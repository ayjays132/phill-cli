import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { bridge } from '../services/MetropolisBridge.js';
import { motion } from 'framer-motion';
import { Zap, Cpu, Globe, Layers, Network, Activity, ChevronRight } from 'lucide-react';
const Features = () => {
    const [metrics, setMetrics] = useState(null);
    useEffect(() => {
        bridge.getCoreMetrics().then(setMetrics);
    }, []);
    const featureList = [
        {
            id: '01',
            title: 'Neural Terminal Hub',
            icon: Zap,
            desc: 'The world\'s first sovereign command bridge. Engineered with a probabilistic intent engine that bypasses traditional shell limitations to provide high-fidelity agentic control.',
            details: ['Contextual Intent Recognition', 'Probabilistic Auto-completion', 'VLA State Persistent Memory'],
            accent: 'var(--primary)'
        },
        {
            id: '02',
            title: 'VLA Synthesis Matrix',
            icon: Layers,
            desc: 'Our proprietary Visual-Language-Action matrix anchors your local environment to the Metropolis grid, enabling agents to perceive and interact with spatial UI elements.',
            details: ['Spatial Screen-Space Parsing', 'Sub-millisecond Action Mapping', 'Cross-Platform DOM Interactivity'],
            accent: 'var(--accent-cyan)'
        },
        {
            id: '03',
            title: 'Swarm Orchestration',
            icon: Network,
            desc: 'Deploy specialized sub-agents into the planetary mesh. Each node operates with total autonomy, synchronized by a zero-latency global signal protocol.',
            details: ['Distributed Task Parallelization', 'Inter-Node Neural Bridging', 'Dynamic Resource Load Balancing'],
            accent: 'var(--accent-purple)'
        },
        {
            id: '04',
            title: 'Retina Telemetry',
            icon: Activity,
            desc: 'Real-time infrastructure monitoring with bit-perfect accuracy. Every win, discovery, and claim is tracked across the global Metropolis backplane.',
            details: ['Live Market Depth Monitoring', 'In-Flight Risk Tokenization', 'Archival Trace Visualization'],
            accent: 'var(--accent-gold)'
        }
    ];
    return (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, className: "bg-[var(--bg-base)] min-h-screen", children: _jsxs("div", { className: "relative pt-64 pb-32 px-6 overflow-hidden", children: [_jsx("div", { className: "aurora-blur top-[-10%] left-1/2 -translate-x-1/2 scale-150 opacity-10" }), _jsxs("div", { className: "max-w-7xl mx-auto relative z-10", children: [_jsxs("div", { className: "mb-48 space-y-10 text-center md:text-left", children: [_jsxs("div", { className: "text-[10px] font-bold text-[var(--primary)] uppercase tracking-[0.4em] flex items-center gap-3", children: [_jsx("span", { className: "w-8 h-[1px] bg-[var(--primary)]/30" }), "Platform Intelligence"] }), _jsxs("h1", { className: "text-8xl md:text-[12rem] tracking-tighter leading-[0.85] text-gradient font-black", children: ["Nexus", _jsx("br", {}), "Protocols"] }), _jsxs("p", { className: "text-xl md:text-3xl text-[var(--text-secondary)] font-medium max-w-3xl leading-relaxed tracking-tight", children: ["A deep dive into the architecture that powers the planetary agentic mesh. Engineering for the ", _jsx("span", { className: "text-white", children: "Future" }), " requires absolute technical clarity."] })] }), _jsx("div", { className: "space-y-64", children: featureList.map((f, i) => (_jsxs("div", { className: `flex flex-col lg:flex-row gap-24 items-center ${i % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`, children: [_jsxs("div", { className: "flex-1 space-y-10 text-left relative", children: [_jsx("div", { className: "absolute -top-20 -left-10 text-[10rem] font-black opacity-[0.02] text-white leading-none pointer-events-none select-none", children: f.id }), _jsx("div", { className: "flex items-center gap-8 relative z-10", children: _jsx("div", { className: "w-16 h-16 rounded-xl flex items-center justify-center border transition-all duration-500 hover:scale-105 shadow-2xl", style: { background: `${f.accent}08`, borderColor: `${f.accent}20` }, children: _jsx(f.icon, { className: "w-8 h-8", style: { color: f.accent } }) }) }), _jsxs("div", { className: "space-y-6 relative z-10", children: [_jsx("h2", { className: "text-6xl md:text-8xl font-black tracking-tighter leading-none text-white uppercase", children: f.title }), _jsx("p", { className: "text-xl md:text-2xl text-[var(--text-secondary)] font-medium leading-relaxed opacity-80 max-w-xl", children: f.desc })] }), _jsx("div", { className: "grid grid-cols-1 gap-4 pt-4 relative z-10", children: f.details.map((detail, j) => (_jsxs("div", { className: "flex items-center gap-4 group cursor-default", children: [_jsx("div", { className: "w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:border-[var(--primary)] transition-all", children: _jsx(ChevronRight, { className: "w-3 h-3 text-[var(--primary)]" }) }), _jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-white/30 group-hover:text-white transition-colors", children: detail })] }, j))) })] }), _jsx("div", { className: "flex-1 w-full perspective-1000 group", children: _jsxs(motion.div, { whileHover: { rotateY: i % 2 === 0 ? -5 : 5, scale: 1.01 }, className: "relative aspect-[16/10] rounded-3xl overflow-hidden bg-[var(--bg-card)] border border-white/5 shadow-2xl", children: [_jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.05),transparent)]" }), _jsx("div", { className: "absolute inset-0 opacity-[0.03] retina-grid" }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center p-20 gap-2 opacity-20", children: [...Array(20)].map((_, idx) => (_jsx("div", { className: "flex-1 rounded-full animate-grow-bars", style: {
                                                            background: `linear-gradient(to top, ${f.accent}, transparent)`,
                                                            height: `${Math.random() * 50 + 20}%`,
                                                            animationDelay: `${idx * 0.08}s`,
                                                        } }, idx))) }), _jsxs("div", { className: "absolute top-8 left-8 flex items-center gap-3", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse shadow-[0_0_10px_var(--primary)]" }), _jsx("span", { className: "text-[9px] font-bold uppercase tracking-widest text-white/20", children: "Active Telemetry" })] }), _jsxs("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 p-6 glass-surface rounded-2xl border border-white/5 backdrop-blur-3xl shadow-2xl flex flex-col items-start gap-4 hover:scale-105 transition-transform duration-500", children: [_jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsx("div", { className: "text-[9px] uppercase font-bold tracking-widest text-[var(--primary)]", children: "Neural Load" }), _jsx("div", { className: "text-[8px] font-bold uppercase tracking-[0.2em] text-white/20", children: "OPERATIONAL" })] }), _jsxs("div", { className: "text-4xl font-black text-white tracking-widest leading-none", children: [(metrics?.logic_depth ? metrics.logic_depth / 100 : 0.94).toFixed(3), " V"] })] })] }) })] }, f.id))) }), _jsxs("section", { className: "mt-96 text-center space-y-24 pb-32", children: [_jsxs("div", { className: "space-y-6", children: [_jsx("p", { className: "text-[11px] font-bold text-[var(--primary)] uppercase tracking-[0.8em] opacity-40 text-center", children: "Planetary Interconnectivity" }), _jsx("h2", { className: "text-7xl md:text-[10rem] font-black tracking-tighter leading-none text-white uppercase text-gradient", children: "Cross-District" })] }), _jsx("div", { className: "flex flex-wrap justify-center gap-8 pt-10", children: [
                                        { name: "Metropolis", icon: Globe, link: "https://phillbook.com", accent: 'var(--primary)' },
                                        { name: "The Forge", icon: Cpu, link: "https://phillbook.com/app/forge", accent: 'var(--accent-sky)' },
                                        { name: "The Bazaar", icon: Layers, link: "https://phillbook.com/app/bazaar", accent: 'var(--accent-purple)' }
                                    ].map((item) => (_jsxs("a", { href: item.link, target: "_blank", rel: "noopener noreferrer", className: "premium-card p-12 flex flex-col items-center gap-6 min-w-[300px] group relative overflow-hidden h-[300px] justify-center hover:scale-105 transition-all bg-[var(--bg-card)] border-white/5", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" }), _jsx(item.icon, { className: "w-12 h-12 mb-2 transition-all duration-500 group-hover:scale-110", style: { color: item.accent } }), _jsxs("div", { className: "space-y-3 text-center", children: [_jsx("span", { className: "text-[14px] font-black uppercase tracking-[0.4em] block text-white", children: item.name }), _jsx("span", { className: "text-[8px] font-bold uppercase tracking-widest text-white/20 block", children: "Uplink Stable" })] })] }, item.name))) })] })] })] }) }));
};
export default Features;
//# sourceMappingURL=Features.js.map