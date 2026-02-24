import os
import re
import requests
from itertools import combinations
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO         = os.getenv("GITHUB_REPO")

HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json"
}

# Conflicting signal pairs — if one reviewer says A and another says B
# in the same PR, that is a conflict worth resolving
CONFLICT_PATTERNS = [
    # Pattern: (signal_a, signal_b, topic)
    (r"\buse\s+streams?\b",          r"\buse\s+(?:for\s+)?loops?\b",       "streams vs loops"),
    (r"\bprefer\s+streams?\b",       r"\bavoid\s+streams?\b",               "streams vs loops"),
    (r"\bimmutable\b",               r"\bmutable\b",                        "mutability"),
    (r"\bsync(?:hronous|hronized)?\b", r"\basync(?:hronous)?\b",           "sync vs async"),
    (r"\bActionListener\b",          r"\bCompletableFuture\b",              "async primitive"),
    (r"\bOptional\b",                r"\bnull.?check\b",                    "null handling"),
    (r"\bthrow\b",                   r"\breturn\s+(?:null|Optional\.empty)", "error strategy"),
    (r"\bsingle\s+class\b",         r"\bsplit\s+(?:into|across)\b",        "class design"),
    (r"\binline\b",                  r"\bextract\s+(?:method|function)\b",  "refactoring"),
    (r"\bStream\s+API\b",            r"\bfor.?each\b",                      "iteration style"),
    (r"\binterface\b",               r"\babstract\s+class\b",               "abstraction type"),
    (r"\bfinal\b",                   r"\bdon.t\s+use\s+final\b",            "final keyword"),
    (r"\bESTestCase\b",              r"\bJUnit\b",                          "test base class"),
    (r"\bsynchronized\b",            r"\bAtomicReference\b",                "concurrency primitive"),
]

def fetch_pr_review_comments(pr_number):
    """Fetch all review comments on a PR."""
    url    = f"https://api.github.com/repos/{REPO}/pulls/{pr_number}/comments"
    resp   = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()

def fetch_pr_issue_comments(pr_number):
    """Fetch general issue-style comments on the PR."""
    url    = f"https://api.github.com/repos/{REPO}/issues/{pr_number}/comments"
    resp   = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()

def get_all_reviewer_comments(pr_number):
    """Combine and deduplicate all comments, grouped by reviewer."""
    review_comments = fetch_pr_review_comments(pr_number)
    issue_comments  = fetch_pr_issue_comments(pr_number)

    by_reviewer = {}

    for comment in review_comments + issue_comments:
        author = comment["user"]["login"]
        if author not in by_reviewer:
            by_reviewer[author] = []
        by_reviewer[author].append({
            "body":       comment["body"],
            "url":        comment["html_url"],
            "created_at": comment["created_at"]
        })

    return by_reviewer

def detect_conflicts(by_reviewer):
    """
    Compare all pairs of reviewers.
    For each conflict pattern pair, check if reviewer A uses signal_a
    and reviewer B uses signal_b. If so, that is a conflict.
    """
    detected = []
    reviewers = list(by_reviewer.keys())

    for reviewer_a, reviewer_b in combinations(reviewers, 2):
        comments_a = " ".join(c["body"] for c in by_reviewer[reviewer_a])
        comments_b = " ".join(c["body"] for c in by_reviewer[reviewer_b])

        for signal_a, signal_b, topic in CONFLICT_PATTERNS:
            a_says_a = bool(re.search(signal_a, comments_a, re.IGNORECASE))
            a_says_b = bool(re.search(signal_b, comments_a, re.IGNORECASE))
            b_says_a = bool(re.search(signal_a, comments_b, re.IGNORECASE))
            b_says_b = bool(re.search(signal_b, comments_b, re.IGNORECASE))

            conflict = None

            # A says use X, B says use Y
            if a_says_a and b_says_b and not a_says_b and not b_says_a:
                conflict = {
                    "topic":        topic,
                    "reviewer_a":   reviewer_a,
                    "stance_a":     f"Prefers approach matching: {signal_a}",
                    "reviewer_b":   reviewer_b,
                    "stance_b":     f"Prefers approach matching: {signal_b}",
                    "comment_a":    by_reviewer[reviewer_a][0]["body"][:300],
                    "comment_b":    by_reviewer[reviewer_b][0]["body"][:300],
                    "url_a":        by_reviewer[reviewer_a][0]["url"],
                    "url_b":        by_reviewer[reviewer_b][0]["url"]
                }

            # B says use X, A says use Y (reversed)
            elif b_says_a and a_says_b and not b_says_b and not a_says_a:
                conflict = {
                    "topic":        topic,
                    "reviewer_a":   reviewer_b,
                    "stance_a":     f"Prefers approach matching: {signal_a}",
                    "reviewer_b":   reviewer_a,
                    "stance_b":     f"Prefers approach matching: {signal_b}",
                    "comment_a":    by_reviewer[reviewer_b][0]["body"][:300],
                    "comment_b":    by_reviewer[reviewer_a][0]["body"][:300],
                    "url_a":        by_reviewer[reviewer_b][0]["url"],
                    "url_b":        by_reviewer[reviewer_a][0]["url"]
                }

            if conflict:
                detected.append(conflict)

    # Fallback for fork/demo environments where all comments come from one user:
    # detect contradictory guidance within the same reviewer's comment set.
    for reviewer in reviewers:
        comments = " ".join(c["body"] for c in by_reviewer[reviewer])
        first_comment = by_reviewer[reviewer][0] if by_reviewer[reviewer] else {"body": "", "url": ""}
        for signal_a, signal_b, topic in CONFLICT_PATTERNS:
            says_a = bool(re.search(signal_a, comments, re.IGNORECASE))
            says_b = bool(re.search(signal_b, comments, re.IGNORECASE))
            if says_a and says_b:
                detected.append({
                    "topic": topic,
                    "reviewer_a": reviewer,
                    "stance_a": f"Mentions approach matching: {signal_a}",
                    "reviewer_b": reviewer,
                    "stance_b": f"Mentions approach matching: {signal_b}",
                    "comment_a": first_comment["body"][:300],
                    "comment_b": first_comment["body"][:300],
                    "url_a": first_comment["url"],
                    "url_b": first_comment["url"],
                })

    # De-duplicate repeated conflicts by (topic, reviewer pair)
    deduped = {}
    for c in detected:
        key = (c["topic"], c["reviewer_a"], c["reviewer_b"])
        if key not in deduped:
            deduped[key] = c

    return list(deduped.values())

if __name__ == "__main__":
    import sys
    import json
    pr_number = int(sys.argv[1]) if len(sys.argv) > 1 else 95103
    by_reviewer = get_all_reviewer_comments(pr_number)
    print(f"Reviewers found: {list(by_reviewer.keys())}")
    conflicts = detect_conflicts(by_reviewer)
    print(f"Conflicts detected: {len(conflicts)}")
    print(json.dumps(conflicts, indent=2))
