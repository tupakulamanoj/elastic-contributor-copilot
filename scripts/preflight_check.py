"""
Run this before recording your demo video.
Every check must pass before you start recording.
"""

import os
import sys
import requests
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

load_dotenv()

CHECKS_PASSED = []
CHECKS_FAILED = []

def build_es_client():
    cloud_id = os.getenv("ELASTIC_CLOUD_ID")
    endpoint = os.getenv("ELASTIC_ENDPOINT")
    api_key = os.getenv("ELASTIC_API_KEY")
    username = os.getenv("ELASTIC_USERNAME")
    password = os.getenv("ELASTIC_PASSWORD")

    if cloud_id and api_key:
        return Elasticsearch(cloud_id=cloud_id, api_key=api_key, request_timeout=30)
    if endpoint and api_key:
        return Elasticsearch(endpoint, api_key=api_key, request_timeout=30)
    return Elasticsearch(endpoint, basic_auth=(username, password), request_timeout=30)

def check(name, fn):
    try:
        result = fn()
        CHECKS_PASSED.append(name)
        print(f"  ✅  {name}: {result}")
    except Exception as e:
        CHECKS_FAILED.append(name)
        print(f"  ❌  {name}: {str(e)[:80]}")

def run_preflight():
    print("\n" + "="*60)
    print("PRE-FLIGHT CHECK — Elastic Contributor Co-pilot")
    print("="*60 + "\n")

    es = build_es_client()

    # Elasticsearch connectivity
    print("[ Elasticsearch ]")
    check("Cluster health",
        lambda: es.cluster.health()["status"])
    check("elastic-copilot-chunks index",
        lambda: f"{es.count(index='elastic-copilot-chunks')['count']} docs")
    check("elastic-coding-standards index",
        lambda: f"{es.count(index='elastic-coding-standards')['count']} docs")
    check("conflict-resolutions index",
        lambda: f"{es.count(index='conflict-resolutions')['count']} docs")
    check("benchmark-timeseries index",
        lambda: f"{es.count(index='benchmark-timeseries')['count']} docs")
    check("codeowners index",
        lambda: f"{es.count(index='codeowners')['count']} rules")

    # ELSER model
    print("\n[ ELSER Model ]")
    check("ELSER model deployed", lambda: (
        es.ml.get_trained_models_stats(
            model_id=".elser_model_2_linux-x86_64"
        )["trained_model_stats"][0]["deployment_stats"]["state"]
    ))

    # Ingest pipeline
    print("\n[ Ingest Pipeline ]")
    check("elser-copilot-pipeline exists", lambda: (
        "exists" if es.ingest.get_pipeline(
            id="elser-copilot-pipeline"
        ) else "missing"
    ))

    # Backend server
    print("\n[ Backend Server ]")
    check("API health endpoint running", lambda: (
        requests.get("http://localhost:8000/api/health", timeout=2).status_code
    ))
    check("Internal API /check-contributor", lambda: (
        requests.post("http://localhost:8000/internal/check-contributor",
            json={"username": "preflight-test", "pr_number": 0},
            timeout=5
        ).status_code
    ))

    # GitHub API
    print("\n[ GitHub API ]")
    gh_token = os.getenv("GITHUB_TOKEN")
    repo     = os.getenv("GITHUB_REPO")
    check("GitHub token valid", lambda: (
        requests.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {gh_token}"}
        ).json()["login"]
    ))
    check(f"Repo {repo} accessible", lambda: (
        requests.get(
            f"https://api.github.com/repos/{repo}",
            headers={"Authorization": f"token {gh_token}"}
        ).json()["full_name"]
    ))

    # Semantic search smoke test
    print("\n[ Semantic Search ]")
    check("Similarity query returns results", lambda: (
        f"{len(es.search(index='elastic-copilot-chunks', body={'size': 3, 'query': {'sparse_vector': {'field': 'body_embedding', 'inference_id': '.elser_model_2_linux-x86_64', 'query': 'memory leak shard recovery'}}})['hits']['hits'])} hits"
    ))

    # Final verdict
    print("\n" + "="*60)
    total = len(CHECKS_PASSED) + len(CHECKS_FAILED)
    print(f"RESULT: {len(CHECKS_PASSED)}/{total} checks passed")

    if CHECKS_FAILED:
        print(f"\nFailed checks (fix before recording):")
        for name in CHECKS_FAILED:
            print(f"  ✗  {name}")
        print("\n❌  NOT READY TO RECORD")
        sys.exit(1)
    else:
        print("\n✅  ALL SYSTEMS GO — Ready to record")
        sys.exit(0)

# Add health endpoint to Flask app
# Add this to webhook_listener.py:
# @app.route("/health")
# def health():
#     return jsonify({"status": "ok"})

if __name__ == "__main__":
    run_preflight()
