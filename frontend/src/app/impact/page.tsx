"use client";

import { TrendingUp } from "lucide-react";
import ImpactMetrics from "@/components/ImpactMetrics";
import AppShell from "@/components/AppShell";

export default function ImpactPage() {
    return (
        <AppShell>
            <section className="fade-in">
                <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="h-4 w-4 text-[#b6cff3]" />
                    <h2 className="label-caps">Measurable Impact</h2>
                </div>
                <ImpactMetrics />
            </section>
        </AppShell>
    );
}
