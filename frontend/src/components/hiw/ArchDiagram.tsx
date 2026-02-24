"use client";

import { motion } from "framer-motion";
import { GitPullRequest, Database, Brain, Cpu, MessageSquare, ArrowRight } from "lucide-react";

const NODES = [
    { id: "github", label: "GitHub", sub: "Webhook Event", icon: GitPullRequest, x: 0, color: "#88c0ff" },
    { id: "elastic", label: "Elasticsearch", sub: "Index + ELSER Embed", icon: Database, x: 1, color: "#f0a8ff" },
    { id: "agents", label: "Agent Pipeline", sub: "4 AI Agents", icon: Brain, x: 2, color: "#ffcc66" },
    { id: "llm", label: "LLM Analysis", sub: "Kibana Agent API", icon: Cpu, x: 3, color: "#66eebb" },
    { id: "comment", label: "GitHub Comment", sub: "Automated Report", icon: MessageSquare, x: 4, color: "#88c0ff" },
];

function DataStream({ delay, y }: { delay: number; y: number }) {
    return (
        <motion.div
            className="absolute h-[3px] w-[3px] rounded-full"
            style={{
                top: y,
                background: "radial-gradient(circle, #fff 0%, rgba(136,192,255,0.9) 60%, transparent 100%)",
                boxShadow: "0 0 8px 2px rgba(136,192,255,0.5)",
            }}
            animate={{ left: ["0%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear", delay }}
        />
    );
}

export default function ArchDiagram() {
    return (
        <div className="app-card">
            <div className="app-card-header">
                <span className="label-caps">System Architecture</span>
            </div>
            <div className="app-card-content">
                <div className="relative flex items-center justify-between gap-2 py-6 overflow-hidden">
                    {/* Connection lines */}
                    <div className="absolute inset-0 flex items-center px-12 pointer-events-none">
                        <div className="relative w-full h-[2px] bg-[#21262d] rounded-full">
                            <DataStream delay={0} y={-1} />
                            <DataStream delay={1} y={-1} />
                            <DataStream delay={2} y={-1} />
                        </div>
                    </div>

                    {NODES.map((node, i) => (
                        <div key={node.id} className="contents">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                whileHover={{ y: -6, scale: 1.05 }}
                                className="relative z-10 flex flex-col items-center gap-2 flex-1"
                            >
                                <motion.div
                                    className="flex h-14 w-14 items-center justify-center rounded-xl border"
                                    style={{
                                        borderColor: `${node.color}44`,
                                        background: `linear-gradient(135deg, ${node.color}15, ${node.color}08)`,
                                        boxShadow: `0 0 20px ${node.color}15`,
                                    }}
                                    animate={{ scale: [1, 1.06, 1] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                                >
                                    <node.icon className="h-6 w-6" style={{ color: node.color }} />
                                </motion.div>
                                <div className="text-center">
                                    <p className="text-[11px] font-bold text-white">{node.label}</p>
                                    <p className="text-[9px] text-[#8ba4c7]">{node.sub}</p>
                                </div>
                            </motion.div>

                            {i < NODES.length - 1 && (
                                <motion.div
                                    className="relative z-10 flex-shrink-0"
                                    animate={{ x: [0, 4, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                                >
                                    <ArrowRight className="h-4 w-4 text-[#88c0ff44]" />
                                </motion.div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-4 p-3 rounded-xl bg-[#0c1a30] border border-[#7ea4de1a] text-center">
                    <p className="text-[10px] text-[#8ba4c7]">
                        <span className="text-[#88c0ff] font-bold">Real-time flow:</span> Events travel through the pipeline in under 60 seconds, from webhook trigger to automated GitHub comment.
                    </p>
                </div>
            </div>
        </div>
    );
}
