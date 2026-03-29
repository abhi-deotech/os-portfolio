import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Book, FileText, Search, ChevronRight, Home, Folder, 
  Menu, X, RefreshCw, AlertCircle, CheckCircle, 
  List, Clock, Hash, ArrowRight, ExternalLink
} from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';
import MarkdownRenderer from './common/MarkdownRenderer';

/**
 * Premium OS Documentation App
 * Features:
 * - Advanced Markdown rendering with Syntax Highlighting
 * - Dynamic Table of Contents (ToC)
 * - Intelligent Search with highlighting
 * - Modern Glassmorphic sidebar
 * - Deep OS integration
 */

const FileTreeNode = ({ node, level = 0, selectedFile, setSelectedFile }) => {
  const isFolder = !!node.children;
  const isSelected = selectedFile?.id === node.id;
  const [isOpen, setIsOpen] = useState(level === 0 || isSelected);

  // Auto-open if a child is selected
  useEffect(() => {
    if (isSelected) setIsOpen(true);
  }, [isSelected]);

  return (
    <div className="select-none">
      <div
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
          isSelected ? 'bg-os-primary/20 border border-os-outline/30' : 'hover:bg-white/5 border border-transparent'
        }`}
        style={{ marginLeft: `${level * 12}px` }}
        onClick={() => isFolder ? setIsOpen(!isOpen) : useOSStore.getState().openWindow('documentation', node.id)}
      >
        {isFolder ? (
          <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''} text-os-onSurfaceVariant`} />
        ) : (
          <FileText size={14} className={isSelected ? 'text-os-primary' : 'text-os-onSurfaceVariant group-hover:text-os-primary'} />
        )}
        {isFolder && <Folder size={14} className="text-os-secondary opacity-70" />}
        <span className={`text-xs font-medium truncate ${isSelected ? 'text-os-onSurface' : 'text-os-onSurfaceVariant group-hover:text-os-onSurface'}`}>
          {node.name}
        </span>
      </div>
      
      <AnimatePresence initial={false}>
        {isOpen && isFolder && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {node.children.map(child => (
              <FileTreeNode 
                key={child.id} 
                node={child} 
                level={level + 1} 
                selectedFile={selectedFile} 
                setSelectedFile={setSelectedFile} 
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DocumentationApp = () => {
  const { 
    fileSystem, 
    syncDocumentation, 
    setIsSyncing, 
    setSyncError, 
    isSyncing, 
    lastSyncTime, 
    syncError,
    activeDocFile,
    openWindow,
    findNodeById
  } = useOSStore();

  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null);
  const [showToC, setShowToC] = useState(false);

  // Sync with store's active file
  useEffect(() => {
    if (activeDocFile) {
      const node = findNodeById(activeDocFile);
      if (node) {
        // Calculate path for breadcrumbs
        const findPath = (targetId, nodes, path = []) => {
          for (const n of nodes) {
            const currentPath = [...path, n.name];
            if (n.id === targetId) return currentPath;
            if (n.children) {
              const subPath = findPath(targetId, n.children, currentPath);
              if (subPath) return subPath;
            }
          }
          return null;
        };
        const path = findPath(activeDocFile, fileSystem);
        setSelectedFile({ ...node, path: path || [node.name] });
      }
    }
  }, [activeDocFile, fileSystem, findNodeById]);

  // GitHub Sync Logic
  const fetchDocumentationFromGitHub = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    setSyncError(null);
    
    const filesToFetch = [
      { id: 'file-readme', name: 'README.md' },
      { id: 'file-architecture', name: 'ARCHITECTURE.md' },
      { id: 'file-terminal', name: 'TERMINAL.md' },
      { id: 'file-styling', name: 'STYLING.md' }
    ];
    
    const fetchedFiles = [];
    try {
      for (const file of filesToFetch) {
        const url = `https://raw.githubusercontent.com/abhi-deotech/os-portfolio/master/${file.name}`;
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const content = await response.text();
          fetchedFiles.push({ id: file.id, content });
        } catch (e) {
          console.warn(`Error fetching ${file.name}:`, e);
        }
      }
      
      if (fetchedFiles.length === 0) throw new Error('Sync failed. Please check your connection.');
      syncDocumentation(fetchedFiles);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (error) {
      setSyncError(error.message);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Extract ToC from Markdown
  const tableOfContents = useMemo(() => {
    if (!selectedFile?.content) return [];
    const lines = selectedFile.content.split('\n');
    const toc = [];
    lines.forEach(line => {
      const match = line.match(/^(#{2,3})\s+(.*)$/);
      if (match) {
        toc.push({
          level: match[1].length,
          text: match[2].trim(),
          id: match[2].trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
        });
      }
    });
    return toc;
  }, [selectedFile]);

  // Flatten and filter for search
  const markdownFiles = useMemo(() => {
    const files = [];
    const traverse = (nodes, path = []) => {
      nodes.forEach(node => {
        const currentPath = [...path, node.name];
        if (node.children) traverse(node.children, currentPath);
        else if (node.name.endsWith('.md')) {
          files.push({ ...node, path: currentPath });
        }
      });
    };
    traverse(fileSystem);
    return files;
  }, [fileSystem]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return markdownFiles.filter(f => 
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, markdownFiles]);

  // Filter filesystem for documentation (only show paths that lead to .md files)
  const filteredDocSystem = useMemo(() => {
    const filterNodes = (nodes) => {
      return nodes
        .map(node => {
          if (node.children) {
            const children = filterNodes(node.children);
            if (children.length > 0) return { ...node, children };
          } else if (node.name.endsWith('.md')) {
            return node;
          }
          return null;
        })
        .filter(Boolean);
    };
    return filterNodes(fileSystem);
  }, [fileSystem]);

  return (
    <div className="flex flex-col h-full bg-os-surface overflow-hidden">
      {/* Premium Header */}
      <div className="h-16 border-b border-os-outline/10 glass-panel flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors touch-hit-area"
          >
            <CustomIcon icon={sidebarOpen ? X : Menu} size={18} color="text-os-onSurfaceVariant" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-os-primary/10 flex items-center justify-center border border-os-primary/20 shadow-lg shadow-os-primary/5">
              <Book size={20} className="text-os-primary" />
            </div>
            <div>
              <h1 className="text-sm font-black text-os-onSurface tracking-tight">OS DOCUMENTATION</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-os-secondary animate-pulse' : 'bg-green-500'}`} />
                <span className="text-[10px] font-bold text-os-onSurfaceVariant uppercase tracking-widest leading-none">
                  {isSyncing ? 'Synchronizing...' : 'Lumina Core v1.0.0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group hidden sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-os-onSurfaceVariant group-focus-within:text-os-primary transition-colors" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-os-surfaceContainerLow/50 rounded-xl text-xs text-os-onSurface placeholder:text-os-onSurfaceVariant border border-os-outline/10 focus:border-os-primary/30 focus:outline-none w-48 lg:w-64 transition-all"
            />
            
            {/* Search Popover */}
            <AnimatePresence>
              {searchTerm && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 left-0 right-0 bg-os-surfaceContainerHigh border border-os-outline/20 rounded-2xl shadow-2xl overflow-hidden z-50 p-2 max-h-96 overflow-y-auto"
                >
                  <p className="text-[10px] font-black p-2 uppercase tracking-widest opacity-40">Results ({searchResults.length})</p>
                  {searchResults.map(res => (
                    <div
                      key={res.id}
                      onClick={() => { openWindow('documentation', res.id); setSearchTerm(''); }}
                      className="p-3 rounded-xl hover:bg-white/5 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FileText size={12} className="text-os-primary" />
                        <span className="text-xs font-bold text-os-onSurface">{res.name}</span>
                      </div>
                      <p className="text-[10px] text-os-onSurfaceVariant line-clamp-1 opacity-60 italic">{(res.path || []).join(' / ')}</p>
                    </div>
                  ))}
                  {searchResults.length === 0 && <p className="p-4 text-xs text-center text-os-onSurfaceVariant">No matches found</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={fetchDocumentationFromGitHub}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${
              syncStatus === 'success' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : syncStatus === 'error'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-os-secondary/10 text-os-secondary border border-os-secondary/20 hover:bg-os-secondary/20 active:scale-95'
            }`}
          >
            {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span className="hidden md:inline">{isSyncing ? 'Syncing' : syncStatus === 'success' ? 'Synced' : 'Sync Docs'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-72 lg:w-80 border-r border-os-outline/10 flex flex-col glass-panel z-10"
            >
              <div className="p-4 border-b border-os-outline/10">
                <div className="flex items-center gap-2 px-2 text-[10px] font-black text-os-onSurfaceVariant uppercase tracking-widest">
                  <List size={12} />
                  Documentation Tree
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {filteredDocSystem.map(node => (
                  <FileTreeNode 
                    key={node.id} 
                    node={node} 
                    selectedFile={selectedFile} 
                    setSelectedFile={setSelectedFile} 
                  />
                ))}
              </div>
              
              {lastSyncTime && (
                <div className="p-4 border-t border-os-outline/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-os-onSurfaceVariant">
                    <Clock size={10} />
                    {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex gap-2 text-[10px] text-os-onSurfaceVariant font-bold">
                    <span className="text-green-500">READY</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#060e20]/40 overflow-hidden">
          {selectedFile ? (
            <div className="h-full flex flex-col relative">
              {/* Internal Breadcrumb & ToC Toggle */}
              <div className="h-14 border-b border-os-outline/5 flex items-center justify-between px-6 shrink-0 bg-os-surface/30 backdrop-blur-md">
                <div className="flex items-center gap-2 text-[10px] font-black text-os-onSurfaceVariant uppercase tracking-widest overflow-hidden">
                  <Home size={12} className="shrink-0 cursor-pointer hover:text-os-primary transition-colors" onClick={() => setSelectedFile(null)} />
                  {(selectedFile?.path || []).map((segment, idx) => (
                    <React.Fragment key={idx}>
                      <ChevronRight size={12} className="shrink-0 opacity-30" />
                      <span className={`truncate ${idx === (selectedFile?.path || []).length - 1 ? 'text-os-primary' : ''}`}>
                        {segment}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                
                <button
                  onClick={() => setShowToC(!showToC)}
                  className={`p-2 rounded-lg transition-all ${showToC ? 'bg-os-primary/20 text-os-primary' : 'hover:bg-white/5 text-os-onSurfaceVariant'}`}
                >
                  <List size={18} />
                </button>
              </div>

              {/* Scroll Container */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-10 relative">
                <div className="max-w-4xl mx-auto flex gap-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex-1 min-w-0"
                  >
                    <MarkdownRenderer content={selectedFile.content} />
                    
                    <div className="mt-16 pt-8 border-t border-os-outline/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-os-onSurfaceVariant uppercase tracking-widest">
                        <AlertCircle size={12} />
                        End of Documentation
                      </div>
                      <button 
                        onClick={() => openWindow('files')}
                        className="flex items-center gap-2 text-[10px] font-black text-os-primary uppercase tracking-widest hover:underline"
                      >
                        Source Code <ExternalLink size={12} />
                      </button>
                    </div>
                  </motion.div>

                  {/* Desktop ToC Floating Menu */}
                  {showToC && tableOfContents.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="w-64 shrink-0 hidden xl:block self-start sticky top-0 bg-os-surfaceContainerLow/50 rounded-2xl border border-os-outline/10 p-5 backdrop-blur-md shadow-2xl"
                    >
                      <h4 className="text-[10px] font-black text-os-onSurface uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Hash size={12} className="text-os-primary" />
                        On this page
                      </h4>
                      <nav className="space-y-3">
                        {tableOfContents.map((item, idx) => (
                          <div 
                            key={idx}
                            className={`text-xs cursor-pointer hover:text-os-primary transition-colors block truncate ${item.level === 3 ? 'pl-4 text-os-onSurfaceVariant' : 'font-bold text-os-onSurface'}`}
                            onClick={() => {
                              const el = document.getElementById(item.id);
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                          >
                            {item.text}
                          </div>
                        ))}
                      </nav>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Dashboard View */
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div className="max-w-xl">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mb-8"
                >
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-os-primary to-os-secondary p-0.5 mx-auto mb-6 shadow-2xl shadow-os-primary/10">
                    <div className="w-full h-full rounded-[1.4rem] bg-os-surface flex items-center justify-center">
                       <Book size={36} className="text-os-primary" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-os-onSurface mb-3 tracking-tight underline decoration-os-primary/30 underline-offset-8">KNOWLEDGE CENTER</h2>
                  <p className="text-os-onSurfaceVariant leading-relaxed">
                    Explore the technical blueprint of Lumina OS. Dive into architecture, command references, and core styling systems.
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {markdownFiles.slice(0, 4).map((file, idx) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => openWindow('documentation', file.id)}
                      className="p-5 bg-os-surfaceContainerLow/50 rounded-2xl border border-os-outline/10 hover:border-os-primary/40 hover:bg-os-surfaceContainerLow transition-all text-left group cursor-pointer group shadow-xl"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-os-primary/10 rounded-xl border border-os-primary/20 group-hover:bg-os-primary/20 transition-colors">
                           <FileText size={16} className="text-os-primary" />
                        </div>
                        <ArrowRight size={14} className="text-os-onSurfaceVariant opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-os-primary" />
                      </div>
                      <h4 className="text-sm font-black text-os-onSurface mb-1 uppercase tracking-tight">{file.name}</h4>
                      <p className="text-[10px] text-os-onSurfaceVariant font-medium line-clamp-2 leading-relaxed italic opacity-60">
                        {file.content.split('\n')[2]?.replace(/[#*]/g, '') || 'Module detailed technical specification.'}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sync Status Overlay */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-os-surface/80 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="relative">
               <div className="w-24 h-24 border-2 border-os-primary/20 border-t-os-primary rounded-full animate-spin" />
               <Book size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-os-primary" />
            </div>
            <p className="mt-8 text-sm font-black text-os-onSurface uppercase tracking-[0.2em] animate-pulse">Syncing Library</p>
            <p className="mt-2 text-[10px] text-os-onSurfaceVariant font-bold uppercase tracking-widest">Fetching from main repository...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentationApp;
