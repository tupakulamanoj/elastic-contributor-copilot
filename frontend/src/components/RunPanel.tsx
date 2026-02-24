"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Play,
  Terminal,
  Cpu,
  Hash,
  Activity,
  ChevronRight,
  ChevronDown,
  Monitor
} from "lucide-react";
import { motion } from "framer-motion";

interface AgentStep {
  agent: number;
  name: string;
  success: boolean;
  duration_ms: number;
  summary?: string;
  error?: string;
}

interface RunPanelProps {
  onStart: (mode: string, number: number) => void;
  steps: AgentStep[];
  logs: string[];
  isRunning: boolean;
  finalReport: { title: string; content: string } | null;
}

export default function RunPanel({ onStart, steps, logs, isRunning, finalReport }: RunPanelProps) {
  const [mode, setMode] = useState("pr");
  const [number, setNumber] = useState(95103);
  const [logsOpen, setLogsOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps, logs]);

  return (
    <div className="flex h-full flex-col">
      {/* Interaction Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-3 w-3 text-neutral-500" />
            <span className="label-caps text-[9px]">Select Target Object</span>
          </div>
          <div className="flex p-1.5 rounded-2xl bg-[#0d1117] border border-[#30363d] shadow-inner">
            {["issue", "pr", "conflict"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all duration-300
                  ${mode === m
                    ? "bg-white text-black shadow-lg"
                    : "text-neutral-500 hover:text-white hover:bg-[#21262d]"
                  }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Hash className="h-3 w-3 text-neutral-500" />
            <span className="label-caps text-[9px]">Resource Identifier</span>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <input
                type="number"
                value={number}
                onChange={(e) => setNumber(parseInt(e.target.value, 10) || 0)}
                className="mono-text w-full rounded-2xl border border-[#30363d] bg-[#0d1117] py-3.5 px-6 text-sm text-white outline-none transition-all group-focus-within:border-neutral-500 group-focus-within:ring-4 group-focus-within:ring-white/5"
                placeholder="ID..."
              />
            </div>
            <button
              onClick={() => onStart(mode, number)}
              disabled={isRunning}
              className="flex items-center gap-3 rounded-2xl bg-white px-8 py-3.5 text-xs font-black uppercase tracking-widest text-black transition-all hover:bg-neutral-200 active:scale-95 disabled:opacity-30 shadow-xl"
            >
              {isRunning ? <Loader size={16} /> : <Play className="h-3.5 w-3.5 fill-current" />}
              Execute
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 flex flex-col rounded-3xl border border-[#30363d] bg-[#0d1117] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#30363d] bg-[#161b22] px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#30363d]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#30363d]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#30363d]" />
            </div>
            <div className="h-4 w-px bg-[#30363d] mx-1" />
            <Terminal className="h-3.5 w-3.5 text-neutral-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Pipeline_Telemetry.log</span>
          </div>
          {isRunning && (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-[#30363d]">
              <Activity className="h-3 w-3 text-white animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-300">Stream Active</span>
            </div>
          )}
        </div>

        <div className="mono-text flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
          {steps.length === 0 && !isRunning && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
              <div className="h-16 w-16 rounded-full border-2 border-dashed border-neutral-600 flex items-center justify-center mb-4">
                <ChevronRight className="h-6 w-6 text-neutral-500" />
              </div>
              <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Awaiting Command Initialization</p>
            </div>
          )}

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="group"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className={`h-2 w-2 rounded-full ${step.success ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "bg-neutral-500"}`} />
                <span className="text-[11px] font-black text-neutral-300 uppercase tracking-widest">
                  Agent_{step.agent} <span className="text-neutral-600 px-2">{'//'}</span> {step.name.replace(/\s+/g, '_').toUpperCase()}
                </span>
                <span className="text-[10px] font-bold text-neutral-600 ml-auto group-hover:text-neutral-400 transition-colors">
                  latency:{step.duration_ms}ms
                </span>
              </div>
              <div className="ml-5 border-l-2 border-[#30363d] pl-8 py-2">
                <p className="text-[12px] leading-relaxed text-neutral-400 bg-[#161b22] p-4 rounded-2xl border border-[#30363d] group-hover:border-neutral-500 transition-all">
                  {step.summary || step.error}
                </p>
              </div>
            </motion.div>
          ))}

          {logs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#30363d]">
              <button
                onClick={() => setLogsOpen((o) => !o)}
                className="w-full flex items-center justify-between mb-2 cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full bg-white ${isRunning ? "animate-pulse" : ""}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-neutral-200 transition-colors">
                    {isRunning ? "Live Telemetry" : "Execution Trace"}
                  </span>
                  <span className="text-[9px] font-bold text-neutral-600 bg-[#21262d] px-2 py-0.5 rounded-full">
                    {logs.length} lines
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!isRunning && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Process Terminated</span>
                  )}
                  <ChevronDown className={`h-3.5 w-3.5 text-neutral-500 transition-transform duration-200 ${logsOpen ? "rotate-180" : ""}`} />
                </div>
              </button>
              {logsOpen && (
                <div className="space-y-2">
                  {logs.map((log, i) => (
                    <div key={`log-${i}`} className="flex gap-4 group">
                      <span className="text-[10px] text-neutral-600 font-bold min-w-[20px]">{(i + 1).toString().padStart(2, '0')}</span>
                      <p className="text-[11px] text-neutral-500 group-hover:text-neutral-300 transition-colors">
                        <span className="text-neutral-600 mr-2">❯</span>
                        {log}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {finalReport && finalReport.content && (
            <div className="mt-4 space-y-4 border-t border-[#30363d] pt-5">
              <div className="flex items-center justify-between gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300">
                  {finalReport.title}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  What gets posted to GitHub
                </span>
              </div>
              <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-5">
                <div className="mb-4 flex items-center gap-3 border-b border-[#30363d] pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#21262d] text-[11px] font-black text-neutral-300">
                    AI
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-neutral-200">elastic-contributor-copilot bot</span>
                    <span className="text-[10px] text-neutral-500">comment preview</span>
                  </div>
                </div>
                <MarkdownPreview content={finalReport.content} />
              </div>
            </div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}

function Loader({ size }: { size: number }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <Cpu size={size} />
    </motion.div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  let inCodeBlock = false;

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const key = `md-${idx}`;

    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return;
    }

    if (inCodeBlock) {
      nodes.push(
        <pre key={key} className="overflow-x-auto rounded bg-[#0d1117] px-3 py-2 text-[11px] text-neutral-300">
          {line}
        </pre>
      );
      return;
    }

    if (line.startsWith("### ")) {
      nodes.push(
        <h4 key={key} className="pt-2 text-[13px] font-bold text-neutral-200">
          {line.replace(/^###\s+/, "")}
        </h4>
      );
      return;
    }

    if (line.startsWith("## ")) {
      nodes.push(
        <h3 key={key} className="pt-2 text-[14px] font-extrabold text-white">
          {line.replace(/^##\s+/, "")}
        </h3>
      );
      return;
    }

    if (/^\d+\.\s+/.test(line) || line.startsWith("- ")) {
      nodes.push(
        <p key={key} className="pl-2 text-[12px] leading-relaxed text-neutral-300">
          {line}
        </p>
      );
      return;
    }

    if (line.startsWith("---")) {
      nodes.push(<hr key={key} className="my-2 border-[#30363d]" />);
      return;
    }

    if (!line.trim()) {
      nodes.push(<div key={key} className="h-1" />);
      return;
    }

    nodes.push(
      <p key={key} className="text-[12px] leading-relaxed text-neutral-300">
        {line}
      </p>
    );
  });

  return <div className="space-y-2 text-neutral-300">{nodes}</div>;
}
