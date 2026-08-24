import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileCode, AlertCircle, Check, Copy } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { MAX_SIDELOAD_BYTES } from '../../store/slices/gamesSlice';

/**
 * The sideload path: drop or pick one self-contained .html file and it becomes a tile.
 *
 * Deliberately narrow. Zip support was considered and rejected: there is no decompression
 * primitive in the dependency list, and the asset inliner a zip would need fails silently on
 * `fetch('./level.json')`, `new Worker()` and any runtime-constructed path — so it would promise
 * more than it delivers. A URL-embed option was rejected too, because third-party
 * X-Frame-Options blocks it and the app already ships that blocked-state UI in Browser.jsx.
 *
 * Single-file HTML is the format that actually works from a static host with no server.
 */

const EXAMPLE = `<!doctype html>
<canvas id="c" width="320" height="320"></canvas>
<script>
  const ctx = c.getContext('2d');
  let x = 160, y = 160, dx = 2.4, dy = 1.9, score = 0;
  setInterval(() => {
    x += dx; y += dy;
    if (x < 8 || x > 312) { dx = -dx; score++; }
    if (y < 8 || y > 312) { dy = -dy; score++; }
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 320, 320);
    ctx.fillStyle = '#cc97ff';
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillText('bounces: ' + score, 10, 20);
    // Optional: report the score to the OS shell.
    window.lumina && window.lumina.score(score);
  }, 16);
</script>`;

const AddGameDialog = ({ open, onClose }) => {
  const addUserGame = useOSStore((s) => s.addUserGame);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  const accept = useCallback(async (file) => {
    setError('');
    if (!file) return;
    if (!/\.x?html?$/i.test(file.name)) {
      setError('Only a single .html file is supported.');
      return;
    }
    if (file.size > MAX_SIDELOAD_BYTES) {
      setError(`That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 2 MB.`);
      return;
    }

    setBusy(true);
    try {
      const html = await file.text();
      const title = file.name.replace(/\.x?html?$/i, '').slice(0, 48);
      const res = await addUserGame({ title, html });
      if (!res.ok) setError(res.error);
      else onClose();
    } catch {
      setError('Could not read that file.');
    } finally {
      setBusy(false);
    }
  }, [addUserGame, onClose]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    accept(e.dataTransfer.files?.[0]);
  }, [accept]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-full overflow-y-auto scrollbar-hide bg-sdl-surface border border-hairline/10 rounded-3xl shadow-[var(--sdl-lift-window)] p-6"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-black text-sdl-ink">Add a game</h2>
                <p className="text-sdl-sec text-sm mt-0.5">One self-contained HTML file, up to 2 MB.</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2 rounded-xl bg-sdl-sunken border border-hairline/10 text-sdl-sec hover:text-sdl-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
              >
                <X size={16} />
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${
                dragging ? 'border-os-primary bg-os-primary/10' : 'border-hairline/20 hover:border-os-primary/50 hover:bg-veil/5'
              }`}
            >
              <Upload size={28} className={`mx-auto mb-3 ${dragging ? 'text-os-primary' : 'text-sdl-sec'}`} />
              <p className="font-bold text-sdl-ink text-sm">
                {busy ? 'Adding…' : dragging ? 'Drop it' : 'Drop an .html file, or click to pick one'}
              </p>
              <p className="text-sdl-sec text-xs mt-1">It runs sandboxed and never leaves your browser.</p>
              <input
                ref={inputRef}
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(e) => accept(e.target.files?.[0])}
              />
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-sdl-alert/10 border border-sdl-alert/30">
                <AlertCircle size={16} className="text-sdl-alert shrink-0 mt-0.5" />
                <p className="text-sm text-sdl-ink">{error}</p>
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-hairline/10">
              <button
                onClick={() => setShowExample((v) => !v)}
                className="flex items-center gap-2 text-sm font-bold text-sdl-sec hover:text-sdl-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 rounded-lg"
              >
                <FileCode size={15} />
                What can I add?
              </button>

              {showExample && (
                <div className="mt-3 space-y-3">
                  <p className="text-sdl-sec text-xs leading-relaxed">
                    Any single HTML file that runs on its own — no build step, no server, no external
                    files. It gets an opaque origin, so it cannot read anything else in this OS.
                    Call <code className="font-mono text-os-primary">window.lumina.score(n)</code> to
                    show a score in the header. Save this as{' '}
                    <code className="font-mono text-os-primary">bounce.html</code> and drop it above:
                  </p>
                  <div className="relative">
                    <pre className="p-3 rounded-xl bg-sdl-sunken border border-hairline/10 text-[10px] font-mono text-sdl-sec overflow-x-auto leading-relaxed">
                      {EXAMPLE}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(EXAMPLE);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1600);
                      }}
                      aria-label="Copy example"
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-sdl-surface border border-hairline/10 text-sdl-sec hover:text-sdl-ink transition-colors"
                    >
                      {copied ? <Check size={13} className="text-os-tertiary" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddGameDialog;
