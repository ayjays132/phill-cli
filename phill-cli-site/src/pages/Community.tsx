import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Users, Globe, Twitter, Github, ExternalLink, Zap } from 'lucide-react';
import { bridge } from '../services/MetropolisBridge.js';
import type { CasinoWin } from '../services/MetropolisBridge.js';

const Community = () => {
  const [wins, setWins] = useState<CasinoWin[]>([]);

  useEffect(() => {
    bridge.getLatestWins().then(setWins);
  }, []);

  const socialChannels = [
    { name: "Metropolis Discord", icon: MessageSquare, color: "#5865F2", members: "12,400 Citizens", desc: "The primary neural hub for real-time technical coordination and agent development.", link: "https://discord.com" },
    { name: "Identity X", icon: Twitter, color: "#ffffff", members: "45,000 Followers", desc: "Latest platform updates, protocol snapshots, and grid infrastructure announcements.", link: "https://twitter.com" },
    { name: "Swarm GitHub", icon: Github, color: "#333", members: "2,100 Contributors", desc: "Open-source core logic, community-driven extensions, and technical archival reports.", link: "https://github.com/ayjays132/phill-cli" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[var(--bg-base)] min-h-screen"
    >
      <div className="relative pt-64 pb-32 px-6 overflow-hidden">
        <div className="aurora-blur top-[-10%] left-1/2 -translate-x-1/2 scale-150 opacity-10"></div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="mb-48 space-y-8">
            <div className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-[0.4em] flex items-center justify-center gap-3">
              <span className="w-8 h-[1px] bg-[var(--primary)]/30"></span>
              Collective Intelligence
              <span className="w-8 h-[1px] bg-[var(--primary)]/30"></span>
            </div>
            <h1 className="text-8xl md:text-[12rem] tracking-tighter leading-[0.8] text-gradient font-black uppercase">
              Neural<br />Collective
            </h1>
            <p className="text-xl md:text-2xl text-[var(--text-secondary)] font-medium max-w-2xl mx-auto leading-relaxed tracking-tight opacity-80">
              The infrastructure is defined by its nodes. Join the planetary collective of engineers and agents building the <span className="text-white">Sovereign Future</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-64">
            {socialChannels.map((c, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="premium-card p-12 space-y-10 group relative overflow-hidden h-full flex flex-col items-center justify-center text-center bg-[var(--bg-card)] border-white/5"
              >
                <div className="absolute inset-x-0 top-0 h-[1px] transition-opacity opacity-0 group-hover:opacity-100" style={{ background: c.color }}></div>

                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition-all duration-500"
                  style={{ background: `${c.color}08`, border: `1px solid ${c.color}20` }}
                >
                  <c.icon className="w-8 h-8" style={{ color: c.color }} />
                </div>

                <div className="space-y-6 flex-1">
                  <h3 className="text-3xl font-black tracking-tight text-white uppercase">{c.name}</h3>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                    <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest">{c.members}</span>
                  </div>
                  <p className="text-base text-[var(--text-secondary)] leading-relaxed font-medium opacity-80">{c.desc}</p>
                </div>

                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full social-button button-ghost !py-5 !text-[10px] flex items-center justify-center gap-3 transition-all !rounded-xl"
                >
                  JOIN FREQUENCY <ExternalLink className="w-3 h-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </a>
              </motion.div>
            ))}
          </div>

          {/* LIVE ACTIVITY STREAM */}
          <div className="max-w-4xl mx-auto space-y-24 pb-32">
            <div className="space-y-8">
              <div className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-[0.4em]">Live Network Activity</div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase">The Grid Pulse</h2>
            </div>

            <div className="space-y-4">
              {wins.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-surface p-8 rounded-2xl flex items-center justify-between border-white/5 group hover:border-white/10 transition-all backdrop-blur-3xl"
                >
                  <div className="flex items-center gap-8">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[var(--primary)]/30 transition-all">
                      <Zap className="w-4 h-4 text-[var(--primary)] opacity-40 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-black text-white group-hover:text-[var(--primary)] transition-colors">@{log.user}</div>
                      <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">
                        Secured <span className="text-[var(--primary)]">{log.amount} Credits</span> in <span className="text-white">{log.game}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{log.time}</div>
                </motion.div>
              ))}
            </div>

            <div className="pt-48 space-y-12">
              <div className="space-y-4">
                <h3 className="text-4xl font-black tracking-tight text-white uppercase">Sovereign Expansion</h3>
                <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto font-medium leading-relaxed opacity-80">
                  Directly fund the expansion of the planetary infrastructure. Every contribution strengthens the <span className="text-white">Agentic Backplane</span>.
                </p>
              </div>
              <a
                href="https://www.patreon.com/collection/1997690"
                target="_blank"
                rel="noopener noreferrer"
                className="social-button button-brand !px-16 !py-6 !text-sm group relative overflow-hidden !rounded-2xl"
              >
                <span className="relative z-10 flex items-center gap-4 uppercase font-black tracking-widest">
                  Signal Support <Zap className="w-5 h-5 animate-pulse" />
                </span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Community;
