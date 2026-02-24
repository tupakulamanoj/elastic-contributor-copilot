import os
import time
import requests
from requests.exceptions import RequestException
from elasticsearch import Elasticsearch, helpers
from dotenv import load_dotenv

# -----------------------------
# Environment setup
# -----------------------------
load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO         = os.getenv("GITHUB_REPO")          # e.g. elastic/elasticsearch
ELASTIC_EP   = os.getenv("ELASTIC_ENDPOINT")
ELASTIC_KEY  = os.getenv("ELASTIC_API_KEY")

INDEX = "elastic-copilot"
BULK_SIZE = 500          # safe chunk size
REQUEST_TIMEOUT = 30     # seconds

# -----------------------------
# Elasticsearch client
# -----------------------------
es = Elasticsearch(
    ELASTIC_EP,
    api_key=ELASTIC_KEY
)

# -----------------------------
# GitHub headers
# -----------------------------
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json"
}

# -----------------------------
# GitHub fetch helper (pagination + retry + rate-limit safe)
# -----------------------------
def github_get(url, params=None):
    if params is None:
        params = {}

    while url:
        try:
            resp = requests.get(
                url,
                headers=HEADERS,
                params=params,
                timeout=REQUEST_TIMEOUT
            )

            # Rate limit handling
            if resp.status_code == 403:
                reset = int(resp.headers.get("X-RateLimit-Reset", time.time() + 60))
                wait = max(reset - int(time.time()), 0) + 5
                print(f"[Rate limit] Sleeping {wait}s...")
                time.sleep(wait)
                continue

            resp.raise_for_status()

            yield from resp.json()

            # Pagination
            url = resp.links.get("next", {}).get("url")
            params = {}

        except RequestException as e:
            print(f"[Network error] {e}. Retrying in 10s...")
            time.sleep(10)
            continue

# -----------------------------
# Stream & index issues + PRs
# -----------------------------
def index_issues_and_prs():
    print("Fetching issues and PRs...")
    url = f"https://api.github.com/repos/{REPO}/issues"
    params = {"state": "all", "per_page": 100}

    buffer = []
    count = 0

    for item in github_get(url, params):
        is_pr = "pull_request" in item

        doc = {
            "_index": INDEX,
            "_id": f"{'pr' if is_pr else 'issue'}-{item['number']}",
            "_source": {
                "id": str(item["id"]),
                "type": "pr" if is_pr else "issue",
                "title": item.get("title", ""),
                "body": item.get("body", "") or "",
                "author": item["user"]["login"],
                "labels": [l["name"] for l in item.get("labels", [])],
                "status": item.get("state", ""),
                "created_at": item.get("created_at"),
                "updated_at": item.get("updated_at"),
                "url": item.get("html_url", ""),
                "number": item["number"],
            }
        }

        buffer.append(doc)
        count += 1

        if len(buffer) >= BULK_SIZE:
            try:
                helpers.bulk(es, buffer)
                print(f"Indexed {count} issues/PRs...")
            except helpers.BulkIndexError as e:
                print(f"Failed to index {len(e.errors)} documents. First error: {e.errors[0]}")
                # continue processing next batch
            buffer.clear()

    if buffer:
        helpers.bulk(es, buffer)
        print(f"Indexed final batch. Total issues/PRs: {count}")

# -----------------------------
# Stream & index comments
# -----------------------------
def index_comments():
    print("Fetching comments...")
    url = f"https://api.github.com/repos/{REPO}/issues/comments"
    params = {"per_page": 100}

    buffer = []
    count = 0

    for item in github_get(url, params):
        issue_number = int(item["issue_url"].split("/")[-1])

        doc = {
            "_index": INDEX,
            "_id": f"comment-{item['id']}",
            "_source": {
                "id": str(item["id"]),
                "type": "comment",
                "body": item.get("body", "") or "",
                "author": item["user"]["login"],
                "created_at": item.get("created_at"),
                "updated_at": item.get("updated_at"),
                "url": item.get("html_url", ""),
                "parent_id": f"issue-{issue_number}",
                "title": "",
                "labels": [],
                "status": "",
                "number": issue_number
            }
        }

        buffer.append(doc)
        count += 1

        if len(buffer) >= BULK_SIZE:
            helpers.bulk(es, buffer)
            print(f"Indexed {count} comments...")
            buffer.clear()

    if buffer:
        helpers.bulk(es, buffer)
        print(f"Indexed final batch. Total comments: {count}")

# -----------------------------
# Main execution
# -----------------------------
if __name__ == "__main__":
    print("Starting full GitHub ingestion 🚀")

    index_issues_and_prs()
    index_comments()

    print("Done. Full backfill complete ✅")
