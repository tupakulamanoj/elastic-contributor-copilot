import os
import requests
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

load_dotenv()

es = Elasticsearch(
    os.getenv("ELASTIC_ENDPOINT"),
    api_key=os.getenv("ELASTIC_API_KEY")
)

# Curated map of module paths to relevant documentation
# These are real Elastic docs URLs
MODULE_DOCS = {
    "server/src/main/java/org/elasticsearch/index/engine": [
        {
            "title": "Engine Internals — Developer Guide",
            "url":   "https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-translog.html",
            "why":   "You are touching the engine layer. Understand translog and segment lifecycle first."
        },
        {
            "title": "Lucene Index Writer Best Practices",
            "url":   "https://lucene.apache.org/core/9_0_0/core/org/apache/lucene/index/IndexWriter.html",
            "why":   "Engine changes often interact with Lucene's IndexWriter directly."
        }
    ],
    "server/src/main/java/org/elasticsearch/search": [
        {
            "title": "Search Internals — Query Execution",
            "url":   "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-your-data.html",
            "why":   "Understand how queries are distributed across shards before modifying search code."
        }
    ],
    "server/src/main/java/org/elasticsearch/cluster": [
        {
            "title": "Cluster State Management",
            "url":   "https://www.elastic.co/guide/en/elasticsearch/reference/current/cluster.html",
            "why":   "Cluster state changes are sensitive. Read the cluster module docs carefully."
        },
        {
            "title": "Cluster coordination design doc",
            "url":   "https://github.com/elastic/elasticsearch/blob/main/docs/internal/ClusterCoordination.md",
            "why":   "The internal design doc explains the raft-based coordination model used here."
        }
    ],
    "x-pack/plugin/security": [
        {
            "title": "Security Plugin Architecture",
            "url":   "https://www.elastic.co/guide/en/elasticsearch/reference/current/secure-cluster.html",
            "why":   "Security changes require understanding the authentication/authorization pipeline."
        }
    ],
    "x-pack/plugin/ml": [
        {
            "title": "Machine Learning APIs",
            "url":   "https://www.elastic.co/guide/en/elasticsearch/reference/current/ml-apis.html",
            "why":   "ML plugin changes should align with the documented ML API contracts."
        }
    ]
}

# Universal docs every contributor should read
UNIVERSAL_DOCS = [
    {
        "title": "Contributing to Elasticsearch",
        "url":   "https://github.com/elastic/elasticsearch/blob/main/CONTRIBUTING.md",
        "why":   "Start here. Covers the full contribution workflow and coding standards."
    },
    {
        "title": "Elasticsearch Developer Guide",
        "url":   "https://github.com/elastic/elasticsearch/blob/main/DEVELOPER_GUIDE.md",
        "why":   "How to build, test, and run Elasticsearch locally."
    },
    {
        "title": "Elastic Coding Style Guide",
        "url":   "https://github.com/elastic/elasticsearch/blob/main/buildSrc/src/main/resources/checkstyle.xml",
        "why":   "The checkstyle config is the authoritative style reference."
    }
]

def get_relevant_docs(file_paths):
    """
    Given a list of changed file paths, return relevant documentation links.
    Always includes universal docs, plus module-specific docs.
    """
    relevant = list(UNIVERSAL_DOCS)
    seen_urls = {d["url"] for d in UNIVERSAL_DOCS}

    for file_path in file_paths:
        for module_prefix, docs in MODULE_DOCS.items():
            if file_path.startswith(module_prefix):
                for doc in docs:
                    if doc["url"] not in seen_urls:
                        relevant.append(doc)
                        seen_urls.add(doc["url"])

    return relevant

def format_docs_for_comment(docs):
    lines = []
    for doc in docs:
        lines.append(f"- **[{doc['title']}]({doc['url']})** — {doc['why']}")
    return "\n".join(lines)

if __name__ == "__main__":
    test_files = [
        "server/src/main/java/org/elasticsearch/index/engine/Engine.java",
        "x-pack/plugin/security/src/main/java/org/elasticsearch/xpack/security/Auth.java"
    ]
    docs = get_relevant_docs(test_files)
    print(format_docs_for_comment(docs))