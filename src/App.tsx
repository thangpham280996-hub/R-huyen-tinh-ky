import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, BookOpen, Users, ShieldCheck, PenTool, LayoutDashboard,
  RefreshCw, Save, History, X, Clock, CheckCircle2, AlertTriangle, Download,
  FolderOpen, Trash2, Plus, BookMarked
} from 'lucide-react';
import { NovelState } from './types';
import Page1Start from './components/Page1Start';
import Page2Idea from './components/Page2Idea';
import Page3Characters from './components/Page3Characters';
import Page4Rules from './components/Page4Rules';
import Page5Compose from './components/Page5Compose';

// ─── Error Boundary ──────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || String(error) };
  }
  componentDidCatch(error: any, info: any) {
    console.error('App crashed:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07070a] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-neutral-900 border border-red-900/50 rounded-2xl p-6 text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-lg font-bold text-red-400">Ứng dụng gặp lỗi</h2>
            <p className="text-xs text-gray-400 leading-relaxed break-all">{this.state.error}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: '' }); window.location.reload(); }}
              className="px-5 py-2.5 bg-red-800 hover:bg-red-700 text-white rounded-xl text-sm font-semibold"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PROJECT_LIST_KEY   = 'htk_project_list';      // danh sách meta các dự án
const PROJECT_PREFIX     = 'htk_project_';           // prefix data từng dự án
const ACTIVE_PROJECT_KEY = 'htk_active_project';     // id dự án đang mở
const BACKUP_LIST_KEY    = 'htk_backups';
const BACKUP_DATA_PREFIX = 'htk_bk_';
const MAX_AUTO_BACKUPS   = 7;
const MAX_MANUAL_BACKUPS = 5;
const AUTO_SAVE_INTERVAL = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProjectMeta {
  id: string;
  title: string;
  genres: string[];
  chapterCount: number;
  wordCount: number;
  characterCount: number;
  createdAt: number;
  updatedAt: number;
}

interface BackupMeta {
  id: string;
  label: string;
  type: 'auto' | 'manual';
  timestamp: number;
  title: string;
  chapterCount: number;
  wordCount: number;
  projectId: string;
}

// ─── Initial State ────────────────────────────────────────────────────────────
const makeInitialState = (title = ''): NovelState => ({
  config: {
    title,
    genres: [],
    customGenre: '',
    context: '',
    nsfwEnabled: true,
    intenseSmutEnabled: true,
    writingStyle: '',
    customStyle: '',
    referenceFileContent: '',
    referenceFileName: '',
  },
  characters: [],
  worldEntities: [],
  rules: {
    forbidden: '',
    mandatory: '',
    minWords: 1500,
    consistencyRules: '',
    hardRules: {
      noSelfEnding: true, noNewCharacters: true, noOffTopicContent: true,
      noUnmentionedRefs: true, noFakeIntensity: true, noTimeskip: true,
      noRepeatContent: true, noMetaComments: true, noOOCPersonality: true,
      noModernSlangInAncient: true, noAncientToneInModern: false,
      noAbruptResolution: true, noSummaryMode: true, noExcessiveEllipsis: true,
      noFutureCharacters: true, noSelfAddPlot: true, noDangerousTone: false,
    },
    loreEntries: [],
  },
  chapters: [],
  currentChapterId: '',
  apiKeys: [],
  storyEvents: [],
});

// ─── Project Storage helpers ──────────────────────────────────────────────────
function genId() { return Math.random().toString(36).substr(2, 9); }

function loadProjectList(): ProjectMeta[] {
  try { return JSON.parse(localStorage.getItem(PROJECT_LIST_KEY) || '[]'); } catch { return []; }
}

function saveProjectList(list: ProjectMeta[]) {
  localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(list));
}

function loadProject(id: string): NovelState | null {
  try {
    const raw = localStorage.getItem(PROJECT_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveProject(id: string, state: NovelState) {
  localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(state));
  // Cập nhật meta
  const wordCount = state.chapters.reduce(
    (acc, c) => acc + (c.content?.split(/\s+/).filter(Boolean).length || 0), 0
  );
  const list = loadProjectList();
  const idx = list.findIndex(p => p.id === id);
  const meta: ProjectMeta = {
    id,
    title: state.config.title || 'Chưa đặt tên',
    genres: state.config.genres.slice(0, 3),
    chapterCount: state.chapters.length,
    wordCount,
    characterCount: state.characters.length,
    createdAt: idx >= 0 ? list[idx].createdAt : Date.now(),
    updatedAt: Date.now(),
  };
  if (idx >= 0) list[idx] = meta; else list.push(meta);
  saveProjectList(list);
}

function deleteProject(id: string) {
  localStorage.removeItem(PROJECT_PREFIX + id);
  saveProjectList(loadProjectList().filter(p => p.id !== id));
  // Xoá backup liên quan
  loadBackupList()
    .filter(b => b.projectId === id)
    .forEach(b => { try { localStorage.removeItem(BACKUP_DATA_PREFIX + b.id); } catch {} });
  saveBackupList(loadBackupList().filter(b => b.projectId !== id));
}

function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

function setActiveProjectId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  else localStorage.removeItem(ACTIVE_PROJECT_KEY);
}

// ─── Backup helpers ───────────────────────────────────────────────────────────
function loadBackupList(): BackupMeta[] {
  try { return JSON.parse(localStorage.getItem(BACKUP_LIST_KEY) || '[]'); } catch { return []; }
}
function saveBackupList(list: BackupMeta[]) {
  localStorage.setItem(BACKUP_LIST_KEY, JSON.stringify(list));
}

function createBackup(projectId: string, state: NovelState, type: 'auto' | 'manual', label?: string): BackupMeta | null {
  try {
    const now = Date.now();
    const wordCount = state.chapters.reduce(
      (acc, c) => acc + (c.content?.split(/\s+/).filter(Boolean).length || 0), 0
    );
    const meta: BackupMeta = {
      id: `${type}_${now}`,
      label: label || (type === 'auto'
        ? `Tự động — ${new Date(now).toLocaleString('vi-VN')}`
        : `Thủ công — ${new Date(now).toLocaleString('vi-VN')}`),
      type, timestamp: now, projectId,
      title: state.config.title || 'Chưa đặt tên',
      chapterCount: state.chapters.length, wordCount,
    };
    localStorage.setItem(BACKUP_DATA_PREFIX + meta.id, JSON.stringify(state));
    const list = loadBackupList();
    const sameType = list.filter(b => b.type === type && b.projectId === projectId);
    const maxCount = type === 'auto' ? MAX_AUTO_BACKUPS : MAX_MANUAL_BACKUPS;
    if (sameType.length >= maxCount) {
      const oldest = sameType.sort((a, b) => a.timestamp - b.timestamp)[0];
      try { localStorage.removeItem(BACKUP_DATA_PREFIX + oldest.id); } catch {}
      saveBackupList([...list.filter(b => b.id !== oldest.id), meta]);
    } else {
      saveBackupList([...list, meta]);
    }
    return meta;
  } catch { return null; }
}

function restoreBackup(id: string): NovelState | null {
  try { const r = localStorage.getItem(BACKUP_DATA_PREFIX + id); return r ? JSON.parse(r) : null; } catch { return null; }
}
function deleteBackupItem(id: string) {
  try { localStorage.removeItem(BACKUP_DATA_PREFIX + id); saveBackupList(loadBackupList().filter(b => b.id !== id)); } catch {}
}

function formatTime(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000) return 'vừa xong';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} phút trước`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} giờ trước`;
  return `${Math.floor(d / 86_400_000)} ngày trước`;
}

// ─── ProjectLibrary Modal ─────────────────────────────────────────────────────
function ProjectLibrary({
  currentProjectId,
  onOpen,
  onCreate,
  onClose,
}: {
  currentProjectId: string | null;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<ProjectMeta[]>([]);
  useEffect(() => {
    setList(loadProjectList().sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Xoá dự án "${title}"?\nThao tác này KHÔNG THỂ hoàn tác.`)) return;
    deleteProject(id);
    setList(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-gray-100">Thư Viện Dự Án</h3>
            <span className="text-[10px] text-gray-500 font-mono">({list.length} truyện)</span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-200 rounded-lg hover:bg-neutral-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-5 py-4 space-y-3">
          {/* Nút tạo mới */}
          <button
            onClick={onCreate}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-red-800/50 hover:border-red-600/70 hover:bg-red-950/20 rounded-xl text-sm text-red-400 hover:text-red-300 transition-all font-semibold"
          >
            <Plus className="w-4 h-4" /> Tạo Truyện Mới
          </button>

          {list.length === 0 && (
            <div className="py-8 text-center text-gray-500 text-xs">Chưa có dự án nào.</div>
          )}

          {list.map(p => {
            const isActive = p.id === currentProjectId;
            return (
              <div
                key={p.id}
                className={`group rounded-xl border p-4 transition-all ${
                  isActive
                    ? 'bg-red-950/20 border-red-800/50'
                    : 'bg-neutral-950/50 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isActive && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-red-900/50 border border-red-700/50 text-red-400 rounded font-mono">
                          ĐANG MỞ
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-gray-100 truncate">{p.title}</h4>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
                      <span>{p.chapterCount} chương · {p.wordCount.toLocaleString()} từ · {p.characterCount} nhân vật</span>
                    </div>
                    {p.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.genres.map(g => (
                          <span key={g} className="px-1.5 py-0.5 bg-neutral-800 rounded text-[9px] text-gray-400">{g}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-600 mt-1.5">Cập nhật {formatTime(p.updatedAt)}</p>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => onOpen(p.id)}
                        className="px-3 py-1.5 bg-red-900/50 border border-red-800/50 hover:bg-red-800/60 text-red-200 rounded-lg text-[10px] font-semibold transition-colors"
                      >
                        Mở
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(p.id, p.title)}
                      className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 hover:bg-red-950/40 hover:border-red-800/50 hover:text-red-400 text-gray-500 rounded-lg text-[10px] transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Xoá
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-neutral-800 text-[10px] text-gray-600 text-center">
          Mỗi dự án được lưu riêng biệt trong trình duyệt
        </div>
      </div>
    </div>
  );
}

// ─── BackupPanel ──────────────────────────────────────────────────────────────
function BackupPanel({
  projectId,
  onRestore,
  onClose,
}: {
  projectId: string | null;
  onRestore: (id: string) => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<BackupMeta[]>([]);
  useEffect(() => {
    const all = loadBackupList()
      .filter(b => !projectId || b.projectId === projectId)
      .sort((a, b) => b.timestamp - a.timestamp);
    setList(all);
  }, [projectId]);

  const handleDelete = (id: string) => {
    if (!confirm('Xoá bản backup này?')) return;
    deleteBackupItem(id);
    setList(prev => prev.filter(b => b.id !== id));
  };

  const autoBackups   = list.filter(b => b.type === 'auto');
  const manualBackups = list.filter(b => b.type === 'manual');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-gray-100">Lịch Sử Lưu Trữ</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-200 rounded-lg hover:bg-neutral-800">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-5">
          {list.length === 0 && (
            <div className="py-10 text-center text-gray-500 text-sm">
              Chưa có bản lưu nào.<br />
              <span className="text-xs text-gray-600">Bấm 💾 để tạo bản lưu thủ công.</span>
            </div>
          )}
          {manualBackups.length > 0 && (
            <div>
              <p className="text-[10px] text-amber-400 font-mono uppercase tracking-wider mb-2">
                📌 Lưu Thủ Công ({manualBackups.length}/{MAX_MANUAL_BACKUPS})
              </p>
              <div className="space-y-2">
                {manualBackups.map(b => (
                  <BackupRow key={b.id} meta={b} onRestore={onRestore} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
          {autoBackups.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2">
                🔄 Tự Động ({autoBackups.length}/{MAX_AUTO_BACKUPS})
              </p>
              <div className="space-y-2">
                {autoBackups.map(b => (
                  <BackupRow key={b.id} meta={b} onRestore={onRestore} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-neutral-800 text-[10px] text-gray-600 text-center">
          Tự động lưu mỗi 30 giây • Giữ {MAX_AUTO_BACKUPS} bản tự động + {MAX_MANUAL_BACKUPS} bản thủ công
        </div>
      </div>
    </div>
  );
}

function BackupRow({ meta, onRestore, onDelete }: { meta: BackupMeta; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-200 truncate">{meta.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] text-gray-500">{formatTime(meta.timestamp)}</span>
          <span className="text-[10px] text-gray-600">·</span>
          <span className="text-[10px] text-gray-500">{meta.chapterCount} chương · {meta.wordCount.toLocaleString()} từ</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => { if (confirm(`Khôi phục "${meta.label}"?\nDữ liệu hiện tại sẽ được backup trước.`)) onRestore(meta.id); }}
          className="px-2.5 py-1 bg-amber-900/40 border border-amber-800/50 hover:bg-amber-800/50 text-amber-300 rounded-lg text-[10px] font-semibold transition-colors"
        >
          Khôi phục
        </button>
        <button onClick={() => onDelete(meta.id)} className="p-1 text-neutral-600 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Project management state ──
  const [projectId, setProjectId]     = useState<string | null>(null);
  const [state, setState]             = useState<NovelState | null>(null);
  const [activeTab, setActiveTab]     = useState<string>('start');
  const [showLibrary, setShowLibrary] = useState(false);
  const [showBackup, setShowBackup]   = useState(false);
  const [saveFlash, setSaveFlash]     = useState<'ok' | 'err' | null>(null);
  const lastAutoBackupDay             = useRef<string>('');

  // ── Load dự án khi khởi động ──
  useEffect(() => {
    const list = loadProjectList();
    let activeId = getActiveProjectId();

    // Migrate: nếu có data cũ từ key cũ, chuyển sang project mới
    const oldData = localStorage.getItem('huyen_tinh_ky_state');
    if (oldData && list.length === 0) {
      try {
        const parsed = JSON.parse(oldData) as NovelState;
        const newId = genId();
        saveProject(newId, parsed);
        setActiveProjectId(newId);
        setProjectId(newId);
        setState(parsed);
        localStorage.removeItem('huyen_tinh_ky_state');
        return;
      } catch {}
    }

    if (activeId && list.find(p => p.id === activeId)) {
      const data = loadProject(activeId);
      if (data) { setProjectId(activeId); setState(data); return; }
    }

    // Nếu có dự án, mở dự án mới nhất
    if (list.length > 0) {
      const newest = list.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      const data = loadProject(newest.id);
      if (data) {
        setProjectId(newest.id);
        setActiveProjectId(newest.id);
        setState(data);
        return;
      }
    }

    // Không có gì — bắt đầu trạng thái trống, chưa có projectId
    setState(makeInitialState());
  }, []);

  // ── Auto-save khi state thay đổi ──
  useEffect(() => {
    if (!state || !projectId) return;
    saveProject(projectId, state);
  }, [state, projectId]);

  // ── Auto-backup mỗi 30 giây ──
  useEffect(() => {
    if (!state || !projectId) return;
    const interval = setInterval(() => {
      const hasContent = state.chapters.length > 0 || state.characters.length > 0;
      if (!hasContent) return;
      const today = new Date().toLocaleDateString('vi-VN');
      const didToday = loadBackupList().some(b =>
        b.type === 'auto' && b.projectId === projectId &&
        new Date(b.timestamp).toLocaleDateString('vi-VN') === today
      );
      if (!didToday || lastAutoBackupDay.current !== today) {
        createBackup(projectId, state, 'auto');
        lastAutoBackupDay.current = today;
      }
      saveProject(projectId, state);
      setSaveFlash('ok');
      setTimeout(() => setSaveFlash(null), 1500);
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [state, projectId]);

  const updateState = useCallback((updater: (prev: NovelState) => void) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as NovelState;
      updater(next);
      return next;
    });
  }, []);

  // ── Tạo truyện mới ──
  const handleCreateNew = () => {
    // Lưu dự án hiện tại trước nếu có
    if (state && projectId) {
      try {
        createBackup(projectId, state, 'manual', `Trước khi tạo truyện mới — ${new Date().toLocaleString('vi-VN')}`);
        saveProject(projectId, state);
      } catch (e) { console.warn('Backup failed:', e); }
    }
    const newId = genId();
    const newState = makeInitialState('Truyện Mới - ' + new Date().toLocaleDateString('vi-VN'));
    // Lưu project mới vào storage TRƯỚC khi set state
    saveProject(newId, newState);
    setActiveProjectId(newId);
    // Set state trước, projectId sau để tránh race condition
    setState(newState);
    setProjectId(newId);
    setShowLibrary(false);
    setActiveTab('idea');
  };

  // ── Mở dự án khác ──
  const handleOpenProject = (id: string) => {
    // Lưu dự án hiện tại
    if (state && projectId) saveProject(projectId, state);
    const data = loadProject(id);
    if (data) {
      setProjectId(id);
      setActiveProjectId(id);
      setState(data);
      setShowLibrary(false);
      setActiveTab('start');
    }
  };

  // ── Xoá dự án hiện tại từ header (nút reset) ──
  const handleDeleteCurrent = () => {
    if (!projectId || !state) return;
    if (!confirm(
      `Xoá truyện "${state.config.title || 'chưa đặt tên'}"?\nThao tác KHÔNG THỂ hoàn tác.`
    )) return;
    deleteProject(projectId);
    // Chuyển sang dự án khác hoặc trạng thái trống
    const remaining = loadProjectList();
    if (remaining.length > 0) {
      const newest = remaining.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      const data = loadProject(newest.id);
      if (data) {
        setProjectId(newest.id);
        setActiveProjectId(newest.id);
        setState(data);
        setActiveTab('start');
        return;
      }
    }
    setProjectId(null);
    setActiveProjectId(null);
    setState(makeInitialState());
    setActiveTab('start');
  };

  // ── Manual backup ──
  const handleManualSave = () => {
    if (!state || !projectId) return;
    const result = createBackup(projectId, state, 'manual');
    setSaveFlash(result ? 'ok' : 'err');
    setTimeout(() => setSaveFlash(null), 2000);
  };

  // ── Restore backup ──
  const handleRestore = (id: string) => {
    if (state && projectId) createBackup(projectId, state, 'manual', `Trước khi khôi phục — ${new Date().toLocaleString('vi-VN')}`);
    const restored = restoreBackup(id);
    if (restored && projectId) {
      setState(restored);
      saveProject(projectId, restored);
      setShowBackup(false);
      setSaveFlash('ok');
      setTimeout(() => setSaveFlash(null), 2000);
    }
  };

  // ── Export JSON ──
  const handleExportJSON = () => {
    if (!state) return;
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.config.title || 'truyen'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── onEnterNewWorld cho Page1Start ──
  const handleEnterNewWorld = () => {
    if (state && projectId) {
      const hasContent = state.chapters.length > 0 || state.characters.length > 0 || state.config.title;
      if (hasContent) {
        const ok = confirm(
          `Đang mở truyện "${state.config.title || 'chưa đặt tên'}".\n` +
          `Bấm OK → Lưu lại và tạo truyện mới.\nBấm Cancel → Quay lại.`
        );
        if (!ok) return;
      }
    }
    handleCreateNew();
  };

  if (!state) return (
    <div className="min-h-screen bg-[#07070a] flex items-center justify-center text-gray-400 text-sm">
      <div className="text-center">
        <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-3" />
        Đang tải dự án...
      </div>
    </div>
  );

  const projectList   = loadProjectList();
  const backupCount   = loadBackupList().filter(b => b.projectId === projectId).length;
  const currentMeta   = projectList.find(p => p.id === projectId);

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-[#07070a] text-gray-100 flex flex-col font-sans selection:bg-red-900 selection:text-white">
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-red-950/10 via-[#07070a]/40 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#07070a]/90 backdrop-blur-md border-b border-neutral-900 px-6 py-4 flex items-center justify-between gap-3">
        <div onClick={() => setActiveTab('start')} className="flex items-center gap-2 cursor-pointer group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-900 to-red-650 flex items-center justify-center shadow-lg shadow-red-900/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div className="hidden sm:block">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-red-500 to-amber-400 bg-clip-text text-transparent">
              Huyền Tình Ký
            </span>
            <span className="text-[9px] font-mono block text-gray-500 uppercase tracking-widest leading-none">StoryCraft Pro</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1.5 bg-neutral-900/50 p-1 rounded-xl border border-neutral-850">
          {[
            { id: 'start', icon: LayoutDashboard, label: 'Bắt Đầu' },
            { id: 'idea', icon: BookOpen, label: 'Ý Tưởng' },
            { id: 'characters', icon: Users, label: 'Nhân Vật' },
            { id: 'rules', icon: ShieldCheck, label: 'Quy Tắc' },
            { id: 'compose', icon: PenTool, label: 'Sáng Tác' },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                activeTab === id
                  ? id === 'compose'
                    ? 'bg-gradient-to-r from-red-900 to-red-800 text-red-200'
                    : 'bg-red-950/50 text-red-400 border border-red-900/60'
                  : 'text-gray-400 hover:text-gray-200'
              }`}>
              <Icon className={`w-3.5 h-3.5 ${id === 'compose' ? 'text-amber-400' : ''}`} />
              {label}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/* Save flash */}
          <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all ${
            saveFlash === 'ok' ? 'text-green-400 bg-green-950/30 border border-green-900/40' :
            saveFlash === 'err' ? 'text-red-400 bg-red-950/30 border border-red-900/40' : 'text-gray-600'
          }`}>
            {saveFlash === 'ok' ? <><CheckCircle2 className="w-3 h-3" /> Đã lưu</> :
             saveFlash === 'err' ? <><AlertTriangle className="w-3 h-3" /> Lỗi</> :
             <><Clock className="w-3 h-3" /> Tự động lưu</>}
          </div>

          {/* Thư viện dự án */}
          <button onClick={() => setShowLibrary(true)}
            className="relative p-1.5 bg-neutral-900 hover:bg-amber-950/30 border border-neutral-800 hover:border-amber-800/50 rounded-lg text-neutral-500 hover:text-amber-400 transition-colors flex items-center gap-1"
            title="Thư viện dự án">
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Dự án</span>
            {projectList.length > 1 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-600 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                {projectList.length}
              </span>
            )}
          </button>

          {/* Manual save */}
          <button onClick={handleManualSave} title="Lưu backup thủ công"
            className="p-1.5 bg-neutral-900 hover:bg-amber-950/40 border border-neutral-800 hover:border-amber-800/50 rounded-lg text-neutral-500 hover:text-amber-400 transition-colors flex items-center gap-1">
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Lưu</span>
          </button>

          {/* Backup history */}
          <button onClick={() => setShowBackup(true)} title="Lịch sử backup"
            className="relative p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-500 hover:text-amber-400 transition-colors flex items-center gap-1">
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Lịch sử</span>
            {backupCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-600 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                {backupCount > 9 ? '9+' : backupCount}
              </span>
            )}
          </button>

          {/* Export JSON */}
          <button onClick={handleExportJSON} title="Xuất JSON"
            className="hidden sm:flex p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-500 hover:text-blue-400 transition-colors items-center gap-1">
            <Download className="w-3.5 h-3.5" />
            <span className="text-xs">JSON</span>
          </button>

          {/* Xoá truyện hiện tại */}
          <button onClick={handleDeleteCurrent} title="Xoá truyện đang mở"
            className="p-1.5 bg-neutral-900 hover:bg-red-950/40 border border-neutral-800 hover:border-red-800/50 rounded-lg text-neutral-600 hover:text-red-400 transition-colors flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Xoá</span>
          </button>
        </div>
      </header>

      {/* Current project indicator */}
      {currentMeta && (
        <div className="bg-neutral-950/80 border-b border-neutral-900 px-6 py-1.5 flex items-center gap-2">
          <BookMarked className="w-3 h-3 text-red-500 shrink-0" />
          <span className="text-[10px] text-gray-400 font-mono truncate">
            {currentMeta.title}
          </span>
          <span className="text-[10px] text-gray-600">·</span>
          <span className="text-[10px] text-gray-600">{currentMeta.chapterCount} chương · {currentMeta.wordCount.toLocaleString()} từ</span>
          <button
            onClick={() => setShowLibrary(true)}
            className="ml-auto text-[10px] text-gray-600 hover:text-amber-400 transition-colors shrink-0"
          >
            Đổi truyện →
          </button>
        </div>
      )}

      {/* Mobile nav */}
      <div className="md:hidden sticky top-[68px] z-25 bg-[#07070a] border-b border-neutral-900 overflow-x-auto py-2.5 px-4 flex gap-1.5">
        {[
          { id: 'start', label: 'Mở Đầu' }, { id: 'idea', label: 'Ý Tưởng' },
          { id: 'characters', label: 'Nhân Vật' }, { id: 'rules', label: 'Quy Tắc' },
          { id: 'compose', label: 'Sáng Tác' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
              activeTab === id ? id === 'compose' ? 'bg-red-900 text-white' : 'bg-red-950/60 text-red-400' : 'text-gray-400'
            }`}>{label}</button>
        ))}
        <div className="flex-shrink-0 flex items-center gap-1 ml-auto">
          <button onClick={() => setShowLibrary(true)} className="p-1 text-gray-500 hover:text-amber-400"><FolderOpen className="w-3.5 h-3.5" /></button>
          <button onClick={handleManualSave} className="p-1 text-gray-500 hover:text-amber-400"><Save className="w-3.5 h-3.5" /></button>
          <button onClick={() => setShowBackup(true)} className="p-1 text-gray-500 hover:text-amber-400 relative">
            <History className="w-3.5 h-3.5" />
            {backupCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-600 rounded-full text-[7px] text-white flex items-center justify-center">{backupCount}</span>}
          </button>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 relative z-10">
        {activeTab === 'start'      && <Page1Start      key={projectId || 'start'} state={state} updateState={updateState} onNavigate={setActiveTab} onEnterNewWorld={handleEnterNewWorld} />}
        {activeTab === 'idea'       && <Page2Idea       key={projectId || 'idea'} state={state} updateState={updateState} onNavigate={setActiveTab} />}
        {activeTab === 'characters' && <Page3Characters key={projectId || 'chars'} state={state} updateState={updateState} onNavigate={setActiveTab} />}
        {activeTab === 'rules'      && <Page4Rules      key={projectId || 'rules'} state={state} updateState={updateState} onNavigate={setActiveTab} />}
        {activeTab === 'compose'    && <Page5Compose    key={projectId || 'compose'} state={state} updateState={updateState} onNavigate={setActiveTab} />}
      </main>

      <footer className="bg-[#050507] border-t border-neutral-950 py-4 px-6 text-center text-[10px] text-gray-600 font-mono">
        © 2026 HUYỀN TÌNH KÝ • STORYCRAFT PRO • Viết truyện AI không giới hạn NSFW
      </footer>

      {showLibrary && (
        <ProjectLibrary
          currentProjectId={projectId}
          onOpen={handleOpenProject}
          onCreate={handleCreateNew}
          onClose={() => setShowLibrary(false)}
        />
      )}
      {showBackup && (
        <BackupPanel
          projectId={projectId}
          onRestore={handleRestore}
          onClose={() => setShowBackup(false)}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
