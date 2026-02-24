"use client";

import { useEffect, useState } from "react";
import {
    Timer,
    TrendingUp,
    Zap,
    ArrowRight,
    Clock,
    Search,
    Database,
    Brain,
} from "lucide-react";

interface AgentImpact {
    agent: number;
    name: string;
    manual_time_s: number;
    automated_time_ms: number;
    speedup_factor: number;
    time_saved_s: number;
}

interface ImpactData {
    total_pipeline_runs: number;
    total_time_saved_hours: number;
    documents_indexed: number;
    elser_chunks: number;
    search_latency_ms: number;
    agents: AgentImpact[];
    summary: {
        manual_total_min: number;
        automated_total_s: number;
        overall_speedup: number;
        workflows_automated: number;
        steps_removed_per_review: number;
    };
}

function formatTime(seconds: number): string {
    if (seconds >= 60) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds)}s`;
}

export default function ImpactMetrics() {
    const [data, setData] = useState<ImpactData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("http://localhost:8000/api/impact")
            .then((r) => r.json())
            .then((d) => {
                setData(d);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        style={{
                            height: 100,
                            background: "#161b22",
                            borderRadius: 12,
                            border: "1px solid #30363d",
                            animation: "pulse 2s infinite",
                        }}
                    />
                ))}
            </div>
        );
    }

    if (!data) return null;

    const heroStats = [
        {
            value: `${data.summary.overall_speedup}×`,
            label: "Faster Than Manual",
            icon: <Zap size={16} />,
            detail: `${data.summary.manual_total_min}min → ${data.summary.automated_total_s}s`,
        },
        {
            value: `${data.summary.workflows_automated}`,
            label: "Workflows Automated",
            icon: <TrendingUp size={16} />,
            detail: `${data.summary.steps_removed_per_review} manual steps removed`,
        },
        {
            value: `${data.search_latency_ms}ms`,
            label: "ELSER Search Latency",
            icon: <Search size={16} />,
            detail: `Across ${data.elser_chunks.toLocaleString()} chunks`,
        },
        {
            value: `${data.total_time_saved_hours}h`,
            label: "Total Time Saved",
            icon: <Clock size={16} />,
            detail: `Over ${data.total_pipeline_runs} pipeline runs`,
        },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Hero stat cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                }}
            >
                {heroStats.map((stat, i) => (
                    <div
                        key={i}
                        style={{
                            padding: 20,
                            background: "#161b22",
                            border: "1px solid #30363d",
                            borderRadius: 12,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = "#e6edf3";
                            e.currentTarget.style.background = "#1c2128";
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = "#30363d";
                            e.currentTarget.style.background = "#161b22";
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                color: "#8b949e",
                            }}
                        >
                            {stat.icon}
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em",
                                }}
                            >
                                {stat.label}
                            </span>
                        </div>
                        <div
                            style={{
                                fontSize: 32,
                                fontWeight: 900,
                                color: "#e6edf3",
                                letterSpacing: "-0.02em",
                                lineHeight: 1,
                            }}
                        >
                            {stat.value}
                        </div>
                        <div style={{ fontSize: 11, color: "#484f58" }}>{stat.detail}</div>
                    </div>
                ))}
            </div>

            {/* Per-agent comparison bars */}
            <div
                style={{
                    background: "#161b22",
                    border: "1px solid #30363d",
                    borderRadius: 12,
                    padding: 20,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 16,
                    }}
                >
                    <Timer size={14} style={{ color: "#8b949e" }} />
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.15em",
                            color: "#8b949e",
                        }}
                    >
                        Agent Performance — Manual vs Automated
                    </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {data.agents.map((agent) => {
                        const maxManual = Math.max(
                            ...data.agents.map((a) => a.manual_time_s)
                        );
                        const manualPct = (agent.manual_time_s / maxManual) * 100;
                        const autoPct =
                            (agent.automated_time_ms / 1000 / maxManual) * 100;

                        return (
                            <div key={agent.agent}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: 6,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "#e6edf3",
                                        }}
                                    >
                                        Agent {agent.agent} — {agent.name}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: "#e6edf3",
                                            background: "#21262d",
                                            padding: "2px 8px",
                                            borderRadius: 10,
                                        }}
                                    >
                                        {agent.speedup_factor}× faster
                                    </span>
                                </div>

                                {/* Manual bar */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span
                                        style={{
                                            fontSize: 10,
                                            color: "#484f58",
                                            width: 56,
                                            textAlign: "right",
                                        }}
                                    >
                                        Manual
                                    </span>
                                    <div
                                        style={{
                                            flex: 1,
                                            height: 8,
                                            background: "#21262d",
                                            borderRadius: 4,
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${manualPct}%`,
                                                height: "100%",
                                                background: "#484f58",
                                                borderRadius: 4,
                                                transition: "width 0.8s ease-out",
                                            }}
                                        />
                                    </div>
                                    <span
                                        style={{ fontSize: 10, color: "#484f58", width: 48 }}
                                    >
                                        {formatTime(agent.manual_time_s)}
                                    </span>
                                </div>

                                {/* Automated bar */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span
                                        style={{
                                            fontSize: 10,
                                            color: "#e6edf3",
                                            width: 56,
                                            textAlign: "right",
                                        }}
                                    >
                                        AI Agent
                                    </span>
                                    <div
                                        style={{
                                            flex: 1,
                                            height: 8,
                                            background: "#21262d",
                                            borderRadius: 4,
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${Math.max(autoPct, 1)}%`,
                                                height: "100%",
                                                background: "#e6edf3",
                                                borderRadius: 4,
                                                transition: "width 0.8s ease-out",
                                            }}
                                        />
                                    </div>
                                    <span
                                        style={{ fontSize: 10, color: "#e6edf3", width: 48 }}
                                    >
                                        {(agent.automated_time_ms / 1000).toFixed(1)}s
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom summary */}
                <div
                    style={{
                        marginTop: 16,
                        padding: "12px 16px",
                        background: "#0d1117",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                    }}
                >
                    <span style={{ fontSize: 12, color: "#484f58", fontWeight: 600 }}>
                        {data.summary.manual_total_min} min manual review
                    </span>
                    <ArrowRight size={14} style={{ color: "#e6edf3" }} />
                    <span style={{ fontSize: 12, color: "#e6edf3", fontWeight: 700 }}>
                        {data.summary.automated_total_s}s automated
                    </span>
                    <span
                        style={{
                            fontSize: 11,
                            color: "#8b949e",
                            background: "#21262d",
                            padding: "2px 10px",
                            borderRadius: 10,
                            fontWeight: 700,
                        }}
                    >
                        {data.summary.overall_speedup}× speedup
                    </span>
                </div>
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
        </div>
    );
}
