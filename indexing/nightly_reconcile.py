import os
import requests
import time
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
from indexing.live_indexer import update_status

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

def get_stale_open_docs(batch_size=100):
    """
    Find documents that are marked 'open' in our index.
    We will verify their real status on GitHub.
    """
    result = es.search(
        index="elastic-copilot",
        body={
            "size": batch_size,
            "query": {"term": {"status": "open"}},
            "_source": ["number", "type", "updated_at"]
        }
    )
    return result["hits"]["hits"]

def verify_github_status(number, doc_type):
    """Check the real current status of an issue or PR on GitHub."""
    endpoint = "pulls" if doc_type == "pr" else "issues"
    url      = f"https://api.github.com/repos/{REPO}/{endpoint}/{number}"
    resp     = requests.get(url, headers=HEADERS)

    if resp.status_code == 404:
        return "deleted"
    if resp.status_code == 403:
        time.sleep(60)
        return verify_github_status(number, doc_type)

    resp.raise_for_status()
    data = resp.json()

    if doc_type == "pr" and data.get("merged_at"):
        return "merged"
    return data.get("state", "open")

def run_reconcile(batch_size=100):
    print("Starting nightly reconcile...")
    stale_docs = get_stale_open_docs(batch_size)
    print(f"Checking {len(stale_docs)} open documents against GitHub...")

    corrected  = 0
    confirmed  = 0
    errors     = 0

    for doc in stale_docs:
        src    = doc["_source"]
        number = src["number"]
        dtype  = src["type"]

        try:
            real_status = verify_github_status(number, dtype)

            if real_status != "open":
                update_status(number, dtype, real_status)
                print(f"  Corrected {dtype} #{number}: open → {real_status}")
                corrected += 1
            else:
                confirmed += 1

            time.sleep(0.1)   # gentle rate limiting

        except Exception as e:
            print(f"  Error checking {dtype} #{number}: {e}")
            errors += 1

    print(f"\nReconcile complete:")
    print(f"  Corrected: {corrected}")
    print(f"  Confirmed open: {confirmed}")
    print(f"  Errors: {errors}")
    return corrected, confirmed, errors

if __name__ == "__main__":
    run_reconcile()