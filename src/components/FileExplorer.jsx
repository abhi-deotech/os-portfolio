import React, { useState, useRef, useMemo } from 'react';
import { Tree } from 'react-arborist';
import { 
  Folder, FolderOpen, FileText, Plus, Trash2, Edit3, 
  HardDrive, Image, Music, Video, Archive, Settings, 
  Monitor, File, RefreshCw, Search, ChevronRight, Home,
  Clock, Star, MoreVertical, FilePlus, FolderPlus
} from 'lucide-react';
import useOSStore from '../store/osStore';

/**
 * Premium File Explorer for Lumina OS.
 * Features:
 * - Breadcrumb navigation
 * - Real-time filtering/search
 * - App integration (Double-click to open)
 * - Drag and Drop (DND) support
 * - Recent Files tracking
 * - Modern Glassmorphic UI
 */

// --- Individual Node Renderer ---
const Node = ({ node, style, dragHandle }) => {
  const deleteNode = useOSStore(state => state.deleteNode);
  const renameNode = useOSStore(state => state.renameNode);
  const openWindow = useOSStore(state => state.openWindow);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.data.name);
  const inputRef = useRef(null);

  const isFolder = !!node.data.children;
  const isSelected = node.isSelected;

  // App Integration Logic
  const handleOpen = () => {
    if (isFolder) {
      node.toggle();
      return;
    }

    const { name, id } = node.data;
    if (name.endsWith('.md')) openWindow('documentation', id);
    else if (name.endsWith('.mp3') || name.endsWith('.wav')) openWindow('music', id);
    else if (name.endsWith('.mp4') || name.endsWith('.avi')) openWindow('media', id);
    else if (name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.jpeg')) openWindow('photos', id);
    else if (name.endsWith('.txt')) openWindow('notepad', id);
  };

  const getFileIcon = (name) => {
    if (isFolder) {
      return node.isOpen ? (
        <FolderOpen size={16} className="text-os-secondary" />
      ) : (
        <Folder size={16} className="text-os-secondary" />
      );
    }

    const iconProps = { size: 16, className: 'shrink-0' };
    if (name.endsWith('.md')) return <FileText {...iconProps} className="text-os-primary" />;
    if (name.endsWith('.pdf')) return <FileText {...iconProps} className="text-red-400" />;
    if (name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.jpeg')) return <Image {...iconProps} className="text-os-tertiary" />;
    if (name.endsWith('.mp3')) return <Music {...iconProps} className="text-os-primary" />;
    if (name.endsWith('.mp4')) return <Video {...iconProps} className="text-os-secondary" />;
    if (name.endsWith('.zip')) return <Archive {...iconProps} className="text-yellow-500" />;
    return <File {...iconProps} className="text-os-onSurfaceVariant" />;
  };

  const handleRenameCommit = () => {
    if (renameValue.trim()) renameNode(node.id, renameValue.trim());
    setIsRenaming(false);
  };

  return (
    <div
      style={style}
      ref={dragHandle}
      className={`group flex items-center gap-2 px-3 py-1 rounded-xl cursor-pointer transition-all border ${
        isSelected ? 'bg-os-primary/20 border-os-primary/30 shadow-lg shadow-os-primary/5' : 'hover:bg-white/5 border-transparent'
      }`}
      onClick={(e) => {
        if (e.detail === 2) handleOpen();
        else node.select();
      }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {getFileIcon(node.data.name)}
        {isRenaming ? (
          <input
            ref={inputRef}
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameCommit();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-os-surfaceContainerLow border border-os-primary/40 rounded px-1.5 py-0.5 text-xs text-os-onSurface outline-none w-full"
          />
        ) : (
          <span className={`text-xs font-medium truncate ${isSelected ? 'text-os-onSurface' : 'text-os-onSurfaceVariant group-hover:text-os-onSurface'}`}>
            {node.data.name}
          </span>
        )}
      </div>

      {!isRenaming && (
        <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-os-onSurfaceVariant hover:text-os-primary transition-all"
          >
            <Edit3 size={11} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-os-onSurfaceVariant hover:text-red-400 transition-all"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
};

// --- Main File Explorer Component ---
const FileExplorer = () => {
  const fileSystem = useOSStore(state => state.fileSystem);
  const createFolder = useOSStore(state => state.createFolder);
  const createFile = useOSStore(state => state.createFile);
  const moveNode = useOSStore(state => state.moveNode);
  const resetFileSystem = useOSStore(state => state.resetFileSystem);
  const getPathFromId = useOSStore(state => state.getPathFromId);
  const findNodeById = useOSStore(state => state.findNodeById);
  const recentFiles = useOSStore(state => state.recentFiles);
  const openWindow = useOSStore(state => state.openWindow);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [activeTab, setActiveTab] = useState('This PC'); // 'This PC', 'Recent', 'Starred'

  // Derive breadcrumbs for selected node
  const breadcrumbs = useMemo(() => {
    if (!selectedNodeId) return ['This PC'];
    const path = getPathFromId(selectedNodeId);
    return path ? ['This PC', ...path] : ['This PC'];
  }, [selectedNodeId, getPathFromId]);

  // Derived Recent Files List
  const recentFileList = useMemo(() => {
    return (recentFiles || []).map(id => findNodeById(id)).filter(Boolean);
  }, [recentFiles, findNodeById]);

  // Handle DND move
  const handleMove = ({ dragIds, parentId, index }) => {
    moveNode(dragIds[0], parentId, index);
  };

  const handleCreateFile = () => {
    const name = prompt('Enter file name (e.g., notes.txt):', 'newfile.txt');
    if (name) {
      const parentId = selectedNodeId && findNodeById(selectedNodeId)?.children ? selectedNodeId : null;
      createFile(name, '', parentId);
    }
  };

  const handleCreateFolder = () => {
    const name = prompt('Enter folder name:', 'New Folder');
    if (name) {
      const parentId = selectedNodeId && findNodeById(selectedNodeId)?.children ? selectedNodeId : null;
      createFolder(name, parentId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-os-surface font-sans overflow-hidden">
      {/* Header Area */}
      <div className="bg-os-surfaceContainerLow/30 p-4 border-b border-os-outline/10 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
             <div className="w-8 h-8 rounded-xl bg-orange-400/10 flex items-center justify-center border border-orange-400/20">
                <HardDrive size={16} className="text-orange-400" />
             </div>
             <h2 className="text-xs font-black text-os-onSurface tracking-widest uppercase ml-2">Lumina Cloud</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCreateFolder}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-os-primary/10 hover:border-os-primary/20 text-os-onSurfaceVariant hover:text-os-primary transition-all"
              title="New Folder"
            >
              <FolderPlus size={16} />
            </button>
            <button 
              onClick={handleCreateFile}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-os-tertiary/10 hover:border-os-tertiary/20 text-os-onSurfaceVariant hover:text-os-tertiary transition-all"
              title="New File"
            >
              <FilePlus size={16} />
            </button>
            <div className="w-px h-6 bg-os-outline/10 mx-1" />
            <button 
              onClick={resetFileSystem}
              className="p-2 rounded-xl hover:bg-red-500/10 text-os-onSurfaceVariant hover:text-red-400 transition-all"
              title="Reset All"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Breadcrumbs */}
          <div className="flex-1 bg-os-surfaceContainerLow/50 rounded-xl border border-os-outline/10 px-3 py-1.5 flex items-center gap-1 overflow-x-auto scrollbar-hide min-h-[32px]">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className={`text-[10px] font-bold whitespace-nowrap cursor-default ${idx === breadcrumbs.length - 1 ? 'text-os-primary' : 'text-os-onSurfaceVariant/60'}`}>
                  {crumb}
                </span>
                {idx < breadcrumbs.length - 1 && <ChevronRight size={10} className="text-os-onSurfaceVariant/30 shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-48 lg:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-os-onSurfaceVariant opacity-50" />
            <input 
              type="text" 
              placeholder="Search in Lumina..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-os-surfaceContainerLow/50 rounded-xl border border-os-outline/10 text-xs text-os-onSurface focus:outline-none focus:border-os-primary/30 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-60 border-r border-os-outline/5 flex flex-col glass-panel shrink-0">
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            <section>
              <h3 className="px-3 text-[10px] font-black text-os-onSurfaceVariant uppercase tracking-widest mb-3 opacity-40">Locations</h3>
              <div className="space-y-1">
                {[
                  { id: 'This PC', icon: Home, label: 'Internal Storage' },
                  { id: 'Starred', icon: Star, label: 'Starred Items' },
                  { id: 'Recent', icon: Clock, label: 'Recent Activity' }
                ].map(item => (
                  <div 
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                      activeTab === item.id ? 'bg-os-primary/10 text-os-primary border border-os-primary/10' : 'hover:bg-white/5 text-os-onSurfaceVariant hover:text-os-onSurface'
                    }`}
                  >
                    <item.icon size={16} />
                    <span className="text-xs font-bold">{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {recentFileList.length > 0 && (
              <section>
                <h3 className="px-3 text-[10px] font-black text-os-onSurfaceVariant uppercase tracking-widest mb-3 opacity-40">Quick Access</h3>
                <div className="space-y-1">
                  {recentFileList.map(file => (
                    <div 
                      key={file.id}
                      onClick={() => openWindow(file.name.endsWith('.md') ? 'documentation' : 'notepad', file.id)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-os-onSurfaceVariant hover:text-os-onSurface transition-all cursor-pointer group"
                    >
                      <FileText size={14} className="text-os-primary/60 group-hover:text-os-primary" />
                      <span className="text-xs truncate">{file.name}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="p-4 border-t border-os-outline/5">
             <div className="flex items-center gap-3 mb-2">
                <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full w-2/3 bg-gradient-to-r from-os-primary to-os-secondary rounded-full" />
                </div>
                <span className="text-[10px] font-black text-os-onSurfaceVariant">64%</span>
             </div>
             <p className="text-[9px] font-bold text-os-onSurfaceVariant uppercase tracking-widest text-center opacity-40">128 GB of 256 GB used</p>
          </div>
        </div>

        {/* The Explorer View */}
        <div className="flex-1 overflow-y-auto px-4 py-4 relative bg-[#060e20]/20">
          {activeTab === 'This PC' ? (
            <Tree
              data={fileSystem}
              idAccessor="id"
              childrenAccessor="children"
              openByDefault={false}
              width="100%"
              indent={16}
              rowHeight={34}
              searchTerm={searchTerm}
              searchMatch={(node, term) => node.data.name.toLowerCase().includes(term.toLowerCase())}
              onSelect={(nodes) => nodes[0] && setSelectedNodeId(nodes[0].id)}
              onMove={handleMove}
              renderCursor={() => (
                <div className="h-0.5 bg-os-primary/40 rounded-full mx-2 shadow-[0_0_8px_var(--os-primary)]" />
              )}
            >
              {Node}
            </Tree>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
               <div className="w-16 h-16 rounded-full bg-os-outline/10 flex items-center justify-center mb-4">
                  {activeTab === 'Starred' ? <Star size={32} /> : <Clock size={32} />}
               </div>
               <h3 className="text-sm font-black uppercase tracking-widest">{activeTab} is Empty</h3>
               <p className="text-xs mt-2">No items have been {activeTab.toLowerCase()} yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-8 border-t border-os-outline/5 glass-panel px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
           <span className="text-[10px] font-bold text-os-onSurfaceVariant tracking-widest uppercase">
             {fileSystem.length} Root Objects
           </span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
           <span className="text-[10px] font-bold text-os-onSurfaceVariant uppercase tracking-widest">Storage Synced</span>
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;
