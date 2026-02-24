"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
    Search,
    ShieldAlert,
    Zap,
    Scale,
    GitPullRequest,
    AlertCircle,
    ArrowDown,
    Database,
    Brain,
    MessageSquare,
    CheckCircle2,
    Workflow,
    ShieldCheck,
    BarChart3,
    Users,
    ArrowRight,
    Sparkles,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import StatsBar from "@/components/hiw/StatsBar";
import LiveDemo from "@/components/hiw/LiveDemo";
import ArchDiagram from "@/components/hiw/ArchDiagram";
import BeforeAfter from "@/components/hiw/BeforeAfter";
import TechStack from "@/components/hiw/TechStack";
import Timeline from "@/components/hiw/Timeline";
import FaqSection from "@/components/hiw/FaqSection";

/* ── Scroll-triggered animation wrapper ── */
function AnimateOnScroll({
    children,
    delay = 0,
    className = "",
}: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-60px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.7, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* ── Floating particle background ── */
function FloatingParticles() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            {Array.from({ length: 18 }).map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: 2 + Math.random() * 4,
                        height: 2 + Math.random() * 4,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        background: `rgba(136,192,255,${0.15 + Math.random() * 0.25})`,
                    }}
                    animate={{
                        y: [0, -30 - Math.random() * 40, 0],
                        opacity: [0.2, 0.7, 0.2],
                    }}
                    transition={{
                        duration: 4 + Math.random() * 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: Math.random() * 3,
                    }}
                />
            ))}
        </div>
    );
}

/* ── Animated flow line ── */
function FlowLine() {
    return (
        <div className="flex justify-center py-6">
            <div className="relative">
                <div className="w-[2px] h-16 bg-gradient-to-b from-[#88c0ff33] via-[#88c0ff66] to-[#88c0ff33] rounded-full" />
                <motion.div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[6px] h-[6px] rounded-full"
                    style={{
                        background: "radial-gradient(circle, #fff 0%, rgba(136,192,255,0.9) 60%, transparent 100%)",
                        boxShadow: "0 0 10px 3px rgba(136,192,255,0.5)",
                    }}
                    animate={{ top: ["0%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
            </div>
        </div>
    );
}

/* ── Agent card with detailed breakdown ── */
function AgentCard({
    agent,
    index,
}: {
    agent: {
        id: number;
        name: string;
        title: string;
        icon: React.ElementType;
        color: string;
        glow: string;
        description: string;
        whatItDoes: string[];
        tools: { name: string; icon: React.ElementType; desc: string }[];
        example: string;
        appliesTo: string;
    };
    index: number;
}) {
    const isEven = index % 2 === 0;

    return (
        <AnimateOnScroll delay={0.1}>
            <div id={`agent-${agent.id}`} className="relative scroll-mt-32">
                {/* Agent number floating badge */}
                <motion.div
                    className="absolute -top-5 left-1/2 -translate-x-1/2 z-20"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div
                        className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border"
                        style={{
                            background: `linear-gradient(135deg, ${agent.color}22, ${agent.color}11)`,
                            borderColor: `${agent.color}44`,
                            color: agent.color,
                            boxShadow: `0 0 20px ${agent.glow}`,
                        }}
                    >
                        <Sparkles className="h-3 w-3" />
                        Agent 0{agent.id}
                    </div>
                </motion.div>

                <div className="app-card overflow-visible mt-3">
                    {/* Header */}
                    <div className="app-card-header flex items-center gap-4 py-5">
                        <motion.div
                            className="flex h-14 w-14 items-center justify-center rounded-xl border"
                            style={{
                                borderColor: `${agent.color}55`,
                                background: `linear-gradient(135deg, ${agent.color}15, ${agent.color}08)`,
                                boxShadow: `0 0 24px ${agent.glow}`,
                            }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <agent.icon className="h-7 w-7" style={{ color: agent.color }} />
                        </motion.div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{agent.name}</h3>
                            <p className="text-xs text-[#a8c4e8] mt-0.5">{agent.title}</p>
                        </div>
                        <div className="ml-auto">
                            <span
                                className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
                                style={{
                                    color: agent.color,
                                    borderColor: `${agent.color}33`,
                                    background: `${agent.color}0d`,
                                }}
                            >
                                {agent.appliesTo}
                            </span>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6">
                        {/* Description */}
                        <p className="text-sm text-[#c2d6f3] leading-relaxed">{agent.description}</p>

                        {/* Two-column: What it does + Tools */}
                        <div className={`grid md:grid-cols-2 gap-6 ${isEven ? "" : "direction-rtl"}`}>
                            {/* What it does */}
                            <div className="space-y-3" style={{ direction: "ltr" }}>
                                <h4 className="label-caps mb-3">What It Does</h4>
                                {agent.whatItDoes.map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -15 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.2 + i * 0.1 }}
                                        className="flex items-start gap-3"
                                    >
                                        <div className="mt-1 flex-shrink-0">
                                            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: agent.color }} />
                                        </div>
                                        <span className="text-xs text-[#b6cff3] leading-relaxed">{item}</span>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Tools Used */}
                            <div className="space-y-3" style={{ direction: "ltr" }}>
                                <h4 className="label-caps mb-3">Elasticsearch Tools Used</h4>
                                {agent.tools.map((tool, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 15 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.3 + i * 0.1 }}
                                        className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0c1a30] border border-[#7ea4de22] hover:border-[#7ea4de44] transition-colors"
                                    >
                                        <tool.icon className="h-4 w-4 flex-shrink-0" style={{ color: agent.color }} />
                                        <div>
                                            <span className="text-[11px] font-bold text-[#d3e6ff] mono-text">{tool.name}</span>
                                            <p className="text-[10px] text-[#8ba4c7] mt-0.5">{tool.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Example output */}
                        <div className="mt-4">
                            <h4 className="label-caps mb-2">Example Output</h4>
                            <div className="rounded-xl bg-[#080f1d] border border-[#7ea4de1a] p-4">
                                <pre className="text-[11px] text-[#88c0ff] mono-text leading-relaxed whitespace-pre-wrap">
                                    {agent.example}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AnimateOnScroll>
    );
}

/* ── Data ── */
const AGENTS = [
    {
        id: 1,
        name: "Context Retriever",
        title: "Semantic Search & Duplicate Detection",
        icon: Search,
        color: "#88c0ff",
        glow: "rgba(136,192,255,0.15)",
        appliesTo: "Issues & PRs",
        description:
            "The first agent to run on every incoming issue or PR. It searches through 172K+ indexed documents using Elastic's ELSER semantic search to find duplicates, similar discussions, relevant code owners, and build a comprehensive triage report.",
        whatItDoes: [
            "Searches for duplicate issues using semantic similarity, not just keyword matching",
            "Finds related past PRs and issues that provide context for the new item",
            "Identifies code owners by analyzing CODEOWNERS file against changed file paths",
            "Generates a structured triage summary with recommended actions",
            "Posts the triage report as an automated GitHub comment",
        ],
        tools: [
            { name: "find_similar_issues", icon: Search, desc: "ELSER vector search across 172K+ documents" },
            { name: "check_for_duplicates", icon: AlertCircle, desc: "Detects exact and near-duplicate issues" },
            { name: "find_code_owners", icon: Users, desc: "Parses CODEOWNERS for relevant reviewers" },
            { name: "search_repository", icon: Database, desc: "Full-text search across the repository index" },
        ],
        example: `## Triage Summary: Issue #95103
### Duplicate Check
No open duplicates found.

### Related Issues & PRs
| PR      | Title                              | Relevance          |
|---------|------------------------------------|--------------------|
| #94986  | Add connectors indices on startup  | Earlier WIP version|
| #97463  | Add index templates to Application | Follow-up work     |

### Code Ownership
| Path              | Owner                  |
|-------------------|------------------------|
| /connectors/      | Team:Enterprise Search |

### Recommended Actions
1. Track follow-up work in PR #118991`,
    },
    {
        id: 2,
        name: "Architecture Critic",
        title: "Code Quality & Standards Review",
        icon: ShieldAlert,
        color: "#f0a8ff",
        glow: "rgba(240,168,255,0.15)",
        appliesTo: "PRs Only",
        description:
            "Reviews the code diff of a pull request against 15 coding standards automatically. Checks for anti-patterns, error handling gaps, thread safety issues, naming conventions, and API contract violations — providing actionable feedback before human reviewers even look at the code.",
        whatItDoes: [
            "Analyzes the full diff for coding standard violations and anti-patterns",
            "Checks error handling — uncaught exceptions, missing null checks, silent failures",
            "Detects thread safety issues in concurrent code paths",
            "Reviews API conventions — REST naming, response formats, backward compatibility",
            "Produces a scored report card with severity levels for each finding",
        ],
        tools: [
            { name: "search_coding_standards", icon: ShieldCheck, desc: "Matches code against 15 standards docs" },
            { name: "analyze_diff_patterns", icon: Workflow, desc: "Pattern analysis on added/removed code" },
            { name: "check_api_conventions", icon: CheckCircle2, desc: "REST API naming & contract checks" },
        ],
        example: `## Architecture Review — PR #95103

### Findings (3 items)
| Severity | Rule            | Description                         |
|----------|-----------------|-------------------------------------|
| ⚠️ WARN  | Error Handling  | Missing try-catch in startup hook   |
| ℹ️ INFO  | Naming          | Index name should use kebab-case    |
| ℹ️ INFO  | Documentation   | Missing Javadoc on public method    |

### Score: 8.5/10
Overall clean implementation with minor issues.`,
    },
    {
        id: 3,
        name: "Impact Quantifier",
        title: "Performance & Regression Analysis",
        icon: Zap,
        color: "#ffcc66",
        glow: "rgba(255,204,102,0.15)",
        appliesTo: "PRs Only",
        description:
            "Assesses the performance impact of code changes by cross-referencing modified files with historical benchmark data and past performance regressions. Flags changes that touch performance-critical hotpaths and estimates potential impact.",
        whatItDoes: [
            "Cross-references changed files with known performance-critical code paths",
            "Searches benchmark history for regressions related to similar changes",
            "Estimates impact on indexing throughput, query latency, and memory usage",
            "Flags changes to hot paths — inner loops, codec layers, query execution",
            "Provides a risk assessment with confidence scoring",
        ],
        tools: [
            { name: "query_benchmark_data", icon: BarChart3, desc: "Searches nightly benchmark result index" },
            { name: "search_performance_history", icon: Zap, desc: "Finds past perf regressions in similar areas" },
            { name: "analyze_hotpath_impact", icon: Workflow, desc: "Maps changes to known hotpaths" },
        ],
        example: `## Performance Impact Assessment — PR #95103

### Risk Level: LOW ✅

### Changed Hotpaths: None detected
The connectors indices are created at startup only and do
not affect query or indexing hotpaths.

### Benchmark Cross-Reference
No prior regressions found in the Enterprise Search module
across the last 90 days of nightly benchmarks.`,
    },
    {
        id: 4,
        name: "Conflict Resolver",
        title: "Reviewer Consensus & Mediation",
        icon: Scale,
        color: "#66eebb",
        glow: "rgba(102,238,187,0.15)",
        appliesTo: "PRs Only",
        description:
            "Monitors reviewer comments for disagreements and conflicting feedback. When conflicts are detected, it searches past resolution patterns across the repository to suggest compromise approaches and help the team reach consensus faster.",
        whatItDoes: [
            "Parses all reviewer comments to detect contradictory feedback",
            "Identifies common conflict patterns — style vs. performance, scope disagreements",
            "Searches past PRs for similar conflicts and how they were resolved",
            "Suggests resolution approaches based on historical consensus patterns",
            "Tracks reviewer sentiment to flag escalating discussions early",
        ],
        tools: [
            { name: "find_reviewer_conflicts", icon: Users, desc: "NLP-based contradiction detection in reviews" },
            { name: "search_resolution_examples", icon: Search, desc: "Past conflict patterns and outcomes" },
            { name: "analyze_review_sentiment", icon: MessageSquare, desc: "Sentiment scoring across discussion threads" },
        ],
        example: `## Conflict Resolution — PR #95103

### Conflicts Detected: 0
No reviewer disagreements found. All reviewers aligned
on the implementation approach.

### Consensus Status: ✅ ALIGNED
- sphilipse (author): Implementation owner
- elastic-machine: CI/automation approvals
- No blocking review comments`,
    },
];

const WORKFLOW_STEPS = [
    {
        icon: GitPullRequest,
        title: "GitHub Event",
        desc: "A new issue is opened or a PR is submitted to elastic/elasticsearch",
    },
    {
        icon: Database,
        title: "Index & Embed",
        desc: "Content is indexed into Elasticsearch and embedded via ELSER for semantic search",
    },
    {
        icon: Brain,
        title: "Agent Pipeline",
        desc: "4 specialized AI agents run sequentially, each analyzing a different dimension",
    },
    {
        icon: MessageSquare,
        title: "Automated Comment",
        desc: "A comprehensive triage/quality report is posted as a GitHub comment",
    },
];

export default function HowItWorksPage() {
    return (
        <AppShell>
            <div className="relative">
                <FloatingParticles />

                {/* ── Hero Section ── */}
                <section className="text-center py-6 fade-in">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#88c0ff0d] border border-[#88c0ff33] text-[10px] font-bold uppercase tracking-[0.2em] text-[#88c0ff] mb-6">
                            <Workflow className="h-3 w-3" />
                            How It Works
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
                            4 AI Agents.<br />
                            <span className="bg-gradient-to-r from-[#88c0ff] via-[#c0a8ff] to-[#f0a8ff] bg-clip-text text-transparent">
                                One Intelligent Pipeline.
                            </span>
                        </h1>
                        <p className="max-w-2xl mx-auto text-sm text-[#a8c4e8] leading-relaxed">
                            Every GitHub issue and pull request triggers a pipeline of specialized AI agents.
                            Each agent uses Elasticsearch's semantic search to analyze a different dimension
                            — from duplicate detection to performance impact — and posts actionable
                            insights automatically.
                        </p>
                    </motion.div>
                </section>

                {/* ── Key Stats ── */}
                <AnimateOnScroll className="mt-10">
                    <div className="flex items-center gap-3 mb-6">
                        <Sparkles className="h-4 w-4 text-[#b6cff3]" />
                        <h2 className="label-caps">At a Glance</h2>
                    </div>
                    <StatsBar />
                </AnimateOnScroll>

                {/* ── High-Level Workflow ── */}
                <AnimateOnScroll className="mt-10">
                    <div className="flex items-center gap-3 mb-6">
                        <Workflow className="h-4 w-4 text-[#b6cff3]" />
                        <h2 className="label-caps">The Pipeline at a Glance</h2>
                    </div>

                    <div className="app-card">
                        <div className="app-card-content">
                            <div className="grid md:grid-cols-4 gap-6">
                                {WORKFLOW_STEPS.map((step, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.15 }}
                                        className="relative text-center group"
                                    >
                                        {/* Connector arrow */}
                                        {i < WORKFLOW_STEPS.length - 1 && (
                                            <div className="hidden md:block absolute top-8 -right-3 z-10">
                                                <motion.div
                                                    animate={{ x: [0, 4, 0] }}
                                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                                >
                                                    <ArrowRight className="h-5 w-5 text-[#88c0ff55]" />
                                                </motion.div>
                                            </div>
                                        )}

                                        <motion.div
                                            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#7ea4de33] bg-[#0c1a30] mb-4 group-hover:border-[#88c0ff55] transition-colors"
                                            whileHover={{ scale: 1.08, y: -4 }}
                                        >
                                            <step.icon className="h-7 w-7 text-[#88c0ff]" />
                                        </motion.div>

                                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#88c0ff88] mb-1">
                                            Step {i + 1}
                                        </div>
                                        <h3 className="text-sm font-bold text-white mb-1">{step.title}</h3>
                                        <p className="text-[11px] text-[#8ba4c7] leading-relaxed">{step.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </AnimateOnScroll>

                {/* ── System Architecture ── */}
                <AnimateOnScroll className="mt-14">
                    <ArchDiagram />
                </AnimateOnScroll>

                {/* ── Issue vs PR Flow Comparison ── */}
                <AnimateOnScroll className="mt-14">
                    <div className="flex items-center gap-3 mb-6">
                        <ArrowDown className="h-4 w-4 text-[#b6cff3]" />
                        <h2 className="label-caps">Issue vs Pull Request — What Runs?</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Issue flow */}
                        <motion.div
                            whileHover={{ y: -2 }}
                            className="app-card"
                        >
                            <div className="app-card-header flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-[#88c0ff]" />
                                <h3 className="text-sm font-bold text-white">GitHub Issue</h3>
                            </div>
                            <div className="p-5 space-y-3">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#88c0ff0d] border border-[#88c0ff33]">
                                    <Search className="h-4 w-4 text-[#88c0ff]" />
                                    <span className="text-xs font-bold text-white">Agent 1 — Context Retriever</span>
                                    <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-[#66eebb]">RUNS</span>
                                </div>
                                {["Architecture Critic", "Impact Quantifier", "Conflict Resolver"].map((name, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#161b22]/60 border border-[#30363d]/50 opacity-40">
                                        <div className="h-4 w-4 rounded-full bg-[#30363d]" />
                                        <span className="text-xs text-neutral-500">Agent {i + 2} — {name}</span>
                                        <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-neutral-600">SKIPPED</span>
                                    </div>
                                ))}
                                <p className="text-[10px] text-[#8ba4c7] mt-2 pl-1">
                                    Issues only need triage — duplicate checks, related issues, and code ownership.
                                </p>
                            </div>
                        </motion.div>

                        {/* PR flow */}
                        <motion.div
                            whileHover={{ y: -2 }}
                            className="app-card"
                        >
                            <div className="app-card-header flex items-center gap-3">
                                <GitPullRequest className="h-5 w-5 text-[#f0a8ff]" />
                                <h3 className="text-sm font-bold text-white">Pull Request</h3>
                            </div>
                            <div className="p-5 space-y-3">
                                {[
                                    { name: "Context Retriever", icon: Search, color: "#88c0ff" },
                                    { name: "Architecture Critic", icon: ShieldAlert, color: "#f0a8ff" },
                                    { name: "Impact Quantifier", icon: Zap, color: "#ffcc66" },
                                    { name: "Conflict Resolver", icon: Scale, color: "#66eebb" },
                                ].map((agent, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.1 + i * 0.1 }}
                                        className="flex items-center gap-3 p-3 rounded-xl border"
                                        style={{
                                            background: `${agent.color}09`,
                                            borderColor: `${agent.color}33`,
                                        }}
                                    >
                                        <agent.icon className="h-4 w-4" style={{ color: agent.color }} />
                                        <span className="text-xs font-bold text-white">Agent {i + 1} — {agent.name}</span>
                                        <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-[#66eebb]">RUNS</span>
                                    </motion.div>
                                ))}
                                <p className="text-[10px] text-[#8ba4c7] mt-2 pl-1">
                                    PRs get the full pipeline — code review, performance analysis, and conflict resolution.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </AnimateOnScroll>

                {/* ── Interactive Demo ── */}
                <AnimateOnScroll className="mt-14">
                    <div className="flex items-center gap-3 mb-6">
                        <Zap className="h-4 w-4 text-[#b6cff3]" />
                        <h2 className="label-caps">Try It Yourself</h2>
                    </div>
                    <LiveDemo />
                </AnimateOnScroll>

                {/* ── Deep Dive: Each Agent ── */}
                <section className="mt-16">
                    <AnimateOnScroll>
                        <div className="text-center mb-10">
                            <h2 className="text-2xl font-black text-white tracking-tight mb-2">Deep Dive: Meet the Agents</h2>
                            <p className="text-xs text-[#a8c4e8] max-w-lg mx-auto">
                                Each agent is a specialized AI model connected to Elasticsearch tools.
                                Here's exactly what each one does and why.
                            </p>
                        </div>
                    </AnimateOnScroll>

                    <div className="space-y-2">
                        {AGENTS.map((agent, i) => (
                            <div key={agent.id}>
                                <AgentCard agent={agent} index={i} />
                                {i < AGENTS.length - 1 && <FlowLine />}
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Before vs After ── */}
                <AnimateOnScroll className="mt-16">
                    <div className="flex items-center gap-3 mb-6">
                        <ArrowDown className="h-4 w-4 text-[#b6cff3]" />
                        <h2 className="label-caps">Manual vs Automated</h2>
                    </div>
                    <BeforeAfter />
                </AnimateOnScroll>

                {/* ── Tech Stack ── */}
                <AnimateOnScroll className="mt-14">
                    <div className="flex items-center gap-3 mb-6">
                        <Database className="h-4 w-4 text-[#b6cff3]" />
                        <h2 className="label-caps">Powered by Elastic Stack</h2>
                    </div>
                    <TechStack />
                </AnimateOnScroll>

                {/* ── Real Example Timeline ── */}
                <AnimateOnScroll className="mt-14">
                    <Timeline />
                </AnimateOnScroll>

                {/* ── FAQ ── */}
                <AnimateOnScroll className="mt-14">
                    <FaqSection />
                </AnimateOnScroll>

                {/* ── Final CTA ── */}
                <AnimateOnScroll className="mt-16">
                    <div className="app-card text-center py-10 px-8">
                        <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#88c0ff33] bg-[#88c0ff0d] mb-4"
                        >
                            <Sparkles className="h-8 w-8 text-[#88c0ff]" />
                        </motion.div>
                        <h3 className="text-xl font-black text-white mb-2">Ready to See It in Action?</h3>
                        <p className="text-xs text-[#a8c4e8] max-w-md mx-auto mb-6">
                            Head over to the Execution Workflow page to run the pipeline on any issue or PR
                            and watch the agents work in real-time.
                        </p>
                        <a
                            href="/workflow"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-[#e8f0ff] transition-colors"
                        >
                            <Workflow className="h-4 w-4" />
                            Go to Execution Workflow
                            <ArrowRight className="h-4 w-4" />
                        </a>
                    </div>
                </AnimateOnScroll>
            </div>
        </AppShell>
    );
}
