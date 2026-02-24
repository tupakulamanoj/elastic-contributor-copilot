import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO         = os.getenv("GITHUB_REPO")

HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3.diff"   # raw diff format
}

def fetch_pr_diff(pr_number):
    url  = f"https://api.github.com/repos/{REPO}/pulls/{pr_number}"
    resp = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    return resp.text

def parse_diff_into_chunks(diff_text, max_chunk_lines=60):
    """
    Split a raw git diff into per-file chunks.
    Each chunk contains the filename and the added lines only.
    We only care about added lines for code review purposes.
    """
    chunks   = []
    current_file   = None
    current_lines  = []

    for line in diff_text.splitlines():
        # Detect file header
        if line.startswith("diff --git"):
            if current_file and current_lines:
                chunks.append({
                    "file":  current_file,
                    "added_code": "\n".join(current_lines)
                })
            current_file  = line.split(" b/")[-1]
            current_lines = []

        # Collect only added lines (not removed, not context)
        elif line.startswith("+") and not line.startswith("+++"):
            current_lines.append(line[1:])   # strip the leading +

    # Don't forget the last file
    if current_file and current_lines:
        chunks.append({
            "file":       current_file,
            "added_code": "\n".join(current_lines)
        })

    return chunks

def extract_code_patterns(added_code):
    """
    Lightweight static pattern extraction before sending to the agent.
    Flags obvious anti-patterns so the agent has hints to work with.
    """
    hints = []

    if re.search(r'catch\s*\(\w+\s+\w+\)\s*\{\s*\}', added_code):
        hints.append("Empty catch block detected (STD-002)")

    if re.search(r'Thread\.sleep\(', added_code):
        hints.append("Thread.sleep() detected — possible polling loop (STD-015)")

    if re.search(r'\.get\(\)', added_code) and "Future" in added_code:
        hints.append("Blocking .get() on Future detected (STD-004)")

    if re.search(r'new\s+ArrayList\(\)|new\s+HashMap\(\)', added_code):
        hints.append("Object allocation in potential hot path (STD-012)")

    if re.search(r'logger\.\w+\(".*"\s*\+', added_code):
        hints.append("Eager string concatenation in log call (STD-005)")

    if re.search(r'if\s*\(.*\.isPresent\(\)\)', added_code):
        hints.append("Optional.isPresent() + get() pattern (STD-010)")

    if re.search(r'password|token|api.?key|secret', added_code, re.IGNORECASE):
        hints.append("Possible sensitive field in code — check logging (STD-009)")

    return hints

if __name__ == "__main__":
    import sys
    pr_number = int(sys.argv[1]) if len(sys.argv) > 1 else 95103
    print(f"Fetching diff for PR #{pr_number}...")
    diff = fetch_pr_diff(pr_number)
    chunks = parse_diff_into_chunks(diff)
    print(f"Parsed {len(chunks)} file chunks")
    for c in chunks[:3]:
        hints = extract_code_patterns(c["added_code"])
        print(f"\nFile: {c['file']}")
        print(f"Lines added: {len(c['added_code'].splitlines())}")
        if hints:
            print(f"Hints: {hints}")
