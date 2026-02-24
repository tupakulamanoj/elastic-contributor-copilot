"""
Runs the pipeline against a batch of real issues and PRs
and collects the metrics you need for the essay.

Usage:
  python metrics_collector.py
"""

import os
import json
import time
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

load_dotenv()

es = Elasticsearch(
    os.getenv("ELASTIC_ENDPOINT"),
    api_key=os.getenv("ELASTIC_API_KEY")
)

def collect_index_stats():
    """How much data did we index?"""
    stats = {}
    for index in [
        "elastic-copilot",
        "elastic-copilot-chunks",
        "elastic-coding-standards",
        "conflict-resolutions",
        "benchmark-timeseries",
        "codeowners",
        "contributor-history"
    ]:
        try:
            count = es.count(index=index)["count"]
            stats[index] = count
        except Exception:
            stats[index] = 0
    return stats

def collect_similarity_scores(sample_queries):
    """
    Run a set of sample queries and collect the top similarity scores.
    This proves your vector search is finding relevant results.
    """
    scores = []
    for query in sample_queries:
        try:
            result = es.search(
                index="elastic-copilot-chunks",
                body={
                    "size": 3,
                    "query": {
                        "sparse_vector": {
                            "field":        "body_embedding",
                            "inference_id": ".elser_model_2_linux-x86_64",
                            "query":        query
                        }
                    },
                    "_source": ["title", "number", "type"]
                }
            )
            hits = result["hits"]["hits"]
            if hits:
                top_score = hits[0]["_score"]
                scores.append({
                    "query":     query,
                    "top_score": round(top_score, 4),
                    "top_result": hits[0]["_source"].get("title", "")[:60],
                    "results_found": len(hits)
                })
        except Exception as e:
            print(f"Search failed for query '{query}': {e}")

    return scores

def collect_standards_coverage():
    """How many standards do we have per category and severity?"""
    result = es.search(
        index="elastic-coding-standards",
        body={
            "size": 0,
            "aggs": {
                "by_severity": {
                    "terms": {"field": "severity"}
                },
                "by_category": {
                    "terms": {"field": "category"}
                }
            }
        }
    )
    return {
        "by_severity": {
            b["key"]: b["doc_count"]
            for b in result["aggregations"]["by_severity"]["buckets"]
        },
        "by_category": {
            b["key"]: b["doc_count"]
            for b in result["aggregations"]["by_category"]["buckets"]
        }
    }

def collect_regression_history_stats():
    """How many historical regressions are in the benchmark data?"""
    result = es.search(
        index="benchmark-timeseries",
        body={
            "size": 0,
            "query": {"term": {"is_regression": True}},
            "aggs": {
                "by_module": {
                    "terms": {"field": "module"}
                },
                "avg_delta": {
                    "avg": {"field": "delta_pct"}
                },
                "max_delta": {
                    "max": {"field": "delta_pct"}
                }
            }
        }
    )
    aggs = result["aggregations"]
    return {
        "total_regressions": result["hits"]["total"]["value"],
        "avg_delta_pct":     round(aggs["avg_delta"]["value"] or 0, 2),
        "max_delta_pct":     round(aggs["max_delta"]["value"] or 0, 2),
        "modules_affected":  len(aggs["by_module"]["buckets"])
    }

def collect_codeowners_coverage():
    """How many CODEOWNERS rules are indexed?"""
    try:
        count = es.count(index="codeowners")["count"]
        sample = es.search(
            index="codeowners",
            body={"size": 3, "query": {"match_all": {}}}
        )
        unique_owners = set()
        for hit in sample["hits"]["hits"]:
            for owner in hit["_source"].get("owners", []):
                unique_owners.add(owner)
        return {"rules": count, "sample_unique_owners": len(unique_owners)}
    except Exception:
        return {"rules": 0}

def run_all_metrics():
    print("Collecting metrics...\n")
    report = {}

    print("[1/5] Index statistics...")
    report["index_stats"] = collect_index_stats()

    print("[2/5] Similarity search quality...")
    sample_queries = [
        "memory leak in shard recovery",
        "stream api vs for loop performance",
        "authentication token expiry",
        "backwards compatibility serialization",
        "thread pool starvation async",
        "null pointer exception in search",
        "cluster state observer vs polling",
        "optional isPresent anti-pattern"
    ]
    report["similarity_scores"] = collect_similarity_scores(sample_queries)

    print("[3/5] Coding standards coverage...")
    report["standards_coverage"] = collect_standards_coverage()

    print("[4/5] Benchmark regression history...")
    report["regression_stats"] = collect_regression_history_stats()

    print("[5/5] CODEOWNERS coverage...")
    report["codeowners"] = collect_codeowners_coverage()

    # Compute summary numbers for the essay
    scores     = [s["top_score"] for s in report["similarity_scores"] if "top_score" in s]
    avg_score  = round(sum(scores) / len(scores), 4) if scores else 0
    high_conf  = len([s for s in scores if s > 1.5])

    report["essay_numbers"] = {
        "total_documents_indexed":       sum(report["index_stats"].values()),
        "avg_similarity_score":          avg_score,
        "high_confidence_matches":       f"{high_conf}/{len(scores)} queries",
        "coding_standards_total":        sum(report["standards_coverage"]["by_severity"].values()),
        "critical_standards":            report["standards_coverage"]["by_severity"].get("critical", 0),
        "benchmark_data_points":         report["index_stats"].get("benchmark-timeseries", 0),
        "historical_regressions_tracked": report["regression_stats"]["total_regressions"],
        "codeowners_rules_indexed":      report["codeowners"]["rules"],
        "conflict_resolutions_indexed":  report["index_stats"].get("conflict-resolutions", 0)
    }

    # Save to disk
    os.makedirs("results", exist_ok=True)
    with open("results/metrics_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "="*60)
    print("METRICS REPORT — Use these numbers in your essay")
    print("="*60)
    for key, value in report["essay_numbers"].items():
        print(f"  {key:<45} {value}")

    print("\nSimilarity Search Quality:")
    for item in report["similarity_scores"][:5]:
        print(f"  Score {item['top_score']:.4f} — '{item['query'][:40]}'")
        print(f"           → '{item['top_result'][:55]}'")

    print("\nFull report saved to: results/metrics_report.json")
    return report

if __name__ == "__main__":
    run_all_metrics()