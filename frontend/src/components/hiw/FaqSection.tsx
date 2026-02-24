"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

const FAQS = [
    {
        q: "Does it work on private repositories?",
        a: "Yes! The system uses a GitHub token for API access, so it works on any repository the token has permissions for — public or private. All data stays within your Elasticsearch cluster."
    },
    {
        q: "What happens if an agent fails?",
        a: "Each agent runs independently in a try/catch. If one agent fails, the others continue normally. The pipeline reports the error for the failed agent and still generates a partial report from the successful agents."
    },
    {
        q: "Can I customize which agents run?",
        a: "Currently the pipeline routes automatically — issues get Agent 1 only, while PRs get all 4 agents. The agent definitions are modular, so adding new agents or modifying existing ones is straightforward by editing the agents list in the pipeline runner."
    },
    {
        q: "How does ELSER semantic search differ from keyword search?",
        a: "ELSER (Elastic Learned Sparse Encoder) understands meaning, not just keywords. For example, searching for 'memory leak in query cache' will find issues about 'OOM errors in the request cache' even though the words don't match — because the concepts are semantically similar."
    },
    {
        q: "How is the knowledge base kept up to date?",
        a: "Two mechanisms: (1) Real-time webhooks index new issues, PRs, and comments as they're created. (2) An incremental sync job runs periodically to catch any updates that webhooks might miss, ensuring the 172K+ document index stays current."
    },
    {
        q: "What LLM powers the agents?",
        a: "The agents use Elastic's Kibana Agent API, which orchestrates calls to the configured LLM with access to Elasticsearch tools. The actual LLM can be swapped — the system is model-agnostic and works with any provider supported by Elastic's inference API."
    },
    {
        q: "How accurate is the duplicate detection?",
        a: "The system uses hybrid search (ELSER semantic + BM25 full-text) which catches both exact and conceptual duplicates. It won't flag false positives as duplicates — it presents similar issues and lets reviewers decide. In testing, it catches duplicates that keyword search alone would miss."
    },
    {
        q: "Can I run the pipeline manually on old issues/PRs?",
        a: "Absolutely! The Execution Workflow page lets you enter any issue or PR number and run the full pipeline on demand. This is useful for retroactive triage or testing the system on specific items."
    },
];

function FaqItem({ faq, index }: { faq: { q: string; a: string }; index: number }) {
    const [open, setOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.06 }}
            className="border-b border-[#7ea4de1a] last:border-0"
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 py-4 px-1 text-left group"
            >
                <HelpCircle className={`h-4 w-4 flex-shrink-0 transition-colors ${open ? "text-[#88c0ff]" : "text-[#6b7f9e]"}`} />
                <span className={`text-sm font-semibold flex-1 transition-colors ${open ? "text-white" : "text-[#b6cff3] group-hover:text-white"}`}>
                    {faq.q}
                </span>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-4 w-4 text-[#6b7f9e]" />
                </motion.div>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <p className="text-xs text-[#8ba4c7] leading-relaxed pb-4 pl-7 pr-4">
                            {faq.a}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function FaqSection() {
    return (
        <div className="app-card">
            <div className="app-card-header">
                <span className="label-caps">Frequently Asked Questions</span>
            </div>
            <div className="app-card-content py-0 px-5">
                {FAQS.map((faq, i) => (
                    <FaqItem key={i} faq={faq} index={i} />
                ))}
            </div>
        </div>
    );
}
