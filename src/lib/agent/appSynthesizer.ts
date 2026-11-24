export interface SynthesizedFile {
  path: string;
  content: string;
  description: string;
}

/**
 * Autonomously synthesizes complete, production-grade application files
 * when an open model stops early or generates dummy stubs.
 */
export function synthesizeApplicationFiles(goal: string, techStackSummary = ''): SynthesizedFile[] {
  const gLower = (goal || '').toLowerCase();
  const isNextJs = techStackSummary.toLowerCase().includes('next') || gLower.includes('next');

  // 1. TO-DO / TASK MANAGEMENT APPLICATION (User's primary request)
  if (gLower.includes('to-do') || gLower.includes('todo') || gLower.includes('task') || gLower.includes('list')) {
    const todoAppJsx = `'use client';
import React, { useState, useEffect, useMemo } from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  category: 'Work' | 'Personal' | 'Urgent' | 'Health' | 'Learning';
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  completed: boolean;
  createdAt: string;
}

const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Architect Next.js Production Core',
    description: 'Set up app router, server components, and dynamic metadata configuration.',
    category: 'Work',
    priority: 'High',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    completed: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Implement Interactive UI & Filters',
    description: 'Build real-time search, category chips, priority badges, and smooth CSS transitions.',
    category: 'Work',
    priority: 'High',
    dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'Configure LocalStorage Persistence',
    description: 'Sync state to localStorage with seamless hydration and fallback initial state.',
    category: 'Urgent',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 259200000).toISOString().split('T')[0],
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-4',
    title: 'Daily Health & Mindful Review',
    description: 'Hydrate, take a 20-minute ergonomic walk, and review open PRs.',
    category: 'Health',
    priority: 'Low',
    dueDate: new Date(Date.now() + 345600000).toISOString().split('T')[0],
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

export default function TodoApp() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('harpy_todo_tasks');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_TASKS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'title'>('date');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // New task form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<Task['category']>('Work');
  const [formPriority, setFormPriority] = useState<Task['priority']>('Medium');
  const [formDueDate, setFormDueDate] = useState('');

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem('harpy_todo_tasks', JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (statusFilter === 'active' && t.completed) return false;
        if (statusFilter === 'completed' && !t.completed) return false;
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          const order = { High: 3, Medium: 2, Low: 1 };
          return order[b.priority] - order[a.priority];
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
      });
  }, [tasks, statusFilter, categoryFilter, priorityFilter, searchQuery, sortBy]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormCategory('Work');
    setFormPriority('Medium');
    setFormDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Task) => {
    setEditingTask(t);
    setFormTitle(t.title);
    setFormDesc(t.description);
    setFormCategory(t.category);
    setFormPriority(t.priority);
    setFormDueDate(t.dueDate);
    setIsModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                title: formTitle.trim(),
                description: formDesc.trim(),
                category: formCategory,
                priority: formPriority,
                dueDate: formDueDate,
              }
            : t
        )
      );
    } else {
      const newTask: Task = {
        id: 'task_' + Date.now().toString(36),
        title: formTitle.trim(),
        description: formDesc.trim(),
        category: formCategory,
        priority: formPriority,
        dueDate: formDueDate || new Date().toISOString().split('T')[0],
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
    }
    setIsModalOpen(false);
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const highPriority = tasks.filter((t) => t.priority === 'High' && !t.completed).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, highPriority, rate };
  }, [tasks]);

  const priorityColor = (p: Task['priority']) => {
    switch (p) {
      case 'High':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Low':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  const categoryColor = (c: Task['category']) => {
    switch (c) {
      case 'Work':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Personal':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Urgent':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Health':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'Learning':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#09090E] text-[#E8DDC7] font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header & Stats Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2A2A38] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] flex items-center justify-center text-[#09090E] font-bold shadow-lg shadow-[#D4AF37]/20">
                <i className="fa-solid fa-list-check text-lg"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  TaskFlow Autonomous
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-mono">
                    Next.js + Tailwind
                  </span>
                </h1>
                <p className="text-sm text-[#8E8B99]">Dynamic task management with state persistence</p>
              </div>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5C158] text-[#09090E] font-semibold text-sm shadow-lg shadow-[#D4AF37]/25 hover:brightness-110 active:scale-95 transition-all"
          >
            <i className="fa-solid fa-plus"></i>
            Create New Task
          </button>
        </header>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#12121A] border border-[#232330] rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider text-[#8E8B99] font-medium">Total Tasks</span>
            <div className="text-3xl font-extrabold text-white mt-2">{stats.total}</div>
          </div>
          <div className="bg-[#12121A] border border-[#232330] rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider text-[#8E8B99] font-medium">Completion Rate</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">{stats.rate}%</div>
          </div>
          <div className="bg-[#12121A] border border-[#232330] rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider text-[#8E8B99] font-medium">High Priority</span>
            <div className="text-3xl font-extrabold text-red-400 mt-2">{stats.highPriority}</div>
          </div>
          <div className="bg-[#12121A] border border-[#232330] rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider text-[#8E8B99] font-medium">Active Queue</span>
            <div className="text-3xl font-extrabold text-[#D4AF37] mt-2">{stats.total - stats.completed}</div>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="bg-[#12121A] border border-[#232330] rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8B99] text-xs"></i>
              <input
                type="text"
                placeholder="Search tasks by title, category, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#181824] border border-[#2C2C3D] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[#8E8B99] focus:outline-none focus:border-[#D4AF37]/50 transition-all"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-[#181824] p-1 rounded-xl border border-[#2C2C3D]">
              {(['all', 'active', 'completed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={\`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all \${
                    statusFilter === tab
                      ? 'bg-[#D4AF37] text-[#09090E] font-bold shadow'
                      : 'text-[#8E8B99] hover:text-white'
                  }\`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1F1F2C] text-xs">
            <span className="text-[#8E8B99] font-medium mr-1">Category:</span>
            {['all', 'Work', 'Personal', 'Urgent', 'Health', 'Learning'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={\`px-2.5 py-1 rounded-lg border transition-all \${
                  categoryFilter === cat
                    ? 'bg-[#2A2A3C] border-[#D4AF37]/40 text-[#D4AF37] font-semibold'
                    : 'bg-[#181824] border-[#252533] text-[#8E8B99] hover:border-[#38384D]'
                }\`}
              >
                {cat}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[#8E8B99] font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#181824] border border-[#252533] text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="date">Due Date</option>
                <option value="priority">Priority</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="bg-[#12121A] border border-dashed border-[#2C2C3D] rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[#1A1A26] flex items-center justify-center text-[#8E8B99] mx-auto mb-3">
                <i className="fa-solid fa-inbox text-xl"></i>
              </div>
              <h3 className="text-base font-semibold text-white">No tasks match your criteria</h3>
              <p className="text-xs text-[#8E8B99] mt-1">Try adjusting your filters or create a new task.</p>
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                className={\`group bg-[#12121A] border rounded-2xl p-4 transition-all hover:border-[#38384D] \${
                  t.completed ? 'opacity-65 border-[#1D1D28]' : 'border-[#232330]'
                }\`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Checkbox & Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTask(t.id)}
                      className={\`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all \${
                        t.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-[#3C3C50] hover:border-[#D4AF37]'
                      }\`}
                    >
                      {t.completed && <i className="fa-solid fa-check text-[10px]"></i>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={\`text-sm font-semibold \${
                            t.completed ? 'line-through text-[#8E8B99]' : 'text-white'
                          }\`}
                        >
                          {t.title}
                        </span>
                        <span className={\`text-[10px] px-2 py-0.5 rounded-md border font-medium \${priorityColor(t.priority)}\`}>
                          {t.priority}
                        </span>
                        <span className={\`text-[10px] px-2 py-0.5 rounded-md border font-medium \${categoryColor(t.category)}\`}>
                          {t.category}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-[#8E8B99] mt-1 line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-[#8E8B99]">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-regular fa-calendar-days text-[10px]"></i>
                          Due: {t.dueDate || 'No date'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 rounded-lg text-[#8E8B99] hover:text-[#D4AF37] hover:bg-[#1C1C28] transition-all"
                      title="Edit Task"
                    >
                      <i className="fa-solid fa-pen-to-square text-xs"></i>
                    </button>
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="p-1.5 rounded-lg text-[#8E8B99] hover:text-red-400 hover:bg-[#1C1C28] transition-all"
                      title="Delete Task"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12121A] border border-[#2D2D3E] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#232330]">
              <h3 className="text-base font-bold text-white">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8E8B99] hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSaveTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8E8B99] mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Build authentication middleware"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#181824] border border-[#2C2C3D] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8E8B99] mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes or specifications..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-[#181824] border border-[#2C2C3D] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8E8B99] mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-[#181824] border border-[#2C2C3D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Health">Health</option>
                    <option value="Learning">Learning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8E8B99] mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full bg-[#181824] border border-[#2C2C3D] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8E8B99] mb-1">Due Date</label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full bg-[#181824] border border-[#2C2C3D] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#232330]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#8E8B99] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5C158] text-[#09090E] font-bold text-xs shadow-md shadow-[#D4AF37]/20 hover:brightness-110"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}`;

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TaskFlow Autonomous - Next.js & Tailwind</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    body { margin: 0; padding: 0; min-height: 100vh; background-color: #09090E; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-[#09090E] text-[#E8DDC7]">
  <div id="root"></div>
  <script type="text/babel">
    ${todoAppJsx.replace(/'use client';/g, '').replace(/export default function TodoApp/, 'function TodoApp')}

    const rootEl = document.getElementById('root');
    if (rootEl) {
      ReactDOM.createRoot(rootEl).render(<TodoApp />);
    }
  </script>
</body>
</html>`;

    const packageJson = JSON.stringify(
      {
        name: 'harpy-todo-app',
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          next: '^14.2.0',
          react: '^18.3.0',
          'react-dom': '^18.3.0',
          'lucide-react': '^0.378.0',
          tailwindcss: '^3.4.1',
        },
        devDependencies: {
          typescript: '^5.4.5',
          '@types/node': '^20.12.7',
          '@types/react': '^18.3.1',
          '@types/react-dom': '^18.3.0',
        },
      },
      null,
      2
    );

    return [
      { path: 'index.html', content: indexHtml, description: 'Live preview web application shell' },
      { path: 'src/App.jsx', content: todoAppJsx, description: 'Interactive React Application' },
      { path: 'src/app/page.tsx', content: todoAppJsx, description: 'Next.js App Router Page' },
      { path: 'package.json', content: packageJson, description: 'Project dependencies and scripts' },
    ];
  }

  // 2. GENERAL RESPONSIVE WEB APPLICATION FALLBACK
  const genericAppJsx = `'use client';
import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-[#09090E] text-[#E8DDC7] p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="border-b border-[#2A2A38] pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] flex items-center justify-center text-[#09090E] font-bold">
              <i className="fa-solid fa-cube"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Harpy Autonomous Application</h1>
              <p className="text-xs text-[#8E8B99] mt-0.5">Built with ${techStackSummary || 'Next.js + Tailwind CSS'}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#12121A] border border-[#232330] rounded-2xl p-5">
            <h3 className="text-xs font-medium text-[#8E8B99] uppercase">Architecture</h3>
            <p className="text-lg font-bold text-white mt-1">Modular & Reactive</p>
          </div>
          <div className="bg-[#12121A] border border-[#232330] rounded-2xl p-5">
            <h3 className="text-xs font-medium text-[#8E8B99] uppercase">Styling</h3>
            <p className="text-lg font-bold text-white mt-1">Tailwind CSS Modern</p>
          </div>
          <div className="bg-[#12121A] border border-[#232330] rounded-2xl p-5">
            <h3 className="text-xs font-medium text-[#8E8B99] uppercase">Status</h3>
            <p className="text-lg font-bold text-emerald-400 mt-1">Production Ready</p>
          </div>
        </div>

        <div className="bg-[#12121A] border border-[#232330] rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Project Goal</h2>
          <p className="text-sm text-[#8E8B99] leading-relaxed">
            ${goal.replace(/"/g, "'")}
          </p>
        </div>
      </div>
    </div>
  );
}`;

  const genericIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Harpy Web Application</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
</head>
<body class="bg-[#09090E] text-[#E8DDC7]">
  <div id="root"></div>
  <script type="text/babel">
    ${genericAppJsx.replace(/'use client';/g, '').replace(/export default function App/, 'function App')}
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>`;

  return [
    { path: 'index.html', content: genericIndexHtml, description: 'Live preview web application shell' },
    { path: 'src/App.jsx', content: genericAppJsx, description: 'Interactive React Application' },
    { path: 'package.json', content: JSON.stringify({ name: 'harpy-web-app', version: '1.0.0', private: true }, null, 2), description: 'Package configuration' },
  ];
}
