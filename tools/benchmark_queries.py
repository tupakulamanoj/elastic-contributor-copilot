import os
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

load_dotenv()

es = Elasticsearch(
    os.getenv("ELASTIC_ENDPOINT"),
    api_key=os.getenv("ELASTIC_API_KEY")
)

def get_module_for_file(file_path):
    """Map a changed file path to its benchmark module."""
    MODULE_MAP = {
        "server/src/main/java/org/elasticsearch/index/engine":   "engine",
        "server/src/main/java/org/elasticsearch/search":         "search",
        "server/src/main/java/org/elasticsearch/index/shard":    "shard",
        "server/src/main/java/org/elasticsearch/cluster":        "cluster",
        "x-pack/plugin/security":                                "security",
        "x-pack/plugin/ml":                                      "ml",
        "server/src/main/java/org/elasticsearch/common/io":      "io"
    }
    for prefix, module in MODULE_MAP.items():
        if file_path.startswith(prefix):
            return prefix
    return None

def query_recent_baseline(module, days=30):
    """Get the rolling average and stddev for the last N days for a module."""
    query = f"""
    FROM benchmark-timeseries
    | WHERE module == "{module}"
    | WHERE timestamp >= NOW() - {days} days
    | STATS
        avg_value  = AVG(value),
        max_value  = MAX(value),
        min_value  = MIN(value),
        data_points = COUNT(*)
      BY metric
    | SORT metric ASC
    """
    resp = es.esql.query(body={"query": query})
    return resp

def query_regression_history(module):
    """Find past PRs that caused regressions in this module."""
    query = f"""
    FROM benchmark-timeseries
    | WHERE module == "{module}"
    | WHERE is_regression == true
    | KEEP timestamp, metric, delta_pct, pr_number, value
    | SORT timestamp DESC
    | LIMIT 10
    """
    resp = es.esql.query(body={"query": query})
    return resp

def query_metric_trend(module, metric, days=14):
    """Get day-by-day trend for a specific metric to detect drift."""
    query = f"""
    FROM benchmark-timeseries
    | WHERE module == "{module}" AND metric == "{metric}"
    | WHERE timestamp >= NOW() - {days} days
    | STATS daily_avg = AVG(value) BY DATE_TRUNC(1 day, timestamp)
    | SORT `DATE_TRUNC(1 day, timestamp)` ASC
    """
    resp = es.esql.query(body={"query": query})
    return resp

def assess_risk(module, changed_lines):
    """
    Simple risk scoring based on:
    - How volatile is this module historically?
    - How many lines changed?
    - Has this module regressed before?
    """
    baseline = query_recent_baseline(module)
    regressions = query_regression_history(module)

    regression_count = len(regressions.get("values", []))
    lines_risk = "high" if changed_lines > 200 else "medium" if changed_lines > 50 else "low"

    if regression_count >= 3:
        history_risk = "high"
    elif regression_count >= 1:
        history_risk = "medium"
    else:
        history_risk = "low"

    risk_matrix = {
        ("high",   "high"):   "CRITICAL",
        ("high",   "medium"): "HIGH",
        ("high",   "low"):    "MEDIUM",
        ("medium", "high"):   "HIGH",
        ("medium", "medium"): "MEDIUM",
        ("medium", "low"):    "LOW",
        ("low",    "high"):   "MEDIUM",
        ("low",    "medium"): "LOW",
        ("low",    "low"):    "LOW"
    }

    overall_risk = risk_matrix.get((lines_risk, history_risk), "MEDIUM")

    return {
        "module":           module,
        "overall_risk":     overall_risk,
        "lines_risk":       lines_risk,
        "history_risk":     history_risk,
        "regression_count": regression_count,
        "baseline_data":    baseline,
        "regression_history": regressions
    }

if __name__ == "__main__":
    result = assess_risk(
        "server/src/main/java/org/elasticsearch/index/engine",
        changed_lines=150
    )
    print(f"Risk: {result['overall_risk']}")
    print(f"Past regressions: {result['regression_count']}")
