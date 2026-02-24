"use client";

import { motion } from "framer-motion";
import { GitPullRequest, Database, Search, ShieldAlert, Zap, Scale, MessageSquare, CheckCircle2 } from "lucide-react";

const EVENTS = [
    { time: "0.0s", label: "PR #95103 opened", detail: "Webhook received from GitHub", icon: GitPullRequest, color: "#88c0ff" },
    { time: "1.2s", label: "Indexed to Elasticsearch", detail: "PR data + comments stored and chunked", icon: Database, color: "#88c0ff" },
    { time: "2.0s", label: "ELSER embedding complete", detail: "Semantic vectors generated for title + body", icon: Search, color: "#f0a8ff" },
    { time: "2.5s", label: "Agent 1 started", detail: "Searching 172K docs for duplicates & similar issues", icon: Search, color: "#88c0ff" },
    { time: "18.3s", label: "Agent 1 complete", detail: "Found 7 related issues, 0 duplicates, 2 code owners", icon: CheckCircle2, color: "#66eebb" },
    { time: "18.5s", label: "Agent 2 started", detail: "Analyzing diff against coding standards", icon: ShieldAlert, color: "#f0a8ff" },
    { time: "32.1s", label: "Agent 2 complete", detail: "Score: 8.5/10 — 1 warning, 2 info items", icon: CheckCircle2, color: "#66eebb" },
    { time: "32.3s", label: "Agent 3 started", detail: "Cross-referencing with benchmark data", icon: Zap, color: "#ffcc66" },
    { time: "41.7s", label: "Agent 3 complete", detail: "Risk: LOW — no hotpaths affected", icon: CheckCircle2, color: "#66eebb" },
    { time: "41.9s", label: "Agent 4 started", detail: "Scanning reviewer comments for conflicts", icon: Scale, color: "#66eebb" },
    { time: "48.2s", label: "Agent 4 complete", detail: "0 conflicts — consensus aligned", icon: CheckCircle2, color: "#66eebb" },
    { time: "49.0s", label: "Quality report composed", detail: "Architecture + Impact combined into GitHub comment", icon: MessageSquare, color: "#88c0ff" },
    { time: "51.6s", label: "Comment posted ✅", detail: "Full triage report posted to PR #95103", icon: CheckCircle2, color: "#66eebb" },
];

export default function Timeline() {
    return (
        <div className="app-card">
            <div className="app-card-header flex items-center justify-between">
                <span className="label-caps">Real Example: PR #95103 End-to-End Journey</span>
                <span className="text-[10px] font-bold text-[#66eebb] mono-text">Total: 51.6s</span>
            </div>
            <div className="p-5">
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#88c0ff33] via-[#66eebb33] to-[#88c0ff33] rounded-full" />

                    <div className="space-y-1">
                        {EVENTS.map((ev, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.06 }}
                                className="relative flex items-start gap-4 py-2 group"
                            >
                                {/* Dot */}
                                <motion.div
                                    className="relative z-10 flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full border"
                                    style={{ borderColor: `${ev.color}44`, background: `${ev.color}0d` }}
                                    whileHover={{ scale: 1.15 }}
                                >
                                    <ev.icon className="h-4 w-4" style={{ color: ev.color }} />
                                </motion.div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-[#88c0ff] mono-text flex-shrink-0">{ev.time}</span>
                                        <span className="text-xs font-bold text-white">{ev.label}</span>
                                    </div>
                                    <p className="text-[10px] text-[#8ba4c7] mt-0.5">{ev.detail}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
