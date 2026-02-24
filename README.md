# 🤖 Elastic Contributor Co-Pilot

> **An AI-powered multi-agent pipeline that automates PR triage, code review, and conflict resolution for open-source projects — powered by Elasticsearch and ELSER.**

[![Built with Elastic](https://img.shields.io/badge/Built%20with-Elastic-005EB8?style=flat-square&logo=elastic)](https://www.elastic.co/)
[![Agents](https://img.shields.io/badge/AI%20Agents-4-blue?style=flat-square)](#-the-four-agents)
[![Indexed](https://img.shields.io/badge/Documents%20Indexed-172K%2B-green?style=flat-square)](#)

---

## 📌 The Problem

Elasticsearch is a massive open-source project with **thousands of contributors**. When someone opens a PR or issue:

- They don't know if it **duplicates** work solved years ago
- They don't know the project's **coding standards** and conventions
- They don't know **who should review** their code
- Maintainers spend **hours repeating the same guidance** manually
- When reviewers disagree, **historical precedent** is hard to find
- Manual triage takes **~45 minutes** per PR across **12 steps**

## 💡 Our Solution

An intelligent co-pilot that **automatically handles context retrieval, code review, impact analysis, and conflict resolution** as soon as a PR or issue is created — reducing triage time from **45 minutes to under 60 seconds**.

---

## 🏗️ System Architecture

```
┌─────────────────────┐
│   GitHub Repository  │
│  (elastic/elasticsearch)│
└──────────┬──────────┘
           │ Webhook (PR/Issue opened)
           ▼
┌──────────────────────────────────────────────┐
│              FastAPI Backend                  │
│           (backend/main.py)                  │
│  • Webhook verification & event routing      │
│  • WebSocket real-time dashboard updates     │
│  • GitHub API integration                    │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│           Elasticsearch Cloud                │
│  ┌────────────┐  ┌─────────────────────┐     │
│  │ ELSER v2    │  │ 172K+ Documents     │     │
│  │ (Semantic   │  │ • Issues & PRs      │     │
│  │  Search)    │  │ • Comments          │     │
│  └────────────┘  │ • Coding Standards   │     │
│                   │ • Benchmarks         │     │
│                   │ • CODEOWNERS rules   │     │
│                   └─────────────────────┘     │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│          Pipeline Orchestrator               │
│         (pipeline/orchestrator.py)           │
│                                              │
│    ┌──────────┐  ┌──────────┐               │
│    │ Agent 1  │→ │ Agent 2  │               │
│    │ Context  │  │ Arch     │               │
│    │ Retriever│  │ Critic   │               │
│    └──────────┘  └──────────┘               │
│         │              │                     │
│    ┌──────────┐  ┌──────────┐               │
│    │ Agent 3  │  │ Agent 4  │               │
│    │ Impact   │← │ Conflict │               │
│    │ Quantify │  │ Resolver │               │
│    └──────────┘  └──────────┘               │
│                                              │
│    Result: AI-generated GitHub Comment       │
└──────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│          Next.js Dashboard                   │
│         (frontend/)                          │
│  • Real-time pipeline visualization          │
│  • Agent execution logs                      │
│  • Impact metrics & analytics                │
│  • Repository chat (semantic Q&A)            │
└──────────────────────────────────────────────┘
```

---

## 🤖 The Four Agents (Built in Kibana Agent Builder)

> All 4 agents are created and configured inside **Kibana Agent Builder** with a total of **18 tools** including Search, ES|QL, and Workflows. The Python files act as wrappers that gather context and call the Agent Builder API.

### Agent 1 — Context Retriever
**Agent ID:** `context_retriever` &nbsp;|&nbsp; **File:** `agents/agent1_context_retriever.py`

Triages new issues and PRs by finding similar past work, detecting duplicates, and identifying code owners.

**Kibana Agent Builder Tools:**
| Tool | Type | Description |
|---|---|---|
| `find_similar_issues` | Search (ELSER) | Semantic search for related GitHub issues/PRs |
| `check_for_duplicates` | Search | Checks if an issue with similar title already exists in open state |
| `find_code_owners` | Search | Finds GitHub code owners responsible for a specific file path |
| `find_code_owners_by_prefix` | Search | Fallback owner lookup using directory prefix matching |
| `search_repository` | Search | Search issues, PRs, and comments using natural language |
| `list_recent_open_issues` | ES\|QL | Lists the most recently opened GitHub issues |
| `list_top_open_issues` | ES\|QL | Lists top open issues by relevance |

**Runs on:** Issues ✅ &nbsp; PRs ✅

---

### Agent 2 — Architecture Critic
**Agent ID:** `architecture_critic` &nbsp;|&nbsp; **File:** `agents/agent2_architecture_critic.py`

Reviews PR code changes against Elastic's 15 coding standards and flags violations with severity ratings.

**Kibana Agent Builder Tools:**
| Tool | Type | Description |
|---|---|---|
| `find_related_standards` | Search (ELSER) | Semantic search over coding standards index for relevant rules |
| `get_standards_by_severity` | ES\|QL | Retrieves all coding standards matching a severity level |
| `search_coding_standards` | Search | Finds standards relevant to a specific code pattern |
| `search_past_resolutions` | Search | Finds how similar code issues were previously addressed |
| `list_pull_requests` | ES\|QL | Lists pull requests by status (open, closed, merged) |

**Runs on:** PRs only ✅

---

### Agent 3 — Impact Quantifier
**Agent ID:** `impact_quantifier` &nbsp;|&nbsp; **File:** `agents/agent3_impact_quantifier.py`

Assesses performance risk by analyzing benchmark data, detecting regressions, and classifying risk level.

**Kibana Agent Builder Tools:**
| Tool | Type | Description |
|---|---|---|
| `get_module_baseline` | ES\|QL | Analyzes recent benchmark performance metrics for a module (30 days) |
| `get_regression_history` | ES\|QL | Retrieves the most recent benchmark regressions for a module |
| `get_worst_regressions_ever` | ES\|QL | Identifies the most severe regressions across all modules |

**Runs on:** PRs only ✅

---

### Agent 4 — Conflict Resolver
**Agent ID:** `conflict_resolver` &nbsp;|&nbsp; **File:** `agents/agent4_conflict_resolver.py`

Detects reviewer disagreements, finds historical precedent, and suggests data-backed consensus.

**Kibana Agent Builder Tools:**
| Tool | Type | Description |
|---|---|---|
| `list_comments` | ES\|QL | Lists comments for a given issue or pull request |
| `get_resolution_by_topic` | ES\|QL | Retrieves past conflict resolutions related to a specific topic |
| `list_issues` | ES\|QL | Lists GitHub issues by status, labels, author, or time |
| `list_recent_prs` | ES\|QL | Lists the most recently opened pull requests |

**Runs on:** PRs with reviewer conflicts ✅

---

## 📂 Project Structure

```
Elastic/
│
├── agents/                  # 🤖 AI Agent modules
│   ├── agent1_context_retriever.py
│   ├── agent2_architecture_critic.py
│   ├── agent3_impact_quantifier.py
│   └── agent4_conflict_resolver.py
│
├── pipeline/                # ⚙️ Orchestration & pipeline core
│   ├── orchestrator.py          # Runs the full agent pipeline
│   ├── conflict_detector.py     # Detects reviewer disagreements
│   └── contributor_checker.py   # First-time contributor detection
│
├── indexing/                # 📥 Data ingestion & sync
│   ├── crawler.py               # GitHub data crawler
│   ├── chunker.py               # Document chunking for ELSER
│   ├── live_indexer.py          # Real-time document indexer
│   ├── incremental_sync.py      # 15-min incremental sync
│   ├── sync_manager.py          # Sync orchestration
│   └── nightly_reconcile.py     # Nightly full reconciliation
│
├── tools/                   # 🔧 Shared utility modules
│   ├── search.py                # Elasticsearch search wrapper
│   ├── diff_parser.py           # Git diff parsing & analysis
│   ├── codeowners.py            # CODEOWNERS file parser
│   ├── doc_linker.py            # Documentation linker
│   ├── welcome_composer.py      # Welcome message composer
│   └── benchmark_queries.py     # Performance benchmark queries
│
├── scripts/                 # 📜 Setup, seeding & maintenance
│   ├── create_index.py          # ES index creation
│   ├── seed_standards.py        # Seed 15 coding standards
│   ├── seed_benchmarks.py       # Seed benchmark data
│   ├── seed_resolutions.py      # Seed conflict resolutions
│   ├── preflight_check.py       # System health check
│   ├── metrics_collector.py     # Pipeline metrics collection
│   ├── check_activity.py        # Activity monitoring
│   ├── check_comments.py        # Comment verification
│   ├── check_pr_comments.py     # PR comment checker
│   └── cleanup_comments.py      # Comment cleanup utility
│
├── backend/                 # 🖥️ FastAPI backend server
│   ├── main.py                  # API + Webhook + WebSocket server
│   └── requirements.txt
│
├── frontend/                # 🎨 Next.js dashboard
│   └── src/
│       ├── app/                 # Pages (workflow, how-it-works, impact, chat, knowledge)
│       └── components/          # React components (PipelineFlow, AppShell, etc.)
│
├── tests/                   # 🧪 Test suite
│   ├── run_scenarios.py         # End-to-end scenario runner
│   ├── seed_test_data.py        # Test data seeder
│   └── test_agent1.py           # Agent 1 unit tests
│
├── workflows/               # 📋 Workflow configurations
│   └── welcome_bot_workflow.json
│
├── results/                 # 📊 Pipeline output logs
│
├── main.py                  # Entry point
├── .env                     # Environment variables
├── requirements.txt         # Python dependencies
├── pyproject.toml           # Project metadata
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- Elasticsearch Cloud account (with ELSER enabled)
- GitHub Personal Access Token

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/elastic-copilot.git
cd elastic-copilot

# Python dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# GitHub
GITHUB_TOKEN=your_github_token
GITHUB_REPO=elastic/elasticsearch
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Elasticsearch Cloud
ELASTIC_ENDPOINT=https://your-cluster.cloud.es.io
ELASTIC_API_KEY=your_api_key
ELASTIC_CLOUD_ID=your_cloud_id
ELASTIC_AGENT_URL=https://your-agent-url/api/agent_builder/converse
```

### 3. Seed the Knowledge Base

```bash
# Create Elasticsearch indices
python scripts/create_index.py

# Seed coding standards, benchmarks, and conflict resolutions
python scripts/seed_standards.py
python scripts/seed_benchmarks.py
python scripts/seed_resolutions.py

# Run preflight check
python scripts/preflight_check.py
```

### 4. Start the Services

```bash
# Terminal 1: Backend (FastAPI + WebSocket)
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend (Next.js dashboard)
cd frontend
npm run dev
```

### 5. Access the Dashboard

Open **http://localhost:3000** in your browser.

| Page | URL | Description |
|------|-----|-------------|
| How It Works | `/how-it-works` | Interactive animated explainer |
| Execution Workflow | `/workflow` | Run the pipeline on any PR/issue |
| Measurable Impact | `/impact` | Performance metrics & analytics |
| Repository Chat | `/chat` | Semantic Q&A over the knowledge base |
| Knowledge Base | `/knowledge` | Browse 172K+ indexed documents |

---

## ⚡ End-to-End Pipeline Flow

```
Contributor opens a PR on GitHub
        │
        ▼
  GitHub Webhook → FastAPI Backend (port 8000)
        │
        ├─── Is this a first-time contributor?
        │    └─ Yes → Welcome Bot posts a greeting + quality report
        │
        ▼
  ┌─── Agent 1: Context Retriever ──────────────────┐
  │  • Semantic search via ELSER across 172K+ docs   │
  │  • Finds similar past issues/PRs                 │
  │  • Identifies code owners from CODEOWNERS        │
  │  • Time: ~15 seconds                             │
  └─────────────────────────────────────────────────┘
        │
        ▼
  ┌─── Agent 2: Architecture Critic ────────────────┐
  │  • Fetches and parses the full PR diff           │
  │  • Compares against 15 coding standards          │
  │  • Flags violations with severity ratings        │
  │  • Time: ~15 seconds                             │
  └─────────────────────────────────────────────────┘
        │
        ▼
  ┌─── Agent 3: Impact Quantifier ──────────────────┐
  │  • Checks 2,880 benchmark data points            │
  │  • Assesses performance risk per module          │
  │  • Detects regression trends (90 days)           │
  │  • Time: ~10 seconds                             │
  └─────────────────────────────────────────────────┘
        │
        ▼
  ┌─── Agent 4: Conflict Resolver ──────────────────┐
  │  • Detects reviewer disagreements                │
  │  • Finds historical precedent patterns           │
  │  • Suggests data-backed consensus                │
  │  • Time: ~10 seconds                             │
  └─────────────────────────────────────────────────┘
        │
        ▼
  📝 AI-Generated Quality Report posted to GitHub
     (Total pipeline time: ~55 seconds)
```

---

## 📊 Impact & Results

| Metric | Manual Process | With Co-Pilot | Improvement |
|--------|---------------|---------------|-------------|
| Triage Time | ~45 min | ~55 sec | **49× faster** |
| Steps Required | 12 manual steps | Fully automated | **100% automated** |
| Duplicate Detection | Often missed | Semantic similarity | **Near-zero misses** |
| Code Review Coverage | Inconsistent | 15 standards checked | **100% coverage** |
| Conflict Resolution | Hours of discussion | Instant precedent lookup | **Minutes, not hours** |

---

## 🛠️ Tech Stack

| Technology | Role |
|-----------|------|
| **Elasticsearch** | Stores and indexes 172K+ documents with full-text + semantic search |
| **ELSER v2** | Sparse vector embeddings for semantic similarity across all documents |
| **Kibana Agent API** | Connects AI models to Elasticsearch tools for agent reasoning |
| **Ingest Pipelines** | Automatic chunking and embedding at index time |
| **FastAPI** | Backend server with webhook handling + WebSocket for real-time updates |
| **Next.js 14** | Frontend dashboard with animations and real-time pipeline visualization |
| **Framer Motion** | Smooth animations throughout the dashboard |
| **GitHub API** | Webhook integration, PR diff fetching, and comment posting |

---

## 🔑 Key Features

- **Fully Automated Pipeline** — From webhook to GitHub comment in ~55 seconds
- **Semantic Search** — ELSER-powered similarity matching, not just keyword search
- **Real-Time Dashboard** — Watch agents process live via WebSocket
- **Interactive Explainer** — Animated "How It Works" page for demos
- **Repository Chat** — Ask natural language questions about the codebase
- **Welcome Bot** — Automatically greets first-time contributors
- **Conflict Mediation** — AI-powered reviewer disagreement resolution
- **Performance Guard** — Catches regression risks before merge

---

## 📄 License

Built for the **Elastic Hackathon 2026**. All rights reserved.
