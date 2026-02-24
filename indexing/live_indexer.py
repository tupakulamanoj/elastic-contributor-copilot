import os
from datetime import datetime
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

load_dotenv()

ELASTIC_ENDPOINT = os.getenv("ELASTIC_ENDPOINT")
ELASTIC_API_KEY = os.getenv("ELASTIC_API_KEY")
ELASTIC_CLOUD_ID = os.getenv("ELASTIC_CLOUD_ID")

if ELASTIC_CLOUD_ID:
    es = Elasticsearch(cloud_id=ELASTIC_CLOUD_ID, api_key=ELASTIC_API_KEY, request_timeout=30)
elif ELASTIC_ENDPOINT:
    es = Elasticsearch(ELASTIC_ENDPOINT, api_key=ELASTIC_API_KEY, request_timeout=30)
else:
    es = None

INDEX       = "elastic-copilot"
CHUNK_INDEX = "elastic-copilot-chunks"

CHUNK_SIZE    = 400
CHUNK_OVERLAP = 50

def chunk_text(text):
    words  = text.split()
    chunks = []
    start  = 0
    while start < len(words):
        end = start + CHUNK_SIZE
        chunks.append(" ".join(words[start:end]))
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks

def index_issue(issue_data):
    """
    Index a raw GitHub issue or PR payload immediately.
    Called directly from the webhook handler.
    """
    is_pr  = "pull_request" in issue_data or issue_data.get("type") == "pr"
    doc_id = f"{'pr' if is_pr else 'issue'}-{issue_data['number']}"

    doc = {
        "id":         str(issue_data.get("id", issue_data["number"])),
        "type":       "pr" if is_pr else "issue",
        "title":      issue_data.get("title", ""),
        "body":       issue_data.get("body", "") or "",
        "author":     issue_data["user"]["login"],
        "labels":     [l["name"] for l in issue_data.get("labels", [])],
        "status":     issue_data.get("state", "open"),
        "created_at": issue_data.get("created_at"),
        "updated_at": issue_data.get("updated_at"),
        "url":        issue_data.get("html_url", ""),
        "number":     issue_data["number"],
        "indexed_at": datetime.utcnow().isoformat()
    }

    # Index the main document — pipeline auto-embeds it
    es.index(index=INDEX, id=doc_id, document=doc)

    # Index chunks for similarity search
    combined = f"{doc['title']} {doc['body']}".strip()
    if combined:
        chunks = chunk_text(combined)
        for i, chunk in enumerate(chunks):
            es.index(
                index=CHUNK_INDEX,
                id=f"{doc_id}-chunk-{i}",
                document={
                    "parent_doc_id": doc_id,
                    "chunk_index":   i,
                    "type":          doc["type"],
                    "author":        doc["author"],
                    "labels":        doc["labels"],
                    "status":        doc["status"],
                    "url":           doc["url"],
                    "number":        doc["number"],
                    "created_at":    doc["created_at"],
                    "title":         doc["title"],
                    "body":          chunk
                }
            )
    print(f"Indexed {doc['type']} #{doc['number']} in real time")

def index_comment(comment_data, issue_number):
    """Index a new review comment immediately."""
    doc_id = f"comment-{comment_data['id']}"
    es.index(
        index=INDEX,
        id=doc_id,
        document={
            "id":         str(comment_data["id"]),
            "type":       "comment",
            "body":       comment_data.get("body", "") or "",
            "author":     comment_data["user"]["login"],
            "created_at": comment_data.get("created_at"),
            "updated_at": comment_data.get("updated_at"),
            "url":        comment_data.get("html_url", ""),
            "parent_id":  f"issue-{issue_number}",
            "title":      "",
            "labels":     [],
            "status":     "",
            "number":     issue_number,
            "indexed_at": datetime.utcnow().isoformat()
        }
    )

def update_status(number, doc_type, new_status):
    """
    Update the status of an issue or PR when it is closed or merged.
    Called when webhook fires a 'closed' action.
    """
    doc_id = f"{doc_type}-{number}"
    try:
        es.update(
            index=INDEX,
            id=doc_id,
            body={"doc": {
                "status":     new_status,
                "updated_at": datetime.utcnow().isoformat()
            }}
        )
        # Also update all chunk documents for this parent
        es.update_by_query(
            index=CHUNK_INDEX,
            body={
                "query": {"term": {"parent_doc_id": doc_id}},
                "script": {
                    "source": f"ctx._source.status = '{new_status}'"
                }
            }
        )
        print(f"Updated {doc_type} #{number} status to {new_status}")
    except Exception as e:
        print(f"Status update failed for {doc_type} #{number}: {e}")


def delete_document(number, doc_type):
    """
    Permanently remove an issue/PR and its chunks from the index.
    Called when GitHub returns 404 (item truly deleted).
    """
    doc_id = f"{doc_type}-{number}"
    deleted_chunks = 0
    try:
        # Delete all associated chunks first
        resp = es.delete_by_query(
            index=CHUNK_INDEX,
            body={"query": {"term": {"parent_doc_id": doc_id}}},
            conflicts="proceed"
        )
        deleted_chunks = resp.get("deleted", 0)
    except Exception as e:
        print(f"Chunk cleanup for {doc_id} failed: {e}")

    try:
        es.delete(index=INDEX, id=doc_id, ignore=[404])
        print(f"Deleted {doc_type} #{number} from index ({deleted_chunks} chunks removed)")
    except Exception as e:
        print(f"Delete failed for {doc_type} #{number}: {e}")
