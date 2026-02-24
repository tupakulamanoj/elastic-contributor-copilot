import os
import requests
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
from tools.codeowners import (
    parse_codeowners,
    fetch_codeowners,
    get_owners_for_files
)

load_dotenv()

# ─────────────────────────────────────────
# ENV
# ─────────────────────────────────────────
GITHUB_TOKEN   = os.getenv("GITHUB_TOKEN")
REPO           = os.getenv("GITHUB_REPO")          # owner/repo
AGENT_API_URL  = os.getenv("ELASTIC_AGENT_URL")    # Agent Builder endpoint
ELASTIC_CLOUD_ID = os.getenv("ELASTIC_CLOUD_ID")
ELASTIC_API_KEY  = os.getenv("ELASTIC_API_KEY")

es = Elasticsearch(
    cloud_id=ELASTIC_CLOUD_ID,
    api_key=ELASTIC_API_KEY
)

HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json"
}

# ─────────────────────────────────────────
# GITHUB FETCHERS
# ─────────────────────────────────────────
def get_issue(issue_number):
    url = f"https://api.github.com/repos/{REPO}/issues/{issue_number}"
    r = requests.get(url, headers=HEADERS)
    r.raise_for_status()
    return r.json()

def get_pr_files(pr_number):
    url = f"https://api.github.com/repos/{REPO}/pulls/{pr_number}/files"
    r = requests.get(url, headers=HEADERS)
    if r.status_code == 404:
        print(f"  PR #{pr_number} not found, skipping file lookup")
        return []
    r.raise_for_status()
    return [f["filename"] for f in r.json()]

# ─────────────────────────────────────────
# PROMPT BUILDER
# ─────────────────────────────────────────
def build_agent_prompt(issue, files=None, owners=None):
    prompt = f"""
New GitHub Item #{issue['number']}

Title:
{issue['title']}

Body:
{issue.get('body') or 'No description provided.'}

Author: {issue['user']['login']}
State: {issue['state']}
Labels: {', '.join(l['name'] for l in issue.get('labels', [])) or 'None'}
URL: {issue['html_url']}
"""

    if files:
        prompt += "\nFiles changed:\n" + "\n".join(f"- {f}" for f in files)

    if owners:
        prompt += "\n\nOwners from CODEOWNERS:\n" + "\n".join(f"- {o}" for o in owners)

    prompt += """

Please perform repository triage using these SPECIFIC tools:

1. Use the `find_similar_issues` tool to search for semantically similar GitHub issues and PRs related to this item's title and description.
2. Use the `check_for_duplicates` tool to check if a duplicate open issue already exists with a similar title.
3. Use the `find_code_owners` tool to look up the code owners for the changed file paths listed above.
4. Use the `search_repository` tool to search for any related discussions or context.

Return a concise, structured maintainer-ready summary with:
- Overview of the issue/PR
- Duplicate check results (with issue numbers and links)
- Related issues/PRs found (with scores and links)
- Code ownership validation
- Recommended actions
"""

    return prompt.strip()

# ─────────────────────────────────────────
# AGENT CALL (FIXED)
# ─────────────────────────────────────────
def call_agent(prompt):
    payload = {
        "input": prompt,
        "agent_id": "context_retriever"
    }

    r = requests.post(
        AGENT_API_URL,
        headers={
            "Authorization": f"ApiKey {ELASTIC_API_KEY}",
            "Content-Type": "application/json",
            "kbn-xsrf": "true"
        },
        json=payload,
        timeout=300
    )

    if not r.ok:
        print(f"Agent API error {r.status_code}: {r.text[:500]}")

    r.raise_for_status()
    return r.json()

# ─────────────────────────────────────────
# MAIN WORKFLOW
# ─────────────────────────────────────────
def process_issue(issue_number, is_pr=False):
    print(f"\n{'='*70}")
    print(f"Processing {'PR' if is_pr else 'Issue'} #{issue_number}")
    print(f"{'='*70}")

    issue = get_issue(issue_number)
    files = []
    owners = []

    if is_pr:
        files = get_pr_files(issue_number)
        print(f"Files changed: {len(files)}")

        try:
            content = fetch_codeowners()
            rules = parse_codeowners(content)
            owners = get_owners_for_files(files, rules)
            print(f"CODEOWNERS hit: {owners}")
        except Exception as e:
            print(f"CODEOWNERS lookup failed: {e}")

    prompt = build_agent_prompt(issue, files, owners)
    print("\nSending to Agent…")

    response = call_agent(prompt)

    # Extract clean message: API returns {"response": {"message": "..."}, "steps": [...]}
    if "response" in response and isinstance(response["response"], dict):
        result = response["response"].get("message", "")
    elif "response" in response and isinstance(response["response"], str):
        result = response["response"]
    else:
        result = response.get("message", str(response))

    print("\n--- AGENT RESPONSE ---")
    print(result)
    return result

# ─────────────────────────────────────────
# TEST
# ─────────────────────────────────────────
if __name__ == "__main__":
    process_issue(12345, is_pr=False)
    process_issue(12346, is_pr=True)