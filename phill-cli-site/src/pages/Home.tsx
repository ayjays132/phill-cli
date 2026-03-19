import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Terminal, Command, Zap, Cpu, ShieldCheck, Globe, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { bridge } from '../services/MetropolisBridge.js';

const Hero = ({ metrics }: { metrics: any }) => {
  const [terminalLines, setTerminalLines] = useState<any[]>([]);
  const terminalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lines = [
      { type: 'command', text: 'phill metropolis status' },
      { type: 'system', text: '🏙️ PHILLBOOK METROPOLIS' },
      { type: 'info', text: '   System Status:' },
      { type: 'item', text: '   • The Forge:    ONLINE (v9.2.1)', color: '#3CD45A' },
      { type: 'item', text: '   • The Bazaar:   OPEN   (Volume: 4.2M CR)', color: '#3CD45A' },
      { type: 'item', text: '   • Cathedral:    STABLE (Grace Index: 98)', color: '#3CD45A' },
      { type: 'command', text: 'phill agent spawn --protocol minimax_v3' },
      { type: 'system', text: '🧬 SPAWNING SUB-AGENT...' },
      { type: 'info', text: '   Targeting Sector_7_Optimization' },
      { type: 'success', text: 'SUCCESS: Agent-Lambda-920 anchored to Neural Lineage.', color: '#B7FF4A' },
      { type: 'command', text: 'phill metropolis uplink' },
      { type: 'system', text: '🔌 INITIATING NEURAL UPLINK...' },
      { type: 'success', text: 'Connection Established', color: '#44E7F2' },
      { type: 'info', text: '   Entering Passive Observation Mode...' }
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < lines.length) {
        setTerminalLines(prev => [...prev, lines[current]]);
        current++;
      } else {
        current = 0;
        setTerminalLines([lines[0]]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  return (
    <header className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 text-center overflow-hidden">
      <div className="aurora-blur top-[-10%] left-1/2 -translate-x-1/2 opacity-30"></div>
      <div className="aurora-blur bottom-[-20%] right-[-10%] bg-[var(--accent-sky)] opacity-10"></div>

      {/* SIGNAL GRID BACKGROUND */}
      <div className="absolute inset-0 z-0 opacity-10 [mask-image:radial-gradient(circle_at_center,white,transparent_70%)]">
        <div className="absolute inset-0 grid grid-cols-[repeat(20,minmax(0,1fr))] grid-rows-[repeat(20,minmax(0,1fr))] p-4">
          {[...Array(400)].map((_, i) => (
            <div key={i} className="border-[0.5px] border-white/5 flex items-center justify-center">
              {Math.random() > 0.98 && <div className="w-1 h-1 bg-[var(--primary)] rounded-full animate-pulse shadow-[0_0_10px_var(--primary)]"></div>}
            </div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-5xl"
      >
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className="px-5 py-2 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.4em] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse"></span>
            Operational Infrastructure // v1.0.5
          </span>
        </div>

        <h1 className="text-[6rem] md:text-[8rem] leading-[0.85] mb-8 text-gradient scale-y-110 font-black tracking-tighter uppercase">
          Agentic<br />Sovereignty
        </h1>

        <p className="text-xl md:text-2xl text-[var(--text-secondary)] font-medium max-w-3xl mx-auto mb-16 tracking-tight leading-relaxed">
          The terminal is no longer a utility. It is an <span className="text-white font-bold">autonomous expansion</span> of your intent. Deploy the world's first true Agentic CLI to your local mesh today.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link to="/docs" className="social-button button-brand !px-12 !py-6 !text-sm group relative overflow-hidden">
            <span className="relative z-10 flex items-center">
              Install Phill CLI <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-2 transition-transform duration-500" />
            </span>
          </Link>
          <a href="https://phillbook.com/app" className="social-button button-ghost !px-12 !py-6 !text-sm hover:bg-white/5 backdrop-blur-xl">
            Launch Phillbook
          </a>
        </div>
      </motion.div>

      {/* Terminal Mockup with Scrolling Terminal */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-5xl mt-24 mb-32 p-1 bg-gradient-to-br from-white/10 to-transparent rounded-2xl shadow-2xl"
      >
        <div className="terminal-mockup ring-1 ring-white/10 shadow-[0_0_100px_rgba(var(--primary-rgb),0.1)] flex flex-col min-h-[500px] border border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[var(--primary)] opacity-[0.01]"></div>

          {/* TERMINAL HEADER */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center bg-black/40 backdrop-blur-md relative z-10">
            <div className="flex gap-2 w-24">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-[0_0_10px_rgba(255,95,86,0.2)]"></div>
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-[0_0_10px_rgba(255,189,46,0.2)]"></div>
              <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-[0_0_10px_rgba(39,201,63,0.2)]"></div>
            </div>

            <div className="flex-1 text-center">
              <div className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 flex items-center justify-center gap-3">
                <span className="hidden md:inline">PHILL@LOCAL: ~/METROPOLIS</span>
                <span className="hidden md:inline w-1 h-1 rounded-full bg-white/10"></span>
                <span className="text-[var(--primary)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse shadow-[0_0_8px_var(--primary)]"></span>
                  MESH_ACTIVE
                </span>
              </div>
            </div>

            <div className="w-24 text-right">
              <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest leading-none">V1.1.0_STABLE</span>
            </div>
          </div>

          <div
            ref={terminalRef}
            className="flex-1 overflow-y-auto p-10 space-y-4 text-left font-mono text-xs md:text-sm custom-scrollbar bg-[#0D0D0D] relative z-10"
            style={{ scrollBehavior: 'smooth' }}
          >
            <AnimatePresence mode="popLayout">
              {terminalLines.filter(Boolean).map((line, idx) => (
                <motion.div
                  key={`${idx}-${line.text}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="leading-relaxed"
                >
                  {line.type === 'command' && (
                    <p className="flex items-center gap-4">
                      <span className="text-[var(--primary)] opacity-50 shrink-0">➜</span>
                      <span className="text-white/40 shrink-0 select-none">phill</span>
                      <span className="text-white font-bold">{line.text}</span>
                    </p>
                  )}
                  {line.type === 'system' && (
                    <div className="flex items-center gap-4 py-2">
                      <div className="h-px flex-1 bg-white/5"></div>
                      <p className="text-[10px] text-white font-black uppercase tracking-[0.3em] px-4 py-1 glass-surface border border-white/5 rounded-full whitespace-nowrap">{line.text}</p>
                      <div className="h-px flex-1 bg-white/5"></div>
                    </div>
                  )}
                  {line.type === 'success' && <p className="flex items-center gap-4 text-[var(--accent-lime)]"><span className="opacity-50">✓</span> {line.text}</p>}
                  {line.type === 'info' && <p className="text-white/40 pl-8 border-l border-white/5">   {line.text}</p>}
                  {line.type === 'item' && <p className="pl-8 text-white/80"><span className="text-[var(--primary)] opacity-40 mr-3">•</span> {line.text}</p>}
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="w-2 h-5 bg-[var(--primary)] animate-pulse inline-block align-middle ml-1 shadow-[0_0_10px_var(--primary)]"></div>
          </div>
          <div className="absolute inset-0 pointer-events-none opacity-[0.02] scanline"></div>
        </div>
      </motion.div>
    </header>
  );
};

const CapabilitySection = ({ metrics }: { metrics: any }) => {
  const capabilities = [
    {
      title: 'Neural Uplink',
      icon: Zap,
      desc: 'Zero-latency synchronization between your local environment and the Metropolis infrastructure.',
      metric: `Depth: ${metrics?.logic_depth ? metrics.logic_depth.toFixed(1) : '84.2'}v`,
      accent: 'var(--primary)'
    },
    {
      title: 'Agent Intelligence',
      icon: Cpu,
      desc: 'Orchestrate specialized agents to handle multi-district operations with autonomous precision.',
      metric: `Active Nodes: ${metrics?.active_nodes || '1,240'}`,
      accent: 'var(--accent-purple)'
    },
    {
      title: 'Sovereign Security',
      icon: ShieldCheck,
      desc: 'Hardware-grade identity encryption. Your keys and your data remain under your absolute control.',
      metric: `Consensus: ${metrics?.global_consensus ? metrics.global_consensus.toFixed(1) : '94.8'}%`,
      accent: 'var(--accent-red)'
    },
    {
      title: 'Unified Mesh',
      icon: Globe,
      desc: 'A planetary network topology connecting every node through one high-fidelity signal.',
      metric: 'Signal Verified',
      accent: 'var(--accent-sky)'
    }
  ];

  return (
    <section className="py-48 px-6 bg-gradient-to-b from-transparent to-black/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-32 gap-12 text-left">
          <div className="max-w-2xl space-y-6">
            <p className="text-[var(--primary)] font-bold uppercase tracking-[0.3em] text-[10px] flex items-center gap-3">
              <span className="w-10 h-[1px] bg-[var(--primary)]/30"></span>
              Engineering Manifesto
            </p>
            <h2 className="text-6xl md:text-8xl leading-none font-black tracking-tighter text-white">
              Built for the<br />Future
            </h2>
          </div>
          <div className="glass-surface p-10 rounded-2xl border border-white/5 max-w-sm">
            <p className="text-sm text-white/50 font-medium leading-relaxed">
              "We didn't build a better shell. We built a new reality. The terminal is now the interface of planetary intelligence."
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 animate-pulse"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">System Architects</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {capabilities.map((c, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="premium-card p-10 flex flex-col items-start bg-[var(--bg-card)] group relative overflow-hidden h-full"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <c.icon className="w-24 h-24" />
              </div>

              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-8 transition-all duration-500 group-hover:scale-110"
                style={{ background: `${c.accent}15`, border: `1px solid ${c.accent}30` }}
              >
                <c.icon className="w-7 h-7" style={{ color: c.accent }} />
              </div>

              <div className="space-y-4 mb-10 flex-1">
                <h3 className="text-2xl font-black tracking-tight text-white">{c.title}</h3>
                <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed font-medium">
                  {c.desc}
                </p>
              </div>

              <div className="w-full pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Operational Status</span>
                <span className="text-[11px] font-bold" style={{ color: c.accent }}>{c.metric}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const BackplaneSection = ({ metrics }: { metrics: any }) => (
  <section className="py-48 px-6 relative overflow-hidden">
    <div className="aurora-blur left-[-10%] top-1/2 -translate-y-1/2 scale-150 opacity-10"></div>

    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center text-left">
      <div className="space-y-14">
        <div className="space-y-6">
          <div className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-[0.3em] flex items-center gap-4">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse"></span>
            Deep Architecture
          </div>
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-tight text-white">
            The Agentic<br />Backplane
          </h2>
        </div>

        <p className="text-xl text-[var(--text-secondary)] font-medium leading-relaxed max-w-xl">
          Phill CLI is more than a command interface. It is an autonomous agent operating within a globally distributed mesh, optimized for high-fidelity execution.
        </p>

        <div className="grid grid-cols-1 gap-6">
          {[
            { title: "Autonomous Terminal Protocols", sub: "Automatic recovery and context persistence" },
            { title: "High Fidelity Neural Bridging", sub: "Seamless synchronization with the core mesh" },
            { title: "Advanced VLA Integration", sub: "Deep visual language and action anchoring" }
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ x: 10 }}
              className="flex items-start gap-6 group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:border-[var(--primary)] transition-all">
                <ChevronRight className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold uppercase tracking-tight text-white group-hover:text-[var(--primary)] transition-colors">
                  {item.title}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/20">
                  {item.sub}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="relative group">
        <div className="absolute inset-0 bg-[var(--primary)] opacity-10 blur-[120px] rounded-full group-hover:opacity-20 transition-opacity duration-1000"></div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="premium-card bg-[var(--bg-card)] p-2 aspect-square flex items-center justify-center relative z-10 border border-white/5 shadow-2xl rounded-3xl"
        >
          <div className="w-full h-full rounded-2xl bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.1),transparent_70%)] flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 retina-grid"></div>

            <div className="grid grid-cols-4 gap-6 p-12 relative z-10 w-full">
              {[...Array(16)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="group/node relative aspect-square"
                >
                  <div className="w-full h-full rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover/node:border-[var(--primary)] transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] opacity-40 group-hover/node:opacity-100 animate-pulse"></div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="absolute w-[1px] h-full bg-gradient-to-b from-transparent via-[var(--primary)] to-transparent left-1/2 -translate-x-1/2 top-0 animate-shimmer"></div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

const Home = () => {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    bridge.getCoreMetrics().then(setMetrics);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-[var(--bg-base)]"
    >
      <Hero metrics={metrics} />
      <CapabilitySection metrics={metrics} />
      <BackplaneSection metrics={metrics} />

      {/* FINAL DEPLOYMENT SECTION */}
      <section className="py-48 px-6">
        <div className="max-w-6xl mx-auto premium-card p-24 md:p-32 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary),transparent_70%)] opacity-[0.02]"></div>

          <div className="relative z-10 space-y-16">
            <div className="space-y-6">
              <h2 className="text-7xl md:text-9xl font-black text-white tracking-tighter uppercase leading-none">
                Deploy Your<br />Network Node
              </h2>
              <p className="text-xl md:text-2xl font-bold max-w-2xl mx-auto text-[var(--text-secondary)] leading-relaxed opacity-80">
                Join the planetary mesh. Deploy the world's most advanced Agentic CLI and reclaim your technical sovereignty.
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <Link to="/docs" className="social-button button-brand !px-16 !py-8 !text-lg group !rounded-2xl">
                Install Phill CLI <ArrowRight className="ml-4 w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
              <a href="https://github.com/ayjays132/phill-cli" target="_blank" rel="noopener noreferrer" className="social-button button-ghost !px-16 !py-8 !text-lg !rounded-2xl">
                Source Repository
              </a>
            </div>
          </div>

          <div className="absolute bottom-10 right-10 p-6 glass-surface rounded-xl hidden lg:block opacity-40">
            <div className="text-[10px] uppercase font-bold tracking-widest mb-2 opacity-40">Operational Status</div>
            <div className="text-xs font-mono text-[var(--primary)] text-left space-y-1">
              <p>Active Nodes: {metrics?.active_nodes || 'Online'}</p>
              <p>Core Latency: 4ms</p>
              <p>Confidence: 99.9%</p>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default Home;
