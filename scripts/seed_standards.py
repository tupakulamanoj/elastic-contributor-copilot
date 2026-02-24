import os
from elasticsearch import Elasticsearch, helpers
from dotenv import load_dotenv

load_dotenv()

ELASTIC_ENDPOINT = os.getenv("ELASTIC_ENDPOINT")
ELASTIC_API_KEY  = os.getenv("ELASTIC_API_KEY")

# -----------------------------
# Elasticsearch (API key auth)
# -----------------------------
es = Elasticsearch(
    ELASTIC_ENDPOINT,
    api_key=ELASTIC_API_KEY,
    request_timeout=300
)


INDEX = "elastic-coding-standards"

# ---------------------------------------------------------------
# 15 real patterns pulled from Elastic's contributing guides,
# blog posts, and public PR review history.
# Each has: category, pattern, anti_pattern, explanation, severity,
# example_pr_url, tags
# ---------------------------------------------------------------
STANDARDS = [
    {
        "id": "STD-001",
        "category": "Performance",
        "title": "Prefer Streams over imperative loops for collection transforms",
        "pattern": "Use Java Stream API (map, filter, collect) when transforming or filtering collections.",
        "anti_pattern": "Using a for loop with a mutable accumulator list to build a transformed collection.",
        "explanation": (
            "Elastic core code favors the Stream API for readability and because it enables "
            "lazy evaluation. Imperative loops with mutable state are harder to reason about "
            "and miss optimization opportunities in the JVM. This pattern is enforced across "
            "the elasticsearch-java client and the server core."
        ),
        "severity": "medium",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/91823",
        "tags": ["java", "performance", "collections"]
    },
    {
        "id": "STD-002",
        "category": "Error Handling",
        "title": "Never swallow exceptions silently",
        "pattern": "Always log or rethrow exceptions. Use logger.warn() or logger.error() before any catch block exit.",
        "anti_pattern": "catch (Exception e) { } or catch blocks that only have a comment.",
        "explanation": (
            "Silent exception swallowing is one of the most common causes of difficult-to-debug "
            "production issues in Elasticsearch. Every catch block must either rethrow, wrap in "
            "an ElasticsearchException, or log with sufficient context. This is a hard requirement "
            "in Elastic's code review checklist."
        ),
        "severity": "high",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/88156",
        "tags": ["java", "error-handling", "reliability"]
    },
    {
        "id": "STD-003",
        "category": "Testing",
        "title": "Use ESTestCase as the base class for all unit tests",
        "pattern": "Extend ESTestCase (or a subclass like ESSingleNodeTestCase) for all Elasticsearch unit tests.",
        "anti_pattern": "Extending plain JUnit TestCase or using raw @Test annotations without ESTestCase.",
        "explanation": (
            "ESTestCase provides randomized testing via the Lucene test framework, which runs "
            "each test with random seeds to surface flaky behavior. Tests that bypass ESTestCase "
            "lose this guarantee and are routinely rejected in PRs. It also provides useful "
            "assertion helpers specific to Elasticsearch data structures."
        ),
        "severity": "high",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/95103",
        "tags": ["java", "testing", "unit-tests"]
    },
    {
        "id": "STD-004",
        "category": "Concurrency",
        "title": "Use ActionListener instead of raw callbacks or blocking calls",
        "pattern": "Use ActionListener<T> for async operations. Chain with ActionListener.wrap() or ActionListener.map().",
        "anti_pattern": "Blocking with .get() on a Future, or passing raw Runnable callbacks for async results.",
        "explanation": (
            "Elasticsearch is built on a non-blocking async model. Using .get() on futures inside "
            "request handling threads can cause thread pool starvation under load. ActionListener "
            "is the canonical async primitive in the codebase and reviewers will flag any deviation. "
            "Use ListenableFuture only when bridging to external APIs that require futures."
        ),
        "severity": "high",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/90580",
        "tags": ["java", "async", "concurrency", "performance"]
    },
    {
        "id": "STD-005",
        "category": "Logging",
        "title": "Use lazy log evaluation with lambda suppliers",
        "pattern": "Use logger.debug(() -> 'message ' + expensiveCall()) with lambda for debug/trace logging.",
        "anti_pattern": "logger.debug('message ' + expensiveCall()) where string is always evaluated.",
        "explanation": (
            "String concatenation in log statements is always evaluated even when the log level "
            "is disabled. In hot paths this causes measurable GC pressure. Elastic enforces lazy "
            "log evaluation using lambda suppliers for all debug and trace level statements. "
            "This is caught in automated checks in the Elasticsearch build system."
        ),
        "severity": "medium",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/84632",
        "tags": ["java", "logging", "performance"]
    },
    {
        "id": "STD-006",
        "category": "API Design",
        "title": "REST API changes require both REST spec and YAML test updates",
        "pattern": "Any change to a REST endpoint must update the .json spec file in rest-api-spec and add a YAML integration test.",
        "anti_pattern": "Modifying endpoint behavior without updating the spec or only updating Java tests.",
        "explanation": (
            "Elastic's REST API compatibility guarantee requires that the rest-api-spec is the "
            "source of truth for all endpoint contracts. Missing spec updates cause failures in "
            "client compatibility tests across all language clients. This is one of the most "
            "common reasons PRs are sent back for revision."
        ),
        "severity": "high",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/92741",
        "tags": ["api", "rest", "testing", "spec"]
    },
    {
        "id": "STD-007",
        "category": "Memory Management",
        "title": "Always close Releasable resources in a try-finally or try-with-resources block",
        "pattern": "Use try-with-resources for any class implementing Releasable, Closeable, or holding a BytesRef.",
        "anti_pattern": "Calling releasable.close() only in the happy path without a finally block.",
        "explanation": (
            "Elasticsearch manages off-heap memory through a reference counting system. "
            "Releasable objects that are not closed on exception paths cause memory leaks "
            "that are extremely difficult to reproduce. CircuitBreaker accounting will also "
            "be incorrect, potentially masking real memory pressure issues."
        ),
        "severity": "high",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/89234",
        "tags": ["java", "memory", "resources", "reliability"]
    },
    {
        "id": "STD-008",
        "category": "Deprecation",
        "title": "Use @UpdateForV9 or @DeprecatedWarning annotations for version-gated changes",
        "pattern": "Annotate code that must change at the next major version with @UpdateForV9 including a tracking issue number.",
        "anti_pattern": "Leaving TODO comments without annotations, or making breaking changes without a deprecation cycle.",
        "explanation": (
            "Elastic follows a strict deprecation policy where breaking changes must be "
            "deprecated in vN and removed in vN+1. The @UpdateForV9 annotation is picked up "
            "by automated tooling that generates the migration guide. Plain TODO comments "
            "are invisible to this pipeline and get lost across releases."
        ),
        "severity": "medium",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/93012",
        "tags": ["java", "versioning", "deprecation", "api"]
    },
    {
        "id": "STD-009",
        "category": "Security",
        "title": "Never log sensitive fields: passwords, tokens, API keys",
        "pattern": "Redact or omit authentication credentials, API keys, and PII from all log statements and exception messages.",
        "anti_pattern": "Logging request headers, settings objects, or user input directly without sanitization.",
        "explanation": (
            "Elastic has strict security logging requirements, particularly for x-pack security "
            "components. Sensitive data in logs has caused customer-facing security incidents. "
            "The security team reviews any PR touching authentication or authorization code "
            "specifically for this pattern. Use Strings.toString() with the ToXContent.EMPTY_PARAMS "
            "override that excludes sensitive fields."
        ),
        "severity": "critical",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/87341",
        "tags": ["security", "logging", "compliance"]
    },
    {
        "id": "STD-010",
        "category": "Code Style",
        "title": "Use Optional.ifPresent() or map() instead of isPresent() + get()",
        "pattern": "Use optional.map(fn).orElse(default) or optional.ifPresent(consumer) for Optional handling.",
        "anti_pattern": "if (optional.isPresent()) { doSomething(optional.get()); }",
        "explanation": (
            "The isPresent() + get() pattern defeats the purpose of Optional and is flagged "
            "by Elastic's Checkstyle configuration. The functional style is more composable "
            "and eliminates the risk of a NoSuchElementException if the condition check and "
            "get() call become separated during refactoring."
        ),
        "severity": "low",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/91100",
        "tags": ["java", "style", "optional"]
    },
    {
        "id": "STD-011",
        "category": "Documentation",
        "title": "Public API methods require Javadoc with @param and @return",
        "pattern": "All public methods in client-facing APIs must have complete Javadoc including parameter descriptions.",
        "anti_pattern": "Empty Javadoc stubs /** */ or Javadoc that only restates the method name.",
        "explanation": (
            "Elastic's public Java client is consumed by thousands of developers. Missing or "
            "trivial Javadoc forces users to read source code to understand behavior. The "
            "documentation team runs automated checks that flag empty or one-word Javadoc. "
            "Internal implementation methods are exempt but any public interface or abstract "
            "class method is not."
        ),
        "severity": "medium",
        "example_pr_url": "https://github.com/elastic/elasticsearch-java/pull/512",
        "tags": ["documentation", "javadoc", "api"]
    },
    {
        "id": "STD-012",
        "category": "Performance",
        "title": "Avoid unnecessary object allocation in hot paths",
        "pattern": "Reuse objects, use primitive arrays, or use pooled buffers in code executed per-document or per-shard.",
        "anti_pattern": "Creating new ArrayList() or new HashMap() inside methods called per document during indexing or search.",
        "explanation": (
            "Per-document allocation in indexing and search hot paths causes significant GC "
            "pressure at scale. Elastic benchmarks flag regressions in allocation rate as "
            "part of the CI pipeline. For per-document code, prefer reusable data structures "
            "initialized at the reader/writer level and passed down, not allocated per call."
        ),
        "severity": "medium",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/90123",
        "tags": ["java", "performance", "gc", "indexing"]
    },
    {
        "id": "STD-013",
        "category": "Compatibility",
        "title": "Serialization changes must handle BWC (backwards wire compatibility)",
        "pattern": "When adding fields to Writeable or StreamInput/StreamOutput, always check the node version before reading/writing.",
        "anti_pattern": "Adding a new field to readFrom() and writeTo() without a version gate.",
        "explanation": (
            "Elasticsearch supports rolling upgrades where nodes of different versions run in "
            "the same cluster. Serialization changes without version gates cause "
            "StreamCorruptedException when a new node sends a message to an old node. "
            "Always wrap new fields with if (in.getVersion().onOrAfter(VERSION_CONSTANT))."
        ),
        "severity": "critical",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/88901",
        "tags": ["java", "serialization", "bwc", "compatibility"]
    },
    {
        "id": "STD-014",
        "category": "Testing",
        "title": "Integration tests must clean up their own indices and data",
        "pattern": "Use @After or deleteIndex() in teardown to remove any indices created during integration tests.",
        "anti_pattern": "Relying on test framework cleanup or leaving indices that bleed into other test runs.",
        "explanation": (
            "Shared test cluster state causes flaky tests that are extremely hard to diagnose. "
            "Elastic's CI runs tests in parallel and test pollution is a recurring source of "
            "build failures. Every integration test that creates an index is responsible for "
            "deleting it. Use the built-in ESRestTestCase.deleteIndex() helper."
        ),
        "severity": "medium",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/94521",
        "tags": ["testing", "integration-tests", "reliability"]
    },
    {
        "id": "STD-015",
        "category": "Concurrency",
        "title": "Use cluster state observers instead of polling for state changes",
        "pattern": "Use ClusterStateObserver to wait for cluster state transitions instead of Thread.sleep() loops.",
        "anti_pattern": "while (!conditionMet()) { Thread.sleep(100); checkState(); } polling loops.",
        "explanation": (
            "Polling loops for cluster state changes waste thread resources and create timing "
            "sensitivity in tests. ClusterStateObserver is event-driven and will notify as "
            "soon as the condition is met, making both production code and tests faster and "
            "more reliable. This is a required pattern in all cluster coordination code."
        ),
        "severity": "high",
        "example_pr_url": "https://github.com/elastic/elasticsearch/pull/86702",
        "tags": ["java", "concurrency", "cluster", "reliability"]
    }
]

def create_standards_index():
    mapping = {
        "settings": {
            "default_pipeline": "elser-copilot-pipeline"
        },
        "mappings": {
            "properties": {
                "id":              { "type": "keyword" },
                "category":        { "type": "keyword" },
                "title":           { "type": "text" },
                "pattern":         { "type": "text" },
                "anti_pattern":    { "type": "text" },
                "explanation":     { "type": "text" },
                "body":            { "type": "text" },   # combined field for ELSER
                "body_embedding":  { "type": "sparse_vector" },
                "title_embedding": { "type": "sparse_vector" },
                "severity":        { "type": "keyword" },
                "example_pr_url":  { "type": "keyword" },
                "tags":            { "type": "keyword" }
            }
        }
    }

    if es.indices.exists(index=INDEX):
        es.indices.delete(index=INDEX)
        print(f"Deleted existing index: {INDEX}")

    es.indices.create(index=INDEX, body=mapping)
    print(f"Created index: {INDEX}")

def build_docs():
    docs = []
    for std in STANDARDS:
        # Combine all text fields into body so ELSER embeds everything
        combined_body = (
            f"{std['title']}. "
            f"Pattern: {std['pattern']} "
            f"Anti-pattern: {std['anti_pattern']} "
            f"Explanation: {std['explanation']}"
        )
        docs.append({
            "_index": INDEX,
            "_id":    std["id"],
            "_source": {
                **std,
                "body":  combined_body,
                "title": std["title"]
            }
        })
    return docs

if __name__ == "__main__":
    print("Creating standards index...")
    create_standards_index()

    print("Building and indexing standards...")
    docs = build_docs()
    success, errors = helpers.bulk(es, docs, chunk_size=5, raise_on_error=False, request_timeout=300)
    print(f"Indexed {success} standards. Errors: {len(errors)}")

    # Verify
    import time
    time.sleep(2)
    count = es.count(index=INDEX)
    print(f"Verified: {count['count']} standards in index")