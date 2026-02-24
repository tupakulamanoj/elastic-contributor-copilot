"""
Seeds your fork with realistic test data:
- Issues (including duplicates)
- PRs with different characteristics
- Review comments that conflict

Run once before testing:
  python tests/seed_test_data.py
"""

import os
import time
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
TESTS_DIR = Path(__file__).resolve().parent

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO         = os.getenv("GITHUB_REPO")

HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept":        "application/vnd.github+json"
}

created = {
    "issues": [],
    "prs":    []
}

def ensure_repo_issues_enabled():
    """Ensure Issues are enabled for the target repo."""
    repo_url = f"https://api.github.com/repos/{REPO}"
    resp = requests.get(repo_url, headers=HEADERS)
    resp.raise_for_status()
    repo_data = resp.json()

    if repo_data.get("has_issues"):
        return

    print("Issues are disabled on this repository. Attempting to enable...")
    patch_resp = requests.patch(repo_url, headers=HEADERS, json={"has_issues": True})
    if patch_resp.status_code in (200, 201):
        print("Issues enabled successfully.")
        return

    settings_url = f"https://github.com/{REPO}/settings"
    raise RuntimeError(
        "GitHub Issues are disabled for this repo and could not be enabled via API.\n"
        f"Enable Issues manually at: {settings_url}\n"
        f"API response: {patch_resp.status_code} {patch_resp.text[:300]}"
    )

def create_issue(title, body, labels=None):
    url  = f"https://api.github.com/repos/{REPO}/issues"
    data = {"title": title, "body": body}
    if labels:
        data["labels"] = labels
    resp = requests.post(url, headers=HEADERS, json=data)
    if resp.status_code == 410:
        settings_url = f"https://github.com/{REPO}/settings"
        raise RuntimeError(
            "GitHub returned 410 Gone when creating issues. "
            "This usually means Issues are disabled on the target repository.\n"
            f"Enable Issues at: {settings_url}"
        )
    resp.raise_for_status()
    result = resp.json()
    print(f"Created issue #{result['number']}: {title[:50]}")
    created["issues"].append(result["number"])
    time.sleep(1)
    return result

def create_branch(branch_name, base="main"):
    # Get base branch SHA
    url  = f"https://api.github.com/repos/{REPO}/git/refs/heads/{base}"
    resp = requests.get(url, headers=HEADERS)

    if resp.status_code != 200:
        # Try master if main doesn't exist
        url  = f"https://api.github.com/repos/{REPO}/git/refs/heads/master"
        resp = requests.get(url, headers=HEADERS)

    resp.raise_for_status()
    sha = resp.json()["object"]["sha"]

    # Create new branch
    url  = f"https://api.github.com/repos/{REPO}/git/refs"
    resp = requests.post(url, headers=HEADERS, json={
        "ref": f"refs/heads/{branch_name}",
        "sha": sha
    })

    if resp.status_code == 422:
        print(f"Branch {branch_name} already exists, skipping")
        return sha

    resp.raise_for_status()
    print(f"Created branch: {branch_name}")
    return sha

def commit_file_to_branch(branch_name, file_path, content, message):
    """Create or update a file on a branch to make it a valid PR source."""
    url = f"https://api.github.com/repos/{REPO}/contents/{file_path}"

    # Check if file exists
    existing = requests.get(
        url,
        headers=HEADERS,
        params={"ref": branch_name}
    )

    import base64
    encoded = base64.b64encode(content.encode()).decode()

    payload = {
        "message": message,
        "content": encoded,
        "branch":  branch_name
    }

    if existing.status_code == 200:
        payload["sha"] = existing.json()["sha"]

    resp = requests.put(url, headers=HEADERS, json=payload)
    resp.raise_for_status()
    print(f"Committed {file_path} to {branch_name}")

def create_pr(title, body, branch_name, base="main"):
    # Try main first, fall back to master
    for base_branch in ["main", "master"]:
        url  = f"https://api.github.com/repos/{REPO}/pulls"
        resp = requests.post(url, headers=HEADERS, json={
            "title": title,
            "body":  body,
            "head":  branch_name,
            "base":  base_branch
        })
        if resp.status_code == 201:
            result = resp.json()
            print(f"Created PR #{result['number']}: {title[:50]}")
            created["prs"].append(result["number"])
            time.sleep(1)
            return result
        elif resp.status_code == 422:
            continue

    print(f"Failed to create PR: {resp.text[:100]}")
    return None

def add_review_comment(pr_number, body):
    url  = f"https://api.github.com/repos/{REPO}/issues/{pr_number}/comments"
    resp = requests.post(url, headers=HEADERS, json={"body": body})
    resp.raise_for_status()
    result = resp.json()
    print(f"Added comment to PR #{pr_number}: {body[:50]}")
    time.sleep(0.5)
    return result

def seed_all():
    print("\n" + "="*60)
    print("Seeding fork with test data")
    print(f"Repo: {REPO}")
    print("="*60)

    if not GITHUB_TOKEN or not REPO:
        raise RuntimeError("Missing GITHUB_TOKEN or GITHUB_REPO in environment.")

    ensure_repo_issues_enabled()

    # ── BATCH 1: Issues for duplicate detection testing ──────────

    print("\n[1/4] Creating issues for duplicate detection...")

    issue_memory = create_issue(
        title  = "Memory leak in shard recovery when node restarts",
        body   = """
## Description
When a node restarts unexpectedly during shard recovery, there is a memory 
leak in the RecoveryTarget class. The Releasable resource is not properly 
closed in the exception path, causing heap usage to grow over time.

## Steps to reproduce
1. Start a 3-node cluster
2. Begin a large shard recovery
3. Kill one node mid-recovery
4. Observe heap usage on remaining nodes

## Expected behavior
Heap usage should remain stable after recovery completes.

## Environment
- Elasticsearch 8.11.0
- JDK 17
- 32GB heap
""",
        labels = ["bug", ">bug"]
    )

    issue_auth = create_issue(
        title  = "Authentication token expiry not handled correctly in REST client",
        body   = """
## Description
When an API key expires during a long-running operation, the REST client 
throws an uncaught exception instead of returning a proper 401 response.

## Steps to reproduce
1. Create an API key with 1 minute expiry
2. Start a bulk indexing operation
3. Wait for key to expire mid-operation
4. Observe exception in logs

## Expected behavior
Client should return AuthenticationException with clear message.
""",
        labels = ["bug", "Rest Client"]
    )

    issue_stream = create_issue(
        title  = "Performance regression in bulk indexing after recent refactor",
        body   = """
## Description
After the recent refactor in the indexing path that replaced Stream API 
with for loops for 'clarity', bulk indexing throughput dropped by ~12%.

## Benchmark results
Before: 52,000 docs/sec
After:  45,800 docs/sec

## Root cause
The for loop implementation allocates a new ArrayList on each call 
instead of reusing the stream pipeline.
""",
        labels = ["performance", ">bug"]
    )

    issue_cluster = create_issue(
        title  = "ClusterState observer not notified when master changes",
        body   = """
## Description
When the master node changes during a rolling upgrade, ClusterStateObserver 
instances on data nodes are not reliably notified. This causes some nodes 
to use stale cluster state for up to 30 seconds.

## Impact
Search requests may be routed to shards that have moved, causing 
unnecessary retries and latency spikes.
""",
        labels = ["bug", "cluster"]
    )

    # ── BATCH 2: PR for first-time contributor scenario ──────────

    print("\n[2/4] Creating PR for first-time contributor scenario...")

    branch1 = "fix/shard-recovery-memory-leak"
    create_branch(branch1)
    commit_file_to_branch(
        branch_name = branch1,
        file_path   = "test_fix_shard_recovery.py",
        content     = '''"""
Fix for memory leak in shard recovery.
NOTE: This code intentionally contains standard violations
for testing the Architecture Critic agent.
"""

import logging

logger = logging.getLogger(__name__)

class RecoveryTarget:
    def __init__(self):
        self.resources = []

    def recover_shard(self, shard_id):
        # STD-002 violation: empty except block
        try:
            result = self._do_recovery(shard_id)
            return result
        except Exception as e:
            pass  # TODO: handle this later

    def process_files(self, files):
        # STD-001 violation: for loop instead of stream
        result = []
        for f in files:
            if f.endswith(".seg"):
                result.append(f.upper())
        return result

    def log_progress(self, shard_id, progress):
        # STD-005 violation: eager string concat in log
        logger.debug("Recovery progress for shard " + str(shard_id) + ": " + str(progress))

    def get_status(self):
        # STD-010 violation: isPresent + get pattern
        status = self._fetch_status()
        if status.isPresent():
            return status.get()
        return None

    def _do_recovery(self, shard_id):
        return {"shard": shard_id, "status": "complete"}

    def _fetch_status(self):
        return None
''',
        message = "Fix memory leak in shard recovery path"
    )

    pr_first_time = create_pr(
        title       = "Fix memory leak in shard recovery path",
        body        = """## Summary

This PR fixes the memory leak reported in the shard recovery path.
The Releasable resource was not being closed in the exception path.

## Changes
- Added try-with-resources block in RecoveryTarget
- Used for loop for clarity in file processing
- Added logging for debug tracing

## Testing
All existing tests pass. Added new test for exception path.

## Notes
This is my first contribution to Elasticsearch. 
Happy to make any changes the reviewers suggest!
""",
        branch_name = branch1
    )

    # ── BATCH 3: PR for conflict scenario ────────────────────────

    print("\n[3/4] Creating PR with conflicting reviewer comments...")

    branch2 = "feature/add-cluster-formation-tracking"
    create_branch(branch2)
    commit_file_to_branch(
        branch_name = branch2,
        file_path   = "test_cluster_formation.py",
        content     = '''"""
Add cluster formation time tracking.
This code will receive conflicting review comments for testing.
"""

import java.util.concurrent.CompletableFuture as CompletableFuture

class ClusterFormationTracker:

    def track_formation(self, cluster_id):
        # Using CompletableFuture for async tracking
        future = CompletableFuture()
        future.supplyAsync(lambda: self._record_formation(cluster_id))
        return future

    def process_nodes(self, nodes):
        # Using for loop for simplicity
        result = []
        for node in nodes:
            result.append(node.getId())
        return result

    def _record_formation(self, cluster_id):
        return {"cluster": cluster_id, "formed_at": "now"}
''',
        message = "Add cluster formation time tracking"
    )

    pr_conflict = create_pr(
        title       = "Add cluster formation time tracking field",
        body        = """## Summary

Adds a new field to track when the cluster was formed.
Uses CompletableFuture for async recording.
Used for loop in node processing for code clarity.

## Changes
- Added ClusterFormationTracker
- New field in cluster state
- Async recording via CompletableFuture

## Testing
Unit tests added and passing.
""",
        branch_name = branch2
    )

    # Add conflicting review comments to trigger Agent 4
    if pr_conflict:
        pr_num = pr_conflict["number"]
        time.sleep(2)

        add_review_comment(pr_num,
            "I think we should use ActionListener here instead of "
            "CompletableFuture. ActionListener is the standard async "
            "primitive in the Elasticsearch codebase and integrates "
            "properly with our thread pool model. CompletableFuture "
            "can cause thread pool starvation under load."
        )
        time.sleep(1)

        add_review_comment(pr_num,
            "Actually I prefer CompletableFuture here, it's cleaner "
            "and more standard Java. ActionListener is overly complex "
            "for this use case. Let's keep it simple with CompletableFuture."
        )
        time.sleep(1)

        add_review_comment(pr_num,
            "Also, please use Stream API instead of the for loop in "
            "process_nodes(). Prefer streams for collection transforms, "
            "it's more idiomatic and enables lazy evaluation."
        )
        time.sleep(1)

        add_review_comment(pr_num,
            "I disagree — use the for loop, avoid streams here. "
            "Streams make the code harder to read and debug. "
            "The for loop is clearer for new contributors."
        )

    # ── BATCH 4: Duplicate issue ──────────────────────────────────

    print("\n[4/4] Creating duplicate issue for detection testing...")

    issue_duplicate = create_issue(
        title  = "Heap memory keeps growing during shard recovery process",
        body   = """
## Description
I noticed that heap memory keeps increasing when shards are being 
recovered after a node restart. The memory does not get released 
even after recovery completes successfully.

## Steps to reproduce
1. Set up a cluster with large indices
2. Restart a node
3. Monitor heap usage during recovery
4. Heap never returns to baseline

## This looks similar to issues I've seen mentioned before but 
I couldn't find the exact duplicate.
""",
        labels = ["bug"]
    )

    # ── Save created IDs for test runner ─────────────────────────

    seeded_path = TESTS_DIR / "seeded_data.json"
    with open(seeded_path, "w", encoding="utf-8") as f:
        json.dump({
            "issues": {
                "memory_leak":    issue_memory["number"],
                "auth_token":     issue_auth["number"],
                "stream_perf":    issue_stream["number"],
                "cluster_state":  issue_cluster["number"],
                "duplicate":      issue_duplicate["number"]
            },
            "prs": {
                "first_time":     pr_first_time["number"] if pr_first_time else None,
                "with_conflict":  pr_conflict["number"] if pr_conflict else None
            },
            "repo": REPO
        }, f, indent=2)

    print("\n" + "="*60)
    print(f"Seed complete. Test data saved to {seeded_path}")
    print("\nCreated:")
    print(f"  Issues: {created['issues']}")
    print(f"  PRs:    {created['prs']}")
    print("="*60)

if __name__ == "__main__":
    seed_all()
