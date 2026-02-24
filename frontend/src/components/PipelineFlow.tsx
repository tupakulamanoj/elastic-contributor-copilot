"use client";

import { motion } from "framer-motion";
import {
  Search,
  ShieldAlert,
  Zap,
  Scale,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  SkipForward
} from "lucide-react";

interface AgentStep {
  agent: number;
  name: string;
  success: boolean;
  duration_ms: number;
  summary?: string;
  error?: string;
  skipped?: boolean;
}

interface PipelineFlowProps {
  currentStep: number | null;
  steps: AgentStep[];
}

const AGENTS = [
  { id: 1, name: "Retriever", icon: Search },
  { id: 2, name: "Critic", icon: ShieldAlert },
  { id: 3, name: "Quantifier", icon: Zap },
  { id: 4, name: "Resolver", icon: Scale },
];

/* ── Animated connector between two agent blocks ── */
function Connector({
  from,
  to,
  currentStep,
  steps,
}: {
  from: number;
  to: number;
  currentStep: number | null;
  steps: AgentStep[];
}) {
  const fromDone = steps.some((s) => s.agent === from && (s.success || s.skipped));
  const toActive = currentStep === to;
  const toDone = steps.some((s) => s.agent === to && (s.success || s.skipped));

  // States: idle, sending (from done, to active), completed (both done)
  const isSending = fromDone && toActive;
  const isCompleted = fromDone && toDone;

  return (
    <div className="hidden md:flex items-center flex-1 relative mx-[-8px] z-0" style={{ minWidth: 36 }}>
      {/* Base track */}
      <div className="w-full h-[2px] rounded-full bg-[#21262d]" />

      {/* Glow fill – completed */}
      <motion.div
        className="absolute inset-y-0 left-0 h-[2px] rounded-full"
        style={{
          background: isCompleted
            ? "linear-gradient(90deg, rgba(136,192,255,0.6), rgba(200,230,255,0.8))"
            : isSending
              ? "linear-gradient(90deg, rgba(136,192,255,0.5), transparent)"
              : "transparent",
          boxShadow: isCompleted
            ? "0 0 8px rgba(136,192,255,0.4)"
            : "none",
        }}
        initial={{ width: "0%" }}
        animate={{
          width: isCompleted ? "100%" : isSending ? "60%" : "0%",
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />

      {/* Traveling particle – while sending */}
      {isSending && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 h-[6px] w-[6px] rounded-full"
          style={{
            background: "radial-gradient(circle, #fff 0%, rgba(136,192,255,0.9) 60%, transparent 100%)",
            boxShadow: "0 0 10px 3px rgba(136,192,255,0.7), 0 0 20px 6px rgba(136,192,255,0.3)",
          }}
          animate={{ left: ["0%", "100%"] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}

      {/* Burst particles on completion */}
      {isCompleted && (
        <>
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[4px] w-[4px] rounded-full bg-white/60"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 2, 0], opacity: [1, 0.6, 0] }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 16, height: 16,
              background: "radial-gradient(circle, rgba(136,192,255,0.3) 0%, transparent 70%)",
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 1.5], opacity: [0.8, 0] }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </>
      )}
    </div>
  );
}

export default function PipelineFlow({ currentStep, steps }: PipelineFlowProps) {
  return (
    <div className="w-full py-2">
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">

        {AGENTS.map((agent, idx) => {
          const stepData = steps.find((s) => s.agent === agent.id);
          const isActive = currentStep === agent.id;
          const isDone = steps.some((s) => s.agent === agent.id && s.success);
          const isSkipped = stepData?.skipped === true;
          const hasError = steps.some((s) => s.agent === agent.id && !s.success);

          return (
            <div key={agent.id} className="contents">
              {/* Connector BEFORE this agent (between previous and current) */}
              {idx > 0 && (
                <Connector
                  from={AGENTS[idx - 1].id}
                  to={agent.id}
                  currentStep={currentStep}
                  steps={steps}
                />
              )}

              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.08 : 1,
                  y: isActive ? -6 : 0,
                }}
                className={`relative z-10 flex flex-col items-center gap-4 rounded-3xl px-6 py-6 transition-all duration-500
                  ${isActive ? "bg-[#1c2128] ring-2 ring-white/20 shadow-[0_0_40px_rgba(136,192,255,0.08)]" : "bg-[#0d1117]"}
                  ${isSkipped ? "opacity-50" : ""}
                  ${isDone && !isSkipped ? "border-neutral-600" : "border-transparent"}
                `}
              >
                {/* Active glow ring */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse at center, rgba(136,192,255,0.06) 0%, transparent 70%)",
                    }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}

                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-300
                  ${isActive ? "border-white/40 bg-white/10 shadow-[0_0_24px_rgba(136,192,255,0.15)]" : "border-[#30363d] bg-[#161b22]"}
                  ${isDone && !isSkipped ? "border-white/30 bg-white/5" : ""}
                  ${isSkipped ? "border-[#30363d]/50 bg-[#161b22]/50" : ""}
                  ${hasError ? "border-neutral-500 bg-neutral-800/30" : ""}
                `}>
                  {isActive ? (
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  ) : isSkipped ? (
                    <SkipForward className="h-7 w-7 text-neutral-600" />
                  ) : isDone ? (
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  ) : hasError ? (
                    <AlertCircle className="h-8 w-8 text-neutral-400" />
                  ) : (
                    <agent.icon className="h-7 w-7 text-neutral-400" />
                  )}
                </div>

                <div className="text-center space-y-1">
                  <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${isActive ? "text-white" : isSkipped ? "text-neutral-600" : "text-neutral-500"}`}>
                    Agent 0{agent.id}
                  </p>
                  <p className={`text-sm font-bold ${isActive ? "text-white" : isSkipped ? "text-neutral-600" : "text-neutral-300"}`}>
                    {agent.name}
                  </p>
                </div>

                <div className="h-4">
                  {isSkipped && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#161b22]/60 border border-[#30363d]/50"
                    >
                      <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Skipped</span>
                    </motion.div>
                  )}
                  {isDone && !isSkipped && stepData && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#161b22] border border-[#30363d]"
                    >
                      <Clock className="h-2.5 w-2.5 text-neutral-500" />
                      <span className="text-[10px] font-bold text-neutral-400 mono-text">
                        {stepData.duration_ms}ms
                      </span>
                    </motion.div>
                  )}
                  {isActive && (
                    <span className="text-[9px] font-black text-white animate-pulse tracking-widest">RUNNING</span>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {currentStep && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 flex items-center justify-center"
        >
          <div className="px-6 py-3 rounded-2xl bg-white/5 border border-[#30363d] backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-white animate-ping absolute inset-0" />
                <div className="h-2 w-2 rounded-full bg-white relative" />
              </div>
              <p className="text-xs font-semibold text-neutral-300 tracking-tight">
                <span className="text-white font-black">ACTIVE:</span> Agent {currentStep} is executing semantic verification on repository nodes...
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
