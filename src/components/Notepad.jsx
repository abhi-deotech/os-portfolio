import React, { useState } from 'react';
import { Save, FileText, ChevronRight, Eye, Edit3, Download, Share2 } from 'lucide-react';
import useOSStore from '../store/osStore';
import useCapability from '../capabilities/useCapability.js';
import { useIsMobile } from '../hooks/useMediaQuery';
import { osAlert } from '../utils/dialog';
import { buildSharePayload, downloadFileName, noteMime } from '../utils/noteExport.js';

import MarkdownRenderer from './common/MarkdownRenderer';

const Notepad = () => {
  const activeNotepadFile = useOSStore((s) => s.activeNotepadFile);
  const fileSystem = useOSStore((s) => s.fileSystem);
  const updateFileContent = useOSStore((s) => s.updateFileContent);
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('Untitled');
  const [isPreview, setIsPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  const isMobile = useIsMobile();
  const webShare = useCapability('webShare');

  // Starts at null so the first render loads the active file too (derived state, not an effect);
  // starting at activeNotepadFile skipped the load and opened an empty, unnamed editor.
  const [prevFileId, setPrevFileId] = useState(null);
  if (activeNotepadFile !== prevFileId) {
    setPrevFileId(activeNotepadFile);
    if (activeNotepadFile) {
      const findFile = (nodes) => {
        for (const node of nodes) {
          if (node.id === activeNotepadFile) return node;
          if (node.children) {
            const found = findFile(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      const file = findFile(fileSystem);
      if (file) {
        setContent(file.content || '');
        setFileName(file.name);
        setIsSaved(true);
      }
    }
  }

  const handleSave = () => {
    if (activeNotepadFile) {
      updateFileContent(activeNotepadFile, content);
      unlockAchievement('writer');
      setIsSaved(true);
    }
  };

  // Gesture realm: a popped-out Notepad lives in another document, so the anchor, Blob URL and
  // share call all come from the window the click happened in.
  const handleDownload = (e) => {
    const view = e.currentTarget.ownerDocument.defaultView;
    const name = downloadFileName(fileName);
    const url = view.URL.createObjectURL(new view.Blob([content], { type: `${noteMime(name)};charset=utf-8` }));
    const a = view.document.createElement('a');
    a.href = url;
    a.download = name;
    view.document.body.appendChild(a);
    a.click();
    a.remove();
    view.setTimeout(() => view.URL.revokeObjectURL(url), 0);
  };

  const handleShare = async (e) => {
    const view = e.currentTarget.ownerDocument.defaultView;
    const { kind, data } = buildSharePayload({ fileName, content, nav: view.navigator, FileCtor: view.File });
    if (kind === 'none') {
      // Share is detected, but this window refused every payload (e.g. a frame without the
      // web-share permission). Never a silent no-op: point at the complete fallback.
      osAlert({ tone: 'warn', kicker: 'Notepad', title: "Couldn't share this note from here. Use Download to save it instead." });
      return;
    }
    try {
      await view.navigator.share(data);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      osAlert({ tone: 'warn', kicker: 'Notepad', title: `Couldn't share this note (${err?.name ?? 'Error'}). Try again.` });
    }
  };

  const handleChange = (e) => {
    setContent(e.target.value);
    setIsSaved(false);
  };

  return (
    <div className="flex flex-col h-full bg-sdl-plane text-sdl-ink font-sans selection:bg-os-primary/30">
      {/* Utility Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-hairline/5 bg-veil/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-os-primary/10 text-os-primary">
            <FileText size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-sdl-ink/80">{fileName}</span>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isSaved ? 'text-sdl-done/60' : 'text-os-primary/80'}`}>
              {isSaved ? 'Saved to System' : 'Unsaved Changes*'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button
             onClick={() => setIsPreview(!isPreview)}
             aria-pressed={isPreview}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-hairline/5 text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${isPreview ? 'bg-os-primary text-sdl-onAccent' : 'bg-veil/5 text-sdl-sec hover:text-sdl-ink'}`}
           >
              {isPreview ? <Edit3 size={14} /> : <Eye size={14} />}
              {isPreview ? 'Edit' : 'Preview'}
           </button>
           {/* The GREEN here was backwards twice over. Law 10: the *saved* state is the neutral one,
               and that is the disabled half — so `done` colours the status label, not the button.
               The enabled half is the primary action, which is the accent; that also restores the
               onAccent contract, since onAccent is measured against the accent and nothing else. */}
           <button
             onClick={handleSave}
             disabled={isSaved}
             className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${isSaved ? 'bg-veil/5 text-sdl-sec' : 'bg-os-primary text-sdl-onAccent hover:bg-os-primary/90'}`}
           >
              <Save size={14} />
              Save
           </button>
           {/* Download works everywhere, so it is the complete fallback where Share is missing. */}
           <button
             onClick={handleDownload}
             aria-label={isMobile ? 'Download' : undefined}
             title={isMobile ? 'Download' : undefined}
             className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-hairline/5 text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 bg-veil/5 text-sdl-sec hover:text-sdl-ink"
           >
              <Download size={14} />
              {!isMobile && 'Download'}
           </button>
           {webShare.supported && (
             <button
               onClick={handleShare}
               aria-label={isMobile ? 'Share' : undefined}
               title={isMobile ? 'Share' : undefined}
               className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-hairline/5 text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 bg-veil/5 text-sdl-sec hover:text-sdl-ink"
             >
                <Share2 size={14} />
                {!isMobile && 'Share'}
             </button>
           )}
        </div>
      </div>

      {/* Editor/Preview Area */}
      <div className="flex-grow relative overflow-hidden">
        {isPreview ? (
          <div className="absolute inset-0 overflow-auto p-10 scrollbar-os">
             <MarkdownRenderer content={content} />
             {!content && <p className="text-sdl-sec italic">No content to preview.</p>}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={handleChange}
            spellCheck={false}
            className="absolute inset-0 w-full h-full bg-transparent p-10 resize-none font-mono text-sm leading-relaxed text-sdl-ink/80 placeholder:text-sdl-sec scrollbar-os focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-os-primary/50"
            placeholder="Type your notes here..."
          />
        )}
      </div>

      {/* Footer Info */}
      {/* Not `veil` here: the old bg-black/40 wanted the status strip to RECEDE, and veil lifts in
          dark (it is white there), so it would have painted a 40% white bar. `sunken` is the role
          that recedes in both modes. */}
      <div className="px-6 py-2 bg-sdl-sunken border-t border-hairline/5 flex justify-between items-center">
         <div className="flex gap-4 text-[9px] font-bold text-sdl-sunkSec uppercase tracking-widest">
            <span>Lines: {content.split('\n').length}</span>
            <span>Words: {content.trim() ? content.trim().split(/\s+/).length : 0}</span>
         </div>
         <div className="text-[9px] font-black text-os-primary/40 uppercase tracking-[0.2em]">Markdown Supported</div>
      </div>
    </div>
  );
};

export default Notepad;
