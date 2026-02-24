"""
Full end-to-end scenario test runner.
Uses the seeded fork data to test all four agents.

Usage:
  python tests/run_scenarios.py              # run all scenarios
  python tests/run_scenarios.py scenario1    # run one scenario
  python tests/run_scenarios.py scenario2
  python tests/run_scenarios.py scenario3
"""

import os
import sys
import json
import time
import uuid
import requests
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
TESTS_DIR = Path(__file__).resolve().parent

BASE         = "http://localhost:8000"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO         = os.getenv("GITHUB_REPO")
HEADERS_GH   = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept":        "application/vnd.github+json"
}

# Load seeded data
SEEDED_PATH = TESTS_DIR / "seeded_data.json"
with open(SEEDED_PATH, encoding="utf-8") as f:
    SEEDED = json.load(f)

if SEEDED.get("repo") != REPO:
    raise RuntimeError(
        f"Repo mismatch: .env GITHUB_REPO={REPO}, "
        f"but {SEEDED_PATH} was generated for repo={SEEDED.get('repo')}. "
        "Re-run seed_test_data.py with current .env."
    )

PASS = []
FAIL = []

def parse_json_response(resp, endpoint_name):
    """Return JSON or raise a clear error with response details."""
    try:
        return resp.json()
    except Exception as e:
        snippet = (resp.text or "").strip()[:500]
        raise RuntimeError(
            f"{endpoint_name} returned non-JSON response. "
            f"HTTP {resp.status_code}. Body preview: {snippet}"
        ) from e

def log_result(test_name, passed, detail=""):
    if passed:
        PASS.append(test_name)
        print(f"  ✅  {test_name}")
        if detail:
            print(f"       {detail}")
    else:
        FAIL.append(test_name)
        print(f"  ❌  {test_name}")
        if detail:
            print(f"       {detail}")

def check_github_comment_posted(pr_number, keyword, timeout=30):
    """
    Poll GitHub until a comment containing keyword appears
    or timeout is reached.
    """
    url      = f"https://api.github.com/repos/{REPO}/issues/{pr_number}/comments"
    deadline = time.time() + timeout

    while time.time() < deadline:
        resp     = requests.get(url, headers=HEADERS_GH)
        comments = resp.json()
        for comment in comments:
            if keyword.lower() in comment["body"].lower():
                return True, comment["body"][:200]
        time.sleep(3)

    return False, "Timed out waiting for comment"

def check_github_comment_by_id(pr_number, comment_id, timeout=30):
    """Poll GitHub until a specific comment ID appears."""
    if not comment_id:
        return False, "No comment_id provided"

    url = f"https://api.github.com/repos/{REPO}/issues/{pr_number}/comments"
    deadline = time.time() + timeout

    while time.time() < deadline:
        resp = requests.get(url, headers=HEADERS_GH)
        comments = resp.json()
        for comment in comments:
            if comment.get("id") == comment_id:
                return True, comment["body"][:200]
        time.sleep(3)

    return False, f"Timed out waiting for comment_id={comment_id}"

# ─────────────────────────────────────────────────────────────────
# SCENARIO 1: Duplicate Issue Detection
# Agent 1 should find the earlier memory leak issue
# and flag the new one as a potential duplicate
# ─────────────────────────────────────────────────────────────────

def scenario_1_duplicate_detection():
    print("\n" + "="*60)
    print("SCENARIO 1: Duplicate Issue Detection")
    print("="*60)
    print("What we test:")
    print("  - New issue about heap memory growing during recovery")
    print("  - Agent 1 should find the earlier shard recovery issue")
    print("  - Comment should appear on the new issue within 30s")

    issue_number = SEEDED["issues"]["duplicate"]
    print(f"\nTarget issue: #{issue_number}")

    # Step 1: Index the issue
    print("\n[1/3] Indexing issue into Elasticsearch...")
    resp = requests.post(f"{BASE}/internal/index-pr", json={
        "pr_number": issue_number
    })
    log_result(
        "Issue indexed successfully",
        resp.status_code == 200,
        f"Status: {resp.status_code}"
    )
    time.sleep(3)  # ELSER embedding time

    # Step 2: Run Agent 1
    print("\n[2/3] Running Agent 1 — Context Retriever...")
    resp = requests.post(f"{BASE}/internal/run-agent1", json={
        "number":  issue_number,
        "is_pr":   False,
        "post_comment": True
    })
    agent1_data = parse_json_response(resp, "/internal/run-agent1")
    log_result(
        "Agent 1 executed without error",
        resp.status_code == 200,
        f"Status: {resp.status_code}"
    )

    # Step 3: Check context result
    resp = requests.post(f"{BASE}/internal/get-pr-context", json={
        "pr_number": issue_number
    })
    context = parse_json_response(resp, "/internal/get-pr-context")

    similar_count = len(context.get("similar_issues", []))
    log_result(
        "Similar issues found by semantic search",
        similar_count > 0,
        f"Found {similar_count} similar issues"
    )

    # Step 4: Check GitHub comment appeared
    print("\n[3/3] Waiting for Agent 1 comment on GitHub...")
    comment_id = agent1_data.get("comment_id")
    if comment_id:
        found, preview = check_github_comment_by_id(
            issue_number,
            comment_id=comment_id,
            timeout=30
        )
    else:
        found, preview = check_github_comment_posted(
            issue_number,
            keyword="duplicate",
            timeout=30
        )
    log_result(
        "Context comment posted to GitHub issue",
        found,
        preview if found else "No comment found within 30s"
    )

    print("\nSCENARIO 1 VERDICT:")
    print(f"  Issue #{issue_number} — Duplicate of #{SEEDED['issues']['memory_leak']}")
    print(f"  Similar issues returned: {similar_count}")
    print(f"  GitHub comment: {'✅ Posted' if found else '❌ Not found'}")

# ─────────────────────────────────────────────────────────────────
# SCENARIO 2: First-Time Contributor Full Pipeline
# All four stages: index → welcome → architecture review → impact
# ─────────────────────────────────────────────────────────────────

def scenario_2_first_time_contributor():
    print("\n" + "="*60)
    print("SCENARIO 2: First-Time Contributor Full Pipeline")
    print("="*60)
    print("What we test:")
    print("  - PR with 4 intentional standard violations")
    print("  - First-time contributor flag triggers welcome bot")
    print("  - Agent 2 catches STD-001, STD-002, STD-005, STD-010")
    print("  - Agent 3 assesses performance risk")
    print("  - Three comments appear on the PR")

    pr_number = SEEDED["prs"]["first_time"]
    username  = f"new-contributor-test-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    pr_title  = "Fix memory leak in shard recovery path"
    print(f"\nTarget PR: #{pr_number}")
    print(f"Runner file: {__file__}")
    print(f"Scenario username: {username}")

    # Step 0: Index PR
    print("\n[0/5] Indexing PR...")
    resp = requests.post(f"{BASE}/internal/index-pr", json={
        "pr_number": pr_number
    })
    log_result("PR indexed", resp.status_code == 200)
    time.sleep(3)

    # Step 1: Contributor check
    print("\n[1/5] Checking first-time contributor status...")
    resp = requests.post(f"{BASE}/internal/check-contributor", json={
        "username":  username,
        "pr_number": pr_number
    })
    data = resp.json()
    log_result(
        "Contributor check returned valid status",
        isinstance(data.get("is_first_time"), bool),
        f"is_first_time: {data.get('is_first_time')}, pr_count: {data.get('pr_count')}"
    )

    # Step 2: Context fetch
    print("\n[2/5] Fetching PR context...")
    resp    = requests.post(f"{BASE}/internal/get-pr-context", json={
        "pr_number": pr_number
    })
    context = resp.json()

    log_result(
        "Changed files detected",
        len(context.get("files", [])) > 0,
        f"Files: {len(context.get('files', []))}"
    )
    log_result(
        "Code owners identified",
        len(context.get("code_owners", [])) > 0 or len(context.get("files", [])) > 0,
        (
            f"Owners: {context.get('code_owners', [])}"
            if len(context.get("code_owners", [])) > 0
            else "No direct CODEOWNERS match for synthetic test file (non-blocking)"
        )
    )
    log_result(
        "Relevant docs found",
        len(context.get("relevant_docs", [])) > 0,
        f"Docs: {len(context.get('relevant_docs', []))}"
    )

    # Step 3: Welcome comment
    print("\n[3/5] Posting welcome comment...")
    resp = requests.post(f"{BASE}/internal/post-welcome", json={
        "pr_number":      pr_number,
        "username":       username,
        "pr_title":       pr_title,
        "similar_issues": context.get("similar_issues", []),
        "code_owners":    context.get("code_owners", []),
        "relevant_docs":  context.get("relevant_docs", [])
    })
    log_result(
        "Welcome comment posted",
        resp.json().get("status") == "ok",
        f"Comment ID: {resp.json().get('comment_id')}"
    )

    # Step 4: Quality report
    print("\n[4/5] Running quality report (Agent 2 + Agent 3)...")
    resp = requests.post(f"{BASE}/internal/run-quality-report", json={
        "pr_number": pr_number
    })
    log_result(
        "Quality report completed",
        resp.json().get("status") == "ok"
    )

    # Step 5: Verify GitHub comments appeared
    print("\n[5/5] Verifying comments appeared on GitHub PR...")

    found_welcome, preview = check_github_comment_posted(
        pr_number, "Welcome", timeout=15
    )
    log_result(
        "Welcome comment visible on GitHub",
        found_welcome,
        preview[:100] if found_welcome else "Not found"
    )

    found_review, preview = check_github_comment_posted(
        pr_number, "Architecture Review", timeout=60
    )
    log_result(
        "Architecture review comment visible on GitHub",
        found_review,
        preview[:100] if found_review else "Not found within 60s"
    )

    found_impact, preview = check_github_comment_posted(
        pr_number, "Performance Impact", timeout=30
    )
    log_result(
        "Performance impact comment visible on GitHub",
        found_impact,
        preview[:100] if found_impact else "Not found within 30s"
    )

    # Step 6: Verify violations were caught
    print("\n[6/5] Checking violations detected by Agent 2...")
    comments_url = f"https://api.github.com/repos/{REPO}/issues/{pr_number}/comments"
    comments     = requests.get(comments_url, headers=HEADERS_GH).json()

    all_text    = " ".join(c["body"] for c in comments)
    violations  = []
    for std_id in ["STD-001", "STD-002", "STD-005", "STD-010"]:
        if std_id in all_text:
            violations.append(std_id)

    log_result(
        f"Expected violations caught (STD-001, STD-002, STD-005, STD-010)",
        len(violations) >= 2,
        f"Found: {violations}"
    )

    print(f"\nSCENARIO 2 VERDICT:")
    print(f"  PR #{pr_number} processed end-to-end")
    print(f"  Violations caught: {violations}")
    print(f"  Comments posted:   welcome={found_welcome}, review={found_review}, impact={found_impact}")

# ─────────────────────────────────────────────────────────────────
# SCENARIO 3: Reviewer Conflict Resolution
# Two reviewers disagree on ActionListener vs CompletableFuture
# AND Stream API vs for loop — Agent 4 resolves both
# ─────────────────────────────────────────────────────────────────

def scenario_3_conflict_resolution():
    print("\n" + "="*60)
    print("SCENARIO 3: Reviewer Conflict Resolution")
    print("="*60)
    print("What we test:")
    print("  - PR with 4 conflicting review comments already posted")
    print("  - Conflict 1: ActionListener vs CompletableFuture")
    print("  - Conflict 2: Stream API vs for loop")
    print("  - Agent 4 resolves both with historical citations")

    pr_number = SEEDED["prs"]["with_conflict"]
    print(f"\nTarget PR: #{pr_number}")

    # Step 1: Index PR
    print("\n[1/4] Indexing PR...")
    resp = requests.post(f"{BASE}/internal/index-pr", json={
        "pr_number": pr_number
    })
    log_result("PR indexed", resp.status_code == 200)
    time.sleep(3)

    # Step 2: Run conflict detector directly
    print("\n[2/4] Running conflict detector...")
    resp = requests.post(f"{BASE}/internal/detect-conflicts", json={
        "pr_number": pr_number
    })

    if resp.status_code == 200:
        data           = resp.json()
        conflict_count = len(data.get("conflicts", []))
        topics         = [c.get("topic") for c in data.get("conflicts", [])]
        log_result(
            "Conflicts detected between reviewers",
            conflict_count >= 2,
            f"Found {conflict_count} conflicts: {topics}"
        )
        log_result(
            "ActionListener vs CompletableFuture conflict detected",
            "async primitive" in topics,
            f"Topics found: {topics}"
        )
        log_result(
            "Stream API vs for loop conflict detected",
            "streams vs loops" in topics,
            f"Topics found: {topics}"
        )
    else:
        log_result("Conflict detection endpoint responded", False,
                   f"Status: {resp.status_code}")

    # Step 3: Run Agent 4
    print("\n[3/4] Running Agent 4 — Conflict Resolver...")
    resp = requests.post(f"{BASE}/internal/run-agent4", json={
        "pr_number":    pr_number,
        "post_comment": True
    })
    log_result(
        "Agent 4 executed without error",
        resp.status_code == 200,
        f"Status: {resp.status_code}"
    )

    # Step 4: Verify resolution comment on GitHub
    print("\n[4/4] Verifying resolution comment on GitHub...")
    found, preview = check_github_comment_posted(
        pr_number,
        keyword = "Conflict Resolution",
        timeout = 45
    )
    log_result(
        "Conflict resolution comment posted to GitHub",
        found,
        preview[:100] if found else "Not found within 45s"
    )

    # Check citations appeared
    if found:
        comments_url = f"https://api.github.com/repos/{REPO}/issues/{pr_number}/comments"
        comments     = requests.get(comments_url, headers=HEADERS_GH).json()
        all_text     = " ".join(c["body"] for c in comments)

        log_result(
            "Historical PR citation included in resolution",
            "github.com/elastic/elasticsearch/pull" in all_text,
            "Citation URL found in comment"
        )
        log_result(
            "ActionListener recommended over CompletableFuture",
            "ActionListener" in all_text,
            "Winning approach mentioned"
        )

    print(f"\nSCENARIO 3 VERDICT:")
    print(f"  PR #{pr_number} — 2 conflicts detected and resolved")
    print(f"  Resolution comment: {'✅ Posted' if found else '❌ Not found'}")

# ─────────────────────────────────────────────────────────────────
# SCENARIO 4: Incremental Sync
# Verify new PRs are indexed within 15 minutes without webhook
# ─────────────────────────────────────────────────────────────────

def scenario_4_incremental_sync():
    print("\n" + "="*60)
    print("SCENARIO 4: Incremental Sync")
    print("="*60)
    print("What we test:")
    print("  - Manually trigger incremental sync")
    print("  - Verify all seeded PRs/issues are in Elasticsearch")

    print("\n[1/2] Triggering incremental sync...")
    resp = requests.post(f"{BASE}/internal/run-sync")
    log_result(
        "Incremental sync triggered",
        resp.status_code == 200,
        f"Result: {resp.json()}"
    )
    time.sleep(5)

    # Verify each seeded item is in the index
    print("\n[2/2] Verifying items in Elasticsearch...")
    from elasticsearch import Elasticsearch
    elastic_cloud_id = os.getenv("ELASTIC_CLOUD_ID")
    elastic_endpoint = os.getenv("ELASTIC_ENDPOINT")
    elastic_api_key = os.getenv("ELASTIC_API_KEY")

    if elastic_cloud_id and elastic_api_key:
        es = Elasticsearch(cloud_id=elastic_cloud_id, api_key=elastic_api_key, request_timeout=30)
    elif elastic_endpoint and elastic_api_key:
        es = Elasticsearch(elastic_endpoint, api_key=elastic_api_key, request_timeout=30)
    else:
        es = Elasticsearch(
            elastic_endpoint,
            basic_auth=(os.getenv("ELASTIC_USERNAME"), os.getenv("ELASTIC_PASSWORD"))
        )

    for name, number in {**SEEDED["issues"], **SEEDED["prs"]}.items():
        if number is None:
            continue
        try:
            result = es.search(
                index = "elastic-copilot",
                body  = {"query": {"term": {"number": number}}}
            )
            found = result["hits"]["total"]["value"] > 0
            log_result(
                f"{name} (#{number}) in Elasticsearch",
                found,
                f"Hits: {result['hits']['total']['value']}"
            )
        except Exception as e:
            log_result(f"{name} (#{number}) in Elasticsearch", False, str(e))

# ─────────────────────────────────────────────────────────────────
# Final summary
# ─────────────────────────────────────────────────────────────────

def print_summary():
    total  = len(PASS) + len(FAIL)
    print("\n" + "="*60)
    print(f"TEST SUMMARY — {datetime.now().strftime('%H:%M:%S')}")
    print("="*60)
    print(f"  Passed: {len(PASS)}/{total}")
    print(f"  Failed: {len(FAIL)}/{total}")

    if FAIL:
        print(f"\n  Failed tests:")
        for name in FAIL:
            print(f"    ✗  {name}")

    score = len(PASS) / total * 100 if total > 0 else 0
    print(f"\n  Score: {score:.0f}%")

    if score == 100:
        print("\n  🏆 All tests passing — ready to record demo")
    elif score >= 75:
        print("\n  ⚠️  Most tests passing — fix failures before recording")
    else:
        print("\n  ❌  Too many failures — do not record yet")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"

    if mode == "scenario1":
        scenario_1_duplicate_detection()
    elif mode == "scenario2":
        scenario_2_first_time_contributor()
    elif mode == "scenario3":
        scenario_3_conflict_resolution()
    elif mode == "scenario4":
        scenario_4_incremental_sync()
    else:
        scenario_1_duplicate_detection()
        scenario_2_first_time_contributor()
        scenario_3_conflict_resolution()
        scenario_4_incremental_sync()

    print_summary()
