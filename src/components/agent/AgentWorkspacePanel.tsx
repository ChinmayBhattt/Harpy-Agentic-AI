'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Terminal as TerminalIcon,
  Globe,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Play,
  Compass,
  ArrowRight,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
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
  userDisplayName?: string;
  isOpen: boolean;
  onClose: () => void;
  selectedFilePath?: string;
  onSelectFile?: (path: string) => void;
  filesChanged?: FileChangeRecord[];
  onOpenBrowserAgent?: (goal?: string) => void;
  theme?: 'dark' | 'light';
}

interface TerminalEntry {
  id: string;
  type: 'prompt' | 'output' | 'error';
  command?: string;
  text: string;
  timestamp: string;
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

// Generates live interactive web preview bundle for iframe
function generatePreviewHtml(files: FileChangeRecord[], theme: 'dark' | 'light' = 'dark'): string {
  if (!files || files.length === 0) {
    if (theme === 'light') {
      return `<!DOCTYPE html><html><body style="background:#F8F9FB;color:#0F172A;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2 style="color:#0F172A;font-size:18px;margin-bottom:8px;">No Web Assets Yet</h2><p style="color:#64748B;font-size:13px;margin:0;">Files created by Harpy Agent will render live here.</p></div></body></html>`;
    }
    return `<!DOCTYPE html><html><body style="background:#09090E;color:#E8DDC7;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>No Web Assets Yet</h2><p style="opacity:0.6;">Files created by Harpy Agent will render live here.</p></div></body></html>`;
  }

  // 1. Check for index.html
  const indexHtmlFile = files.find(
    (f) => f.path.toLowerCase() === 'index.html' || f.path.toLowerCase().endsWith('/index.html')
  );

  // 2. Gather CSS files
  const cssFiles = files.filter((f) => f.path.endsWith('.css'));
  const combinedCss = cssFiles.map((f) => `/* ${f.path} */\n${f.newContent || ''}`).join('\n\n');

  // 3. Gather JS/JSX/TSX files
  const jsFiles = files.filter(
    (f) =>
      /\.(js|jsx|ts|tsx)$/i.test(f.path) &&
      !f.path.includes('vite.config') &&
      !f.path.includes('tailwind.config')
  );

  const isReact = jsFiles.some((f) =>
    /import.*react|from ['"]react['"]|<[A-Z]/i.test(f.newContent || '')
  );

  // Standalone HTML/CSS/JS Project
  if (!isReact && indexHtmlFile && indexHtmlFile.newContent) {
    let html = indexHtmlFile.newContent;
    if (combinedCss) {
      if (html.includes('</head>')) {
        html = html.replace('</head>', `<style>\n${combinedCss}\n</style></head>`);
      } else {
        html = `<style>\n${combinedCss}\n</style>\n` + html;
      }
    }
    const nonEntryJs = jsFiles.filter(
      (f) => !f.path.endsWith('main.js') && !f.path.endsWith('index.js')
    );
    const entryJs =
      jsFiles.find((f) => f.path.endsWith('main.js') || f.path.endsWith('index.js')) || jsFiles[0];
    const scriptTags = [...nonEntryJs, ...(entryJs ? [entryJs] : [])]
      .map((f) => `<script>\n/* ${f.path} */\n${f.newContent || ''}\n</script>`)
      .join('\n');

    if (html.includes('</body>')) {
      html = html.replace('</body>', `${scriptTags}</body>`);
    } else {
      html += `\n${scriptTags}`;
    }
    return html;
  }

  // Modern React / Tailwind Application with Babel Standalone
  const appFile =
    jsFiles.find((f) => /app\.(jsx|tsx|js)/i.test(f.path)) || jsFiles[0];
  const subComponents = jsFiles.filter(
    (f) => f !== appFile && !/main\.(jsx|tsx|js)/i.test(f.path)
  );

  const cleanModuleCode = (code: string) => {
    return code
      .replace(/['"]use client['"];?/g, '')
      .replace(/['"]use server['"];?/g, '')
      .replace(/import\s+React\s*(?:,\s*\{[^}]*\})?\s*from\s*['"]react['"];?/g, '')
      .replace(/import\s*\{([^}]*)\}\s*from\s*['"]react['"];?/g, 'const { $1 } = React;')
      .replace(/import\s+.*\s+from\s+['"][^'"]+['"];?/g, '')
      .replace(/import\s+['"][^'"]+\.css['"];?/g, '')
      .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1')
      .replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, '')
      .replace(/export\s+\{[^}]*\};?/g, '')
      .replace(/export\s+(const|let|var|function)/g, '$1');
  };

  const componentsBundle = subComponents
    .map((f) => `// ${f.path}\n${cleanModuleCode(f.newContent || '')}`)
    .join('\n\n');

  const appBundle = appFile
    ? cleanModuleCode(appFile.newContent || '')
    : `function App() { return <div className="p-8 text-center text-xl">Project Created Successfully</div>; }`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Harpy Live Workspace Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    ${combinedCss}
    body { margin: 0; padding: 0; min-height: 100vh; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="${theme === 'light' ? 'bg-[#F8F9FB] text-[#0F172A]' : 'bg-[#09090E] text-[#E8DDC7]'}">
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    // Built-in Lucide & FontAwesome icon polyfills for seamless React preview
    const _createIcon = (faClass) => ({ className = '', onClick, style }) =>
      React.createElement('i', { className: (faClass + ' ' + (className || '')).trim(), onClick, style });

    const Plus = _createIcon('fa-solid fa-plus');
    const Trash = _createIcon('fa-solid fa-trash');
    const Trash2 = _createIcon('fa-solid fa-trash-can');
    const Check = _createIcon('fa-solid fa-check');
    const CheckCircle = _createIcon('fa-solid fa-circle-check');
    const Circle = _createIcon('fa-regular fa-circle');
    const Edit = _createIcon('fa-solid fa-pen-to-square');
    const Edit2 = _createIcon('fa-solid fa-pen-to-square');
    const Edit3 = _createIcon('fa-solid fa-pen');
    const Search = _createIcon('fa-solid fa-magnifying-glass');
    const Filter = _createIcon('fa-solid fa-filter');
    const Calendar = _createIcon('fa-solid fa-calendar-days');
    const Clock = _createIcon('fa-solid fa-clock');
    const Tag = _createIcon('fa-solid fa-tag');
    const AlertCircle = _createIcon('fa-solid fa-circle-exclamation');
    const AlertTriangle = _createIcon('fa-solid fa-triangle-exclamation');
    const X = _createIcon('fa-solid fa-xmark');
    const ChevronDown = _createIcon('fa-solid fa-chevron-down');
    const ChevronUp = _createIcon('fa-solid fa-chevron-up');
    const ChevronRight = _createIcon('fa-solid fa-chevron-right');
    const Sparkles = _createIcon('fa-solid fa-wand-magic-sparkles');
    const List = _createIcon('fa-solid fa-list-check');
    const CheckSquare = _createIcon('fa-solid fa-square-check');
    const Square = _createIcon('fa-regular fa-square');
    const ArrowRight = _createIcon('fa-solid fa-arrow-right');
    const RefreshCw = _createIcon('fa-solid fa-rotate');
    const Save = _createIcon('fa-solid fa-floppy-disk');

    ${componentsBundle}

    ${appBundle}

    try {
      const rootEl = document.getElementById('root');
      if (rootEl) {
        const root = ReactDOM.createRoot(rootEl);
        const ComponentToMount =
          (typeof App !== 'undefined') ? App :
          (typeof Page !== 'undefined') ? Page :
          (typeof Home !== 'undefined') ? Home :
          (typeof TodoApp !== 'undefined') ? TodoApp :
          (typeof Main !== 'undefined') ? Main :
          (typeof TodoList !== 'undefined') ? TodoList : null;

        if (ComponentToMount) {
          root.render(<ComponentToMount />);
        } else {
          root.render(<div className="p-8 text-center text-emerald-400 font-mono text-sm">Application Loaded Successfully. Check Components.</div>);
        }
      }
    } catch (renderErr) {
      document.getElementById('root').innerHTML = '<div style="padding:24px;color:#f87171;font-family:monospace;">Render Notice: ' + renderErr.message + '</div>';
    }
  </script>
</body>
</html>`;
}

export default function AgentWorkspacePanel({
  sessionId,
  userId = 'anonymous',
  userDisplayName = 'chinmaybhatt',
  isOpen,
  onClose,
  selectedFilePath,
  onSelectFile,
  filesChanged = [],
  onOpenBrowserAgent,
  theme = 'dark',
}: AgentWorkspacePanelProps) {
  const isLight = theme === 'light';
  // Navigation Tabs: 'code' | 'preview' | 'terminal'
  const [activeTab, setActiveTab] = useState<'code' | 'preview' | 'terminal'>('code');

  // Code Viewer State
  const [tree, setTree] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<string>(selectedFilePath || '');
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['.', 'src', 'components', 'pages', 'app'])
  );
  const [copied, setCopied] = useState(false);

  // Preview State
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewKey, setPreviewKey] = useState(0);

  // Terminal CLI State (Online Workspace Sandbox Terminal)
  const [terminalLines, setTerminalLines] = useState<TerminalEntry[]>([
    {
      id: 'init-1',
      type: 'output',
      text: 'Harpy Cloud Workspace Environment v2.6 (x86_64-linux)\nConnected to /workspace container sandbox. Type shell commands (e.g., ls, pwd, cat, mkdir, help).',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [isRunningCmd, setIsRunningCmd] = useState(false);
  const [currentDir, setCurrentDir] = useState('~');
  const [createdDirs, setCreatedDirs] = useState<Set<string>>(new Set());
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  const currentPathDisplay = currentDir === '~' ? '/workspace' : `/workspace/${currentDir}`;
  const terminalPromptPrefix = `harpy@workspace:${currentPathDisplay}$ `;

  // Compute preview HTML whenever files change
  const previewHtml = useMemo(() => {
    return generatePreviewHtml(filesChanged, theme);
  }, [filesChanged, previewKey, theme]);

  // Sync tree with filesChanged in state/localStorage
  useEffect(() => {
    if (filesChanged && filesChanged.length > 0) {
      const builtTree = buildTreeFromFiles(filesChanged);
      setTree(builtTree);

      const allDirs = new Set<string>(['.']);
      filesChanged.forEach((f) => {
        const parts = f.path.split(/[/\\]/);
        for (let i = 1; i < parts.length; i++) {
          allDirs.add(parts.slice(0, i).join('/'));
        }
      });
      setExpandedFolders((prev) => new Set([...Array.from(prev), ...Array.from(allDirs)]));

      if (!activeFile || !filesChanged.some((f) => f.path === activeFile)) {
        setActiveFile(filesChanged[0].path);
      }
    } else if (isOpen) {
      fetchTree();
    }
  }, [filesChanged, isOpen]);

  const fetchTree = async () => {
    if (!sessionId) return;
    setIsLoadingTree(true);
    try {
      const res = await fetch(
        `/api/agent/workspace?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}&action=tree`
      );
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

  const fetchContent = async (filePath: string) => {
    if (!filePath) return;

    const matching = filesChanged.find(
      (f) =>
        f.path === filePath ||
        f.path === filePath.replace(/^[/\\]+/, '') ||
        filePath.endsWith(f.path)
    );

    if (matching && typeof matching.newContent === 'string') {
      setFileContent(matching.newContent);
      return;
    }

    if (!sessionId) return;
    setIsLoadingContent(true);
    try {
      const res = await fetch(
        `/api/agent/workspace?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}&action=read&path=${encodeURIComponent(filePath)}`
      );
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
      setActiveTab('code');
    }
  }, [selectedFilePath]);

  useEffect(() => {
    if (activeFile && isOpen) {
      fetchContent(activeFile);
    }
  }, [activeFile, isOpen, filesChanged]);

  useEffect(() => {
    if (activeTab === 'terminal') {
      terminalInputRef.current?.focus();
      terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines, activeTab]);

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
    window.open(
      `/api/agent/workspace?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}&action=zip`,
      '_blank'
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Keyboard navigation for real terminal (History Up/Down, Autocomplete Tab, Ctrl+C, Ctrl+L)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecuteCli();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setTerminalInput(commandHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= commandHistory.length) {
        setHistoryIndex(-1);
        setTerminalInput('');
      } else {
        setHistoryIndex(nextIdx);
        setTerminalInput(commandHistory[nextIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = terminalInput.split(' ');
      const lastWord = parts[parts.length - 1] || '';
      if (lastWord) {
        const match = filesChanged.find((f) =>
          f.path.toLowerCase().startsWith(lastWord.toLowerCase())
        );
        if (match) {
          parts[parts.length - 1] = match.path;
          setTerminalInput(parts.join(' '));
        }
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `cancel-${Date.now()}`,
          type: 'prompt',
          command: `${terminalPromptPrefix}${terminalInput}^C`,
          text: '',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setTerminalInput('');
      setIsRunningCmd(false);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setTerminalLines([]);
      setTerminalInput('');
    }
  };

  // Run Terminal Command (Full zsh simulation + isolated sandbox execution)
  const handleExecuteCli = async () => {
    const rawCmd = terminalInput;
    const cmd = rawCmd.trim();
    const promptText = `${terminalPromptPrefix}${rawCmd}`;

    if (!cmd) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `line-${Date.now()}`,
          type: 'prompt',
          command: promptText,
          text: '',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setTerminalInput('');
      return;
    }

    // Save to command history
    setCommandHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    setTerminalInput('');

    // 1. Clear command
    if (cmd.toLowerCase() === 'clear') {
      setTerminalLines([]);
      return;
    }

    const promptEntry: TerminalEntry = {
      id: `cmd-${Date.now()}`,
      type: 'prompt',
      command: promptText,
      text: '',
      timestamp: new Date().toLocaleTimeString(),
    };

    const parts = cmd.split(/\s+/);
    const baseCmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    // 2. Local Unix built-ins for instant responsiveness
    if (baseCmd === 'pwd') {
      const dirOutput =
        currentDir === '~'
          ? '/workspace'
          : `/workspace/${currentDir}`;
      setTerminalLines((prev) => [
        ...prev,
        promptEntry,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: dirOutput,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      return;
    }

    if (baseCmd === 'whoami') {
      setTerminalLines((prev) => [
        ...prev,
        promptEntry,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: 'harpy',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      return;
    }

    if (baseCmd === 'date') {
      setTerminalLines((prev) => [
        ...prev,
        promptEntry,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: new Date().toUTCString(),
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      return;
    }

    if (baseCmd === 'uname') {
      setTerminalLines((prev) => [
        ...prev,
        promptEntry,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: args.includes('-a')
            ? 'Linux harpy-workspace 6.6.0-generic x86_64 GNU/Linux'
            : 'Linux',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      return;
    }

    if (baseCmd === 'echo') {
      setTerminalLines((prev) => [
        ...prev,
        promptEntry,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: args.join(' ').replace(/^["']|["']$/g, ''),
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      return;
    }

    if (baseCmd === 'cd') {
      const targetDir = args[0] || '~';
      let nextDir = currentDir;
      if (targetDir === '~' || targetDir === '/' || !targetDir) {
        nextDir = '~';
      } else if (targetDir === '..') {
        const segs = currentDir.split('/').filter(Boolean);
        segs.pop();
        nextDir = segs.length === 0 || currentDir === '~' ? '~' : segs.join('/');
      } else {
        const clean = targetDir.replace(/^\.\//, '').replace(/\/$/, '');
        nextDir = currentDir === '~' ? clean : `${currentDir}/${clean}`;
      }
      setCurrentDir(nextDir);
      setCreatedDirs((prev) => new Set([...Array.from(prev), nextDir]));
      setTerminalLines((prev) => [...prev, promptEntry]);
      return;
    }

    if (baseCmd === 'mkdir') {
      const dirName = args[0];
      if (dirName) {
        setCreatedDirs((prev) => new Set([...Array.from(prev), dirName]));
      }
      setTerminalLines((prev) => [...prev, promptEntry]);
      try {
        fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'command',
            command: cmd,
            subDir: currentDir === '~' ? '' : currentDir,
            sessionId,
            userId,
          }),
        }).catch(() => {});
      } catch {}
      return;
    }

    if (baseCmd === 'ls' || baseCmd === 'dir') {
      const isLa = args.some((a) => a.includes('l') || a.includes('a'));
      const currentFiles = filesChanged.filter((f) => {
        const cleanPath = f.path.replace(/^[/\\]+/, '');
        if (currentDir === '~') {
          return !cleanPath.includes('/');
        }
        return cleanPath.startsWith(`${currentDir}/`);
      });

      const activeDirs = Array.from(createdDirs);

      if (isLa) {
        const lines = [
          `total ${Math.max(8, (currentFiles.length + activeDirs.length) * 4)}`,
          `drwxr-xr-x 4 harpy workspace  4096 Nov 23 13:20 .`,
          `drwxr-xr-x 3 harpy workspace  4096 Nov 23 13:15 ..`,
          ...activeDirs.map(
            (d) => `drwxr-xr-x 2 harpy workspace  4096 Nov 23 13:20 ${d}`
          ),
          ...currentFiles.map((f) => {
            const fileName = f.path.split('/').pop() || f.path;
            const size = f.newContent?.length || 512;
            return `-rw-r--r-- 1 harpy workspace ${size.toString().padStart(5, ' ')} Nov 23 13:20 ${fileName}`;
          }),
        ];
        setTerminalLines((prev) => [
          ...prev,
          promptEntry,
          {
            id: `out-${Date.now()}`,
            type: 'output',
            text: lines.join('\n'),
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        return;
      } else {
        const names = [
          ...activeDirs,
          ...currentFiles.map((f) => f.path.split('/').pop() || f.path),
        ];
        setTerminalLines((prev) => [
          ...prev,
          promptEntry,
          {
            id: `out-${Date.now()}`,
            type: 'output',
            text: names.join('    ') || '(directory empty)',
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        return;
      }
    }

    if (baseCmd === 'cat') {
      const fileName = args[0];
      if (!fileName) {
        setTerminalLines((prev) => [
          ...prev,
          promptEntry,
          {
            id: `err-${Date.now()}`,
            type: 'error',
            text: 'cat: missing file argument',
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        return;
      }

      const targetFile = filesChanged.find(
        (f) =>
          f.path === fileName ||
          f.path.endsWith(`/${fileName}`) ||
          f.path === `${currentDir}/${fileName}`
      );

      if (targetFile && typeof targetFile.newContent === 'string') {
        setTerminalLines((prev) => [
          ...prev,
          promptEntry,
          {
            id: `out-${Date.now()}`,
            type: 'output',
            text: targetFile.newContent || '',
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        return;
      }
    }

    if (baseCmd === 'help') {
      const helpMsg = `Harpy Cloud Workspace Terminal (Linux/Bash Sandbox)
Available commands:
  ls [-la]       List workspace files and directories
  cd <dir>       Change working directory inside /workspace
  pwd            Print current workspace directory
  cat <file>     Display contents of a file
  mkdir <dir>    Create directory in workspace
  touch <file>   Create empty file
  echo <text>    Write arguments to standard output
  clear (Ctrl+L) Clear terminal screen
  whoami, date   Display cloud sandbox identity
  <any command>  Executes commands in container sandbox (e.g. npm, node, git)`;

      setTerminalLines((prev) => [
        ...prev,
        promptEntry,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          text: helpMsg,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      return;
    }

    // 3. Fallback: Sandboxed Server-side Shell Execution
    setTerminalLines((prev) => [...prev, promptEntry]);
    setIsRunningCmd(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'command',
          command: cmd,
          subDir: currentDir === '~' ? '' : currentDir,
          sessionId,
          userId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.stdout) {
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            type: 'output',
            text: data.stdout,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
      if (data.stderr) {
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            type: 'error',
            text: data.stderr,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (cmdErr: unknown) {
      const msg = cmdErr instanceof Error ? cmdErr.message : 'Execution failed';
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'error',
          text: `zsh: execution notice: ${msg}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsRunningCmd(false);
    }
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
          setActiveTab('code');
          if (onSelectFile) onSelectFile(node.path);
        }}
        style={{ paddingLeft: `${level * 12 + 20}px` }}
        className={`w-full flex items-center gap-2 py-1 text-xs font-mono transition-colors text-left ${
          isSelected && activeTab === 'code'
            ? 'bg-[#C6A46A]/20 text-[#C6A46A] font-medium border-l-2 border-[#C6A46A]'
            : 'text-[#E8DDC7]/75 hover:text-white hover:bg-white/5'
        }`}
      >
        <FileCode
          className={`w-3.5 h-3.5 shrink-0 ${
            isSelected ? 'text-[#C6A46A]' : 'text-[#8C7A6B]'
          }`}
        />
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <div
      className={`h-full flex flex-col border-l overflow-hidden select-none ${
        isLight
          ? 'bg-white border-[#E2E4E9] text-[#0F172A]'
          : 'bg-[#07070B] border-[#1A1A24] text-[#E8DDC7]'
      }`}
    >
      {/* Top Header: Title, Navigation Tabs & Download */}
      <div
        className={`h-14 px-3 sm:px-4 border-b flex items-center justify-between shrink-0 gap-2 ${
          isLight
            ? 'bg-[#F8F9FA] border-[#E2E4E9] text-[#0F172A]'
            : 'bg-[#0A0A10] border-[#1A1A24] text-[#E8DDC7]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-[#C6A46A] shrink-0" />
          <span
            className={`font-cinzel text-xs font-semibold tracking-wider uppercase hidden sm:inline truncate ${
              isLight ? 'text-[#0F172A]' : 'text-[#E8DDC7]'
            }`}
          >
            Workspace IDE
          </span>

          {/* Sub Navigation Tabs */}
          <div
            className={`flex items-center border rounded-lg p-0.5 ml-1 ${
              isLight ? 'bg-[#E2E4E9] border-[#CBD5E1]' : 'bg-[#12121C] border-[#222232]'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                activeTab === 'code'
                  ? 'bg-[#C6A46A] text-[#050508] font-bold shadow-sm'
                  : isLight
                  ? 'text-[#64748B] hover:text-[#0F172A]'
                  : 'text-[#E8DDC7]/70 hover:text-[#C6A46A]'
              }`}
            >
              <Code2 className="w-3 h-3" />
              <span>Code</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                activeTab === 'preview'
                  ? 'bg-[#C6A46A] text-[#050508] font-bold shadow-sm'
                  : isLight
                  ? 'text-[#64748B] hover:text-[#0F172A]'
                  : 'text-[#E8DDC7]/70 hover:text-[#C6A46A]'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Preview</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                activeTab === 'terminal'
                  ? 'bg-[#C6A46A] text-[#050508] font-bold shadow-sm'
                  : isLight
                  ? 'text-[#64748B] hover:text-[#0F172A]'
                  : 'text-[#E8DDC7]/70 hover:text-[#C6A46A]'
              }`}
            >
              <TerminalIcon className="w-3 h-3" />
              <span>CLI</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={fetchTree}
            disabled={isLoadingTree}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight
                ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-black/5'
                : 'text-[#E8DDC7]/70 hover:text-white hover:bg-white/5'
            }`}
            title="Refresh File Tree"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${isLoadingTree ? 'animate-spin text-[#C6A46A]' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={handleDownloadZip}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-cinzel rounded-md transition-all shadow-sm ${
              isLight
                ? 'bg-[#C6A46A] text-[#0A0A10] font-semibold hover:bg-[#B5935A]'
                : 'bg-[#C6A46A]/15 border border-[#C6A46A]/30 text-[#C6A46A] hover:bg-[#C6A46A]/25'
            }`}
            title="Download full project workspace as ZIP"
          >
            <Download className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">Download ZIP</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ml-1 ${
              isLight
                ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-black/5'
                : 'text-[#E8DDC7]/60 hover:text-white hover:bg-white/5'
            }`}
            title="Close Workspace Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split Body: Left Tree & Right Content Pane */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: File Tree Explorer */}
        <div
          className={`w-40 sm:w-52 border-r flex flex-col shrink-0 ${
            isLight ? 'bg-[#F8F9FA] border-[#E2E4E9]' : 'bg-[#050508] border-[#14141C]'
          }`}
        >
          <div
            className={`px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider border-b flex items-center justify-between ${
              isLight ? 'text-[#64748B] border-[#E2E4E9]' : 'text-[#8C7A6B] border-[#14141C]'
            }`}
          >
            <span>Files</span>
            <span className="text-[#C6A46A] font-bold">{filesChanged.length || tree.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto py-1 [scrollbar-width:thin]">
            {tree.length > 0 ? (
              tree.map((node) => renderNode(node))
            ) : (
              <div
                className={`p-4 text-center text-xs font-mono ${
                  isLight ? 'text-[#64748B]' : 'text-[#8C7A6B]'
                }`}
              >
                {isLoadingTree ? 'Scanning workspace...' : 'No files created yet.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Code Viewer OR Live Web Preview OR Interactive CLI */}
        <div
          className={`flex-1 flex flex-col min-w-0 overflow-hidden relative ${
            isLight ? 'bg-white text-[#0F172A]' : 'bg-black text-[#E8DDC7]'
          }`}
        >
          {/* TAB 1: CODE VIEWER */}
          {activeTab === 'code' && (
            <div className="flex-1 flex flex-col min-h-0">
              {activeFile ? (
                <>
                  {/* File Sub Header */}
                  <div
                    className={`px-3 py-2 border-b flex items-center justify-between shrink-0 ${
                      isLight
                        ? 'bg-[#F8F9FA] border-[#E2E4E9] text-[#0F172A]'
                        : 'bg-[#09090E] border-[#14141C] text-[#E8DDC7]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <Code2 className="w-3.5 h-3.5 text-[#C6A46A] shrink-0" />
                      <span className={`font-mono text-xs truncate ${isLight ? 'text-[#0F172A]' : 'text-[#E8DDC7]'}`}>
                        {activeFile}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab('preview')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          isLight
                            ? 'bg-[#C6A46A]/15 text-[#9A6F2E] hover:bg-[#C6A46A]/25 border border-[#C6A46A]/40'
                            : 'bg-[#C6A46A]/10 text-[#C6A46A] hover:bg-[#C6A46A]/20 border border-[#C6A46A]/30'
                        }`}
                        title="View Live Web Output"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Run Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopy}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors shrink-0 ${
                          isLight
                            ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-black/5'
                            : 'text-[#D5C2A5]/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Code Area with Line Numbers */}
                  <div
                    className={`flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed [scrollbar-width:thin] ${
                      isLight ? 'text-[#0F172A] bg-white' : 'text-emerald-200/90 bg-[#06060A]'
                    }`}
                  >
                    {isLoadingContent ? (
                      <div className={`flex items-center justify-center h-full text-xs ${isLight ? 'text-[#64748B]' : 'text-[#8C7A6B]'}`}>
                        Loading file contents...
                      </div>
                    ) : (
                      <pre className="selection:bg-[#C6A46A]/30">
                        {fileContent.split('\n').map((line, idx) => (
                          <div key={idx} className={`flex ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}>
                            <span className={`w-8 shrink-0 select-none text-right pr-3 font-mono text-[10px] ${isLight ? 'text-[#94A3B8]' : 'text-[#8C7A6B]/50'}`}>
                              {idx + 1}
                            </span>
                            <span className={`whitespace-pre-wrap break-all ${isLight ? 'text-[#1E293B]' : 'text-[#E8DDC7]/90'}`}>
                              {line || ' '}
                            </span>
                          </div>
                        ))}
                      </pre>
                    )}
                  </div>
                </>
              ) : (
                <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center text-xs ${isLight ? 'text-[#64748B]' : 'text-[#8C7A6B]'}`}>
                  <FileText className={`w-10 h-10 mb-2 ${isLight ? 'text-[#C6A46A]/60' : 'text-[#C6A46A]/30'}`} />
                  <p className={`font-cinzel text-sm ${isLight ? 'text-[#0F172A]' : 'text-[#E8DDC7]'}`}>Workspace Ready</p>
                  <p className="font-mono text-[11px] mt-1">
                    Select any file from the explorer to view code.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE WEB PREVIEW (localhost:3000) */}
          {activeTab === 'preview' && (
            <div className={`flex-1 flex flex-col min-h-0 ${isLight ? 'bg-[#F1F3F6]' : 'bg-[#0E0E14]'}`}>
              {/* Browser Address Bar & Responsive Controls */}
              <div
                className={`px-3 py-2 border-b flex items-center justify-between shrink-0 gap-2 ${
                  isLight
                    ? 'bg-[#F8F9FA] border-[#E2E4E9] text-[#0F172A]'
                    : 'bg-[#09090E] border-[#1A1A24] text-[#E8DDC7]'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono flex-1 max-w-sm truncate ${
                      isLight
                        ? 'bg-white border-[#CBD5E1] text-[#0F172A]'
                        : 'bg-[#12121A] border-[#222230] text-[#C6A46A]'
                    }`}
                  >
                    <Globe className="w-3 h-3 text-[#C6A46A] shrink-0" />
                    <span>http://localhost:3000</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Viewport Width Switches */}
                  <div
                    className={`flex items-center border rounded-lg p-0.5 ${
                      isLight ? 'bg-[#E2E4E9] border-[#CBD5E1]' : 'bg-[#12121C] border-[#222230]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewViewport('desktop')}
                      className={`p-1 rounded ${
                        previewViewport === 'desktop'
                          ? 'bg-[#C6A46A] text-[#050508]'
                          : isLight
                          ? 'text-[#64748B] hover:text-[#0F172A]'
                          : 'text-[#E8DDC7]/60 hover:text-white'
                      }`}
                      title="Desktop View (100%)"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport('tablet')}
                      className={`p-1 rounded ${
                        previewViewport === 'tablet'
                          ? 'bg-[#C6A46A] text-[#050508]'
                          : isLight
                          ? 'text-[#64748B] hover:text-[#0F172A]'
                          : 'text-[#E8DDC7]/60 hover:text-white'
                      }`}
                      title="Tablet View (768px)"
                    >
                      <Tablet className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport('mobile')}
                      className={`p-1 rounded ${
                        previewViewport === 'mobile'
                          ? 'bg-[#C6A46A] text-[#050508]'
                          : isLight
                          ? 'text-[#64748B] hover:text-[#0F172A]'
                          : 'text-[#E8DDC7]/60 hover:text-white'
                      }`}
                      title="Mobile View (375px)"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Reload Preview Button */}
                  <button
                    type="button"
                    onClick={() => setPreviewKey((k) => k + 1)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isLight
                        ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-black/5'
                        : 'text-[#E8DDC7]/70 hover:text-white hover:bg-white/5'
                    }`}
                    title="Reload Live App"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Open in Browser Agent Button */}
                  {onOpenBrowserAgent && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenBrowserAgent(
                          'Browse and interact with our live generated project at localhost:3000, verify buttons and layout.'
                        )
                      }
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-cinzel rounded-md bg-[#C6A46A]/20 border border-[#C6A46A]/40 text-[#C6A46A] hover:bg-[#C6A46A]/30 transition-all font-semibold shadow-sm ml-1"
                      title="Launch in Harpy Autonomous Browser Panel"
                    >
                      <Compass className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">Browser Agent</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Responsive Container for iframe */}
              <div
                className={`flex-1 flex items-center justify-center p-2 overflow-hidden ${
                  isLight ? 'bg-[#F1F3F6]' : 'bg-[#050508]'
                }`}
              >
                <div
                  className={`h-full rounded-lg overflow-hidden shadow-2xl transition-all duration-300 border ${
                    isLight ? 'border-[#CBD5E1] bg-white' : 'border-[#222230] bg-[#09090E]'
                  } ${
                    previewViewport === 'mobile'
                      ? 'w-[375px]'
                      : previewViewport === 'tablet'
                      ? 'w-[768px]'
                      : 'w-full'
                  }`}
                >
                  <iframe
                    key={previewKey}
                    title="Live Web Preview"
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ONLINE WORKSPACE TERMINAL */}
          {activeTab === 'terminal' && (
            <div
              style={{ backgroundColor: '#0B0D14', color: '#F1F5F9' }}
              className={`workspace-terminal-screen flex-1 flex flex-col min-h-0 font-mono text-[13px] leading-relaxed select-text ${
                isTerminalMaximized
                  ? 'fixed inset-3 sm:inset-6 z-50 rounded-2xl shadow-2xl border border-[#C6A46A]/40 overflow-hidden'
                  : ''
              }`}
            >
              {/* Clean Workspace Terminal Header */}
              <div
                style={{ backgroundColor: '#10121B', borderBottom: '1px solid #1E2235' }}
                className="h-10 px-3.5 flex items-center justify-between select-none shrink-0"
              >
                {/* Left: Terminal Title & /workspace badge */}
                <div className="flex items-center gap-2">
                  <TerminalIcon className="w-4 h-4 text-[#C6A46A]" />
                  <span className="font-cinzel text-xs font-semibold tracking-wider text-[#F1F5F9] uppercase">
                    Workspace Terminal
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#181B26] text-[#C6A46A] border border-[#C6A46A]/30">
                    {currentPathDisplay}
                  </span>
                </div>

                {/* Right: Simple Clear, Full Window, Close Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTerminalLines([])}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5 transition-colors"
                    title="Clear Console Output"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsTerminalMaximized(!isTerminalMaximized)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono text-[#94A3B8] hover:text-[#C6A46A] hover:bg-white/5 transition-colors"
                    title={isTerminalMaximized ? 'Exit Full Window' : 'Full Window (Expand)'}
                  >
                    {isTerminalMaximized ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">
                      {isTerminalMaximized ? 'Exit Full' : 'Full Window'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTerminalMaximized(false);
                      setActiveTab('code');
                    }}
                    className="p-1.5 rounded text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                    title="Close Terminal (Return to Code)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Terminal Screen & Body */}
              <div
                onClick={() => terminalInputRef.current?.focus()}
                style={{ backgroundColor: '#0B0D14', color: '#F1F5F9' }}
                className="workspace-terminal-screen flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed [scrollbar-width:thin] cursor-text"
              >
                {terminalLines.map((entry) => (
                  <div key={entry.id} className="mb-1.5">
                    {entry.type === 'prompt' ? (
                      <div className="text-[#F0F0F5] whitespace-pre-wrap break-all">
                        <span>{entry.command}</span>
                      </div>
                    ) : entry.type === 'error' ? (
                      <div className="text-rose-400 whitespace-pre-wrap break-all">
                        {entry.text}
                      </div>
                    ) : (
                      <div className="text-[#D8D8E2] whitespace-pre-wrap break-all">
                        {entry.text}
                      </div>
                    )}
                  </div>
                ))}

                {/* Active Interactive Prompt Line */}
                <div className="flex items-baseline flex-wrap gap-0 leading-normal">
                  <span className="text-emerald-400 font-semibold select-none">
                    harpy@workspace
                  </span>
                  <span className="text-[#E8DDC7]/60 select-none">:</span>
                  <span className="text-[#59A2F6] font-semibold select-none">
                    {currentPathDisplay}
                  </span>
                  <span className="text-[#E8DDC7] font-bold select-none whitespace-pre">
                    $&nbsp;
                  </span>
                  <span className="text-[#FFFFFF] whitespace-pre font-mono">
                    {terminalInput}
                  </span>
                  {/* Blinking Solid Block Cursor */}
                  <span className="inline-block w-2.5 h-[1.15em] bg-[#C6A46A] animate-pulse ml-0.5 align-text-bottom select-none" />
                </div>

                {isRunningCmd && (
                  <div className="flex items-center gap-2 text-amber-300 py-1 font-mono text-xs animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>executing in sandbox...</span>
                  </div>
                )}

                <div ref={terminalBottomRef} />

                {/* Native Keystroke Listener Input */}
                <input
                  ref={terminalInputRef}
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="opacity-0 absolute -z-10 pointer-events-none"
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
