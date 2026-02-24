"use client";

import { motion } from "framer-motion";
import { Clock, Zap, User, Bot, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

const MANUAL_STEPS = [
    "Open the issue/PR on GitHub",
    "Search for duplicate issues manually",
    "Read through related past issues",
    "Check CODEOWNERS for reviewers",
    "Read the full diff line by line",
    "Cross-reference coding standards",
    "Check performance benchmarks",
    "Read all reviewer comments",
    "Identify conflicting feedback",
    "Draft a triage/review summary",
    "Format and post a GitHub comment",
    "Update tracking labels",
];

const AUTO_STEPS = [
    { label: "Webhook received", time: "0s" },
    { label: "Indexed & embedded via ELSER", time: "2s" },
    { label: "Agent 1: Triage complete", time: "15s" },
    { label: "Agent 2: Code review done", time: "30s" },
    { label: "Agent 3: Impact assessed", time: "40s" },
    { label: "Agent 4: Conflicts checked", time: "50s" },
    { label: "Comment posted to GitHub", time: "55s" },
];

export default function BeforeAfter() {
    return (
        <div className="grid md:grid-cols-2 gap-6">
            {/* Before: Manual */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="app-card"
            >
                <div className="app-card-header flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[#ff8888]" />
                        <span className="text-sm font-bold text-white">Manual Process</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff888811] border border-[#ff888833]">
                        <Clock className="h-3 w-3 text-[#ff8888]" />
                        <span className="text-[10px] font-bold text-[#ff8888] mono-text">~45 min</span>
                    </div>
                </div>
                <div className="p-5 space-y-2">
                    {MANUAL_STEPS.map((step, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 py-1.5"
                        >
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#ff88880d] border border-[#ff888833] flex items-center justify-center text-[8px] font-bold text-[#ff8888] mono-text">
                                {i + 1}
                            </span>
                            <span className="text-[11px] text-[#b6cff3]">{step}</span>
                        </motion.div>
                    ))}
                    <div className="pt-3 border-t border-[#7ea4de1a] flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-[#ff8888]" />
                        <span className="text-[10px] font-bold text-[#ff8888]">Slow, inconsistent, error-prone</span>
                    </div>
                </div>
            </motion.div>

            {/* After: Automated */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="app-card"
            >
                <div className="app-card-header flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-[#66eebb]" />
                        <span className="text-sm font-bold text-white">Automated Pipeline</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#66eebb11] border border-[#66eebb33]">
                        <Zap className="h-3 w-3 text-[#66eebb]" />
                        <span className="text-[10px] font-bold text-[#66eebb] mono-text">~55 sec</span>
                    </div>
                </div>
                <div className="p-5 space-y-2">
                    {AUTO_STEPS.map((step, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#66eebb06] border border-[#66eebb1a] hover:border-[#66eebb33] transition-colors"
                        >
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#66eebb]" />
                            <span className="text-[11px] font-medium text-white flex-1">{step.label}</span>
                            <span className="text-[10px] font-bold text-[#66eebb] mono-text">{step.time}</span>
                        </motion.div>
                    ))}
                    <div className="pt-3 border-t border-[#7ea4de1a] flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#66eebb]" />
                        <span className="text-[10px] font-bold text-[#66eebb]">Fast, consistent, comprehensive</span>
                    </div>
                </div>
            </motion.div>

            {/* Speedup banner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="md:col-span-2 text-center py-4 rounded-2xl bg-gradient-to-r from-[#88c0ff08] via-[#66eebb0d] to-[#88c0ff08] border border-[#66eebb22]"
            >
                <div className="flex items-center justify-center gap-4">
                    <span className="text-sm text-[#b6cff3]">45 min manual</span>
                    <ArrowRight className="h-4 w-4 text-[#66eebb]" />
                    <span className="text-sm text-[#b6cff3]">55 sec automated</span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#66eebb11] border border-[#66eebb44] text-[#66eebb]">
                        49× FASTER
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
