import { motion } from 'framer-motion';
import { FileText, Search, Code, BookOpen, Terminal, ChevronRight, Share2, Shield } from 'lucide-react';

const Docs = () => {
  const sections = [
    {
      title: "Fundamentals",
      icon: Terminal,
      items: ["Quick Start Guide", "Installation Protocols", "Uplink Configuration", "Identity Generation"]
    },
    {
      title: "Core Commands",
      icon: Code,
      items: ["Status Management", "Agent Spawning", "District Navigation", "Mesh Operations"]
    },
    {
      title: "Advanced Systems",
      icon: Shield,
      items: ["VLA Stream Parsing", "Identity Verification", "Optimization Tuning", "Swarm Orchestration"]
    },
    {
      title: "API Reference",
      icon: BookOpen,
      items: ["REST Interface", "WebSocket Streams", "SDK Integration", "Authentication Handshakes"]
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[var(--bg-base)] min-h-screen"
    >
      <div className="relative pt-64 pb-32 px-6 lg:px-12 overflow-hidden">
        <div className="aurora-blur top-[-10%] left-1/2 -translate-x-1/2 scale-150 opacity-5"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-16 lg:gap-32">
            {/* SIDEBAR - INDEX SYSTEM */}
            <aside className="lg:col-span-3 space-y-12 shrink-0">
              <div className="space-y-6">
                <div className="text-[9px] font-black text-[var(--primary)] uppercase tracking-[0.5em] flex items-center gap-3">
                  <span className="w-12 h-[1px] bg-[var(--primary)]/40"></span>
                  INDEX ARC
                </div>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search protocols..."
                    className="w-full bg-white/5 border border-white/5 rounded-xl py-4 pl-12 text-xs outline-none focus:border-[var(--primary)]/30 transition-all font-mono relative z-10 text-white/80"
                  />
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/10 group-focus-within:text-[var(--primary)] transition-colors z-20" />
                </div>
              </div>

              <nav className="space-y-10">
                {sections.map((sec, i) => (
                  <div key={i} className="space-y-5">
                    <div className="flex items-center gap-3">
                      <sec.icon className="w-3.5 h-3.5 text-white/20" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{sec.title}</span>
                    </div>
                    <ul className="space-y-3 pl-1">
                      {sec.items.map((item, j) => (
                        <li key={j}>
                          <a href="#" className="text-xs text-white/20 hover:text-[var(--primary)] transition-all flex items-center justify-between group font-bold tracking-tight">
                            {item}
                            <div className="w-1 h-1 rounded-full bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity translate-x-1"></div>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </aside>

            {/* CONTENT - ARCHIVAL DATA */}
            <div className="lg:col-span-9 space-y-32">
              <div className="space-y-10 text-center lg:text-left">
                <div className="inline-block px-4 py-2 glass-surface border border-white/5 rounded-full mb-4">
                  <span className="text-[8px] font-black text-[var(--primary)] tracking-[0.4em] uppercase">Release Stable v1.1.0</span>
                </div>
                <h1 className="text-6xl md:text-9xl tracking-tighter leading-[0.85] text-gradient font-black uppercase">Technical<br />Archive</h1>
                <p className="text-lg md:text-2xl text-[var(--text-secondary)] font-medium leading-relaxed max-w-2xl tracking-tight opacity-60">
                  Comprehensive documentation for the Phill CLI ecosystem and the sovereign <span className="text-white">Metropolis Interface</span>.
                </p>
              </div>

              {/* INSTALLATION PROTOCOL */}
              <div className="space-y-16">
                <div className="flex items-center gap-6">
                  <div className="h-[1px] w-12 bg-[var(--primary)]/40"></div>
                  <h2 className="text-2xl font-black tracking-[0.2em] text-white uppercase italic">01 // Quick Start</h2>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                </div>

                <div className="space-y-12">
                  <p className="text-base text-white/40 font-medium leading-relaxed max-w-2xl">
                    To initialize the Agent on your local environment, run the following command. This anchors your identity to the planetary mesh.
                  </p>

                  <div className="terminal-mockup ring-1 ring-white/10 shadow-[0_0_80px_rgba(var(--primary-rgb),0.05)] border border-white/5 p-8 md:p-12">
                    <div className="flex items-center justify-between mb-10 opacity-40">
                      <div className="flex gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.5em]">ROOT_INSTALL_PROTOCOL</span>
                    </div>
                    <code className="text-xl md:text-4xl text-white font-mono flex items-center gap-8 leading-none overflow-x-auto custom-scrollbar-hidden pb-4">
                      <span className="text-[var(--primary)] shrink-0 opacity-40">➜</span>
                      <span className="whitespace-nowrap">npm install -g <span className="text-[var(--primary)]">phill-cli</span></span>
                    </code>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-10 justify-between p-10 glass-surface rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] animate-pulse"></div>
                      <p className="text-xs text-white/40 font-bold uppercase tracking-widest leading-none">Uplink Alternative</p>
                    </div>
                    <code className="text-xs text-[var(--primary)] font-mono bg-black/40 px-8 py-4 rounded-xl border border-white/5 shadow-inner">
                      npx phill-cli uplink
                    </code>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <motion.div
                  whileHover={{ y: -5, borderColor: 'rgba(var(--primary-rgb), 0.2)' }}
                  className="premium-card p-12 space-y-10 bg-[var(--bg-card)] border-white/5 transition-colors"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/5 flex items-center justify-center border border-[var(--primary)]/10">
                    <Terminal className="w-6 h-6 text-[var(--primary)]" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black tracking-tight text-white uppercase">CLI Handbook</h3>
                    <p className="text-sm text-white/40 leading-relaxed font-medium">
                      A comprehensive guide to every command, flag, and environment variable available in the ecosystem.
                    </p>
                  </div>
                  <button className="text-[9px] font-black text-[var(--primary)] uppercase tracking-[0.3em] flex items-center gap-4 group border-none bg-transparent cursor-pointer">
                    FETCH_DATA <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>

                <motion.div
                  whileHover={{ y: -5, borderColor: 'rgba(var(--accent-cyan-rgb), 0.2)' }}
                  className="premium-card p-12 space-y-10 bg-[var(--bg-card)] border-white/5 transition-colors"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[var(--accent-cyan)]/5 flex items-center justify-center border border-[var(--accent-cyan)]/10">
                    <Share2 className="w-6 h-6 text-[var(--accent-cyan)]" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black tracking-tight text-white uppercase">Mesh Integration</h3>
                    <p className="text-sm text-white/40 leading-relaxed font-medium">
                      Learn how to bridge local workflows with agent swarms for planetary-scale technical efficiency.
                    </p>
                  </div>
                  <button className="text-[9px] font-black text-[var(--accent-cyan)] uppercase tracking-[0.3em] flex items-center gap-4 group border-none bg-transparent cursor-pointer">
                    VIEW_MAP <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              </div>

              {/* CODE EXAMPLE SYSTEM */}
              <div className="space-y-12 pb-32">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary)]"></div>
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.6em] leading-none">Neural_Handshake.ts // Reference</h4>
                  </div>
                  <div className="px-5 py-2.5 rounded-full border border-[var(--primary)]/20 text-[8px] font-black text-[var(--primary)] tracking-[0.3em] uppercase bg-[var(--primary)]/5">ENCRYPTED_SIGNAL</div>
                </div>
                <div className="terminal-mockup ring-1 ring-white/10 p-12 bg-black/60 relative group">
                  <div className="absolute top-4 right-6 text-[8px] font-bold text-white/5 uppercase tracking-widest group-hover:text-white/20 transition-colors">Typescript // HighFidelity</div>
                  <pre className="text-sm md:text-base text-white/80 leading-[1.8] font-mono overflow-x-auto custom-scrollbar-hidden">
                    <span className="text-[#C586C0]">import</span> &#123; <span className="text-[#9CDCFE]">MetropolisClient</span> &#125; <span className="text-[#C586C0]">from</span> <span className="text-[#CE9178]">'phill-cli'</span>;<br /><br />
                    <span className="text-[#6A9955]">// Initialize high-fidelity uplink system</span><br />
                    <span className="text-[#C586C0]">const</span> client = <span className="text-[#C586C0]">new</span> <span className="text-[#4EC9B0]">MetropolisClient</span>(&#123;<br />
                    &nbsp;&nbsp;identity: <span className="text-[#CE9178]">'neural_key_stable'</span>,<br />
                    &nbsp;&nbsp;district: <span className="text-[#CE9178]">'plaza'</span>,<br />
                    &nbsp;&nbsp;mode: <span className="text-[#CE9178]">'sovereign'</span><br />
                    &#125;);<br /><br />
                    <span className="text-[#C586C0]">await</span> client.<span className="text-[#DCDCAA]">uplink</span>();<br />
                    <span className="text-[#9CDCFE]">console</span>.<span className="text-[#DCDCAA]">log</span>(<span className="text-[#CE9178]">"Signal Anchored"</span>);
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Docs;
