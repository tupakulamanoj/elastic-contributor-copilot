import os
import sys
import time
from elasticsearch import Elasticsearch, helpers
from dotenv import load_dotenv

# -----------------------------
# Environment
# -----------------------------
load_dotenv()

ELASTIC_ENDPOINT = os.getenv("ELASTIC_ENDPOINT")
ELASTIC_API_KEY  = os.getenv("ELASTIC_API_KEY")

INDEX       = "elastic-copilot"
CHUNK_INDEX = "elastic-copilot-chunks"

CHUNK_SIZE    = 400   # words
CHUNK_OVERLAP = 50
BULK_SIZE     = 500    # small batches — ELSER inference is slow

CHUNK_MAPPING = {
    "settings": {
        "default_pipeline": "elser-copilot-pipeline"
    },
    "mappings": {
        "properties": {
            "parent_doc_id":   { "type": "keyword" },
            "chunk_index":     { "type": "integer" },
            "type":            { "type": "keyword" },
            "title":           { "type": "text" },
            "body":            { "type": "text" },
            "body_embedding":  { "type": "sparse_vector" },
            "title_embedding": { "type": "sparse_vector" },
            "author":          { "type": "keyword" },
            "labels":          { "type": "keyword" },
            "status":          { "type": "keyword" },
            "url":             { "type": "keyword" },
            "number":          { "type": "integer" },
            "created_at":      { "type": "date" }
        }
    }
}

# -----------------------------
# Elasticsearch client
# -----------------------------
es = Elasticsearch(
    ELASTIC_ENDPOINT,
    api_key=ELASTIC_API_KEY,
    request_timeout=300
)

# -----------------------------
# Chunking logic
# -----------------------------
def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunks.append(" ".join(words[start:end]))
        start += chunk_size - overlap

    return chunks

# -----------------------------
# Fetch all source docs (scroll)
# -----------------------------
def fetch_all_docs():
    es.indices.refresh(index=INDEX)
    docs = []

    page = es.search(
        index=INDEX,
        body={
            "size": 1000,
            "query": {"match_all": {}}
        },
        scroll="5m"
    )

    scroll_id = page["_scroll_id"]
    hits = page["hits"]["hits"]

    while hits:
        docs.extend(hits)
        page = es.scroll(scroll_id=scroll_id, scroll="5m")
        scroll_id = page["_scroll_id"]
        hits = page["hits"]["hits"]

    return docs

# -----------------------------
# Get already-indexed chunk IDs
# -----------------------------
def get_existing_chunk_ids():
    if not es.indices.exists(index=CHUNK_INDEX):
        return set()

    ids = set()
    for doc in helpers.scan(es, index=CHUNK_INDEX, query={"query": {"match_all": {}}}, _source=False):
        ids.add(doc["_id"])
    return ids

# -----------------------------
# Build chunk documents (skip existing)
# -----------------------------
def build_chunk_docs(docs, existing_ids):
    skipped = 0
    generated = 0

    for doc in docs:
        src = doc["_source"]

        text = f"{src.get('title', '')} {src.get('body', '')}".strip()
        if not text:
            continue

        chunks = chunk_text(text)

        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc['_id']}-chunk-{i}"

            if chunk_id in existing_ids:
                skipped += 1
                continue

            generated += 1
            yield {
                "_index": CHUNK_INDEX,
                "_id": chunk_id,
                "_source": {
                    "parent_doc_id": doc["_id"],
                    "chunk_index": i,
                    "type": src.get("type"),
                    "author": src.get("author"),
                    "labels": src.get("labels", []),
                    "status": src.get("status"),
                    "url": src.get("url"),
                    "number": src.get("number"),
                    "created_at": src.get("created_at"),
                    "title": src.get("title", ""),
                    "body": chunk
                }
            }

    if skipped:
        print(f"  (skipped {skipped} already-indexed chunks)")

# -----------------------------
# Ensure chunk index exists
# -----------------------------
def ensure_chunk_index():
    if not es.indices.exists(index=CHUNK_INDEX):
        es.indices.create(index=CHUNK_INDEX, body=CHUNK_MAPPING)
        print("Created chunk index")
    else:
        print("Chunk index already exists (resuming)")

    # Clean up failed index
    failed = f"failed-{CHUNK_INDEX}"
    if es.indices.exists(index=failed):
        es.indices.delete(index=failed)
        print(f"Deleted {failed}")

# -----------------------------
# Main
# -----------------------------
if __name__ == "__main__":

    # Pass --reset to wipe and start fresh
    fresh = "--reset" in sys.argv

    print("Starting chunking + embedding")

    if fresh:
        print("  --reset flag: wiping chunk index")
        if es.indices.exists(index=CHUNK_INDEX):
            es.indices.delete(index=CHUNK_INDEX)

    ensure_chunk_index()

    print("Fetching source documents...")
    docs = fetch_all_docs()
    print(f"Found {len(docs)} source documents")

    print("Checking already-indexed chunks...")
    existing_ids = get_existing_chunk_ids()
    print(f"Already indexed: {len(existing_ids)} chunks")

    print("Chunking + embedding (this will take a while)...")
    success = 0
    errors = 0

    for ok, info in helpers.streaming_bulk(
        es,
        build_chunk_docs(docs, existing_ids),
        chunk_size=BULK_SIZE,
        raise_on_error=False,
        raise_on_exception=False,
        max_retries=3,
        initial_backoff=10,
        max_backoff=60,
        request_timeout=300
    ):
        if ok:
            success += 1
        else:
            errors += 1

        if (success + errors) % 100 == 0:
            print(f"  progress: {success} ok / {errors} err", flush=True)

    print(f"\nDone! Indexed {success} chunks. Errors: {errors}")
    print(f"Total in index: {es.count(index=CHUNK_INDEX)['count']}")

