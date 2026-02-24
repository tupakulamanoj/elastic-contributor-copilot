import os
import requests
from dotenv import load_dotenv
from tools.diff_parser import fetch_pr_diff, parse_diff_into_chunks
from tools.benchmark_queries import get_module_for_file, assess_risk

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

def build_impact_prompt(pr_number, file_chunks, risk_assessments, prior_context=None):
    prompt = f"Performance Impact Assessment for PR #{pr_number}\n\n"
    prompt += f"Changed Files: {len(file_chunks)}\n"
    prompt += f"Modules Affected: {len(risk_assessments)}\n\n"

    if prior_context:
        prompt += f"""---
Context from Prior Agent Analysis:
{prior_context[:2000]}

Use the above context to enrich your assessment. If architectural violations
were flagged, factor them into the risk level. If similar past issues caused
regressions, highlight the correlation.
---\n\n"""

    for assessment in risk_assessments:
        module = assessment["module"]
        risk   = assessment["overall_risk"]
        reg_count = assessment["regression_count"]

        prompt += f"""
Module: {module}
Overall Risk: {risk}
Lines Risk: {assessment['lines_risk']}
Historical Regression Count: {reg_count}
"""
        if reg_count > 0:
            prompt += "Past Regressions:\n"
            values = assessment["regression_history"].get("values", [])
            for row in values[:3]:
                prompt += f"  - PR #{row[3]}: {row[1]} delta {row[2]:+.1f}% on {row[0][:10]}\n"

    prompt += """
Using the benchmark tools available to you:
1. Query the 30-day baseline for each affected module
2. Identify which metrics are most at risk based on what changed
3. Check for similar past regressions
4. Return a structured impact report with risk level and recommended actions
"""
    return prompt.strip()

def assess_pr_impact(pr_number, post_comment=False, prior_context=None):
    print(f"\n{'='*60}")
    print(f"Impact Quantifier assessing PR #{pr_number}")
    print('='*60)

    diff   = fetch_pr_diff(pr_number)
    chunks = parse_diff_into_chunks(diff)

    # Map files to modules and assess risk
    risk_assessments = []
    seen_modules     = set()

    for chunk in chunks:
        module = get_module_for_file(chunk["file"])
        if module and module not in seen_modules:
            seen_modules.add(module)
            lines = len(chunk["added_code"].splitlines())
            risk  = assess_risk(module, lines)
            risk_assessments.append(risk)
            print(f"Module: {module} → Risk: {risk['overall_risk']}")

    if not risk_assessments:
        msg = "No performance-sensitive modules found in this PR. No benchmark impact predicted."
        print(msg)
        return msg

    prompt   = build_impact_prompt(pr_number, chunks, risk_assessments, prior_context=prior_context)
    response = call_agent(prompt)
    # Extract clean message: API returns {"response": {"message": "..."}, "steps": [...]}
    if "response" in response and isinstance(response["response"], dict):
        result = response["response"].get("message", "")
    elif "response" in response and isinstance(response["response"], str):
        result = response["response"]
    else:
        result = response.get("message", str(response))

    print("\n--- Impact Quantifier Report ---")
    print(result)

    if post_comment:
        post_github_comment(pr_number, result)

    return result

def post_github_comment(pr_number, content):
    body = f"""## 📊 Elastic Co-pilot — Performance Impact Assessment

{content}

---
*Based on 180 days of benchmark history. Data sourced from Elasticsearch benchmark pipeline.*
"""
    url  = f"https://api.github.com/repos/{REPO}/issues/{pr_number}/comments"
    resp = requests.post(url, headers=HEADERS_GH, json={"body": body})
    resp.raise_for_status()
    print(f"Posted impact comment to PR #{pr_number}")

if __name__ == "__main__":
    import sys
    pr_number    = int(sys.argv[1]) if len(sys.argv) > 1 else 95103
    post_comment = "--post" in sys.argv
    assess_pr_impact(pr_number, post_comment=post_comment)