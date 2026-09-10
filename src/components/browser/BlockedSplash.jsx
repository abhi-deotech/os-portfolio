import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ExternalLink, Info } from 'lucide-react';
import { hostOf } from './browserCore';

/**
 * Rendered inside a tab whose committed URL matches the block list — sites whose
 * X-Frame-Options / frame-ancestors policy would leave the iframe blank anyway, so the splash
 * says so instead of letting a silent white frame look like a crash.
 *
 * The warning voice is the `--sdl-warn` role throughout: the old yellow-500 broke SDL law 6
 * (brightness ceiling — dim before glare) and was identical across all sixteen colorways. The
 * primary action stays a standard SDL primary button (accent bg + on-accent ink); warn colours
 * the *explanation*, not the way out.
 */
const BlockedSplash = ({ url, onOpenExternal, onBackToStart }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.985 }}
    animate={{ opacity: 1, scale: 1 }}
    className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center overflow-y-auto custom-scrollbar"
  >
    <div className="relative mb-8">
      <div
        className="absolute inset-0 blur-3xl rounded-full"
        style={{ background: 'rgb(var(--sdl-warn-rgb) / 0.18)' }}
      />
      <div className="relative w-20 h-20 bg-sdl-warn/10 border border-sdl-warn/25 rounded-[1.75rem] flex items-center justify-center">
        <ShieldAlert size={40} className="text-sdl-warn" />
      </div>
    </div>

    <h2 className="text-xl md:text-2xl font-display font-black text-sdl-ink mb-3 tracking-tight">
      Embedding restricted
    </h2>
    <p className="text-sdl-sec text-sm max-w-md leading-relaxed mb-8 font-medium">
      <span className="text-sdl-ink font-bold">{hostOf(url) || url}</span> does not allow itself to
      be displayed inside other applications.
    </p>

    <div className="flex flex-col sm:flex-row gap-3">
      <button
        type="button"
        onClick={onOpenExternal}
        className="flex items-center justify-center gap-2.5 px-6 py-3 bg-os-primary text-sdl-onAccent font-bold text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgb(var(--sdl-accent-rgb)/0.3)] hover:bg-os-primary/90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
      >
        <ExternalLink size={14} /> Open externally
      </button>
      <button
        type="button"
        onClick={onBackToStart}
        className="flex items-center justify-center gap-2.5 px-6 py-3 bg-veil/5 border border-hairline/10 text-sdl-sec font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-veil/10 hover:text-sdl-ink active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
      >
        Back to start
      </button>
    </div>

    <div className="mt-10 flex items-center gap-2.5 px-4 py-2 bg-veil/5 rounded-xl border border-hairline/5">
      <Info size={13} className="text-sdl-sec shrink-0" />
      <span className="text-[10px] font-bold text-sdl-sec uppercase tracking-wider">
        Browser security policy (X-Frame-Options)
      </span>
    </div>
  </motion.div>
);

export default BlockedSplash;
