import os
import requests
from dotenv import load_dotenv
from pipeline.conflict_detector import (
    get_all_reviewer_comments,
    detect_conflicts
)

load_dotenv()

AGENT_API_URL   = os.getenv("ELASTIC_AGENT_URL")
ELASTIC_API_KEY = os.getenv("ELASTIC_API_KEY")
GITHUB_TOKEN    = os.getenv("GITHUB_TOKEN")
REPO            = os.getenv("GITHUB_REPO")

HEADERS_GH = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json"
}

def call_agent(prompt):
    resp = requests.post(
        AGENT_API_URL,
        headers={
            "Content-Type":  "application/json",
            "Authorization": f"ApiKey {ELASTIC_API_KEY}",
            "kbn-xsrf":     "true"
        },
        json={"input": prompt},
        timeout=300
    )
    if not resp.ok:
        print(f"Agent API error {resp.status_code}: {resp.text[:500]}")
    resp.raise_for_status()
    return resp.json()

def build_conflict_prompt(pr_number, conflicts):
    prompt = f"""
Conflict Resolution Request for PR #{pr_number}

{len(conflicts)} conflict(s) detected between reviewers.

"""
    for i, conflict in enumerate(conflicts, 1):
        prompt += f"""
---
Conflict {i}: {conflict['topic'].upper()}

Reviewer @{conflict['reviewer_a']} says:
"{conflict['comment_a']}"
Source: {conflict['url_a']}

Reviewer @{conflict['reviewer_b']} says:
"{conflict['comment_b']}"
Source: {conflict['url_b']}

"""

    prompt += """
For each conflict:
1. Search past resolutions for how this topic was previously decided
2. Find any relevant coding standards that apply
3. Present both viewpoints clearly
4. Cite the historical precedent with PR URL and who decided it
5. Give a concrete recommended resolution

Format each conflict resolution clearly with headers.
End with a summary table: Conflict | Recommended Approach | Confidence
"""
    return prompt.strip()

def format_as_github_comment(pr_number, agent_response, conflicts):
    conflict_topics = ", ".join(c["topic"] for c in conflicts)
    return f"""## ⚖️ Elastic Co-pilot — Conflict Resolution Report

**{len(conflicts)} reviewer conflict(s) detected:** {conflict_topics}

{agent_response}

---
*This resolution is based on historical PR decisions in the Elastic repository.*
*Maintainers: React with 👍 to accept this resolution or 👎 to override it.*
*CC: {" ".join("@" + c["reviewer_a"] + " @" + c["reviewer_b"] for c in conflicts)}*
"""

def post_github_comment(pr_number, body):
    url  = f"https://api.github.com/repos/{REPO}/issues/{pr_number}/comments"
    resp = requests.post(url, headers=HEADERS_GH, json={"body": body})
    resp.raise_for_status()
    print(f"Posted conflict resolution to PR #{pr_number}")

def resolve_pr_conflicts(pr_number, post_comment=False):
    print(f"\n{'='*60}")
    print(f"Conflict Resolver scanning PR #{pr_number}")
    print('='*60)

    print("Fetching reviewer comments...")
    by_reviewer = get_all_reviewer_comments(pr_number)
    print(f"Reviewers: {list(by_reviewer.keys())}")

    print("Detecting conflicts...")
    conflicts = detect_conflicts(by_reviewer)

    if not conflicts:
        msg = "No reviewer conflicts detected in this PR. Consensus maintained."
        print(msg)
        if post_comment:
            body = f"""## ⚖️ Elastic Co-pilot — Conflict Resolution Report

No reviewer conflicts detected in this PR. Consensus maintained.

---
*No contradictory reviewer guidance detected for this PR in current comments.*
"""
            post_github_comment(pr_number, body)
        return msg

    print(f"Found {len(conflicts)} conflict(s):")
    for c in conflicts:
        print(f"  - {c['topic']}: @{c['reviewer_a']} vs @{c['reviewer_b']}")

    prompt   = build_conflict_prompt(pr_number, conflicts)
    print("\nCalling Conflict Resolver agent...")
    response = call_agent(prompt)
    # Extract clean message: API returns {"response": {"message": "..."}, "steps": [...]}
    if "response" in response and isinstance(response["response"], dict):
        result = response["response"].get("message", "")
    elif "response" in response and isinstance(response["response"], str):
        result = response["response"]
    else:
        result = response.get("message", str(response))

    print("\n--- Conflict Resolution Report ---")
    print(result)

    if post_comment:
        formatted = format_as_github_comment(pr_number, result, conflicts)
        post_github_comment(pr_number, formatted)

    return result

if __name__ == "__main__":
    import sys
    pr_number    = int(sys.argv[1]) if len(sys.argv) > 1 else 95103
    post_comment = "--post" in sys.argv
    resolve_pr_conflicts(pr_number, post_comment=post_comment)
