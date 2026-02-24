import os
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

load_dotenv()

es = Elasticsearch(
    os.getenv("ELASTIC_ENDPOINT"),
    api_key=os.getenv("ELASTIC_API_KEY")
)

# ❌ NO default_pipeline here
mapping = {
    "mappings": {
        "properties": {
            "id":         { "type": "keyword" },
            "type":       { "type": "keyword" },   # issue | pr | comment
            "title":      { "type": "text" },
            "body":       { "type": "text" },
            "author":     { "type": "keyword" },
            "labels":     { "type": "keyword" },
            "status":     { "type": "keyword" },
            "created_at": { "type": "date" },
            "updated_at": { "type": "date" },
            "url":        { "type": "keyword" },
            "number":     { "type": "integer" },
            "parent_id":  { "type": "keyword" }
        }
    }
}

index_name = "elastic-copilot"

if es.indices.exists(index=index_name):
    es.indices.delete(index=index_name)
    print(f"Deleted existing index: {index_name}")

es.indices.create(index=index_name, body=mapping)
print(f"Created index: {index_name}")
