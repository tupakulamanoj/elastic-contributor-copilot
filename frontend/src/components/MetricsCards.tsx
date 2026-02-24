"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Brain,
  BarChart3,
  Scale,
  History,
  GitPullRequest,
  AlertCircle,
  Code
} from "lucide-react";

interface Stat {
  name: string;
  label: string;
  count: number;
  icon: string;
}

export default function MetricsCards() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/stats`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) {
            setStats(data.indices || []);
            setLoading(false);
          }
        })
        .catch(() => {
          // Backend may not be ready yet — retry in 3s
          if (!cancelled) setTimeout(load, 3000);
        });
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("issue")) return <AlertCircle className="h-4 w-4 text-neutral-400" />;
    if (l.includes("pr") || l.includes("pull")) return <GitPullRequest className="h-4 w-4 text-neutral-400" />;
    if (l.includes("code") || l.includes("file")) return <Code className="h-4 w-4 text-neutral-400" />;
    if (l.includes("agent") || l.includes("brain")) return <Brain className="h-4 w-4 text-neutral-400" />;
    if (l.includes("metric") || l.includes("stat")) return <BarChart3 className="h-4 w-4 text-neutral-400" />;
    if (l.includes("conflict")) return <Scale className="h-4 w-4 text-neutral-400" />;
    if (l.includes("history")) return <History className="h-4 w-4 text-neutral-400" />;
    return <Database className="h-4 w-4 text-neutral-400" />;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-[#161b22] border border-[#30363d]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {stats.map((stat, i) => (
        <div
          key={stat.name}
          className="stagger-item group relative flex flex-col justify-between p-6 rounded-2xl bg-[#161b22] border border-[#30363d] hover:border-neutral-500 hover:bg-[#1c2128] transition-all duration-300 shadow-lg"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-xl bg-[#0d1117] p-2.5 group-hover:bg-white/5 transition-colors">
              {getIcon(stat.label)}
            </div>
            <div className="h-1.5 w-1.5 rounded-full bg-[#30363d] group-hover:bg-white transition-colors" />
          </div>

          <div className="flex flex-col">
            <span className="text-3xl font-black text-white tracking-tighter mb-1">
              {stat.count.toLocaleString()}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 group-hover:text-neutral-400 transition-colors">
              {stat.label}
            </span>
          </div>

          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="h-px w-8 bg-white/20" />
          </div>
        </div>
      ))}
    </div>
  );
}
