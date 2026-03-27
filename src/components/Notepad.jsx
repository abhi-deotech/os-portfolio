import React, { useState, useEffect } from 'react';
import { Save, FileText, ChevronRight, Eye, Edit3 } from 'lucide-react';
import useOSStore from '../store/osStore';

const Notepad = () => {
  const { activeNotepadFile, fileSystem, updateFileContent, unlockAchievement } = useOSStore();
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('Untitled');
  const [isPreview, setIsPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
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
  }, [activeNotepadFile, fileSystem]);

  const handleSave = () => {
    if (activeNotepadFile) {
      updateFileContent(activeNotepadFile, content);
      unlockAchievement('writer');
      setIsSaved(true);
    }
  };

  const handleChange = (e) => {
    setContent(e.target.value);
    setIsSaved(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] text-white font-sans selection:bg-os-primary/30">
      {/* Utility Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-os-primary/10 text-os-primary">
            <FileText size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white/80">{fileName}</span>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isSaved ? 'text-green-500/60' : 'text-os-primary/80'}`}>
              {isSaved ? 'Saved to System' : 'Unsaved Changes*'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsPreview(!isPreview)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 text-[10px] font-bold uppercase tracking-widest transition-all ${isPreview ? 'bg-os-primary text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}
           >
              {isPreview ? <Edit3 size={14} /> : <Eye size={14} />}
              {isPreview ? 'Edit' : 'Preview'}
           </button>
           <button 
             onClick={handleSave}
             disabled={isSaved}
             className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${isSaved ? 'bg-white/5 text-white/20' : 'bg-green-500 text-black hover:bg-green-400'}`}
           >
              <Save size={14} />
              Save
           </button>
        </div>
      </div>

      {/* Editor/Preview Area */}
      <div className="flex-grow relative overflow-hidden">
        {isPreview ? (
          <div className="absolute inset-0 overflow-auto p-10 scrollbar-os prose prose-invert max-w-none">
             {/* Simple Markdown-ish Rendering */}
             {content.split('\n').map((line, i) => {
               if (line.startsWith('# ')) return <h1 key={i} className="text-4xl font-black mb-6 text-os-primary">{line.replace('# ', '')}</h1>;
               if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold mb-4 border-b border-white/10 pb-2">{line.replace('## ', '')}</h2>;
               if (line.startsWith('- ')) return <div key={i} className="flex gap-3 mb-2"><ChevronRight size={16} className="text-os-primary shrink-0 mt-1" /><span>{line.replace('- ', '')}</span></div>;
               return <p key={i} className="mb-4 text-white/60 leading-relaxed font-medium">{line}</p>;
             })}
             {!content && <p className="text-white/20 italic">No content to preview.</p>}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={handleChange}
            spellCheck={false}
            className="absolute inset-0 w-full h-full bg-transparent p-10 outline-none resize-none font-mono text-sm leading-relaxed text-white/80 placeholder:text-white/10 scrollbar-os"
            placeholder="Type your notes here..."
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="px-6 py-2 bg-black/40 border-t border-white/5 flex justify-between items-center">
         <div className="flex gap-4 text-[9px] font-bold text-white/20 uppercase tracking-widest">
            <span>Lines: {content.split('\n').length}</span>
            <span>Words: {content.trim() ? content.trim().split(/\s+/).length : 0}</span>
         </div>
         <div className="text-[9px] font-black text-os-primary/40 uppercase tracking-[0.2em]">Markdown Supported</div>
      </div>
    </div>
  );
};

export default Notepad;
