import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Command,
  Menu,
  X,
  Github,
  Twitter,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Pages
import Home from './pages/Home.js';
import FeaturesPage from './pages/Features.js';
import Docs from './pages/Docs.js';
import Community from './pages/Community.js';

// --- COMPONENTS ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Core', path: '/' },
    { name: 'Intelligence', path: '/features' },
    { name: 'Technical', path: '/docs' },
    { name: 'Network', path: '/community' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[200] p-6 lg:p-10 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto relative">
        {/* LOGO & STATUS PILL */}
        <Link to="/" className="flex items-center gap-6 glass-surface px-6 py-3 rounded-2xl border border-white/10 group shadow-2xl backdrop-blur-3xl hover:border-[var(--primary)]/30 transition-all">
          <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center shadow-lg group-hover:rotate-12 transition-all duration-500">
            <Command className="w-5 h-5 text-black" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-black tracking-tight leading-none mb-1 text-white uppercase">Phill CLI</span>
            <div className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[var(--accent-lime)] animate-pulse"></span>
              <span className="text-[6px] font-bold uppercase tracking-[0.3em] text-[var(--primary)] opacity-80">Node Alpha-920 // Active</span>
            </div>
          </div>
        </Link>

        {/* DESKTOP NAV PILL */}
        <div className="hidden lg:flex items-center gap-10 glass-surface px-10 py-3 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-3xl">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all hover:text-white ${location.pathname === link.path ? 'text-[var(--primary)]' : 'text-white/40'}`}
            >
              {link.name}
            </Link>
          ))}
          <div className="w-px h-4 bg-white/10 mx-2"></div>
          <Link to="/docs" className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--accent-cyan)] hover:brightness-125 transition-all">Initialize</Link>
        </div>

        {/* MOBILE TOGGLE / CTA PILL */}
        <div className="flex items-center gap-4">
          <Link to="/docs" className="hidden sm:flex social-button button-brand !px-6 !py-3 !text-[8px] !rounded-xl">DEPLOY NODE</Link>
          <button
            className="lg:hidden w-12 h-12 flex items-center justify-center rounded-xl glass-surface border border-white/5 hover:border-white/20 transition-all shadow-2xl backdrop-blur-3xl text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* MOBILE DRAWER */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="lg:hidden absolute top-20 right-0 w-72 glass-surface p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-3xl flex flex-col gap-6"
            >
              <div className="text-[8px] font-bold text-white/20 uppercase tracking-[0.5em] mb-2">Navigation Matrix</div>
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`text-xl font-black uppercase tracking-tighter transition-all ${location.pathname === link.path ? 'text-[var(--primary)]' : 'text-white/40 hover:text-white'}`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="h-px bg-white/5 my-2"></div>
              <Link to="/docs" onClick={() => setIsOpen(false)} className="social-button button-brand !px-6 !py-4 !text-xs !rounded-xl">DEPLOY CLI</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

const Footer = () => (
  <footer className="py-32 px-6 border-t border-white/5 bg-[var(--bg-card)] overflow-hidden relative">
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-24 mb-32">
        <div className="md:col-span-4 space-y-10">
          <Link to="/" className="flex items-center gap-5 group">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-all duration-500">
              <Command className="w-8 h-8 text-black" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter leading-none mb-1">PHILL <span className="text-white/20">CLI</span></span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">Neural Infrastructure</span>
            </div>
          </Link>
          <p className="text-base text-[var(--text-secondary)] max-w-sm leading-relaxed font-medium opacity-80">
            The world's first true Agentic CLI, built for the planetary-scale Metropolis infrastructure. Engineered for the future of autonomous sovereignty.
          </p>
        </div>

        <div className="md:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-16">
          {[
            { title: 'Ecosystem', links: [{ n: 'Plaza District', h: 'https://phillbook.com/app/plaza' }, { n: 'Forge Complex', h: 'https://phillbook.com/app/forge' }, { n: 'The Cathedral', h: 'https://phillbook.com/app/cathedral' }, { n: 'Sovereign Bank', h: 'https://phillbook.com/app/bank' }] },
            { title: 'Technical', links: [{ n: 'Neural API', h: '/docs' }, { n: 'VLA Streams', h: '/features' }, { n: 'Mesh Services', h: '/features' }, { n: 'Grid Logs', h: '/community' }] },
            { title: 'Sovereignty', links: [{ n: 'Documentation', h: '/docs' }, { n: 'Core Manifesto', h: '/docs' }, { n: 'Identity Portal', h: 'https://phillbook.com/app/profile' }, { n: 'Security Hub', h: 'https://phillbook.com/app/security' }] },
            { title: 'Community', links: [{ n: 'Twitter', h: 'https://twitter.com' }, { n: 'Discord', h: 'https://discord.com' }, { n: 'GitHub', h: 'https://github.com' }, { n: 'Support Signal', h: 'https://www.patreon.com/collection/1997690' }] }
          ].map((col) => (
            <div key={col.title} className="space-y-8">
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest">{col.title}</h4>
              <ul className="space-y-4">
                {col.links.map((link) => (
                  <li key={link.n}>
                    {link.h.startsWith('http') ? (
                      <a href={link.h} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-white transition-all font-medium flex items-center gap-2 group">
                        <div className="w-1 h-1 rounded-full bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {link.n}
                      </a>
                    ) : (
                      <Link to={link.h} className="text-sm text-[var(--text-secondary)] hover:text-white transition-all font-medium flex items-center gap-2 group">
                        <div className="w-1 h-1 rounded-full bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {link.n}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-12 pt-16 border-t border-white/5">
        <div className="flex flex-col items-center md:items-start gap-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">© 2026 Metropolis Sovereign Authority // PHILL INFRASTABLE</p>
          <div className="flex gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/10">System Operational Confidence: 99.998%</span>
          </div>
        </div>
        <div className="flex gap-10 text-white/30">
          <Github className="w-5 h-5 cursor-pointer hover:text-white hover:scale-110 transition-all" />
          <Twitter className="w-5 h-5 cursor-pointer hover:text-white hover:scale-110 transition-all" />
          <Layers className="w-5 h-5 cursor-pointer hover:text-white hover:scale-110 transition-all" />
        </div>
      </div>
    </div>

    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--primary)]/5 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
  </footer>
);

import NotFound from './pages/NotFound.js';



const App = () => {
  const location = useLocation();

  return (
    <div className="relative min-h-screen bg-[var(--bg-base)]">
      <div className="retina-grain"></div>
      <Navbar />

      <main className="relative z-10 pt-32 lg:pt-40">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/community" element={<Community />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

const Root = () => (
  <Router>
    <App />
  </Router>
);

export default Root;
