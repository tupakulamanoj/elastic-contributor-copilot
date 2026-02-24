# Elastic Contributor Co-Pilot

## Problem

Elasticsearch is one of the largest open-source projects on GitHub, with thousands of contributors and hundreds of PRs opened every month. When a new contributor opens a PR or issue, they often don't know if their work duplicates something solved years ago, which coding standards to follow, or who should review their changes. Maintainers spend an average of 45 minutes per PR repeating the same 12-step triage process — checking for duplicates, reviewing code against conventions, assessing performance impact, and resolving reviewer disagreements. This manual overhead slows down the entire contribution lifecycle.

## Solution

Elastic Contributor Co-Pilot is a multi-agent AI system that fully automates PR and issue triage. When a contributor opens a PR or issue, a GitHub webhook triggers a pipeline of four specialized AI agents, all built inside Kibana Agent Builder with 18 tools:

- **Agent 1 (Context Retriever)** — Uses ELSER semantic search across 172,000+ indexed documents to find similar past issues, detect duplicates, and identify code owners from CODEOWNERS.
- **Agent 2 (Architecture Critic)** — Reviews the PR diff against 15 seeded Elastic coding standards, flagging violations with severity ratings and quality scores.
- **Agent 3 (Impact Quantifier)** — Queries 2,880 benchmark data points via ES|QL to assess performance regression risk per module over the last 90 days.
- **Agent 4 (Conflict Resolver)** — Detects reviewer disagreements in comment threads, searches historical resolution patterns, and suggests data-backed consensus.

The pipeline posts a comprehensive AI-generated quality report as a GitHub comment within 55 seconds — replacing a 45-minute manual process.

## Elastic Features Used

We built all four agents inside **Kibana Agent Builder** with 18 tools spanning Search (ELSER semantic search), ES|QL (benchmark queries, regression detection, issue listing), and Workflows. Elasticsearch stores 172,000+ documents across issues, PRs, comments, coding standards, benchmarks, and conflict resolutions, all embedded via ELSER v2 ingest pipelines for semantic similarity matching. A real-time Next.js dashboard visualizes the agent pipeline execution live via WebSocket.

## What We Liked

1. **Agent Builder's tool framework** made it incredibly fast to wire up search and ES|QL tools — we had 18 tools running within hours, not days.
2. **ELSER v2** delivers remarkably accurate semantic matching — duplicate detection catches issues that keyword search would miss entirely.

## Challenges

1. Tuning agent prompts to consistently use the right tools in the right order required significant iteration.
2. Handling the Agent Builder API's response format across different tool execution paths needed careful error handling on the Python wrapper side.
