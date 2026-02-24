import os
import requests
from datetime import datetime
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO         = os.getenv("GITHUB_REPO")

es = Elasticsearch(
    os.getenv("ELASTIC_ENDPOINT"),
    api_key=os.getenv("ELASTIC_API_KEY")
)

HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json"
}

CONTRIBUTOR_INDEX = "contributor-history"

def create_contributor_index():
    if not es.indices.exists(index=CONTRIBUTOR_INDEX):
        es.indices.create(index=CONTRIBUTOR_INDEX, body={
            "mappings": {
                "properties": {
                    "username":       { "type": "keyword" },
                    "first_seen":     { "type": "date" },
                    "pr_count":       { "type": "integer" },
                    "last_pr_number": { "type": "integer" },
                    "last_pr_date":   { "type": "date" },
                    "is_maintainer":  { "type": "boolean" },
                    "welcomed":       { "type": "boolean" }
                }
            }
        })
        print(f"Created index: {CONTRIBUTOR_INDEX}")

def get_contributor_record(username):
    try:
        resp = es.get(index=CONTRIBUTOR_INDEX, id=username)
        return resp["_source"]
    except Exception:
        return None

def upsert_contributor(username, pr_number):
    record = get_contributor_record(username)

    if record is None:
        # First time we have ever seen this contributor
        doc = {
            "username":       username,
            "first_seen":     datetime.utcnow().isoformat(),
            "pr_count":       1,
            "last_pr_number": pr_number,
            "last_pr_date":   datetime.utcnow().isoformat(),
            "is_maintainer":  False,
            "welcomed":       False
        }
        es.index(index=CONTRIBUTOR_INDEX, id=username, document=doc)
        return True, doc   # True = is first-time

    else:
        # Returning contributor — increment their count
        es.update(
            index=CONTRIBUTOR_INDEX,
            id=username,
            body={
                "doc": {
                    "pr_count":       record["pr_count"] + 1,
                    "last_pr_number": pr_number,
                    "last_pr_date":   datetime.utcnow().isoformat()
                }
            }
        )
        return False, record   # False = not first-time

def check_github_contribution_history(username):
    """
    Cross-check with GitHub API to see if they have merged PRs.
    More reliable than just our local index for the first run.
    """
    try:
        url    = f"https://api.github.com/repos/{REPO}/pulls"
        params = {
            "state":     "closed",
            "per_page":  10
        }
        resp   = requests.get(url, headers=HEADERS, params=params, timeout=30)
        resp.raise_for_status()

        merged_by_user = [
            pr for pr in resp.json()
            if pr.get("user", {}).get("login") == username
            and pr.get("merged_at") is not None
        ]
        return len(merged_by_user)
    except Exception as e:
        print(f"GitHub API check failed: {e}")
        return 0  # Assume first-time if we can't verify

def is_first_time_contributor(username, pr_number):
    """
    Returns (is_first_time: bool, contributor_record: dict)
    Logic:
    - If we have never seen them in our index AND
    - They have 0 merged PRs on GitHub → genuine first-timer
    - If they are in our index with pr_count == 1 and welcomed == False
      → they opened a PR before but were never welcomed (edge case)
    """
    create_contributor_index()

    is_new, record = upsert_contributor(username, pr_number)

    if not is_new:
        return False, record

    # Double-check with GitHub API
    merged_count = check_github_contribution_history(username)
    is_first_time = merged_count == 0

    # Mark them as welcomed so we don't double-welcome
    if is_first_time:
        es.update(
            index=CONTRIBUTOR_INDEX,
            id=username,
            body={"doc": {"welcomed": True}}
        )

    return is_first_time, record

if __name__ == "__main__":
    result, record = is_first_time_contributor("new-test-user", 99999)
    print(f"First time: {result}")
    print(f"Record: {record}")