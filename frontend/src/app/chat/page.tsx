"use client";

import { MessageSquare } from "lucide-react";
import RepoChat from "@/components/RepoChat";
import AppShell from "@/components/AppShell";

export default function ChatPage() {
    return (
        <AppShell>
            <section className="fade-in">
                <div className="flex items-center gap-3 mb-6">
                    <MessageSquare className="h-4 w-4 text-[#b6cff3]" />
                    <h2 className="label-caps">Repository Chat</h2>
                </div>
                <RepoChat />
            </section>
        </AppShell>
    );
}
