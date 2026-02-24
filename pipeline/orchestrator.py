import os
import time
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Configure structured logging for the demo
logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers = [
        logging.StreamHandler(),
        logging.FileHandler(f"demo_run_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    ]
)
log = logging.getLogger("orchestrator")

from agents.agent1_context_retriever   import process_issue
from agents.agent2_architecture_critic import review_pr
from agents.agent3_impact_quantifier   import assess_pr_impact
from agents.agent4_conflict_resolver   import resolve_pr_conflicts
from pipeline.contributor_checker      import is_first_time_contributor
from tools.doc_linker                  import get_relevant_docs
from tools.welcome_composer            import compose_welcome_comment, compose_quality_report_comment

import requests

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO         = os.getenv("GITHUB_REPO")
HEADERS_GH   = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json"
}

# ----------------------------------------------------------------
# Result collector — everything gets stored here for metrics
# ----------------------------------------------------------------
class PipelineResult:
    def __init__(self, trigger_type, number):
        self.trigger_type     = trigger_type   # "issue" | "pr" | "conflict"
        self.number           = number
        self.started_at       = datetime.now()
        self.steps            = []
        self.errors           = []
        self.metrics          = {}
        self.final_status     = None

    def add_step(self, name, duration_ms, output_summary, success=True):
        self.steps.append({
            "step":         name,
            "duration_ms":  round(duration_ms),
            "success":      success,
            "summary":      output_summary
        })
        if not success:
            self.errors.append(name)

    def set_metric(self, key, value):
        self.metrics[key] = value

    def finish(self, status="success"):
        self.final_status  = status
        self.total_time_ms = (datetime.now() - self.started_at).total_seconds() * 1000
        return self

    def to_dict(self):
        return {
            "trigger_type":  self.trigger_type,
            "number":        self.number,
            "started_at":    self.started_at.isoformat(),
            "total_time_ms": round(getattr(self, "total_time_ms", 0)),
            "final_status":  self.final_status,
            "steps":         self.steps,
            "errors":        self.errors,
            "metrics":       self.metrics
        }

# ----------------------------------------------------------------
# Timer utility
# ----------------------------------------------------------------
class Timer:
    def __enter__(self):
        self.start = time.time()
        self.elapsed_ms = 0
        return self
    def __exit__(self, *args):
        self.elapsed_ms = (time.time() - self.start) * 1000

# ----------------------------------------------------------------
# Core pipeline functions
# ----------------------------------------------------------------

def run_issue_pipeline(issue_number):
    """
    Pipeline for a new GitHub Issue.
    Runs: Agent 1 (context retrieval + duplicate check)
    """
    result = PipelineResult("issue", issue_number)
    log.info(f"Starting issue pipeline for #{issue_number}")

    # Agent 1
    with Timer() as t:
        try:
            agent1_output = process_issue(issue_number, is_pr=False)
            result.add_step(
                "Agent 1: Context Retriever",
                t.elapsed_ms,
                _summarize(agent1_output),
                success=True
            )
            # Extract similarity score if available
            if agent1_output and "score" in str(agent1_output).lower():
                result.set_metric("top_similarity_score", _extract_score(agent1_output))
        except Exception as e:
            log.error(f"Agent 1 failed: {e}")
            result.add_step("Agent 1: Context Retriever", t.elapsed_ms, str(e), success=False)

    return result.finish()

def run_pr_pipeline(pr_number, username=None, pr_title=None, is_first_time=False):
    """
    Full pipeline for a new Pull Request.
    Runs: Agent 1 → Agent 2 → Agent 3 → Welcome Bot (if first-time)
    """
    result = PipelineResult("pr", pr_number)
    log.info(f"Starting PR pipeline for #{pr_number}")

    # Fetch PR metadata if not provided
    if not username or not pr_title:
        try:
            pr_data  = requests.get(
                f"https://api.github.com/repos/{REPO}/pulls/{pr_number}",
                headers=HEADERS_GH
            ).json()
            username  = username  or pr_data["user"]["login"]
            pr_title  = pr_title  or pr_data["title"]
        except Exception as e:
            log.warning(f"Could not fetch PR metadata: {e}")
            username = username or "unknown"
            pr_title = pr_title or f"PR #{pr_number}"

    # Agent 1 — Context Retriever
    agent1_output = None
    with Timer() as t:
        try:
            agent1_output = process_issue(pr_number, is_pr=True)
            result.add_step(
                "Agent 1: Context Retriever",
                t.elapsed_ms,
                _summarize(agent1_output),
                success=True
            )
        except Exception as e:
            log.error(f"Agent 1 failed: {e}")
            result.add_step("Agent 1: Context Retriever", t.elapsed_ms, str(e), success=False)

    # Agent 2 — Architecture Critic (receives Agent 1 context)
    agent2_output = None
    with Timer() as t:
        try:
            agent2_output = review_pr(pr_number, post_comment=True, prior_context=agent1_output)
            violations    = _count_violations(agent2_output)
            result.add_step(
                "Agent 2: Architecture Critic",
                t.elapsed_ms,
                f"{violations} violations flagged",
                success=True
            )
            result.set_metric("violations_flagged", violations)
        except Exception as e:
            log.error(f"Agent 2 failed: {e}")
            result.add_step("Agent 2: Architecture Critic", t.elapsed_ms, str(e), success=False)

    # Agent 3 — Impact Quantifier (receives Agent 1 + 2 context)
    prior_for_agent3 = ""
    if agent1_output:
        prior_for_agent3 += f"## Agent 1 (Context Retriever) Findings:\n{agent1_output[:800]}\n\n"
    if agent2_output:
        prior_for_agent3 += f"## Agent 2 (Architecture Critic) Findings:\n{agent2_output[:800]}\n"
    with Timer() as t:
        try:
            agent3_output = assess_pr_impact(pr_number, post_comment=True, prior_context=prior_for_agent3 or None)
            risk_level    = _extract_risk_level(agent3_output)
            result.add_step(
                "Agent 3: Impact Quantifier",
                t.elapsed_ms,
                f"Risk level: {risk_level}",
                success=True
            )
            result.set_metric("performance_risk_level", risk_level)
        except Exception as e:
            log.error(f"Agent 3 failed: {e}")
            result.add_step("Agent 3: Impact Quantifier", t.elapsed_ms, str(e), success=False)

    # Welcome Bot — First-Time Contributor
    if is_first_time:
        with Timer() as t:
            try:
                _run_welcome_bot(pr_number, username, pr_title)
                result.add_step(
                    "Welcome Bot",
                    t.elapsed_ms,
                    "Welcome comment + quality report posted",
                    success=True
                )
                result.set_metric("welcome_bot_triggered", True)
            except Exception as e:
                log.error(f"Welcome Bot failed: {e}")
                result.add_step("Welcome Bot", t.elapsed_ms, str(e), success=False)

    return result.finish()

def run_conflict_pipeline(pr_number):
    """
    Pipeline for conflict detection on a PR with reviewer disagreements.
    Runs: Agent 1 (context) → Agent 4 (Conflict Resolver)
    """
    result = PipelineResult("conflict", pr_number)
    log.info(f"Starting conflict pipeline for #{pr_number}")

    # Agent 1 — Context Retriever (gather context for Agent 4)
    agent1_output = None
    with Timer() as t:
        try:
            agent1_output = process_issue(pr_number, is_pr=True)
            result.add_step(
                "Agent 1: Context Retriever",
                t.elapsed_ms,
                _summarize(agent1_output),
                success=True
            )
        except Exception as e:
            log.error(f"Agent 1 failed: {e}")
            result.add_step("Agent 1: Context Retriever", t.elapsed_ms, str(e), success=False)

    # Agent 4 — Conflict Resolver (receives Agent 1 context)
    with Timer() as t:
        try:
            agent4_output  = resolve_pr_conflicts(pr_number, post_comment=True, prior_context=agent1_output)
            conflict_count = _count_conflicts(agent4_output)
            result.add_step(
                "Agent 4: Conflict Resolver",
                t.elapsed_ms,
                f"{conflict_count} conflicts resolved",
                success=True
            )
            result.set_metric("conflicts_resolved", conflict_count)
        except Exception as e:
            log.error(f"Agent 4 failed: {e}")
            result.add_step("Agent 4: Conflict Resolver", t.elapsed_ms, str(e), success=False)

    return result.finish()

# ----------------------------------------------------------------
# Internal helpers
# ----------------------------------------------------------------

def _run_welcome_bot(pr_number, username, pr_title):
    base = "http://localhost:8000"
    context = requests.post(f"{base}/internal/get-pr-context",
        json={"pr_number": pr_number}).json()
    requests.post(f"{base}/internal/post-welcome", json={
        "pr_number":      pr_number,
        "username":       username,
        "pr_title":       pr_title,
        "similar_issues": context.get("similar_issues", []),
        "code_owners":    context.get("code_owners", []),
        "relevant_docs":  context.get("relevant_docs", [])
    })

def _summarize(text, max_len=120):
    if not text:
        return "No output"
    text = str(text).strip().replace("\n", " ")
    return text[:max_len] + "..." if len(text) > max_len else text

def _extract_score(text):
    import re
    match = re.search(r"(\d+\.\d+)", str(text))
    return float(match.group(1)) if match else None

def _count_violations(text):
    if not text:
        return 0
    import re
    return len(re.findall(r"STD-\d+", str(text)))

def _extract_risk_level(text):
    if not text:
        return "UNKNOWN"
    for level in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        if level in str(text).upper():
            return level
    return "UNKNOWN"

def _count_conflicts(text):
    if not text:
        return 0
    import re
    return len(re.findall(r"Conflict \d+", str(text)))

# ----------------------------------------------------------------
# Save results to disk
# ----------------------------------------------------------------

def save_result(result):
    path = f"results/run_{result.trigger_type}_{result.number}.json"
    os.makedirs("results", exist_ok=True)
    with open(path, "w") as f:
        json.dump(result.to_dict(), f, indent=2, default=str)
    log.info(f"Result saved to {path}")
    return path

if __name__ == "__main__":
    import sys
    mode   = sys.argv[1] if len(sys.argv) > 1 else "pr"
    number = int(sys.argv[2]) if len(sys.argv) > 2 else 95103

    if mode == "issue":
        result = run_issue_pipeline(number)
    elif mode == "conflict":
        result = run_conflict_pipeline(number)
    else:
        result = run_pr_pipeline(number, is_first_time="--first-time" in sys.argv)

    save_result(result)
    print(json.dumps(result.to_dict(), indent=2, default=str))