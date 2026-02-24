"use client";

import { motion } from "framer-motion";
import { Database, Brain, Cpu, Search, Layers, Activity } from "lucide-react";

const TECH = [
    {
        name: "Elasticsearch",
        desc: "Stores and indexes 172K+ issues, PRs, and comments with full-text and semantic search capabilities.",
        icon: Database,
        color: "#88c0ff",
        features: ["Full-text search", "Aggregations", "Index management"],
    },
    {
        name: "ELSER v2",
        desc: "Elastic Learned Sparse Encoder — generates semantic embeddings for natural language similarity search.",
        icon: Brain,
        color: "#f0a8ff",
        features: ["Semantic search", "Sparse vectors", "Zero-shot retrieval"],
    },
    {
        name: "Kibana Agent API",
        desc: "Orchestrates AI agent execution with tool access to Elasticsearch indices and external APIs.",
        icon: Cpu,
        color: "#ffcc66",
        features: ["Tool orchestration", "Agent routing", "Context injection"],
    },
    {
        name: "Ingest Pipelines",
        desc: "Processes and enriches documents during indexing — chunking, embedding, and metadata extraction.",
        icon: Layers,
        color: "#66eebb",
        features: ["Document chunking", "ELSER inference", "Field enrichment"],
    },
    {
        name: "Semantic Search",
        desc: "Combines ELSER sparse vectors with BM25 full-text for hybrid search across the repository knowledge base.",
        icon: Search,
        color: "#ff9966",
        features: ["Hybrid ranking", "Multi-field search", "Relevance tuning"],
    },
    {
        name: "Real-time Sync",
        desc: "GitHub webhooks trigger live indexing and incremental sync keeps the knowledge base up-to-date.",
        icon: Activity,
        color: "#cc88ff",
        features: ["Webhook listener", "Incremental sync", "Live indexing"],
    },
];

export default function TechStack() {
    return (
        <div className="grid md:grid-cols-3 gap-4">
            {TECH.map((tech, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -4 }}
                    className="app-card group cursor-default"
                >
                    <div className="p-5 space-y-3">
                        <div className="flex items-center gap-3">
                            <motion.div
                                className="flex h-10 w-10 items-center justify-center rounded-xl border"
                                style={{ borderColor: `${tech.color}44`, background: `${tech.color}0d` }}
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                            >
                                <tech.icon className="h-5 w-5" style={{ color: tech.color }} />
                            </motion.div>
                            <h3 className="text-sm font-bold text-white">{tech.name}</h3>
                        </div>
                        <p className="text-[11px] text-[#8ba4c7] leading-relaxed">{tech.desc}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {tech.features.map((f, j) => (
                                <span
                                    key={j}
                                    className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                                    style={{ color: `${tech.color}cc`, borderColor: `${tech.color}22`, background: `${tech.color}08` }}
                                >
                                    {f}
                                </span>
                            ))}
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
