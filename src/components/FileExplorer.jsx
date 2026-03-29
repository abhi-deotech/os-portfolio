import React, { useState, useRef } from 'react';
import { Tree } from 'react-arborist';
import { Folder, FolderOpen, FileText, Plus, Trash2, Edit3, Check, X, HardDrive, Image, Music, Video, Archive, Settings, Monitor, File, RefreshCw } from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';

// --- Individual Node Renderer ---
const Node = ({ node, style, dragHandle }) => {
  const { deleteNode, renameNode } = useOSStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.data.name);
  const inputRef = useRef(null);

  const isFolder = node.data.children !== undefined && node.data.children !== null;
  const isSelected = node.isSelected;

  // Get appropriate icon based on file type
  const getFileIcon = (type, name) => {
    if (isFolder) {
      return node.isOpen ? (
        <CustomIcon icon={FolderOpen} size={15} color="text-os-secondary" glow={isSelected ? 'rgba(var(--os-secondary-rgb), 0.3)' : false} />
      ) : (
        <CustomIcon icon={Folder} size={15} color="text-os-secondary" glow={isSelected ? 'rgba(var(--os-secondary-rgb), 0.3)' : false} />
      );
    }

    // File type icons
    if (name.endsWith('.md') || name.endsWith('.txt')) {
      return <CustomIcon icon={FileText} size={15} color="text-blue-400" />;
    }
    if (name.endsWith('.pdf')) {
      return <CustomIcon icon={FileText} size={15} color="text-red-400" />;
    }
    if (name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.jpeg') || name.endsWith('.gif')) {
      return <CustomIcon icon={Image} size={15} color="text-green-400" />;
    }
    if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg')) {
      return <CustomIcon icon={Music} size={15} color="text-purple-400" />;
    }
    if (name.endsWith('.mp4') || name.endsWith('.avi') || name.endsWith('.mov')) {
      return <CustomIcon icon={Video} size={15} color="text-orange-400" />;
    }
    if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) {
      return <CustomIcon icon={Archive} size={15} color="text-yellow-400" />;
    }
    if (name.endsWith('.exe') || name.endsWith('.msi') || name.endsWith('.app')) {
      return <CustomIcon icon={Monitor} size={15} color="text-cyan-400" />;
    }
    if (name.endsWith('.sys') || name.endsWith('.dll') || name.endsWith('.ini') || name.endsWith('.log')) {
      return <CustomIcon icon={Settings} size={15} color="text-gray-400" />;
    }
    if (name.endsWith('.json') || name.endsWith('.xml') || name.endsWith('.yml') || name.endsWith('.yaml')) {
      return <CustomIcon icon={File} size={15} color="text-yellow-300" />;
    }

    // Default file icon
    return <CustomIcon icon={FileText} size={15} color="text-os-onSurfaceVariant" />;
  };

  const handleRenameCommit = () => {
    if (renameValue.trim()) renameNode(node.id, renameValue.trim());
    setIsRenaming(false);
  };

  return (
    <div
      style={style}
      ref={dragHandle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer group transition-all duration-150 ${
        isSelected
          ? 'bg-os-primary/20 border border-os-primary/30'
          : 'hover:bg-white/5 border border-transparent'
      }`}
      onClick={() => node.toggle()}
    >
      {/* Icon */}
      {getFileIcon(node.data.type, node.data.name)}

      {/* Name / Rename input */}
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
          className="bg-white/10 border border-os-primary/40 rounded-md px-2 py-0.5 text-xs text-white outline-none w-full"
        />
      ) : (
        <span className={`text-xs font-medium truncate flex-grow ${isSelected ? 'text-white' : 'text-os-onSurfaceVariant group-hover:text-white'}`}>
          {node.data.name}
        </span>
      )}

      {/* Action Buttons (on hover/selected) */}
      {!isRenaming && (
        <div className={`flex items-center gap-1 shrink-0 transition-opacity duration-150 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setRenameValue(node.data.name); }}
            className="p-1 rounded-lg hover:bg-white/10 text-os-onSurfaceVariant hover:text-white transition-colors"
          >
            <CustomIcon icon={Edit3} size={11} animate={false} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
            className="p-1 rounded-lg hover:bg-red-500/20 text-os-onSurfaceVariant hover:text-red-400 transition-colors"
          >
            <CustomIcon icon={Trash2} size={11} animate={false} />
          </button>
        </div>
      )}
    </div>
  );
};

// --- File Explorer Root Component ---
const FileExplorer = () => {
  const { fileSystem, createFolder, resetFileSystem } = useOSStore();

  return (
    <div className="flex flex-col h-full font-sans bg-transparent overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 shrink-0">
        <span className="text-xs font-bold uppercase tracking-widest text-os-onSurfaceVariant">Files</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => createFolder(`New Folder ${Date.now() % 1000}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-os-primary/10 border border-os-primary/20 hover:bg-os-primary/20 transition-all text-os-primary text-xs font-bold"
          >
            <CustomIcon icon={Plus} size={12} glow="rgba(var(--os-primary-rgb), 0.4)" />
            New Folder
          </button>
          <button
            onClick={() => resetFileSystem()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-os-secondary/10 border border-os-secondary/20 hover:bg-os-secondary/20 transition-all text-os-secondary text-xs font-bold"
          >
            <CustomIcon icon={RefreshCw} size={12} glow="rgba(var(--os-secondary-rgb), 0.4)" />
            Reset
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-grow overflow-auto px-4 py-3 scrollbar-hide">
        <Tree
          data={fileSystem}
          idAccessor="id"
          childrenAccessor="children"
          openByDefault={false}
          width="100%"
          indent={16}
          rowHeight={36}
          renderCursor={() => (
            <div className="h-0.5 bg-os-primary/60 rounded-full mx-3 shadow-[0_0_6px_var(--os-primary)]" />
          )}
        >
          {Node}
        </Tree>
      </div>

      {/* Status Bar */}
      <div className="h-8 border-t border-white/5 flex items-center px-6 shrink-0">
        <span className="text-[10px] text-os-onSurfaceVariant font-medium">
          {fileSystem.length} items
        </span>
      </div>
    </div>
  );
};

export default FileExplorer;
