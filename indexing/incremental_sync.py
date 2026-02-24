import os
import time
import requests
from datetime import datetime, timezone
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
from indexing.live_indexer import index_issue, index_comment

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO         = os.getenv("GITHUB_REPO")
HEADERS      = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json"
}

ELASTIC_ENDPOINT = os.getenv("ELASTIC_ENDPOINT")
ELASTIC_API_KEY = os.getenv("ELASTIC_API_KEY")
ELASTIC_CLOUD_ID = os.getenv("ELASTIC_CLOUD_ID")

if ELASTIC_CLOUD_ID:
    es = Elasticsearch(cloud_id=ELASTIC_CLOUD_ID, api_key=ELASTIC_API_KEY, request_timeout=30)
elif ELASTIC_ENDPOINT:
    es = Elasticsearch(ELASTIC_ENDPOINT, api_key=ELASTIC_API_KEY, request_timeout=30)
else:
    es = None

SYNC_STATE_INDEX = "sync-state"

def get_last_sync_time(sync_type):
    """Read the last successful sync timestamp from Elasticsearch."""
    try:
        doc = es.get(index=SYNC_STATE_INDEX, id=sync_type)
        return doc["_source"]["last_sync"]
    except Exception:
        # First run — go back 24 hours
        return (
            datetime.now(timezone.utc)
            .replace(hour=0, minute=0, second=0)
            .isoformat()
        )

def set_last_sync_time(sync_type):
    """Write the current timestamp as the last successful sync."""
    es.index(
        index=SYNC_STATE_INDEX,
        id=sync_type,
        document={"last_sync": datetime.utcnow().isoformat(), "sync_type": sync_type}
    )

def sync_new_issues(since):
    """Fetch and index all issues/PRs updated since the last sync."""
    url    = f"https://api.github.com/repos/{REPO}/issues"
    params = {
        "state":    "all",
        "since":    since,
        "per_page": 100,
        "sort":     "updated",
        "direction": "asc"
    }

    indexed = 0
    while url:
        resp = requests.get(url, headers=HEADERS, params=params)

        if resp.status_code == 403:
            reset = int(resp.headers.get("X-RateLimit-Reset", time.time() + 60))
            wait  = max(reset - int(time.time()), 0) + 5
            print(f"Rate limited. Waiting {wait}s...")
            time.sleep(wait)
            continue

        items = resp.json()
        for item in items:
            try:
                index_issue(item)
                indexed += 1
            except Exception as e:
                print(f"Failed to index item #{item.get('number')}: {e}")

        url    = resp.links.get("next", {}).get("url")
        params = {}

    return indexed

def sync_new_comments(since):
    """Fetch and index all issue comments since last sync."""
    url    = f"https://api.github.com/repos/{REPO}/issues/comments"
    params = {
        "since":    since,
        "per_page": 100,
        "sort":     "updated",
        "direction": "asc"
    }

    indexed = 0
    while url:
        resp   = requests.get(url, headers=HEADERS, params=params)
        resp.raise_for_status()
        items  = resp.json()

        for item in items:
            try:
                issue_number = int(item["issue_url"].split("/")[-1])
                index_comment(item, issue_number)
                indexed += 1
            except Exception as e:
                print(f"Failed to index comment {item.get('id')}: {e}")

        url    = resp.links.get("next", {}).get("url")
        params = {}

    return indexed

def run_incremental_sync():
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Running incremental sync...")

    since_issues   = get_last_sync_time("issues")
    since_comments = get_last_sync_time("comments")

    issues_indexed   = sync_new_issues(since_issues)
    comments_indexed = sync_new_comments(since_comments)

    set_last_sync_time("issues")
    set_last_sync_time("comments")

    print(f"Synced: {issues_indexed} issues/PRs, {comments_indexed} comments")
    return issues_indexed, comments_indexed

def run_polling_loop(interval_seconds=900):
    """Run incremental sync every interval_seconds (default 15 min)."""
    print(f"Starting incremental sync loop (every {interval_seconds//60} minutes)...")
    while True:
        try:
            run_incremental_sync()
        except Exception as e:
            print(f"Sync error: {e}")
        time.sleep(interval_seconds)

if __name__ == "__main__":
    import sys
    if "--once" in sys.argv:
        run_incremental_sync()
    else:
        run_polling_loop()