"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Database, Brain, Zap, Clock } from "lucide-react";

const STATS = [
    { label: "Documents Indexed", value: 172000, suffix: "+", icon: Database, color: "#88c0ff" },
    { label: "AI Agents", value: 4, suffix: "", icon: Brain, color: "#f0a8ff" },
    { label: "Avg Pipeline Time", value: 60, suffix: "s", prefix: "< ", icon: Zap, color: "#ffcc66" },
    { label: "Manual Steps Eliminated", value: 12, suffix: "", icon: Clock, color: "#66eebb" },
];

function AnimatedCounter({ target, duration = 2000, prefix = "", suffix = "" }: { target: number; duration?: number; prefix?: string; suffix?: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref as React.RefObject<Element>, { once: true });

    useEffect(() => {
        if (!inView) return;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [inView, target, duration]);

    const display = target >= 1000 ? `${prefix}${(count / 1000).toFixed(count >= target ? 0 : 0)}K${suffix}` : `${prefix}${count}${suffix}`;
    return <span ref={ref} className="mono-text">{display}</span>;
}

export default function StatsBar() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="app-card text-center py-6 px-4 cursor-default"
                >
                    <motion.div
                        className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border mb-3"
                        style={{ borderColor: `${stat.color}44`, background: `${stat.color}0d`, boxShadow: `0 0 20px ${stat.color}15` }}
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                    >
                        <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                    </motion.div>
                    <div className="text-2xl font-black text-white mb-1">
                        <AnimatedCounter target={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8ba4c7]">{stat.label}</div>
                </motion.div>
            ))}
        </div>
    );
}
