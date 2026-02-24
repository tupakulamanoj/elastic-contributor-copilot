"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Brain,
  Zap,
  Activity,
  Layers,
  TrendingUp,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import TextType from "@/components/TextType";
import AppShell from "@/components/AppShell";

function AgentBeamMap() {
  const agents = [
    { icon: Search, label: "Context Retriever", color: "text-[#9fd2ff]", beamY: 30 },
    { icon: Brain, label: "Architecture Critic", color: "text-[#d8e8ff]", beamY: 85 },
    { icon: Activity, label: "Impact Quantifier", color: "text-[#8fc4ff]", beamY: 145 },
    { icon: Zap, label: "Conflict Resolver", color: "text-white", beamY: 200 },
  ];
  const hub = { x: 90, y: 120 };

  return (
    <div className="relative w-[26rem] h-60 shrink-0 rounded-2xl border border-[#8ab3eb52] bg-[#0d1f3ab3] overflow-hidden">
      {/* SVG beams */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 512 240" aria-hidden>
        <Link href="/how-it-works" className="cursor-pointer">
          <circle cx={hub.x} cy={hub.y} r="40" fill="#0f2442" fillOpacity="0.75" stroke="#b9d7ff66" strokeWidth="1.5" className="hover:fill-[#162d52] transition-colors" />
          <g transform={`translate(${hub.x - 14}, ${hub.y - 14}) scale(1.75)`}>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" fill="#d9ecff" />
          </g>
        </Link>
        {agents.map((agent, idx) => (
          <g key={idx}>
            <line x1={hub.x} y1={hub.y} x2={295} y2={agent.beamY} stroke="#7fb4f8" strokeOpacity="0.18" strokeWidth="1.5" />
            <line
              x1={hub.x} y1={hub.y} x2={295} y2={agent.beamY}
              stroke="#d9ecff" strokeOpacity="0.7" strokeWidth="2"
              strokeDasharray="10 8"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-72" dur={`${2.6 + idx * 0.25}s`} repeatCount="indefinite" />
            </line>
          </g>
        ))}
      </svg>

      {/* Agent cards - flexbox stack */}
      <div className="absolute right-3 top-0 h-full flex flex-col justify-evenly py-2">
        {agents.map((agent, idx) => {
          const Icon = agent.icon;
          return (
            <Link
              key={idx}
              href={`/how-it-works#agent-${idx + 1}`}
              className="flex items-center gap-2.5 rounded-xl border border-[#9fc8ff85] bg-[#0f213ec4] px-3 py-1.5 shadow-[0_0_22px_rgba(130,180,255,0.15)] hover:border-[#b9d7ff] hover:bg-[#162d52] transition-all cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#9fc8ff85] bg-[#0b1a31c4] shadow-[0_0_18px_rgba(130,180,255,0.32)]">
                <Icon className={`h-4 w-4 ${agent.color}`} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#d6e9ff]">{agent.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const NAV_CARDS = [
  {
    href: "/workflow",
    icon: Layers,
    title: "Execution Workflow",
    desc: "Run the 4-agent pipeline on PRs and issues. Context retrieval, architecture review, impact analysis, and conflict resolution.",
    accent: "#7fb4f8",
  },
  {
    href: "/impact",
    icon: TrendingUp,
    title: "Measurable Impact",
    desc: "See how AI agents compare to manual workflows. Per-agent speedup, time saved, and ELSER search latency.",
    accent: "#a0d4ff",
  },
  {
    href: "/chat",
    icon: MessageSquare,
    title: "Repository Chat",
    desc: "Query the knowledge base in natural language. Ask about issues, PRs, code owners, diffs, and more.",
    accent: "#c8e2ff",
  },
  {
    href: "/knowledge",
    icon: Activity,
    title: "System Knowledge Base",
    desc: "Explore 172K+ indexed documents across issues, PRs, coding standards, benchmarks, and CODEOWNERS rules.",
    accent: "#e0eeff",
  },
];

export default function Dashboard() {
  const [startHeroTyping, setStartHeroTyping] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStartHeroTyping(true);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AppShell>
      {/* Hero */}
      <section className="fade-in max-w-6xl">
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10">
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-white">
              Contributor Co-pilot{" "}
              <span className="underline decoration-[#9ec0f7] underline-offset-8">Intelligence</span>
            </h1>
            {startHeroTyping ? (
              <TextType
                as="p"
                text="Accelerate your open-source workflow with automated multi-agent triage. Analyze PRs, resolve conflicts, and explore the knowledge base semantically."
                className="text-[#c7dcf7] text-base sm:text-lg leading-relaxed max-w-2xl"
                typingSpeed={45}
                deletingSpeed={20}
                pauseDuration={4000}
                loop
                startOnVisible
                showCursor
                hideCursorWhileTyping={false}
              />
            ) : (
              <p className="text-[#c7dcf7] text-base sm:text-lg leading-relaxed max-w-2xl opacity-0">
                Accelerate your open-source workflow with automated multi-agent triage.
              </p>
            )}
          </div>
          <div className="hidden justify-self-end pr-1 md:block lg:pr-6">
            <AgentBeamMap />
          </div>
        </div>
      </section>

      {/* Navigation Cards */}
      <section className="fade-in" style={{ animationDelay: "120ms" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {NAV_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="stagger-item group relative flex flex-col justify-between p-6 rounded-2xl bg-[#161b22] border border-[#30363d] hover:border-[#8ab3eb] hover:bg-[#1c2128] transition-all duration-300 shadow-lg"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-xl bg-[#0d1117] p-3 group-hover:bg-white/5 transition-colors">
                    <Icon className="h-5 w-5 text-[#b6cff3] group-hover:text-white transition-colors" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#30363d] group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-white">{card.title}</span>
                  <span className="text-[12px] leading-relaxed text-neutral-500 group-hover:text-neutral-400 transition-colors">
                    {card.desc}
                  </span>
                </div>
                <div
                  className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 rounded-b-2xl"
                  style={{ background: card.accent }}
                />
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
