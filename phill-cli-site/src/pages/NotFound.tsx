import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { WifiOff, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="aurora-blur bg-red-500/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 space-y-12"
      >
        <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8 animate-pulse">
          <WifiOff className="w-10 h-10 text-red-500" />
        </div>

        <div className="space-y-4">
          <h1 className="text-8xl italic tracking-[ -0.05em] leading-none mb-4">Signal<br />Lost.</h1>
          <p className="text-xl text-[var(--text-secondary)] italic max-w-md mx-auto">
            The neural path you are seeking does not exist in the Metropolis Grid.
          </p>
        </div>

        <div className="terminal-mockup ring-1 ring-red-500/20 max-w-sm mx-auto bg-black/40">
          <code className="text-xs font-mono text-red-400">
            ➜ EXCEPTION: 0x404_NOT_FOUND<br />
            ➜ ANALYSING_MESH... FAILURE<br />
            ➜ RE-ROUTING_TO_CORE...
          </code>
        </div>

        <Link
          to="/"
          className="social-button button-brand !px-12 !py-6 inline-flex items-center gap-3"
        >
          <Home className="w-4 h-4" /> Return to Grid
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
