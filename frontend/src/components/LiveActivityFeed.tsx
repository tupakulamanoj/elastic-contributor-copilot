"use client";

import { useEffect, useRef, useState } from "react";
import {
    Radio,
    GitPullRequest,
    AlertCircle,
    CheckCircle2,
    MessageSquare,
    User,
    Search,
    Brain,
    Activity,
    Zap,
    GitCommit,
    Copy,
} from "lucide-react";

interface LiveEvent {
    id: string;
    type: string;
    event?: string;
    action?: string;
    repo?: string;
    stage?: string;
    agent?: number;
    agent_name?: string;
    number?: number;
    title?: string;
    pr_number?: number;
    username?: string;
    is_first?: boolean;
    duration_ms?: number;
    success?: boolean;
    duplicate_found?: boolean;
    error?: string;
    message?: string;
    timestamp: string;
}

function timeAgo(ts: string): string {
    const t = ts.endsWith("Z") ? ts : ts + "Z"; // ensure UTC
    const diff = Date.now() - new Date(t).getTime();
    if (diff < 0) return "just now";
    if (diff < 5000) return "just now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
}

const AGENT_ICONS: Record<number, React.ElementType> = {
    1: Search,
    2: Brain,
    3: Activity,
    4: Zap,
};

function eventIcon(ev: LiveEvent) {
    // Agent processing events
    if (ev.type === "agent_processing") {
        if (ev.stage === "agent_start" && ev.agent) {
            const Icon = AGENT_ICONS[ev.agent] || Radio;
            return <Icon className="h-3.5 w-3.5 text-[#58a6ff] animate-pulse" />;
        }
        if (ev.stage === "agent_done" && ev.agent) {
            const Icon = AGENT_ICONS[ev.agent] || CheckCircle2;
            return <Icon className="h-3.5 w-3.5 text-[#3fb950]" />;
        }
        if (ev.stage === "comment_posted") return <MessageSquare className="h-3.5 w-3.5 text-[#3fb950]" />;
        if (ev.stage === "contributor_check") return <User className="h-3.5 w-3.5 text-[#d2a8ff]" />;
        if (ev.stage === "error") return <AlertCircle className="h-3.5 w-3.5 text-[#f85149]" />;
        return <GitCommit className="h-3.5 w-3.5 text-[#8b949e]" />;
    }

    // Webhook events
    if (ev.type === "webhook_event") {
        if (ev.event === "pull_request") return <GitPullRequest className="h-3.5 w-3.5 text-[#8b9cf7]" />;
        if (ev.event === "issues") return <AlertCircle className="h-3.5 w-3.5 text-[#f7c948]" />;
        if (ev.event?.includes("comment")) return <MessageSquare className="h-3.5 w-3.5 text-[#6bbf6b]" />;
        return <Radio className="h-3.5 w-3.5 text-[#8b949e]" />;
    }

    if (ev.type === "pipeline_start") return <Radio className="h-3.5 w-3.5 text-[#58a6ff] animate-pulse" />;
    if (ev.type === "pipeline_error") return <AlertCircle className="h-3.5 w-3.5 text-[#f85149]" />;
    return <Radio className="h-3.5 w-3.5 text-[#8b949e]" />;
}

function eventLabel(ev: LiveEvent): string {
    // Agent processing events — use the message from backend
    if (ev.type === "agent_processing" && ev.message) {
        return ev.message;
    }

    // Webhook events — show number + title
    if (ev.type === "webhook_event") {
        const action = ev.action ? ` ${ev.action}` : "";
        const event = ev.event?.replace(/_/g, " ") || "event";
        const num = ev.number ? ` #${ev.number}` : "";
        return `GitHub ${event}${action}${num}`;
    }

    if (ev.type === "pipeline_start") return `Pipeline started for PR #${ev.pr_number || "?"}`;
    if (ev.type === "pipeline_error") return `Pipeline error: ${ev.error || "unknown"}`;
    return ev.type;
}

function eventSubtitle(ev: LiveEvent): string | null {
    if (ev.title) return ev.title;
    if (ev.type === "agent_processing" && ev.duplicate_found) return "⚠️ Duplicate issue detected";
    return null;
}

function durationBadge(ev: LiveEvent) {
    if (!ev.duration_ms) return null;
    return (
        <span className="text-[9px] font-bold text-[#3fb950] bg-[#0d1f12] px-1.5 py-0.5 rounded-full border border-[#238636]">
            {(ev.duration_ms / 1000).toFixed(1)}s
        </span>
    );
}

export default function LiveActivityFeed() {
    const [events, setEvents] = useState<LiveEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        let unmounted = false;

        function connect() {
            if (unmounted) return;
            const ws = new WebSocket(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws")}/ws/events`);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!unmounted) setConnected(true);
            };

            ws.onmessage = (msg) => {
                try {
                    const data = JSON.parse(msg.data);
                    const event: LiveEvent = {
                        ...data,
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        timestamp: data.timestamp || new Date().toISOString(),
                    };
                    setEvents((prev) => [event, ...prev].slice(0, 100));
                } catch {
                    // ignore
                }
            };

            ws.onclose = () => {
                if (!unmounted) {
                    setConnected(false);
                    reconnectTimer.current = setTimeout(connect, 3000);
                }
            };

            ws.onerror = () => ws.close();
        }

        connect();

        return () => {
            unmounted = true;
            clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, []);

    return (
        <div className="app-card">
            <div className="app-card-header px-5 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Radio className="h-3.5 w-3.5 text-[#b6cff3]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#b9d0f0]">
                            Live Activity Feed
                        </span>
                        {events.length > 0 && (
                            <span className="text-[9px] font-bold text-neutral-500 bg-[#21262d] px-2 py-0.5 rounded-full">
                                {events.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`h-2 w-2 rounded-full ${connected ? "bg-[#3fb950] shadow-[0_0_6px_#3fb950] animate-pulse" : "bg-[#f85149]"}`}
                        />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                            {connected ? "Live" : "Reconnecting…"}
                        </span>
                    </div>
                </div>
            </div>
            <div className="app-card-content p-0">
                {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <Radio className="h-6 w-6 text-[#30363d] animate-pulse" />
                        <span className="text-[12px] text-neutral-500 font-semibold">
                            Waiting for GitHub events…
                        </span>
                        <span className="text-[10px] text-neutral-600 max-w-xs text-center">
                            Open an issue or create a PR to see real-time agent processing here
                        </span>
                    </div>
                ) : (
                    <div className="divide-y divide-[#21262d] max-h-96 overflow-y-auto">
                        {events.map((ev) => {
                            const subtitle = eventSubtitle(ev);
                            return (
                                <div
                                    key={ev.id}
                                    className={`flex items-start gap-3 px-5 py-3 transition-colors ${ev.type === "agent_processing"
                                        ? "bg-[#0d1117] hover:bg-[#161b22]"
                                        : "hover:bg-[#161b22]"
                                        }`}
                                >
                                    <div className="mt-0.5 shrink-0">{eventIcon(ev)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[12px] font-semibold text-[#e6edf3] truncate">
                                                {eventLabel(ev)}
                                            </span>
                                            {durationBadge(ev)}
                                            {ev.duplicate_found && (
                                                <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#f7c948] bg-[#2d1f00] px-1.5 py-0.5 rounded-full border border-[#6e4a00]">
                                                    <Copy className="h-2.5 w-2.5" /> Duplicate
                                                </span>
                                            )}
                                        </div>
                                        {subtitle && (
                                            <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                                                {subtitle}
                                            </div>
                                        )}
                                        {ev.username && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <User className="h-2.5 w-2.5 text-neutral-600" />
                                                <span className="text-[10px] text-neutral-500">@{ev.username}</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[9px] text-neutral-600 whitespace-nowrap mt-0.5 shrink-0">
                                        {timeAgo(ev.timestamp)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
