'use client';

import React, { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Download,
  RotateCw,
  X,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Layers,
  Code2,
} from 'lucide-react';
import { FileChangeRecord } from '@/lib/agent/events';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  children?: FileNode[];
}

interface AgentWorkspacePanelProps {
  sessionId: string;
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
  selectedFilePath?: string;
  onSelectFile?: (path: string) => void;
  filesChanged?: FileChangeRecord[];
}

function buildTreeFromFiles(files: FileChangeRecord[]): FileNode[] {
  const root: Record<string, any> = {};

  for (const f of files) {
    const cleanPath = f.path.replace(/^[/\\]+/, '');
    const parts = cleanPath.split(/[/\\]/);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const subPath = parts.slice(0, i + 1).join('/');

      if (!current[part]) {
        current[part] = isFile
          ? {
              name: part,
              path: subPath,
              isDirectory: false,
              size: f.newContent?.length || 0,
            }
          : {
              name: part,
              path: subPath,
              isDirectory: true,
              _children: {},
            };
      }

      if (!isFile) {
        current = current[part]._children;
      }
    }
  }

  function convert(obj: Record<string, any>): FileNode[] {
    const nodes: FileNode[] = [];
    for (const key of Object.keys(obj)) {
      if (key === '_children') continue;
      const item = obj[key];
      if (item.isDirectory) {
        nodes.push({
          name: item.name,
          path: item.path,
          isDirectory: true,
          children: convert(item._children),
        });
      } else {
        nodes.push({
          name: item.name,
          path: item.path,
          isDirectory: false,
          size: item.size,
        });
      }
    }

    return nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return convert(root);
}

export default function AgentWorkspacePanel({
  sessionId,
  userId = 'anonymous',
  isOpen,
  onClose,
  selectedFilePath,
  onSelectFile,
  filesChanged = [],
}: AgentWorkspacePanelProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<string>(selectedFilePath || '');
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['.', 'src', 'components', 'pages', 'app']));
  const [copied, setCopied] = useState(false);

  // Sync tree with filesChanged in state/localStorage
  useEffect(() => {
    if (filesChanged && filesChanged.length > 0) {
      const builtTree = buildTreeFromFiles(filesChanged);
      setTree(builtTree);

      // Auto-expand all parent folders
      const allDirs = new Set<string>(['.']);
      filesChanged.forEach((f) => {
        const parts = f.path.split(/[/\\]/);
        for (let i = 1; i < parts.length; i++) {
          allDirs.add(parts.slice(0, i).join('/'));
        }
      });
      setExpandedFolders((prev) => new Set([...Array.from(prev), ...Array.from(allDirs)]));

      // Auto-select first file if activeFile is empty or not in filesChanged
      if (!activeFile || !filesChanged.some((f) => f.path === activeFile)) {
        setActiveFile(filesChanged[0].path);
      }
    } else if (isOpen) {
      fetchTree();
    }
  }, [filesChanged, isOpen]);

  // Fetch Tree from backend API (as fallback or for local filesystem)
  const fetchTree = async () => {
    if (!sessionId) return;
    setIsLoadingTree(true);
    try {
      const res = await fetch(`/api/agent/workspace?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}&action=tree`);
      const data = await res.json();
      if (data.success && Array.isArray(data.tree) && data.tree.length > 0) {
        setTree(data.tree);
        if (!activeFile) {
          const findFirstFile = (nodes: FileNode[]): string | null => {
            for (const n of nodes) {
              if (!n.isDirectory) return n.path;
              if (n.children) {
                const f = findFirstFile(n.children);
                if (f) return f;
              }
            }
            return null;
          };
          const first = findFirstFile(data.tree);
          if (first) setActiveFile(first);
        }
      }
    } catch (err) {
      console.error('Failed to load workspace tree:', err);
    } finally {
      setIsLoadingTree(false);
    }
  };

  // Fetch File Content (checks in-memory filesChanged first, then backend API)
  const fetchContent = async (filePath: string) => {
    if (!filePath) return;

    // Check filesChanged first (instant and guaranteed to work on Vercel)
    const matching = filesChanged.find(
      (f) => f.path === filePath || f.path === filePath.replace(/^[/\\]+/, '') || filePath.endsWith(f.path)
    );

    if (matching && typeof matching.newContent === 'string') {
      setFileContent(matching.newContent);
      return;
    }

    if (!sessionId) return;
    setIsLoadingContent(true);
    try {
      const res = await fetch(`/api/agent/workspace?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}&action=read&path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.success && typeof data.content === 'string') {
        setFileContent(data.content);
      } else {
        setFileContent(`// Unable to read file content: ${data.error || 'File not found'}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error reading file';
      setFileContent(`// Error reading file: ${message}`);
    } finally {
      setIsLoadingContent(false);
    }
  };

  useEffect(() => {
    if (selectedFilePath) {
      setActiveFile(selectedFilePath);
    }
  }, [selectedFilePath]);

  useEffect(() => {
    if (activeFile && isOpen) {
      fetchContent(activeFile);
    }
  }, [activeFile, isOpen, filesChanged]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  const handleDownloadZip = async () => {
    if (filesChanged && filesChanged.length > 0) {
      try {
        const zip = new JSZip();
        for (const file of filesChanged) {
          if (file.newContent) {
            zip.file(file.path, file.newContent);
          }
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `harpy-project-${sessionId}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      } catch (zipErr) {
        console.warn('Browser zip export fallback to server:', zipErr);
      }
    }
    window.open(`/api/agent/workspace?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}&action=zip`, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!isOpen) return null;

  // Render tree node recursively
  const renderNode = (node: FileNode, level = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = activeFile === node.path;

    if (node.isDirectory) {
      return (
        <div key={node.path}>
          <button
            type="button"
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            className="w-full flex items-center gap-1.5 py-1 text-xs text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 transition-colors text-left font-mono"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-[#C6A46A] shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-[#C6A46A]/60 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-[#C6A46A] shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-[#C6A46A]/80 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </button>

          {isExpanded && node.children && (
            <div>{node.children.map((child) => renderNode(child, level + 1))}</div>
          )}
        </div>
      );
    }

    return (
      <button
        key={node.path}
        type="button"
        onClick={() => {
          setActiveFile(node.path);
          if (onSelectFile) onSelectFile(node.path);
        }}
        style={{ paddingLeft: `${level * 12 + 20}px` }}
        className={`w-full flex items-center gap-2 py-1 text-xs font-mono transition-colors text-left ${
          isSelected
            ? 'bg-[#C6A46A]/20 text-[#C6A46A] font-medium border-l-2 border-[#C6A46A]'
            : 'text-[#E8DDC7]/75 hover:text-white hover:bg-white/5'
        }`}
      >
        <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#C6A46A]' : 'text-[#8C7A6B]'}`} />
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#07070B] border-l border-[#1A1A24] text-[#E8DDC7] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-14 px-3 sm:px-4 border-b border-[#1A1A24] bg-[#0A0A10] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-[#C6A46A] shrink-0" />
          <span className="font-cinzel text-xs font-semibold tracking-wider uppercase text-[#E8DDC7] truncate">
            Workspace IDE
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={fetchTree}
            disabled={isLoadingTree}
            className="p-1.5 rounded-lg text-[#E8DDC7]/70 hover:text-white hover:bg-white/5 transition-colors"
            title="Refresh File Tree"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingTree ? 'animate-spin text-[#C6A46A]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleDownloadZip}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-cinzel rounded-md bg-[#C6A46A]/15 border border-[#C6A46A]/30 text-[#C6A46A] hover:bg-[#C6A46A]/25 transition-all shadow-sm"
            title="Download full project workspace as ZIP"
          >
            <Download className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">Download ZIP</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#E8DDC7]/60 hover:text-white hover:bg-white/5 transition-colors ml-1"
            title="Close Workspace Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split Body: Left Tree (w-48 sm:w-56) & Right Code Viewer */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: File Tree */}
        <div className="w-44 sm:w-56 border-r border-[#14141C] bg-[#050508] flex flex-col shrink-0">
          <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-[#8C7A6B] border-b border-[#14141C] flex items-center justify-between">
            <span>Files</span>
            <span>{tree.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto py-1 [scrollbar-width:thin]">
            {tree.length > 0 ? (
              tree.map((node) => renderNode(node))
            ) : (
              <div className="p-4 text-center text-xs text-[#8C7A6B] font-mono">
                {isLoadingTree ? 'Scanning workspace...' : 'No files created yet.'}
              </div>
            )}
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-black">
          {activeFile ? (
            <>
              {/* File Bar */}
              <div className="px-3 py-2 bg-[#09090E] border-b border-[#14141C] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <Code2 className="w-3.5 h-3.5 text-[#C6A46A] shrink-0" />
                  <span className="font-mono text-xs text-[#E8DDC7] truncate">{activeFile}</span>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-[#D5C2A5]/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Code Area with Line Numbers */}
              <div className="flex-1 overflow-auto p-3 font-mono text-xs text-emerald-200/90 leading-relaxed [scrollbar-width:thin]">
                {isLoadingContent ? (
                  <div className="flex items-center justify-center h-full text-xs text-[#8C7A6B]">
                    Loading file contents...
                  </div>
                ) : (
                  <pre className="selection:bg-[#C6A46A]/30">
                    {fileContent.split('\n').map((line, idx) => (
                      <div key={idx} className="flex hover:bg-white/5">
                        <span className="w-8 shrink-0 text-[#8C7A6B]/50 select-none text-right pr-3 font-mono text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="whitespace-pre-wrap break-all text-[#E8DDC7]/90">{line || ' '}</span>
                      </div>
                    ))}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[#8C7A6B]">
              <FileText className="w-10 h-10 text-[#C6A46A]/30 mb-2" />
              <p className="font-cinzel text-sm text-[#E8DDC7]">Workspace Ready</p>
              <p className="font-mono text-[11px] mt-1">Select any file from the explorer to view code.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
