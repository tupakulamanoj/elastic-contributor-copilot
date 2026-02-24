"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {files.map((f, i) => (
                <div
                    key={i}
                    style={{
                        border: "1px solid #30363d",
                        borderRadius: 8,
                        overflow: "hidden",
                    }}
                >
                    {/* File header */}
                    <button
                        onClick={() => toggle(i)}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 12px",
                            background: "#161b22",
                            border: "none",
                            cursor: "pointer",
                            color: "#e6edf3",
                            fontSize: 13,
                            fontFamily:
                                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                        }}
                    >
                        {expandedFiles.has(i) ? (
                            <ChevronDown size={14} />
                        ) : (
                            <ChevronRight size={14} />
                        )}
                        <FileCode size={14} style={{ color: "#8b949e" }} />
                        <span style={{ flex: 1, textAlign: "left" }}>{f.file}</span>
                        <span style={{ color: "#3fb950", fontSize: 12 }}>
                            +{f.additions}
                        </span>
                        <span style={{ color: "#f85149", fontSize: 12, marginLeft: 4 }}>
                            -{f.deletions}
                        </span>
                    </button>

                    {/* Diff lines */}
                    {expandedFiles.has(i) && (
                        <div
                            style={{
                                background: "#0d1117",
                                overflowX: "auto",
                                fontSize: 12,
                                lineHeight: "20px",
                                fontFamily:
                                    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                            }}
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
                        </div>
                    )}
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
        <div
            style={{
                border: "1px solid #30363d",
                borderRadius: 8,
                overflow: "hidden",
                margin: "8px 0",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 12px",
                    background: "#161b22",
                    borderBottom: "1px solid #30363d",
                    fontSize: 12,
                    color: "#8b949e",
                }}
            >
                <span>{language || "code"}</span>
                <button
                    onClick={handleCopy}
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#8b949e",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                    }}
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <div
                style={{
                    background: "#0d1117",
                    padding: 12,
                    overflowX: "auto",
                    fontSize: 12,
                    lineHeight: "20px",
                    fontFamily:
                        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                    color: "#e6edf3",
                    whiteSpace: "pre",
                }}
            >
                {code}
            </div>
        </div>
    );
}

// ─── Markdown-like renderer ───────────────────────────
function renderMessageContent(content: string) {
    // Split on code fences
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, i) => {
        // Code fences
        const codeFenceMatch = part.match(/^```(\w+)?\n?([\s\S]*?)```$/);
        if (codeFenceMatch) {
            return (
                <CodeBlock key={i} language={codeFenceMatch[1]} code={codeFenceMatch[2].trimEnd()} />
            );
        }

        // Regular text — render with basic markdown
        const lines = part.split("\n");
        return (
            <div key={i}>
                {lines.map((line, j) => {
                    // Headers
                    if (line.startsWith("### "))
                        return (
                            <h4
                                key={j}
                                style={{
                                    margin: "12px 0 4px",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: "#e6edf3",
                                }}
                            >
                                {line.slice(4)}
                            </h4>
                        );
                    if (line.startsWith("## "))
                        return (
                            <h3
                                key={j}
                                style={{
                                    margin: "14px 0 6px",
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: "#e6edf3",
                                }}
                            >
                                {line.slice(3)}
                            </h3>
                        );
                    if (line.startsWith("# "))
                        return (
                            <h2
                                key={j}
                                style={{
                                    margin: "16px 0 8px",
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: "#e6edf3",
                                }}
                            >
                                {line.slice(2)}
                            </h2>
                        );

                    // Horizontal rule
                    if (line.match(/^-{3,}$/))
                        return (
                            <hr
                                key={j}
                                style={{
                                    border: "none",
                                    borderTop: "1px solid #30363d",
                                    margin: "12px 0",
                                }}
                            />
                        );

                    // Bold, italic, inline code, and links
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

                    // List items
                    if (line.match(/^[-*]\s/))
                        return (
                            <div
                                key={j}
                                style={{ paddingLeft: 16, position: "relative" }}
                            >
                                <span
                                    style={{ position: "absolute", left: 4, color: "#484f58" }}
                                >
                                    •
                                </span>
                                <span dangerouslySetInnerHTML={{ __html: rendered.slice(2) }} />
                            </div>
                        );

                    // Numbered list
                    const numMatch = line.match(/^(\d+)\.\s/);
                    if (numMatch)
                        return (
                            <div key={j} style={{ paddingLeft: 16, position: "relative" }}>
                                <span
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        color: "#484f58",
                                        fontSize: 12,
                                    }}
                                >
                                    {numMatch[1]}.
                                </span>
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: rendered.slice(numMatch[0].length),
                                    }}
                                />
                            </div>
                        );

                    // Table rows
                    if (line.startsWith("|")) {
                        if (line.match(/^\|[\s-|]+\|$/)) return null; // separator row
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
                                            )
                                        }}
                                    />
                                ))}
                            </div>
                        );
                    }

                    // Empty line
                    if (!line.trim())
                        return <div key={j} style={{ height: 8 }} />;

                    // Normal paragraph
                    return (
                        <div
                            key={j}
                            style={{ lineHeight: "22px" }}
                            dangerouslySetInnerHTML={{ __html: rendered }}
                        />
                    );
                })}
            </div>
        );
    });
}

// ─── Main Chat Component ──────────────────────────────
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-detect diff requests like "show diff for PR #95103"
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
                // diff fetch failed, continue with chat
            }
        }
        return null;
    }, []);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg: ChatMessage = {
            role: "user",
            content: text,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        // Check for diff requests in parallel
        checkForDiffRequest(text);

        try {
            const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    conversation_id: conversationId,
                }),
            });

            const data = await resp.json();

            if (resp.ok) {
                setConversationId(data.conversation_id);
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
        } catch (e) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Error: Could not connect to the backend. Is the server running?",
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

    const suggestions = [
        "What are the most recent open issues?",
        "Show me the diff for PR #95103",
        "Find issues related to search performance",
        "Who owns the server/src/main directory?",
    ];

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "600px",
                background: "#0d1117",
                border: "1px solid #30363d",
                borderRadius: 12,
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "14px 20px",
                    borderBottom: "1px solid #30363d",
                    background: "#161b22",
                }}
            >
                <div
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "#21262d",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <MessageSquare size={16} style={{ color: "#e6edf3" }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#e6edf3" }}>
                        Repository Chat
                    </div>
                    <div style={{ fontSize: 12, color: "#8b949e" }}>
                        Ask anything about {process.env.NEXT_PUBLIC_GITHUB_REPO || "elastic/elasticsearch"}
                    </div>
                </div>
                {conversationId && (
                    <button
                        onClick={() => {
                            setMessages([]);
                            setConversationId(null);
                            setDiffData(null);
                            setShowDiff(false);
                        }}
                        style={{
                            padding: "4px 12px",
                            fontSize: 12,
                            color: "#8b949e",
                            background: "#21262d",
                            border: "1px solid #30363d",
                            borderRadius: 6,
                            cursor: "pointer",
                        }}
                    >
                        New Chat
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                }}
            >
                {/* Empty state */}
                {messages.length === 0 && (
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 16,
                        }}
                    >
                        <div
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 12,
                                background: "#21262d",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Sparkles size={24} style={{ color: "#8b949e" }} />
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: "#e6edf3",
                                    marginBottom: 4,
                                }}
                            >
                                Ask about the repository
                            </div>
                            <div style={{ fontSize: 13, color: "#8b949e", maxWidth: 400 }}>
                                Search issues, view PR diffs, explore code, and get AI-powered
                                insights about elastic/elasticsearch
                            </div>
                        </div>

                        {/* Suggestion chips */}
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                                justifyContent: "center",
                                maxWidth: 500,
                                marginTop: 8,
                            }}
                        >
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setInput(s);
                                        inputRef.current?.focus();
                                    }}
                                    style={{
                                        padding: "6px 14px",
                                        fontSize: 12,
                                        color: "#8b949e",
                                        background: "#161b22",
                                        border: "1px solid #30363d",
                                        borderRadius: 20,
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = "#e6edf3";
                                        e.currentTarget.style.color = "#e6edf3";
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = "#30363d";
                                        e.currentTarget.style.color = "#8b949e";
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            gap: 12,
                            flexDirection: msg.role === "user" ? "row-reverse" : "row",
                        }}
                    >
                        {/* Avatar */}
                        <div
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                background: msg.role === "user" ? "#e6edf3" : "#21262d",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            {msg.role === "user" ? (
                                <User size={14} style={{ color: "#0d1117" }} />
                            ) : (
                                <Bot size={14} style={{ color: "#e6edf3" }} />
                            )}
                        </div>

                        {/* Message bubble */}
                        <div
                            style={{
                                maxWidth: "80%",
                                padding: "10px 14px",
                                borderRadius: 10,
                                background:
                                    msg.role === "user" ? "#21262d" : "#161b22",
                                border: `1px solid ${msg.role === "user" ? "#30363d" : "#30363d"
                                    }`,
                                color: msg.role === "user" ? "#e6edf3" : "#c9d1d9",
                                fontSize: 13,
                                lineHeight: "20px",
                            }}
                        >
                            {msg.role === "assistant" ? (
                                renderMessageContent(msg.content)
                            ) : (
                                <span>{msg.content}</span>
                            )}

                            {/* Tools used badge */}
                            {msg.tools_used && msg.tools_used.length > 0 && (
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 4,
                                        marginTop: 8,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    {msg.tools_used.map((tool, j) => (
                                        <span
                                            key={j}
                                            style={{
                                                padding: "2px 8px",
                                                fontSize: 10,
                                                color: "#8b949e",
                                                background: "#0d1117",
                                                border: "1px solid #30363d",
                                                borderRadius: 10,
                                            }}
                                        >
                                            🔧 {tool}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                    <div style={{ display: "flex", gap: 12 }}>
                        <div
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                background: "#21262d",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <Bot size={14} style={{ color: "#e6edf3" }} />
                        </div>
                        <div
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                background: "#161b22",
                                border: "1px solid #30363d",
                                color: "#8b949e",
                                fontSize: 13,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <Loader2
                                size={14}
                                style={{
                                    animation: "spin 1s linear infinite",
                                }}
                            />
                            Searching repository...
                        </div>
                    </div>
                )}

                {/* Diff panel */}
                {showDiff && diffData && (
                    <div style={{ marginTop: 8 }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 8,
                            }}
                        >
                            <GitPullRequest size={14} style={{ color: "#8b949e" }} />
                            <span
                                style={{ fontSize: 13, color: "#e6edf3", fontWeight: 600 }}
                            >
                                PR #{diffData.pr} — {diffData.files.length} files changed
                            </span>
                            <button
                                onClick={() => setShowDiff(false)}
                                style={{
                                    marginLeft: "auto",
                                    fontSize: 11,
                                    color: "#8b949e",
                                    background: "#21262d",
                                    border: "1px solid #30363d",
                                    borderRadius: 4,
                                    padding: "2px 8px",
                                    cursor: "pointer",
                                }}
                            >
                                Hide diff
                            </button>
                        </div>
                        <DiffViewer files={diffData.files} />
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div
                style={{
                    padding: "12px 20px 16px",
                    borderTop: "1px solid #30363d",
                    background: "#161b22",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-end",
                    }}
                >
                    <textarea
                        ref={inputRef}
                        placeholder="Ask about issues, PRs, code, or anything in the repo..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        style={{
                            flex: 1,
                            padding: "10px 14px",
                            fontSize: 13,
                            color: "#e6edf3",
                            background: "#0d1117",
                            border: "1px solid #30363d",
                            borderRadius: 8,
                            outline: "none",
                            resize: "none",
                            fontFamily: "inherit",
                            lineHeight: "20px",
                            maxHeight: 120,
                            transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#e6edf3")}
                        onBlur={(e) => (e.target.style.borderColor = "#30363d")}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || loading}
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            border: "none",
                            background:
                                input.trim() && !loading ? "#e6edf3" : "#21262d",
                            color: input.trim() && !loading ? "#0d1117" : "#484f58",
                            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s",
                            flexShrink: 0,
                        }}
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>

            {/* Spin animation for loader */}
            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
