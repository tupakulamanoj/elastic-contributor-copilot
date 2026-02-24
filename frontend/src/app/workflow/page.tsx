"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Layers,
    CheckCircle2,
    Clock,
} from "lucide-react";
import PipelineFlow from "@/components/PipelineFlow";
import RunPanel from "@/components/RunPanel";
import LiveActivityFeed from "@/components/LiveActivityFeed";
import AppShell from "@/components/AppShell";

interface AgentStep {
    agent: number;
    name: string;
    success: boolean;
    duration_ms: number;
    summary?: string;
    error?: string;
}

function buildFallbackFinalReport(mode: string, number: number, runSteps: AgentStep[]) {
    const step2 = runSteps.find((s) => s.agent === 2);
    const step3 = runSteps.find((s) => s.agent === 3);
    const step4 = runSteps.find((s) => s.agent === 4);

    if (mode === "conflict") {
        return `## Conflict Resolution Report for PR #${number}\n\n${step4?.summary || step4?.error || "No reviewer conflicts detected in this PR. Consensus maintained."}`;
    }

    if (mode === "pr") {
        return `## Elastic Contributor Co-pilot - Full Quality Report for PR #${number}

### Architecture Review
${step2?.summary || step2?.error || "_No architectural concerns found for this change._"}

### Performance Impact Assessment
${step3?.summary || step3?.error || "_No performance-sensitive modules affected by this change._"}
`;
    }

    if (mode === "issue") {
        const step1 = runSteps.find((s) => s.agent === 1);
        return step1?.summary || "";
    }

    return "";
}

export default function WorkflowPage() {
    const [currentStep, setCurrentStep] = useState<number | null>(null);
    const [steps, setSteps] = useState<AgentStep[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [lastRun, setLastRun] = useState<{ total_time: number; success: boolean } | null>(null);
    const [finalReport, setFinalReport] = useState<{ title: string; content: string } | null>(null);
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [runMode, setRunMode] = useState("pr");
    const [runNumber, setRunNumber] = useState(95103);
    const wsRef = useRef<WebSocket | null>(null);


    const attachPipelineSocketHandlers = useCallback((ws: WebSocket, mode: string, number: number) => {
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case "run_id":
                    if (typeof data.run_id === "string" && data.run_id) setActiveRunId(data.run_id);
                    if (data.status === "not_found") {
                        // Run no longer exists (backend restarted) — reset everything
                        setIsRunning(false);
                        setActiveRunId(null);
                        setCurrentStep(null);
                        setLogs([]);
                        setSteps([]);
                        ws.close();
                        return;
                    }
                    if (data.status === "complete" || data.status === "error") setIsRunning(false);
                    break;
                case "log":
                    setLogs((prev) => [...prev, data.message]);
                    break;
                case "agent_start":
                    setCurrentStep(data.agent);
                    break;
                case "agent_done":
                    setSteps((prev) => {
                        const rest = prev.filter((s) => s.agent !== data.agent);
                        return [...rest, { agent: data.agent, name: data.name, success: true, duration_ms: data.duration_ms, summary: data.result }].sort((a, b) => a.agent - b.agent);
                    });
                    break;
                case "agent_error":
                    setSteps((prev) => {
                        const rest = prev.filter((s) => s.agent !== data.agent);
                        return [...rest, { agent: data.agent, name: data.name, success: false, duration_ms: data.duration_ms, error: data.error }].sort((a, b) => a.agent - b.agent);
                    });
                    break;
                case "complete":
                    setIsRunning(false);
                    setActiveRunId(null);
                    setCurrentStep(null);
                    setLastRun({ total_time: data.total_time_ms, success: data.success });
                    const normalizedSteps: AgentStep[] = Array.isArray(data.steps) && data.steps.length > 0 ? data.steps : steps;
                    if (Array.isArray(data.steps) && data.steps.length > 0) setSteps(data.steps);
                    const computedFinalOutput = typeof data.final_output === "string" && data.final_output.trim()
                        ? data.final_output
                        : buildFallbackFinalReport(mode, number, normalizedSteps);
                    if (computedFinalOutput.trim()) {
                        const reportTitle = mode === "conflict" ? "Conflict Resolution Comment Preview" : "GitHub Comment Preview";
                        setFinalReport({ title: reportTitle, content: computedFinalOutput });
                        setLogs((prev) => [
                            ...prev,
                            "============================================================",
                            `FINAL OUTPUT: ${reportTitle}`,
                            "============================================================",
                            ...computedFinalOutput.split("\n"),
                            "============================================================",
                        ]);
                    }
                    ws.close();
                    break;
                case "final_report":
                    if (typeof data.content === "string" && data.content.trim()) {
                        const reportTitle = data.title || "GitHub Comment Preview";
                        setFinalReport({ title: reportTitle, content: data.content });
                        setLogs((prev) => [
                            ...prev,
                            "============================================================",
                            `FINAL OUTPUT: ${reportTitle}`,
                            "============================================================",
                            ...data.content.split("\n"),
                            "============================================================",
                        ]);
                    }
                    break;
            }
        };
        ws.onerror = () => {
            setIsRunning(false);
            setCurrentStep(null);
            setLogs((prev) => [...prev, "WebSocket error while streaming pipeline."]);
        };
        ws.onclose = () => {
            wsRef.current = null;
        };
    }, [steps]);

    const startPipeline = (mode: string, number: number) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
        setSteps([]);
        setLogs([]);
        setLastRun(null);
        setFinalReport(null);
        setCurrentStep(null);
        setRunMode(mode);
        setRunNumber(number);
        setIsRunning(true);
        const ws = new WebSocket(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws")}/ws/pipeline`);
        wsRef.current = ws;
        ws.onopen = () => {
            ws.send(JSON.stringify({ mode, number }));
        };
        attachPipelineSocketHandlers(ws, mode, number);
    };

    // On unmount: close WebSocket cleanly
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.onerror = null;
                wsRef.current.onmessage = null;
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    return (
        <AppShell>
            {/* Live GitHub Activity */}
            <section className="fade-in">
                <LiveActivityFeed />
            </section>

            {/* Pipeline Execution */}
            <section className="fade-in">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Layers className="h-4 w-4 text-[#b6cff3]" />
                        <h2 className="label-caps">Execution Workflow</h2>
                    </div>
                    {lastRun && (
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[#c2d6f3] bg-[#102342c2] px-4 py-2 rounded-lg ring-1 ring-[#8ab3eb4a]">
                            <span className="flex items-center gap-1.5 text-white">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Success
                            </span>
                            <div className="h-3 w-px bg-[#8ab3eb4a]" />
                            <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {lastRun.total_time}ms
                            </span>
                        </div>
                    )}
                </div>

                <div className="app-card">
                    <div className="app-card-header">
                        <PipelineFlow currentStep={currentStep} steps={steps} />
                    </div>
                    <div className="app-card-content bg-[#08162bcc]">
                        <RunPanel
                            onStart={startPipeline}
                            steps={steps}
                            logs={logs}
                            isRunning={isRunning}
                            finalReport={finalReport}
                        />
                    </div>
                </div>
            </section>

            {/* Final Report */}
            {finalReport && !isRunning && (
                <section className="fade-in space-y-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                        <h2 className="label-caps">Final Report (GitHub Comment Preview)</h2>
                    </div>
                    <div className="app-card">
                        <div className="app-card-header px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-bold text-white">{finalReport.title}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-[#b9d0f0]">
                                    Final output after execution
                                </div>
                            </div>
                        </div>
                        <div className="app-card-content p-6">
                            <pre className="whitespace-pre-wrap rounded-2xl border border-[#7ea4de4a] bg-[#102342c2] p-5 text-[12px] leading-relaxed text-[#d3e6ff]">
                                {finalReport.content}
                            </pre>
                        </div>
                    </div>
                </section>
            )}
        </AppShell>
    );
}
