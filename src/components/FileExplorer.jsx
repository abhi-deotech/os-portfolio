import React, { useState, useRef } from 'react';
import { Tree } from 'react-arborist';
import { motion } from 'framer-motion';
import { Folder, FolderOpen, FileText, Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';

// --- Individual Node Renderer ---
const Node = ({ node, style, dragHandle }) => {
  const { deleteNode, renameNode } = useOSStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.data.name);
  const inputRef = useRef(null);

  const isFolder = node.data.children !== undefined;
  const isSelected = node.isSelected;

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
      {isFolder ? (
        node.isOpen ? (
          <CustomIcon icon={FolderOpen} size={15} color="text-os-secondary" glow={isSelected ? 'rgba(var(--os-secondary-rgb), 0.3)' : false} />
        ) : (
          <CustomIcon icon={Folder} size={15} color="text-os-secondary" glow={isSelected ? 'rgba(var(--os-secondary-rgb), 0.3)' : false} />
        )
      ) : (
        <CustomIcon icon={FileText} size={15} color="text-os-onSurfaceVariant" />
      )}

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
  const { fileSystem, setFileSystem, createFolder } = useOSStore();

  const handleChange = (newTree) => {
    setFileSystem(newTree.map((n) => n.data));
  };

  return (
    <div className="flex flex-col h-full font-sans bg-transparent overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 shrink-0">
        <span className="text-xs font-bold uppercase tracking-widest text-os-onSurfaceVariant">Files</span>
        <div className="ml-auto flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => createFolder(`New Folder ${Date.now() % 1000}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-os-primary/10 border border-os-primary/20 hover:bg-os-primary/20 transition-all text-os-primary text-xs font-bold"
          >
            <CustomIcon icon={Plus} size={12} glow="rgba(var(--os-primary-rgb), 0.4)" />
            New Folder
          </motion.button>
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
