"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    Bot,
    User,
    Loader2,
    FileCode,
    GitPullRequest,
    ChevronDown,
    ChevronRight,
    Copy,
    Check,
    MessageSquare,
    Sparkles,
    Search,
    Database,
    Users,
    AlertCircle,
    ArrowRight,
    RotateCcw,
    Clock,
} from "lucide-react";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    tools_used?: string[];
    timestamp: Date;
}

interface DiffFile {
    file: string;
    additions: number;
    deletions: number;
    diff: string;
}

// ─── Typing animation component ──────────────────────
function TypedText({ text, speed = 12 }: { text: string; speed?: number }) {
    const [displayed, setDisplayed] = useState("");
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!text) return;
        setDisplayed("");
        setDone(false);
        let idx = 0;
        const timer = setInterval(() => {
            idx++;
            setDisplayed(text.slice(0, idx));
            if (idx >= text.length) {
                clearInterval(timer);
                setDone(true);
            }
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);

    return (
        <span>
            {done ? renderMessageContent(text) : (
                <>
                    {renderMessageContent(displayed)}
                    <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                        style={{ color: "#88c0ff", fontWeight: 700 }}
                    >
                        ▊
                    </motion.span>
                </>
            )}
        </span>
    );
}

// ─── Thinking indicator ──────────────────────────────
function ThinkingIndicator() {
    const steps = [
        { icon: Search, label: "Querying Elasticsearch…", delay: 0 },
        { icon: Database, label: "Searching 172K+ documents…", delay: 1.5 },
        { icon: Sparkles, label: "Synthesizing answer…", delay: 3 },
    ];
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        const timers = steps.map((_, i) =>
            setTimeout(() => setActiveStep(i), steps[i].delay * 1000)
        );
        return () => timers.forEach(clearTimeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
        >
            <div className="w-7 h-7 rounded-lg bg-[#21262d] flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-[#e6edf3]" />
            </div>
            <div className="p-3 rounded-xl bg-[#161b22] border border-[#30363d] max-w-[320px]">
                <div className="flex flex-col gap-2">
                    {steps.map((step, i) => {
                        const Icon = step.icon;
                        const isActive = i === activeStep;
                        const isPast = i < activeStep;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{
                                    opacity: i <= activeStep ? 1 : 0.3,
                                    x: 0,
                                }}
                                transition={{ delay: step.delay, duration: 0.3 }}
                                className="flex items-center gap-2"
                            >
                                {isPast ? (
                                    <Check size={12} className="text-[#3fb950]" />
                                ) : isActive ? (
                                    <Loader2
                                        size={12}
                                        className="text-[#88c0ff] animate-spin"
                                    />
                                ) : (
                                    <Icon size={12} className="text-[#484f58]" />
                                )}
                                <span
                                    className={`text-[11px] ${isActive
                                        ? "text-[#88c0ff] font-semibold"
                                        : isPast
                                            ? "text-[#8b949e]"
                                            : "text-[#484f58]"
                                        }`}
                                >
                                    {step.label}
                                </span>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Suggestion Card ─────────────────────────────────
function SuggestionCard({
    icon: Icon,
    label,
    query,
    color,
    onClick,
}: {
    icon: React.ElementType;
    label: string;
    query: string;
    color: string;
    onClick: (q: string) => void;
}) {
    return (
        <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick(query)}
            className="flex items-start gap-3 p-4 rounded-xl bg-[#161b22] border border-[#30363d] text-left group hover:border-[#e6edf355] transition-all cursor-pointer"
            style={{ minWidth: 220, maxWidth: 260 }}
        >
            <div
                className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center border"
                style={{
                    background: `${color}11`,
                    borderColor: `${color}33`,
                }}
            >
                <Icon size={14} style={{ color }} />
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-[#e6edf3] group-hover:text-white">
                    {label}
                </span>
                <span className="text-[10px] text-[#8b949e] leading-relaxed">
                    {query}
                </span>
            </div>
            <ArrowRight
                size={12}
                className="text-[#30363d] group-hover:text-[#8b949e] ml-auto mt-1 transition-colors"
            />
        </motion.button>
    );
}

// ─── Diff Viewer ──────────────────────────────────────
function DiffViewer({ files }: { files: DiffFile[] }) {
    const [expandedFiles, setExpandedFiles] = useState<Set<number>>(
        new Set([0])
    );

    const toggle = (i: number) => {
        setExpandedFiles((prev) => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });
    };

    return (
        <div className="flex flex-col gap-2">
            {files.map((f, i) => (
                <div
                    key={i}
                    className="border border-[#30363d] rounded-lg overflow-hidden"
                >
                    <button
                        onClick={() => toggle(i)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-[#161b22] border-none cursor-pointer text-[#e6edf3] text-[13px] font-mono hover:bg-[#1c2128] transition-colors"
                    >
                        {expandedFiles.has(i) ? (
                            <ChevronDown size={14} />
                        ) : (
                            <ChevronRight size={14} />
                        )}
                        <FileCode size={14} className="text-[#8b949e]" />
                        <span className="flex-1 text-left">{f.file}</span>
                        <span className="text-[#3fb950] text-xs">
                            +{f.additions}
                        </span>
                        <span className="text-[#f85149] text-xs ml-1">
                            -{f.deletions}
                        </span>
                    </button>

                    <AnimatePresence>
                        {expandedFiles.has(i) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="bg-[#0d1117] overflow-x-auto text-xs leading-5 font-mono"
                            >
                                {f.diff.split("\n").map((line, j) => {
                                    let bg = "transparent";
                                    let color = "#8b949e";

                                    if (line.startsWith("+") && !line.startsWith("+++")) {
                                        bg = "rgba(63,185,80,0.15)";
                                        color = "#e6edf3";
                                    } else if (line.startsWith("-") && !line.startsWith("---")) {
                                        bg = "rgba(248,81,73,0.15)";
                                        color = "#8b949e";
                                    } else if (line.startsWith("@@")) {
                                        bg = "rgba(56,139,253,0.1)";
                                        color = "#58a6ff";
                                    }

                                    return (
                                        <div
                                            key={j}
                                            style={{
                                                padding: "0 12px",
                                                background: bg,
                                                color: color,
                                                whiteSpace: "pre",
                                                minHeight: 20,
                                            }}
                                        >
                                            {line}
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
}

// ─── Code Block Renderer ──────────────────────────────
function CodeBlock({ code, language }: { code: string; language?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="border border-[#30363d] rounded-lg overflow-hidden my-2">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-[#30363d] text-xs text-[#8b949e]">
                <span>{language || "code"}</span>
                <button
                    onClick={handleCopy}
                    className="bg-transparent border-none cursor-pointer text-[#8b949e] flex items-center gap-1 hover:text-[#e6edf3] transition-colors"
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <div className="bg-[#0d1117] p-3 overflow-x-auto text-xs leading-5 font-mono text-[#e6edf3] whitespace-pre">
                {code}
            </div>
        </div>
    );
}

// ─── Markdown-like renderer ──────────────────────────
function renderMessageContent(content: string) {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, i) => {
        const codeFenceMatch = part.match(/^```(\w+)?\n?([\s\S]*?)```$/);
        if (codeFenceMatch) {
            return (
                <CodeBlock
                    key={i}
                    language={codeFenceMatch[1]}
                    code={codeFenceMatch[2].trimEnd()}
                />
            );
        }

        const lines = part.split("\n");
        return (
            <div key={i}>
                {lines.map((line, j) => {
                    if (line.startsWith("### "))
                        return (
                            <h4
                                key={j}
                                className="mt-3 mb-1 text-sm font-semibold text-[#e6edf3]"
                            >
                                {line.slice(4)}
                            </h4>
                        );
                    if (line.startsWith("## "))
                        return (
                            <h3
                                key={j}
                                className="mt-3.5 mb-1.5 text-[15px] font-semibold text-[#e6edf3]"
                            >
                                {line.slice(3)}
                            </h3>
                        );
                    if (line.startsWith("# "))
                        return (
                            <h2
                                key={j}
                                className="mt-4 mb-2 text-base font-bold text-[#e6edf3]"
                            >
                                {line.slice(2)}
                            </h2>
                        );

                    if (line.match(/^-{3,}$/))
                        return (
                            <hr
                                key={j}
                                className="border-none border-t border-[#30363d] my-3"
                            />
                        );

                    const rendered = line
                        .replace(
                            /\*\*(.*?)\*\*/g,
                            '<strong style="color:#e6edf3">$1</strong>'
                        )
                        .replace(/\*(.*?)\*/g, "<em>$1</em>")
                        .replace(
                            /`(.*?)`/g,
                            '<code style="background:#161b22;padding:2px 6px;border-radius:4px;font-size:12px">$1</code>'
                        )
                        .replace(
                            /\[(.*?)\]\((.*?)\)/g,
                            '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#58a6ff;text-decoration:none">$1</a>'
                        );

                    if (line.match(/^[-*]\s/))
                        return (
                            <div key={j} className="pl-4 relative">
                                <span className="absolute left-1 text-[#484f58]">
                                    •
                                </span>
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: rendered.slice(2),
                                    }}
                                />
                            </div>
                        );

                    const numMatch = line.match(/^(\d+)\.\s/);
                    if (numMatch)
                        return (
                            <div key={j} className="pl-4 relative">
                                <span className="absolute left-0 text-[#484f58] text-xs">
                                    {numMatch[1]}.
                                </span>
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: rendered.slice(numMatch[0].length),
                                    }}
                                />
                            </div>
                        );

                    if (line.startsWith("|")) {
                        if (line.match(/^\|[\s-|]+\|$/)) return null;
                        const cells = line
                            .split("|")
                            .filter((c) => c.trim())
                            .map((c) => c.trim());
                        return (
                            <div
                                key={j}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
                                    gap: 1,
                                    background: "#21262d",
                                    fontSize: 12,
                                    borderRadius: j === 0 ? "4px 4px 0 0" : 0,
                                    borderBottom: "1px solid #30363d",
                                }}
                            >
                                {cells.map((cell, k) => (
                                    <div
                                        key={k}
                                        style={{ padding: "4px 8px" }}
                                        dangerouslySetInnerHTML={{
                                            __html: cell.replace(
                                                /\[(.*?)\]\((.*?)\)/g,
                                                '<a href="$2" target="_blank" style="color:#58a6ff;text-decoration:none">$1</a>'
                                            ),
                                        }}
                                    />
                                ))}
                            </div>
                        );
                    }

                    if (!line.trim())
                        return <div key={j} style={{ height: 8 }} />;

                    return (
                        <div
                            key={j}
                            className="leading-[22px]"
                            dangerouslySetInnerHTML={{ __html: rendered }}
                        />
                    );
                })}
            </div>
        );
    });
}

// ─── Format timestamp ────────────────────────────────
function formatTime(d: Date) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Main Chat Component ──────────────────────────────
const SUGGESTIONS = [
    {
        icon: Search,
        label: "Find Similar Issues",
        query: "Find issues related to search performance degradation",
        color: "#88c0ff",
    },
    {
        icon: GitPullRequest,
        label: "View PR Changes",
        query: "Show me the diff for PR #95103",
        color: "#f0a8ff",
    },
    {
        icon: Users,
        label: "Code Ownership",
        query: "Who owns the server/src/main directory?",
        color: "#66eebb",
    },
    {
        icon: AlertCircle,
        label: "Recent Issues",
        query: "What are the most recent open issues?",
        color: "#ffcc66",
    },
    {
        icon: Database,
        label: "Architecture Query",
        query: "How is the indexing pipeline structured?",
        color: "#ff8888",
    },
    {
        icon: Sparkles,
        label: "Quick Analysis",
        query: "Summarize the most common bug categories this month",
        color: "#c0a8ff",
    },
];

export default function RepoChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [diffData, setDiffData] = useState<{
        pr: number;
        files: DiffFile[];
    } | null>(null);
    const [showDiff, setShowDiff] = useState(false);
    const [latestIsNew, setLatestIsNew] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    };

    const checkForDiffRequest = useCallback(async (text: string) => {
        const match = text.match(
            /(?:diff|changes|code)\s*(?:for|of|in)?\s*(?:pr|pull\s*request)?\s*#?(\d{3,})/i
        );
        if (match) {
            const prNum = parseInt(match[1]);
            try {
                const resp = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/pr/${prNum}/diff`
                );
                if (resp.ok) {
                    const data = await resp.json();
                    setDiffData({ pr: prNum, files: data.files });
                    setShowDiff(true);
                    return prNum;
                }
            } catch {
                // diff fetch failed
            }
        }
        return null;
    }, []);

    const sendMessage = async (text?: string) => {
        const msg = (text || input).trim();
        if (!msg || loading) return;

        const userMsg: ChatMessage = {
            role: "user",
            content: msg,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);
        setLatestIsNew(false);

        if (inputRef.current) {
            inputRef.current.style.height = "auto";
        }

        checkForDiffRequest(msg);

        try {
            const resp = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/chat`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: msg,
                        conversation_id: conversationId,
                    }),
                }
            );

            const data = await resp.json();

            if (resp.ok) {
                setConversationId(data.conversation_id);
                setLatestIsNew(true);
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: data.answer,
                        tools_used: data.tools_used,
                        timestamp: new Date(),
                    },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: `Error: ${data.error || "Failed to get response"}`,
                        timestamp: new Date(),
                    },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "Error: Could not connect to the backend. Is the server running?",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const messageCount = messages.length;

    return (
        <div className="flex flex-col h-[650px] bg-[#0d1117] border border-[#30363d] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3)]">
            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#30363d] bg-[#161b22]">
                <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#88c0ff22] to-[#c0a8ff22] border border-[#30363d] flex items-center justify-center">
                        <MessageSquare size={16} className="text-[#88c0ff]" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#3fb950] border-2 border-[#161b22]" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-bold text-[#e6edf3]">
                        Repository Chat
                    </div>
                    <div className="text-[11px] text-[#8b949e]">
                        Powered by Elasticsearch ELSER · 172K+ docs indexed
                    </div>
                </div>
                {messageCount > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#484f58] font-mono">
                            {messageCount} msg{messageCount !== 1 ? "s" : ""}
                        </span>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setMessages([]);
                                setConversationId(null);
                                setDiffData(null);
                                setShowDiff(false);
                                setLatestIsNew(false);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[#8b949e] bg-[#21262d] border border-[#30363d] rounded-lg cursor-pointer hover:border-[#e6edf355] hover:text-[#e6edf3] transition-all"
                        >
                            <RotateCcw size={11} />
                            New Chat
                        </motion.button>
                    </div>
                )}
            </div>

            {/* ── Messages Area ── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4 scroll-smooth">
                {/* Empty state with suggestions */}
                <AnimatePresence>
                    {messages.length === 0 && !loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex-1 flex flex-col items-center justify-center gap-6 py-4"
                        >
                            <motion.div
                                animate={{ y: [0, -6, 0] }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#88c0ff11] to-[#c0a8ff11] border border-[#30363d] flex items-center justify-center"
                            >
                                <Sparkles
                                    size={28}
                                    className="text-[#88c0ff]"
                                />
                            </motion.div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-[#e6edf3] mb-1">
                                    Ask anything about the repository
                                </h3>
                                <p className="text-[13px] text-[#8b949e] max-w-md">
                                    Search issues, view PR diffs, explore code
                                    ownership, and get AI-powered insights — all
                                    backed by Elasticsearch.
                                </p>
                            </div>

                            {/* Suggestion grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-[800px] mt-2">
                                {SUGGESTIONS.map((s, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 + i * 0.08 }}
                                    >
                                        <SuggestionCard
                                            {...s}
                                            onClick={(q) => sendMessage(q)}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Messages */}
                {messages.map((msg, i) => {
                    const isLatest =
                        i === messages.length - 1 &&
                        msg.role === "assistant" &&
                        latestIsNew;

                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`flex gap-3 ${msg.role === "user"
                                ? "flex-row-reverse"
                                : "flex-row"
                                }`}
                        >
                            {/* Avatar */}
                            <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === "user"
                                    ? "bg-[#e6edf3]"
                                    : "bg-[#21262d]"
                                    }`}
                            >
                                {msg.role === "user" ? (
                                    <User
                                        size={14}
                                        className="text-[#0d1117]"
                                    />
                                ) : (
                                    <Bot
                                        size={14}
                                        className="text-[#e6edf3]"
                                    />
                                )}
                            </div>

                            {/* Message bubble */}
                            <div
                                className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-[13px] leading-5 ${msg.role === "user"
                                    ? "bg-[#21262d] border border-[#30363d] text-[#e6edf3]"
                                    : "bg-[#161b22] border border-[#30363d] text-[#c9d1d9]"
                                    }`}
                            >
                                {msg.role === "assistant" ? (
                                    isLatest ? (
                                        <TypedText text={msg.content} speed={8} />
                                    ) : (
                                        renderMessageContent(msg.content)
                                    )
                                ) : (
                                    <span>{msg.content}</span>
                                )}

                                {/* Tools used badges */}
                                {msg.tools_used && msg.tools_used.length > 0 && (
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                        {msg.tools_used.map((tool, j) => (
                                            <span
                                                key={j}
                                                className="px-2 py-0.5 text-[10px] text-[#8b949e] bg-[#0d1117] border border-[#30363d] rounded-full"
                                            >
                                                🔧 {tool}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Timestamp */}
                                <div
                                    className={`flex items-center gap-1 mt-1.5 ${msg.role === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                        }`}
                                >
                                    <Clock
                                        size={9}
                                        className="text-[#484f58]"
                                    />
                                    <span className="text-[9px] text-[#484f58]">
                                        {formatTime(msg.timestamp)}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {/* Thinking/loading indicator */}
                <AnimatePresence>
                    {loading && <ThinkingIndicator />}
                </AnimatePresence>

                {/* Diff panel */}
                <AnimatePresence>
                    {showDiff && diffData && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <GitPullRequest
                                    size={14}
                                    className="text-[#8b949e]"
                                />
                                <span className="text-[13px] text-[#e6edf3] font-semibold">
                                    PR #{diffData.pr} — {diffData.files.length}{" "}
                                    files changed
                                </span>
                                <button
                                    onClick={() => setShowDiff(false)}
                                    className="ml-auto text-[11px] text-[#8b949e] bg-[#21262d] border border-[#30363d] rounded px-2 py-0.5 cursor-pointer hover:border-[#e6edf355] transition-all"
                                >
                                    Hide diff
                                </button>
                            </div>
                            <DiffViewer files={diffData.files} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>

            {/* ── Quick replies after conversation starts ── */}
            <AnimatePresence>
                {messages.length > 0 && messages.length <= 2 && !loading && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-5 pb-2 flex gap-2 flex-wrap"
                    >
                        {["Tell me more", "Show related PRs", "Who are the code owners?"].map(
                            (q, i) => (
                                <motion.button
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + i * 0.1 }}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => sendMessage(q)}
                                    className="px-3 py-1.5 text-[11px] font-semibold text-[#8b949e] bg-[#161b22] border border-[#30363d] rounded-full cursor-pointer hover:border-[#88c0ff55] hover:text-[#88c0ff] transition-all"
                                >
                                    {q}
                                </motion.button>
                            )
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Input area ── */}
            <div className="px-5 py-3 border-t border-[#30363d] bg-[#161b22]">
                <div className="flex gap-2 items-end">
                    <textarea
                        ref={inputRef}
                        placeholder="Ask about issues, PRs, code, or anything in the repo..."
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        className="flex-1 px-3.5 py-2.5 text-[13px] text-[#e6edf3] bg-[#0d1117] border border-[#30363d] rounded-xl outline-none resize-none font-sans leading-5 max-h-[120px] transition-all focus:border-[#88c0ff88] focus:shadow-[0_0_0_3px_rgba(136,192,255,0.1)]"
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || loading}
                        className={`w-10 h-10 rounded-xl border-none flex items-center justify-center flex-shrink-0 transition-all ${input.trim() && !loading
                            ? "bg-[#e6edf3] text-[#0d1117] cursor-pointer shadow-[0_0_20px_rgba(136,192,255,0.15)]"
                            : "bg-[#21262d] text-[#484f58] cursor-not-allowed"
                            }`}
                    >
                        <Send size={16} />
                    </motion.button>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-[#484f58]">
                        Press Enter to send · Shift+Enter for new line
                    </span>
                    <span className="text-[10px] text-[#484f58] flex items-center gap-1">
                        <Database size={9} />
                        elastic/elasticsearch
                    </span>
                </div>
            </div>
        </div>
    );
}
