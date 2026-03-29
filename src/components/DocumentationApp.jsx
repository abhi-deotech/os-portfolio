import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Book, FileText, Search, ChevronRight, Home, Folder, Menu, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';

/**
 * OS Documentation App - Displays markdown files in a formatted way
 * Features:
 * - File tree navigation
 * - Markdown rendering with syntax highlighting
 * - Search functionality
 * - Breadcrumb navigation
 * - Responsive design
 */

const DocumentationApp = () => {
  const { 
    fileSystem, 
    syncDocumentation, 
    setIsSyncing, 
    setSyncError, 
    isSyncing, 
    lastSyncTime, 
    syncError 
  } = useOSStore();
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set(['root-documents']));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null); // 'success' | 'error' | null

  // Fetch documentation from GitHub
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
        const url = `https://raw.githubusercontent.com/abhi-deotech/vibe-os-portfolio/main/${file.name}`;
        
        try {
          const response = await fetch(url);
          
          if (!response.ok) {
            console.warn(`Failed to fetch ${file.name}: ${response.status}`);
            continue;
          }
          
          const content = await response.text();
          fetchedFiles.push({ id: file.id, content });
        } catch (fileError) {
          console.warn(`Error fetching ${file.name}:`, fileError);
          // Continue with other files
        }
      }
      
      if (fetchedFiles.length === 0) {
        throw new Error('Unable to fetch any documentation files. Please check your internet connection.');
      }
      
      // Update the file system with fetched content
      syncDocumentation(fetchedFiles);
      setSyncStatus('success');
      
      // Clear success status after 3 seconds
      setTimeout(() => setSyncStatus(null), 3000);
      
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncError(error.message);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Format last sync time
  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never synced';
    const date = new Date(timestamp);
    return `Last synced: ${date.toLocaleTimeString()}`;
  };
  const getMarkdownFiles = (nodes, path = []) => {
    const files = [];
    
    nodes.forEach(node => {
      const currentPath = [...path, node.name];
      
      if (node.children) {
        // It's a folder, recursively search
        files.push({
          ...node,
          path: currentPath,
          type: 'folder'
        });
        files.push(...getMarkdownFiles(node.children, currentPath));
      } else if (node.name && node.name.endsWith('.md')) {
        // It's a markdown file
        files.push({
          ...node,
          path: currentPath,
          type: 'file'
        });
      }
    });
    
    return files;
  };

  const allFiles = getMarkdownFiles(fileSystem);
  const markdownFiles = allFiles.filter(file => file.type === 'file');

  // Filter files based on search
  const filteredFiles = markdownFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle folder expansion
  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Render markdown content (basic implementation)
  const renderMarkdown = (content) => {
    if (!content) return '';
    
    return content
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-os-onSurface mb-2 mt-4">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-os-onSurface mb-3 mt-6">$2</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-os-onSurface mb-4 mt-6">$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/g, '<strong class="font-bold text-os-onSurface">$1</strong>')
      // Italic
      .replace(/\*(.*)\*/g, '<em class="italic text-os-onSurfaceVariant">$1</em>')
      // Code blocks
      .replace(/```(.*?)```/gs, '<pre class="bg-os-surfaceContainerLow rounded-lg p-4 mb-4 overflow-x-auto"><code class="text-sm font-mono text-os-onSurface">$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-os-surfaceContainerLow rounded px-2 py-1 text-sm font-mono text-os-primary">$1</code>')
      // Lists
      .replace(/^- (.*$)/gim, '<li class="ml-4 text-os-onSurfaceVariant">• $1</li>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-4 text-os-onSurfaceVariant leading-relaxed">')
      .replace(/\n/g, '<br />')
      // Wrap in paragraphs
      .replace(/^(.*)$/gim, '<p class="mb-4 text-os-onSurfaceVariant leading-relaxed">$1</p>');
  };

  // Get file tree component
  const FileTreeNode = ({ node, level = 0 }) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedFile && selectedFile.id === node.id;
    const isFolder = node.children !== undefined && node.children !== null;
    
    if (isFolder) {
      return (
        <div>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
              isSelected ? 'bg-os-primary/20' : 'hover:bg-white/5'
            }`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
            onClick={() => toggleFolder(node.id)}
          >
            <ChevronRight
              size={14}
              className={`transition-transform ${isExpanded ? 'rotate-90' : ''} text-os-onSurfaceVariant`}
            />
            <CustomIcon icon={Folder} size={14} color="text-os-secondary" />
            <span className="text-sm text-os-onSurfaceVariant">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => (
                <FileTreeNode key={child.id} node={child} level={level + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (node.name && node.name.endsWith('.md')) {
      return (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
            isSelected ? 'bg-os-primary/20 border-l-2 border-os-primary' : 'hover:bg-white/5'
          }`}
          style={{ paddingLeft: `${level * 16 + 28}px` }}
          onClick={() => setSelectedFile(node)}
        >
          <CustomIcon icon={FileText} size={14} color="text-os-primary" />
          <span className="text-sm text-os-onSurface">{node.name}</span>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-os-surface">
      {/* Header */}
      <div className="h-16 border-b border-os-outline/10 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors lg:hidden"
          >
            <CustomIcon icon={sidebarOpen ? X : Menu} size={18} color="text-os-onSurfaceVariant" />
          </button>
          <div className="flex items-center gap-2">
            <CustomIcon icon={Book} size={20} color="text-os-primary" />
            <h1 className="text-lg font-bold text-os-onSurface">OS Documentation</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <CustomIcon icon={Search} size={16} color="text-os-onSurfaceVariant" className="absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-os-surfaceContainerLow rounded-lg text-sm text-os-onSurface placeholder-os-onSurfaceVariant border border-os-outline/10 focus:border-os-primary/30 focus:outline-none w-64"
            />
          </div>
          
          {/* Sync Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDocumentationFromGitHub}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                syncStatus === 'success' 
                  ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                  : syncStatus === 'error'
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                  : 'bg-os-secondary/10 border border-os-secondary/20 hover:bg-os-secondary/20 text-os-secondary'
              } ${isSyncing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSyncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-os-secondary/30 border-t-os-secondary rounded-full animate-spin" />
                  Syncing...
                </>
              ) : syncStatus === 'success' ? (
                <>
                  <CustomIcon icon={CheckCircle} size={14} color="text-green-400" />
                  Synced!
                </>
              ) : syncStatus === 'error' ? (
                <>
                  <CustomIcon icon={AlertCircle} size={14} color="text-red-400" />
                  Failed
                </>
              ) : (
                <>
                  <CustomIcon icon={RefreshCw} size={14} color="text-os-secondary" />
                  Sync
                </>
              )}
            </button>
            
            {syncError && (
              <span className="text-[10px] text-red-400 hidden xl:block max-w-[150px] truncate">
                {syncError}
              </span>
            )}
            {lastSyncTime && (
              <span className="text-[10px] text-os-onSurfaceVariant hidden xl:block">
                {formatLastSync(lastSyncTime)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-80 border-r border-os-outline/10 flex flex-col bg-os-surfaceContainerLow/30"
            >
              <div className="p-4 border-b border-os-outline/10">
                <div className="flex items-center gap-2 text-sm font-bold text-os-onSurfaceVariant uppercase tracking-wider">
                  <CustomIcon icon={Folder} size={14} />
                  File Explorer
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {fileSystem.map(node => (
                  <FileTreeNode key={node.id} node={node} />
                ))}
              </div>
              
              {searchTerm && (
                <div className="p-4 border-t border-os-outline/10">
                  <div className="text-sm font-bold text-os-onSurfaceVariant mb-2">
                    Search Results ({filteredFiles.length})
                  </div>
                  <div className="space-y-1">
                    {filteredFiles.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-xs"
                        onClick={() => setSelectedFile(file)}
                      >
                        <CustomIcon icon={FileText} size={12} color="text-os-primary" />
                        <span className="text-os-onSurface truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <>
              {/* Breadcrumb */}
              <div className="h-12 border-b border-os-outline/10 flex items-center px-6 shrink-0">
                <div className="flex items-center gap-2 text-sm text-os-onSurfaceVariant">
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="hover:text-os-primary transition-colors"
                  >
                    <CustomIcon icon={Home} size={14} />
                  </button>
                  {selectedFile.path.map((segment, index) => (
                    <React.Fragment key={index}>
                      <ChevronRight size={14} />
                      <span className={index === selectedFile.path.length - 1 ? 'text-os-onSurface font-medium' : ''}>
                        {segment}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Document Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-os-surfaceContainerLow/30 rounded-2xl border border-os-outline/10 p-8">
                    <div
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedFile.content) }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <CustomIcon icon={Book} size={64} color="text-os-onSurfaceVariant" className="mb-4" />
                <h2 className="text-xl font-bold text-os-onSurface mb-2">Welcome to OS Documentation</h2>
                <p className="text-os-onSurfaceVariant mb-6 max-w-md">
                  Select a markdown file from the sidebar to view its contents. You can also search for specific topics.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                  {markdownFiles.slice(0, 4).map(file => (
                    <button
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className="p-4 bg-os-surfaceContainerLow/30 rounded-xl border border-os-outline/10 hover:border-os-primary/30 transition-all text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <CustomIcon icon={FileText} size={16} color="text-os-primary" />
                        <span className="text-sm font-medium text-os-onSurface">{file.name}</span>
                      </div>
                      <p className="text-xs text-os-onSurfaceVariant line-clamp-2">
                        {file.content.split('\n')[0]?.replace(/^# /, '')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentationApp;
