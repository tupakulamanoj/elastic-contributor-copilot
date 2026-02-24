import os
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

load_dotenv()

# -----------------------------
# Elasticsearch (API key auth)
# -----------------------------
es = Elasticsearch(
    os.getenv("ELASTIC_ENDPOINT"),
    api_key=os.getenv("ELASTIC_API_KEY")
)

def semantic_search(query_text, doc_type=None, top_k=5):
    filter_clause = []
    if doc_type:
        filter_clause.append({"term": {"type": doc_type}})

    query = {
        "size": top_k,
        "query": {
            "bool": {
                "should": [
                    {
                        "sparse_vector": {
                            "field": "body_embedding",
                            "inference_id": ".elser_model_2_linux-x86_64",
                            "query": query_text
                        }
                    },
                    {
                        "sparse_vector": {
                            "field": "title_embedding",
                            "inference_id": ".elser_model_2_linux-x86_64",
                            "query": query_text
                        }
                    }
                ],
                "filter": filter_clause
            }
        },
        "_source": ["title", "url", "type", "author", "status", "number"]
    }

    resp = es.search(index="elastic-copilot-chunks", body=query)
    return resp["hits"]["hits"]


if __name__ == "__main__":
    tests = [
        ("memory leak in shard allocation", "issue"),
        ("Stream API vs for loop performance", "pr"),
        ("authentication token expiry bug", None),
    ]

    for query, doc_type in tests:
        print(f"\n[Search] Query: '{query}' (type filter: {doc_type})")
        results = semantic_search(query, doc_type)
        for r in results:
            src = r["_source"]
            print(f"  [{r['_score']:.3f}] #{src.get('number')} - {src.get('title', 'no title')[:80]}")
            print(f"           {src.get('url')}")
