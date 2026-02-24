"use client";

import { Activity } from "lucide-react";
import MetricsCards from "@/components/MetricsCards";
import SearchDemo from "@/components/SearchDemo";
import AppShell from "@/components/AppShell";

export default function KnowledgePage() {
    return (
        <AppShell>
            <section className="fade-in">
                <div className="flex items-center gap-3 mb-6">
                    <Activity className="h-4 w-4 text-[#b6cff3]" />
                    <h2 className="label-caps">System Knowledge Base</h2>
                </div>
                <MetricsCards />
            </section>

            <section className="fade-in" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center gap-3 mb-6">
                    <Activity className="h-4 w-4 text-[#b6cff3]" />
                    <h2 className="label-caps">Semantic Search</h2>
                </div>
                <div className="app-card">
                    <div className="app-card-content">
                        <SearchDemo />
                    </div>
                </div>
            </section>
        </AppShell>
    );
}
