"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Sparkles,
    Github,
    ChevronRight,
    ExternalLink,
    Layers,
    TrendingUp,
    Brain,
    Activity,
    MessageSquare,
} from "lucide-react";
import LightRays from "@/components/LightRays";

const NAV_ITEMS = [
    { href: "/how-it-works", label: "How It Works", icon: Brain },
    { href: "/workflow", label: "Execution Workflow", icon: Layers },
    { href: "/impact", label: "Measurable Impact", icon: TrendingUp },
    { href: "/chat", label: "Repository Chat", icon: MessageSquare },
    { href: "/knowledge", label: "System Knowledge Base", icon: Activity },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="relative min-h-screen overflow-hidden text-white">
            {/* Background */}
            <div className="fixed inset-0 z-0 opacity-70">
                <LightRays
                    raysOrigin="top-center"
                    raysColor="#9dc0ff"
                    raysSpeed={1.05}
                    lightSpread={1.45}
                    rayLength={2.1}
                    pulsating
                    fadeDistance={1.35}
                    saturation={0.9}
                    followMouse
                    mouseInfluence={0.12}
                    noiseAmount={0.05}
                    distortion={0.16}
                />
            </div>
            <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_12%,rgba(120,160,255,0.22),transparent_45%),radial-gradient(circle_at_78%_18%,rgba(90,135,255,0.18),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(150,190,255,0.14),transparent_42%)]" />

            {/* Top Bar */}
            <header className="sticky top-0 z-50 border-b border-[#7ea4de4a] bg-[#061327]/70 backdrop-blur-xl">
                <div className="flex h-16 items-center justify-between px-8">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                                <Sparkles className="h-4 w-4 text-black" />
                            </div>
                            <span className="text-[15px] font-bold tracking-tight text-white">Elastic Pilot</span>
                        </Link>
                        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#9fb5d6]">
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-[#d3e6ff]">
                                {pathname === "/" ? "Dashboard" : NAV_ITEMS.find((n) => n.href === pathname)?.label || "Page"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#e3f1ff] bg-[#9cc2ff1f] px-3 py-1.5 rounded-full border border-[#8ab3eb66]">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            Elastic Cloud Active
                        </div>
                        <div className="h-6 w-px bg-[#7ea4de4a]" />
                        <a
                            href="https://github.com/elastic/elasticsearch"
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center gap-2 text-[#a8c0e1] hover:text-white transition-colors"
                        >
                            <Github className="h-4 w-4" />
                            <span className="hidden md:inline text-xs font-semibold">elastic/elasticsearch</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <nav className="flex items-center gap-1 px-8 -mb-px">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                  group flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-200
                  border-b-2
                  ${isActive
                                        ? "border-white text-white"
                                        : "border-transparent text-[#8b9fc0] hover:text-[#d3e6ff] hover:border-[#8b9fc066]"
                                    }
                `}
                            >
                                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-[#6b7f9e] group-hover:text-[#9fb5d6]"} transition-colors`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            {/* Content */}
            <main className="relative z-10 mx-auto max-w-[1440px] px-8 py-14 space-y-14">
                {children}
            </main>

            {/* Footer */}
            <footer className="relative z-10 mx-auto max-w-[1440px] px-8 pt-14 pb-8 border-t border-[#7ea4de4a] flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b9d0f0]">Hackathon Submission 2026</div>
                    <div className="text-[11px] font-bold text-[#98b3d8]">Powered by Elastic Agent Orchestrator</div>
                </div>
                <div className="flex flex-wrap justify-center items-center gap-8">
                    <div className="flex items-center gap-2 group">
                        <Brain className="h-4 w-4 text-[#9ec0f7] group-hover:text-white transition-colors" />
                        <span className="text-[10px] font-bold text-[#b9d0f0]">ELSER V2.4</span>
                    </div>
                    <div className="flex items-center gap-2 group">
                        <Activity className="h-4 w-4 text-[#9ec0f7] group-hover:text-white transition-colors" />
                        <span className="text-[10px] font-bold text-[#b9d0f0]">INDEX MANAGER</span>
                    </div>
                    <div className="flex items-center gap-2 group">
                        <Layers className="h-4 w-4 text-[#9ec0f7] group-hover:text-white transition-colors" />
                        <span className="text-[10px] font-bold text-[#b9d0f0]">4-AGENT FLOW</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
