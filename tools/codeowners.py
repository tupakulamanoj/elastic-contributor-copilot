import os
import re
import requests
import base64
from elasticsearch import Elasticsearch, helpers
from dotenv import load_dotenv

load_dotenv()

# -----------------------------
# Environment
# -----------------------------
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO         = os.getenv("GITHUB_REPO")

ELASTIC_ENDPOINT = os.getenv("ELASTIC_ENDPOINT")
ELASTIC_API_KEY  = os.getenv("ELASTIC_API_KEY")

# -----------------------------
# Elasticsearch (API key auth)
# -----------------------------
es = Elasticsearch(
    ELASTIC_ENDPOINT,
    api_key=ELASTIC_API_KEY
)

# -----------------------------
# GitHub headers
# -----------------------------
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json"
}

CODEOWNERS_INDEX = "codeowners"

# -----------------------------
# Fetch CODEOWNERS
# -----------------------------
def fetch_codeowners():
    """Try common CODEOWNERS file locations in the repo."""
    paths = ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"]

    for path in paths:
        url = f"https://api.github.com/repos/{REPO}/contents/{path}"
        resp = requests.get(url, headers=HEADERS)

        if resp.status_code == 200:
            content = base64.b64decode(resp.json()["content"]).decode("utf-8")
            print(f"Found CODEOWNERS at {path}")
            return content

    raise FileNotFoundError("No CODEOWNERS file found in repo")

# -----------------------------
# Parse CODEOWNERS
# -----------------------------
def parse_codeowners(content):
    """Parse CODEOWNERS into list of {pattern, owners}."""
    rules = []

    for line in content.splitlines():
        line = line.strip()

        if not line or line.startswith("#"):
            continue

        parts = line.split()
        if len(parts) < 2:
            continue

        pattern = parts[0]
        owners  = parts[1:]   # e.g. ["@elastic/es-core"]

        rules.append({
            "pattern": pattern,
            "owners": owners
        })

    return rules

# -----------------------------
# Match file → owners
# -----------------------------
def match_owners(file_path, rules):
    """
    Last-match-wins semantics (same as GitHub CODEOWNERS).
    """
    matched_owners = []

    for rule in rules:
        pattern = rule["pattern"]

        regex = (
            re.escape(pattern)
            .replace(r"\*\*", ".*")
            .replace(r"\*", "[^/]*")
        )

        if re.search(regex, file_path):
            matched_owners = rule["owners"]

    return matched_owners

# -----------------------------
# Index CODEOWNERS into ES
# -----------------------------
def index_codeowners(rules):
    if es.indices.exists(index=CODEOWNERS_INDEX):
        es.indices.delete(index=CODEOWNERS_INDEX)

    es.indices.create(
        index=CODEOWNERS_INDEX,
        body={
            "mappings": {
                "properties": {
                    "pattern": { "type": "keyword" },
                    "owners":  { "type": "keyword" }
                }
            }
        }
    )

    docs = [
        {
            "_index": CODEOWNERS_INDEX,
            "_id": i,
            "_source": rule
        }
        for i, rule in enumerate(rules)
    ]

    helpers.bulk(es, docs)
    print(f"Indexed {len(docs)} CODEOWNERS rules")

# -----------------------------
# Resolve owners for file list
# -----------------------------
def get_owners_for_files(file_paths, rules):
    all_owners = set()

    for fp in file_paths:
        owners = match_owners(fp, rules)
        all_owners.update(owners)

    return list(all_owners)

# -----------------------------
# Main
# -----------------------------
if __name__ == "__main__":

    print("Fetching CODEOWNERS...")
    content = fetch_codeowners()

    print("Parsing rules...")
    rules = parse_codeowners(content)
    print(f"Found {len(rules)} rules")

    print("Indexing into Elasticsearch...")
    index_codeowners(rules)

    # Test
    test_files = [
        "server/src/main/java/org/elasticsearch/index/engine/Engine.java",
        "x-pack/plugin/security/src/main/java/org/elasticsearch/xpack/security/",
        "docs/reference/query-dsl/match-query.asciidoc"
    ]

    print("\n--- Owner Lookup Test ---")
    for f in test_files:
        owners = get_owners_for_files([f], rules)
        print(f"  {f}")
        print(f"    → Owners: {owners}")
