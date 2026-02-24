import os
import random
from datetime import datetime, timedelta
from elasticsearch import Elasticsearch, helpers
from dotenv import load_dotenv

load_dotenv()

# -----------------------------
# Elasticsearch (API key auth)
# -----------------------------
es = Elasticsearch(
    os.getenv("ELASTIC_ENDPOINT"),
    api_key=os.getenv("ELASTIC_API_KEY")
)

INDEX = "benchmark-timeseries"

# Real benchmark metric names from benchmarks.elastic.co
METRICS = [
    "indexing_throughput_docs_per_sec",
    "query_latency_p99_ms",
    "query_latency_p50_ms",
    "merge_time_ms",
    "gc_young_gen_ms",
    "heap_used_bytes",
    "segment_count",
    "refresh_time_ms"
]

# Map code modules to the benchmarks they affect
MODULE_TO_METRICS = {
    "server/src/main/java/org/elasticsearch/index/engine":
        ["indexing_throughput_docs_per_sec", "merge_time_ms", "segment_count"],
    "server/src/main/java/org/elasticsearch/search":
        ["query_latency_p99_ms", "query_latency_p50_ms"],
    "server/src/main/java/org/elasticsearch/index/shard":
        ["indexing_throughput_docs_per_sec", "refresh_time_ms", "heap_used_bytes"],
    "server/src/main/java/org/elasticsearch/cluster":
        ["query_latency_p99_ms", "gc_young_gen_ms"],
    "x-pack/plugin/security":
        ["query_latency_p99_ms", "query_latency_p50_ms"],
    "x-pack/plugin/ml":
        ["heap_used_bytes", "gc_young_gen_ms"],
    "server/src/main/java/org/elasticsearch/common/io":
        ["indexing_throughput_docs_per_sec", "merge_time_ms"]
}

# Realistic baseline values per metric
BASELINES = {
    "indexing_throughput_docs_per_sec": (45000, 55000),
    "query_latency_p99_ms":             (8,  15),
    "query_latency_p50_ms":             (2,  5),
    "merge_time_ms":                    (200, 400),
    "gc_young_gen_ms":                  (50,  150),
    "heap_used_bytes":                  (2_000_000_000, 3_000_000_000),
    "segment_count":                    (20, 40),
    "refresh_time_ms":                  (10, 30)
}

# PRs that historically caused regressions — used to make the data realistic
REGRESSION_EVENTS = [
    {"pr": 88901, "date": "2023-03-15", "module": "server/src/main/java/org/elasticsearch/index/engine",
     "metric": "merge_time_ms", "delta_pct": +18},
    {"pr": 91823, "date": "2023-05-20", "module": "server/src/main/java/org/elasticsearch/search",
     "metric": "query_latency_p99_ms", "delta_pct": -12},
    {"pr": 90580, "date": "2023-04-10", "module": "server/src/main/java/org/elasticsearch/index/shard",
     "metric": "indexing_throughput_docs_per_sec", "delta_pct": +8},
    {"pr": 84632, "date": "2022-12-01", "module": "server/src/main/java/org/elasticsearch/cluster",
     "metric": "gc_young_gen_ms", "delta_pct": +25},
    {"pr": 89234, "date": "2023-02-28", "module": "x-pack/plugin/ml",
     "metric": "heap_used_bytes", "delta_pct": +15}
]

def create_index():
    if es.indices.exists(index=INDEX):
        es.indices.delete(index=INDEX)

    es.indices.create(index=INDEX, body={
        "mappings": {
            "properties": {
                "timestamp":   { "type": "date" },
                "module":      { "type": "keyword" },
                "metric":      { "type": "keyword" },
                "value":       { "type": "double" },
                "pr_number":   { "type": "integer" },
                "git_sha":     { "type": "keyword" },
                "build_id":    { "type": "keyword" },
                "is_regression": { "type": "boolean" },
                "delta_pct":   { "type": "double" }
            }
        }
    })
    print(f"Created index: {INDEX}")

def generate_baseline_data():
    """Generate 180 days of nightly benchmark data per module per metric."""
    docs = []
    base_date = datetime.now() - timedelta(days=180)

    for module, metrics in MODULE_TO_METRICS.items():
        for metric in metrics:
            low, high = BASELINES[metric]
            prev_value = random.uniform(low, high)

            for day in range(180):
                timestamp = base_date + timedelta(days=day)

                # Natural drift of ±2% per day
                drift = random.uniform(-0.02, 0.02)
                value = prev_value * (1 + drift)
                value = max(low * 0.8, min(high * 1.2, value))

                # Check if a regression event lands on this day
                is_regression = False
                delta_pct     = 0.0
                pr_number     = None

                for event in REGRESSION_EVENTS:
                    event_date = datetime.strptime(event["date"], "%Y-%m-%d")
                    if (event["module"] == module and
                        event["metric"] == metric and
                        abs((timestamp - event_date).days) <= 1):
                        value        = prev_value * (1 + event["delta_pct"] / 100)
                        is_regression = event["delta_pct"] > 5
                        delta_pct    = event["delta_pct"]
                        pr_number    = event["pr"]

                docs.append({
                    "_index": INDEX,
                    "_id":    f"{module}-{metric}-{day}",
                    "_source": {
                        "timestamp":    timestamp.isoformat(),
                        "module":       module,
                        "metric":       metric,
                        "value":        round(value, 4),
                        "pr_number":    pr_number,
                        "git_sha":      f"abc{random.randint(10000,99999)}",
                        "build_id":     f"build-{day}",
                        "is_regression": is_regression,
                        "delta_pct":    round(delta_pct, 2)
                    }
                })
                prev_value = value

    return docs

if __name__ == "__main__":
    print("Creating benchmark time-series index...")
    create_index()

    print("Generating 180 days of benchmark data...")
    docs = generate_baseline_data()
    print(f"Generated {len(docs)} data points")

    success, errors = helpers.bulk(es, docs, raise_on_error=False)
    print(f"Indexed {success} benchmark records. Errors: {len(errors)}")