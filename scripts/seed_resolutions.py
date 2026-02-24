import os
from elasticsearch import Elasticsearch, helpers
from dotenv import load_dotenv

load_dotenv()
es = Elasticsearch(
    os.getenv("ELASTIC_ENDPOINT"),
    api_key=os.getenv("ELASTIC_API_KEY"),
    request_timeout=300
)

INDEX = "conflict-resolutions"

RESOLUTIONS = [
    {
        "id": "RES-001",
        "topic": "streams vs loops",
        "conflict_summary": "One reviewer preferred Stream API, another preferred for loops for clarity",
        "resolution": "Stream API won",
        "reasoning": (
            "Elastic's coding standards (STD-001) explicitly prefer the Stream API for collection "
            "transforms. In this PR the maintainer @dakrone cited memory efficiency and consistency "
            "with the rest of the codebase. The for-loop suggestion was declined with a reference "
            "to the contributing guide section on collection handling."
        ),
        "winning_approach": "Stream API",
        "pr_url": "https://github.com/elastic/elasticsearch/pull/91823",
        "decided_by": "dakrone",
        "date": "2023-05-20",
        "tags": ["java", "style", "collections"]
    },
    {
        "id": "RES-002",
        "topic": "async primitive",
        "conflict_summary": "Reviewer A wanted CompletableFuture, reviewer B insisted on ActionListener",
        "resolution": "ActionListener won",
        "reasoning": (
            "CompletableFuture was rejected because it doesn't integrate with Elasticsearch's "
            "thread pool model and can cause thread starvation. ActionListener is the canonical "
            "async primitive in the server codebase. The exception is bridging code that interfaces "
            "with external Java APIs that require futures — in that case ListenableFuture is acceptable."
        ),
        "winning_approach": "ActionListener",
        "pr_url": "https://github.com/elastic/elasticsearch/pull/90580",
        "decided_by": "original-brownies",
        "date": "2023-04-10",
        "tags": ["java", "async", "concurrency"]
    },
    {
        "id": "RES-003",
        "topic": "null handling",
        "conflict_summary": "One reviewer wanted Optional<T>, another argued null checks are clearer",
        "resolution": "Context-dependent: Optional for return types, null checks for internal state",
        "reasoning": (
            "The team reached a nuanced resolution: Optional is preferred for public API return types "
            "where absence of a value is a valid documented outcome. For internal private methods and "
            "fields, null checks with Objects.requireNonNull() are acceptable. The key principle is "
            "that Optional should never be used as a method parameter."
        ),
        "winning_approach": "Context-dependent",
        "pr_url": "https://github.com/elastic/elasticsearch/pull/88234",
        "decided_by": "jimczi",
        "date": "2023-01-15",
        "tags": ["java", "style", "null-handling"]
    },
    {
        "id": "RES-004",
        "topic": "abstraction type",
        "conflict_summary": "Reviewer wanted an interface, other reviewer wanted abstract class",
        "resolution": "Interface won with a default method compromise",
        "reasoning": (
            "Elasticsearch prefers interfaces over abstract classes for extensibility. Abstract "
            "classes lock the hierarchy and make testing harder because you cannot mock them as "
            "easily. The compromise was to use an interface with a default method for the shared "
            "behavior that the abstract class would have provided, giving flexibility without "
            "forcing a concrete base class."
        ),
        "winning_approach": "Interface with default methods",
        "pr_url": "https://github.com/elastic/elasticsearch/pull/87901",
        "decided_by": "elasticmachine",
        "date": "2022-11-30",
        "tags": ["java", "design", "abstraction"]
    },
    {
        "id": "RES-005",
        "topic": "error strategy",
        "conflict_summary": "One reviewer said throw exception, another said return Optional.empty()",
        "resolution": "Exception for unexpected states, Optional for expected absence",
        "reasoning": (
            "The resolution followed Elastic's principle that exceptions signal programmer errors "
            "or unexpected system states, while Optional signals expected absence of a value. "
            "If the calling code can reasonably expect a value to sometimes not be present, "
            "return Optional. If missing value means something went wrong, throw an exception "
            "with a clear message that includes contextual information for debugging."
        ),
        "winning_approach": "Exception for unexpected, Optional for expected absence",
        "pr_url": "https://github.com/elastic/elasticsearch/pull/86102",
        "decided_by": "henningandersen",
        "date": "2022-10-05",
        "tags": ["java", "error-handling", "design"]
    },
    {
        "id": "RES-006",
        "topic": "sync vs async",
        "conflict_summary": "Reviewer wanted synchronous implementation for simplicity, other wanted async",
        "resolution": "Async won for any network or disk I/O, sync acceptable for pure computation",
        "reasoning": (
            "Any operation involving network calls, disk reads, or waiting on external resources "
            "must be async in Elasticsearch to avoid blocking the transport thread pool. Synchronous "
            "code is only acceptable for pure in-memory computation with bounded time. The rule of "
            "thumb used: if the operation could take more than 1ms, it should be async."
        ),
        "winning_approach": "Async for I/O, sync for pure computation",
        "pr_url": "https://github.com/elastic/elasticsearch/pull/89445",
        "decided_by": "DaveCTurner",
        "date": "2023-02-20",
        "tags": ["java", "async", "architecture"]
    },
    {
        "id": "RES-007",
        "topic": "test base class",
        "conflict_summary": "New contributor used JUnit directly, reviewer requested ESTestCase",
        "resolution": "ESTestCase required, no exceptions for server module",
        "reasoning": (
            "ESTestCase is mandatory for all tests in the server module. It provides randomized "
            "test seeds via the Lucene test framework which catches flaky tests that plain JUnit "
            "would miss. The only exception is modules that are completely independent of "
            "Elasticsearch core, such as standalone utility libraries. For the server module "
            "this is a hard requirement enforced by the build system."
        ),
        "winning_approach": "ESTestCase mandatory",
        "pr_url": "https://github.com/elastic/elasticsearch/pull/95103",
        "decided_by": "rjernst",
        "date": "2023-08-10",
        "tags": ["java", "testing", "standards"]
    },
    {
        "id": "RES-008",
        "topic": "concurrency primitive",
        "conflict_summary": "Reviewer A wanted synchronized block, reviewer B wanted AtomicReference",
        "resolution": "AtomicReference won for simple state, synchronized for compound operations",
        "reasoning": (
            "AtomicReference and atomic classes are preferred for single-variable state because "
            "they have lower overhead than synchronized blocks. However, synchronized is required "
            "when multiple variables must be updated atomically as a unit. The guiding question "
            "is: does the correctness of the update depend on reading multiple variables together? "
            "If yes, use synchronized. If it is a single variable, use an atomic."
        ),
        "winning_approach": "Atomic for single variable, synchronized for compound",
        "pr_url": "https://github.com/elastic/elasticsearch/pull/84921",
        "decided_by": "jpountz",
        "date": "2022-12-15",
        "tags": ["java", "concurrency", "threading"]
    }
]

def create_index():
    if es.indices.exists(index=INDEX):
        es.indices.delete(index=INDEX)

    es.indices.create(index=INDEX, body={
        "settings": {
            "default_pipeline": "elser-copilot-pipeline"
        },
        "mappings": {
            "properties": {
                "id":               { "type": "keyword" },
                "topic":            { "type": "keyword" },
                "conflict_summary": { "type": "text" },
                "resolution":       { "type": "text" },
                "reasoning":        { "type": "text" },
                "body":             { "type": "text" },
                "body_embedding":   { "type": "sparse_vector" },
                "title_embedding":  { "type": "sparse_vector" },
                "winning_approach": { "type": "text" },
                "pr_url":           { "type": "keyword" },
                "decided_by":       { "type": "keyword" },
                "date":             { "type": "date" },
                "tags":             { "type": "keyword" }
            }
        }
    })
    print(f"Created index: {INDEX}")

def build_docs():
    docs = []
    for res in RESOLUTIONS:
        combined = (
            f"{res['topic']}. "
            f"{res['conflict_summary']}. "
            f"Resolution: {res['resolution']}. "
            f"Reasoning: {res['reasoning']}"
        )
        docs.append({
            "_index": INDEX,
            "_id":    res["id"],
            "_source": {
                **res,
                "body":  combined,
                "title": res["conflict_summary"]
            }
        })
    return docs

if __name__ == "__main__":
    print("Creating resolutions index...")
    create_index()

    print("Seeding resolution history...")
    docs    = build_docs()
    success, errors = helpers.bulk(es, docs, chunk_size=5, raise_on_error=False)
    print(f"Indexed {success} resolutions. Errors: {len(errors)}")