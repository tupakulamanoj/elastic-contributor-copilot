# test_day6.py
import requests
import time

BASE = "http://localhost:8000"

def parse_json_response(resp, endpoint_name):
    try:
        return resp.json()
    except Exception as e:
        snippet = (resp.text or "").strip()[:500]
        raise RuntimeError(
            f"{endpoint_name} returned non-JSON response. "
            f"HTTP {resp.status_code}. Body preview: {snippet}"
        ) from e

def test_full_welcome_flow(pr_number, username, pr_title):
    print(f"\n{'='*60}")
    print(f"Testing Welcome Bot flow for PR #{pr_number} by @{username}")
    print('='*60)

    # ── STEP 0: Index the PR first ────────────────────────────────
    print("\n[0/4] Indexing PR into Elasticsearch...")
    resp = requests.post(f"{BASE}/internal/index-pr", json={
        "pr_number": pr_number
    })

    if resp.status_code == 200:
        data = resp.json()
        print(f"Indexed:  #{data['pr']} — {data['title'][:60]}")
        print("Waiting for ELSER to embed document...")
        # Note: server already waits 3s, but a bit extra on client side doesn't hurt
        time.sleep(1) 
    else:
        print(f"Index failed: {resp.status_code} — {resp.text[:100]}")
        print("Continuing anyway — search results may be empty")

    # Step 1
    print("\n[1/4] Checking contributor status...")
    resp = requests.post(f"{BASE}/internal/check-contributor", json={
        "username":  username,
        "pr_number": pr_number
    })
    contributor = parse_json_response(resp, "/internal/check-contributor")
    print(f"First time: {contributor['is_first_time']}")
    print(f"PR count:   {contributor['pr_count']}")

    # Step 2
    print("\n[2/4] Fetching PR context...")
    resp    = requests.post(f"{BASE}/internal/get-pr-context", json={
        "pr_number": pr_number
    })
    context = parse_json_response(resp, "/internal/get-pr-context")
    print(f"Files changed:    {len(context.get('files', []))}")
    print(f"Code owners:      {context.get('code_owners', [])}")
    # Similar issues will now likely be > 0 because we just indexed the PR itself!
    print(f"Similar issues:   {len(context.get('similar_issues', []))}")
    print(f"Relevant docs:    {len(context.get('relevant_docs', []))}")

    # Step 3
    if contributor["is_first_time"]:
        print("\n[3/4] Posting welcome comment...")
        resp = requests.post(f"{BASE}/internal/post-welcome", json={
            "pr_number":      pr_number,
            "username":       username,
            "pr_title":       pr_title,
            "similar_issues": context.get("similar_issues", []),
            "code_owners":    context.get("code_owners", []),
            "relevant_docs":  context.get("relevant_docs", [])
        })
        welcome_result = parse_json_response(resp, "/internal/post-welcome")
        print(f"Welcome comment status: {welcome_result.get('status')}")
    else:
        print("\n[3/4] Skipping welcome — returning contributor")

    # Step 4
    print("\n[4/4] Running quality report...")
    resp = requests.post(f"{BASE}/internal/run-quality-report", json={
        "pr_number": pr_number
    })
    quality_result = parse_json_response(resp, "/internal/run-quality-report")
    print(f"Quality report status: {quality_result.get('status')}")
    print("\n✅ Full welcome flow complete")

if __name__ == "__main__":
    # Use a real PR number from your target repo
    test_full_welcome_flow(
        pr_number = 95103,
        username  = "new-contributor-test",
        pr_title  = "Fix memory leak in shard recovery"
    )
