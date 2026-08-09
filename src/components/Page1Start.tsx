import React, { useState, useMemo } from 'react';
import {
  Sparkles, FileText, Upload, Settings, Plus, Key,
  Check, Trash2, Wifi, WifiOff, Loader2, AlertCircle,
  CheckCircle2, PenTool, ChevronRight, ChevronDown, BookOpen,
  HardDrive, Image as ImageIcon, ListTree, Download, Users, Clock, Database, ShieldCheck
} from 'lucide-react';
import { NovelState, ApiKeyConfig } from '../types';
import FanficAnalyzer from './FanficAnalyzer';
import { callApi } from '../utils/api';

interface Page1StartProps {
  state: NovelState;
  updateState: (updater: (prev: NovelState) => void) => void;
  onNavigate: (tabId: string) => void;
  onEnterNewWorld: () => void;
}

const PROVIDERS = [
  { value: 'gemini',      label: 'Gemini API (Google)',               hint: 'AIza...' },
  { value: 'antigravity', label: 'Antigravity (ag.beijixingxing.com)', hint: 'sk-...' },
  { value: 'catiecli',    label: 'CatieCLI (catiecli.sukaka.top)',     hint: 'cat-...' },
  { value: 'openai',      label: 'OpenAI API',                        hint: 'sk-...' },
  { value: 'claude',      label: 'Claude API (Anthropic)',            hint: 'sk-ant-...' },
  { value: 'grok',        label: 'Grok API (xAI)',                    hint: 'xai-...' },
] as const;

type ProviderValue = typeof PROVIDERS[number]['value'];

const AG_MODELS = [
  { value: 'gemini-3-flash-preview',  label: 'Gemini 3 Flash Preview (Khuyên dùng)' },
  { value: 'gemini-3-pro-preview',    label: 'Gemini 3 Pro Preview' },
  { value: 'gemini-3-pro-low',        label: 'Gemini 3 Pro Low' },
  { value: 'gemini-3-pro-high',       label: 'Gemini 3 Pro High' },
  { value: 'gemini-3.1-pro-low',      label: 'Gemini 3.1 Pro Low' },
  { value: 'gemini-3.1-pro-high',     label: 'Gemini 3.1 Pro High' },
  { value: 'gemini-2.5-flash',        label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-pro',          label: 'Gemini 2.5 Pro' },
  { value: 'claude-sonnet-4-5',       label: 'Claude Sonnet 4.5' },
  { value: 'claude-opus-4-6',         label: 'Claude Opus 4.6' },
];

const CATIECLI_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Khuyên dùng)' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview' },
];

const MODEL_LISTABLE_PROVIDERS: ProviderValue[] = ['antigravity', 'catiecli', 'openai', 'claude', 'grok'];

async function testConnection(key: ApiKeyConfig): Promise<{ ok: boolean; msg: string }> {
  try {
    const body: Record<string, any> = {
      prompt: 'Trả lời đúng 1 từ: "OK"',
      systemInstruction: 'Bạn là AI test kết nối. Chỉ trả lời OK.',
      customApiKey: key.key,
      provider: key.provider,
      customModel: (key as any).customModel || undefined,
    };
    if (key.provider === 'catiecli') {
      body.customEndpoint = 'https://catiecli.sukaka.top/v1/chat/completions';
    } else if (key.provider !== 'gemini') {
      body.customEndpoint = 'https://ag.beijixingxing.com/v1/chat/completions';
    }
    
    const data = await callApi('generate', body);
    const text = (data.text || '').trim();
    return { ok: true, msg: `✓ OK${text ? ` · "${text.substring(0, 30)}"` : ''}` };
  } catch (err: any) {
    return { ok: false, msg: err.message || 'Lỗi không xác định' };
  }
}

async function fetchModelsList(apiKey: string, provider: ProviderValue): Promise<string[]> {
  try {
    const data = await callApi('list-models', {
      customApiKey: apiKey,
      provider: provider,
    });
    
    if (!Array.isArray(data.models) || data.models.length === 0) {
      throw new Error('Không có model nào trả về từ endpoint.');
    }
    return data.models;
  } catch (err: any) {
    throw new Error(err.message || 'Lỗi lấy danh sách model.');
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Page1Start({ state, updateState, onNavigate, onEnterNewWorld }: Page1StartProps) {
  const [newKey, setNewKey]           = useState('');
  const [newLabel, setNewLabel]       = useState('');
  const [newProvider, setNewProvider] = useState<ProviderValue>('antigravity');
  const [newModel, setNewModel]       = useState('gemini-2.5-flash');
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [keysExpanded, setKeysExpanded] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [testStatus, setTestStatus]   = useState<Record<string, { loading: boolean; ok?: boolean; msg?: string }>>({});
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const [modelsLoading, setModelsLoading] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [modelsError, setModelsError]     = useState<string | null>(null);
  const [modelSearch, setModelSearch]     = useState('');

  const hasProject = state.config.title && state.chapters.length > 0;
  const totalWords = state.chapters.reduce(
    (acc, c) => acc + (c.content?.split(/\s+/).filter(Boolean).length || 0), 0
  );

  const totalCharacters = state.characters?.length || 0;
  const totalChapters = state.chapters?.length || 0;
  const totalEvents = state.storyEvents?.length || 0;
  const totalWorlds = state.worldEntities?.length || 0;

  const storageInfo = useMemo(() => {
    const jsonStr = JSON.stringify(state);
    const totalBytes = new Blob([jsonStr]).size;
    const totalImages = state.characters.reduce((acc, c) => acc + (c.images?.length || 0), 0);
    const imagesWithDesc = state.characters.reduce(
      (acc, c) => acc + (c.images?.filter(img => img.description?.trim()).length || 0), 0
    );
    return { totalBytes, totalImages, imagesWithDesc };
  }, [state]);

  const isLarge = storageInfo.totalBytes > 5 * 1024 * 1024;

  const handleExportProject = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_${state.config.title || 'Untitled'}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => setConfirmClearAll(true);

  const runClearAll = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);

        const isValidProject =
          parsed && typeof parsed === 'object' &&
          parsed.config && typeof parsed.config === 'object' &&
          Array.isArray(parsed.chapters) &&
          Array.isArray(parsed.characters);

        if (!isValidProject) {
          if (Array.isArray(parsed?.chunkResults)) {
            alert(
              'File này là "Tiến trình phân tích Đồng nhân" (chunkResults), không phải file dự án.\n\n' +
              'Hãy dùng ô "2. Nối Tiến Trình" trong mục Đồng nhân để tải file này, không phải ở đây.'
            );
          } else {
            alert('File JSON không đúng định dạng dự án (thiếu config/chapters/characters).');
          }
          return;
        }

        updateState((prev) => {
          prev.config        = parsed.config;
          prev.characters    = (parsed.characters || []).map((c: any) => ({
            ...c,
            images: c.images || [],
          }));
          prev.worldEntities = parsed.worldEntities || [];
          prev.rules         = parsed.rules         || prev.rules;
          prev.chapters      = parsed.chapters      || [];
          prev.apiKeys       = parsed.apiKeys       || prev.apiKeys;
          prev.storyEvents   = parsed.storyEvents   || [];
          if (prev.chapters.length > 0) {
            prev.currentChapterId = prev.chapters[prev.chapters.length - 1].id;
          }
        });

        const imgCount = (parsed.characters || []).reduce((acc: number, c: any) => acc + (c.images?.length || 0), 0);
        alert(
          `✅ Tải dữ liệu JSON thành công!\n\n` +
          `📚 ${parsed.chapters.length} chương\n` +
          `👤 ${parsed.characters.length} nhân vật\n` +
          `📷 ${imgCount} ảnh tham chiếu`
        );
        onNavigate('compose');
      } catch {
        alert('❌ Có lỗi khi đọc file JSON — file có thể bị hỏng hoặc không phải JSON hợp lệ.');
      }
    };
    reader.readAsText(file);
  };

  const handleFanfictionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      updateState((prev) => {
        prev.config.referenceFileContent = content;
        prev.config.referenceFileName    = file.name;
        if (!prev.config.genres.includes('Đồng nhân')) prev.config.genres.push('Đồng nhân');
      });
      alert(`✅ Đã nạp bối cảnh gốc từ [${file.name}]!`);
    };
    reader.readAsText(file);
  };

  const handleAddKey = () => {
    if (!newKey.trim()) { alert('Vui lòng nhập API Key'); return; }
    const keyObj: ApiKeyConfig = {
      id:            Math.random().toString(36).substr(2, 9),
      provider:      newProvider as any,
      key:           newKey.trim(),
      label:         newLabel.trim() || `${PROVIDERS.find(p => p.value === newProvider)?.label} #${state.apiKeys.length + 1}`,
      isActive:      state.apiKeys.length === 0,
      quotaExceeded: false,
      customModel:   newProvider !== 'gemini' ? newModel : undefined,
    } as any;
    updateState((prev) => { prev.apiKeys.push(keyObj); });
    setNewKey(''); setNewLabel(''); setIsAddingKey(false);
    setKeysExpanded(true);
    setFetchedModels([]); setModelsError(null); setModelSearch('');
  };

  const handleDeleteKey = (id: string) => {
    updateState((prev) => {
      prev.apiKeys = prev.apiKeys.filter((k) => k.id !== id);
      if (prev.apiKeys.length > 0 && !prev.apiKeys.some((k) => k.isActive)) prev.apiKeys[0].isActive = true;
    });
    setTestStatus((s) => { const n = { ...s }; delete n[id]; return n; });
  };

  const handleToggleActiveKey = (id: string) => {
    updateState((prev) => { prev.apiKeys.forEach((k) => { k.isActive = k.id === id; }); });
  };

  const handleTest = async (key: ApiKeyConfig) => {
    setTestStatus((s) => ({ ...s, [key.id]: { loading: true } }));
    const result = await testConnection(key);
    setTestStatus((s) => ({ ...s, [key.id]: { loading: false, ...result } }));
    if (result.ok) {
      updateState((prev) => {
        const k = prev.apiKeys.find((k) => k.id === key.id);
        if (k) k.quotaExceeded = false;
      });
    }
  };

  const providerHint = PROVIDERS.find((p) => p.value === newProvider)?.hint || '';

  const handleProviderChange = (value: ProviderValue) => {
    setNewProvider(value);
    if (value === 'antigravity') setNewModel('gemini-2.5-flash');
    else if (value === 'catiecli') setNewModel('gemini-3-flash-preview');
    else setNewModel('');
    setFetchedModels([]);
    setModelsError(null);
    setModelSearch('');
  };

  const handleFetchModels = async () => {
    if (!newKey.trim()) {
      setModelsError('Nhập API Key trước khi lấy danh sách model.');
      return;
    }
    setModelsLoading(true);
    setModelsError(null);
    setFetchedModels([]);
    try {
      const models = await fetchModelsList(newKey.trim(), newProvider);
      setFetchedModels(models);
    } catch (err: any) {
      setModelsError(err.message || 'Lỗi lấy danh sách model.');
    } finally {
      setModelsLoading(false);
    }
  };

  const filteredFetchedModels = fetchedModels.filter(
    (m) => !modelSearch || m.toLowerCase().includes(modelSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto py-3 px-4 space-y-3">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-red-950/40 border border-red-500/30 rounded-lg">
            <Sparkles className="w-4 h-4 text-red-500" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-red-500 via-amber-400 to-red-400 bg-clip-text text-transparent">
            Huyền Tình Ký
          </h1>
        </div>
        <p className="text-gray-600 text-[10px] font-mono tracking-wider">
          STORYCRAFT PRO · Sáng tác tiểu thuyết mạng AI không giới hạn
        </p>
      </div>

      <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-[11px] text-amber-300 leading-relaxed flex items-start gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Lưu ý quan trọng:</strong> Dữ liệu chỉ lưu tạm trong trình duyệt (có thể mất sau ~1 ngày hoặc khi xóa cache).
          Hãy <strong>tải JSON về máy thường xuyên</strong> — file JSON chứa toàn bộ nhân vật, ảnh tham chiếu, chương truyện
          và là cách duy nhất để giữ dữ liệu lâu dài. Khi cần viết tiếp, chỉ cần upload lại JSON này.
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-200">{totalCharacters}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Nhân vật</p>
        </div>
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-200">{totalChapters}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Chương</p>
        </div>
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-200">{totalWorlds}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Thế giới</p>
        </div>
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-200">{totalEvents}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Sự kiện</p>
        </div>
      </div>

      {hasProject && (
        <button
          onClick={() => onNavigate('compose')}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-red-950/60 via-neutral-900 to-neutral-900 border border-red-700/50 hover:border-red-500/80 transition-all group"
        >
          <div className="p-2 rounded-lg bg-red-900/50 border border-red-600/40 shrink-0">
            <PenTool className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">Đang viết</span>
              <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-gray-100 group-hover:text-red-300 transition-colors truncate">
              {state.config.title}
            </h3>
          </div>
          <div className="text-[10px] text-gray-500 shrink-0 hidden sm:block">
            {state.chapters.length} chương · {totalWords.toLocaleString()} từ
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-red-400 transition-colors shrink-0" />
        </button>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={onEnterNewWorld}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-br from-red-950/40 to-neutral-900 border border-red-900/40 hover:border-red-500/60 transition-all text-left group"
        >
          <div className="p-2 rounded-lg bg-red-950/80 border border-red-500/30 text-red-400 group-hover:bg-red-900 transition-colors shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-gray-100 group-hover:text-red-400 transition-colors">
              Thế giới mới
            </h3>
            <p className="text-[10px] text-gray-500 leading-tight truncate">
              Thiết lập & viết chương đầu
            </p>
          </div>
        </button>

        <button
          onClick={() => setShowAnalyzer(true)}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-amber-500/50 transition-all text-left group cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-amber-950/50 border border-amber-500/30 text-amber-400 group-hover:bg-amber-950 transition-colors shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-gray-100 group-hover:text-amber-400 transition-colors">
              Đồng nhân
            </h3>
            <p className="text-[10px] text-gray-500 leading-tight truncate">
              {state.config.referenceFileName
                ? <span className="text-amber-400">✓ {state.config.referenceFileName}</span>
                : 'Phân tích & import tác phẩm gốc'}
            </p>
          </div>
        </button>

        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-blue-500/50 transition-all text-left group cursor-pointer">
          <input type="file" accept=".json" onChange={handleJsonUpload} className="hidden" />
          <div className="p-2 rounded-lg bg-blue-950/50 border border-blue-500/30 text-blue-400 group-hover:bg-blue-950 transition-colors shrink-0">
            <Upload className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-gray-100 group-hover:text-blue-400 transition-colors">
              Nhập dự án cũ
            </h3>
            <p className="text-[10px] text-gray-500 leading-tight truncate">
              Phục hồi từ .json đã lưu (kèm ảnh)
            </p>
          </div>
        </label>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-left">
          <div className="p-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-gray-100">Bảo mật dữ liệu</h3>
            <p className="text-[10px] text-gray-500 leading-tight truncate">
              Lưu cục bộ, xuất JSON định kỳ
            </p>
          </div>
        </div>
      </div>

      {(state.characters.length > 0 || state.chapters.length > 0) && (
        <div className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
          isLarge ? 'bg-amber-950/20 border-amber-800/40' : 'bg-neutral-900/60 border-neutral-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <HardDrive className={`w-4 h-4 shrink-0 ${isLarge ? 'text-amber-400' : 'text-gray-500'}`} />
            <div>
              <p className="text-[11px] font-semibold text-gray-300">
                Dung lượng dự án: <span className={isLarge ? 'text-amber-400' : 'text-gray-200'}>{formatBytes(storageInfo.totalBytes)}</span>
              </p>
              {storageInfo.totalImages > 0 && (
                <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                  <ImageIcon className="w-3 h-3 text-violet-400" />
                  {storageInfo.totalImages} ảnh tham chiếu · {storageInfo.imagesWithDesc} đã có mô tả AI
                </p>
              )}
            </div>
          </div>
          {isLarge && (
            <span className="text-[9px] text-amber-500 shrink-0 text-right max-w-[140px] leading-tight">
              File khá nặng — vẫn dùng được nhưng tải lên/xuống sẽ chậm hơn
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-neutral-900/40 border border-neutral-800 rounded-xl">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] text-gray-500">Dữ liệu:</span>
          <span className="text-[10px] font-mono text-gray-300">{formatBytes(storageInfo.totalBytes)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportProject}
            className="px-3 py-1.5 bg-amber-950/30 hover:bg-amber-950/50 border border-amber-700/30 text-amber-300 rounded-lg text-[10px] font-medium flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3 h-3" />
            Tải JSON
          </button>
          <button
            onClick={handleClearData}
            className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-800/20 text-red-400 rounded-lg text-[10px] font-medium flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Xóa dữ liệu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={() => onNavigate('idea')}
          className="flex flex-col items-center gap-1 p-3 bg-neutral-900/40 border border-neutral-800 hover:border-amber-700/40 rounded-xl transition-all group"
        >
          <Sparkles className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] text-gray-500 group-hover:text-gray-300">Ý tưởng</span>
        </button>
        <button
          onClick={() => onNavigate('characters')}
          className="flex flex-col items-center gap-1 p-3 bg-neutral-900/40 border border-neutral-800 hover:border-red-700/40 rounded-xl transition-all group"
        >
          <Users className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] text-gray-500 group-hover:text-gray-300">Nhân vật</span>
        </button>
        <button
          onClick={() => onNavigate('rules')}
          className="flex flex-col items-center gap-1 p-3 bg-neutral-900/40 border border-neutral-800 hover:border-amber-700/40 rounded-xl transition-all group"
        >
          <ShieldCheck className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] text-gray-500 group-hover:text-gray-300">Quy tắc</span>
        </button>
        <button
          onClick={() => onNavigate('compose')}
          className="flex flex-col items-center gap-1 p-3 bg-neutral-900/40 border border-neutral-800 hover:border-red-700/40 rounded-xl transition-all group"
        >
          <PenTool className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] text-gray-500 group-hover:text-gray-300">Sáng tác</span>
        </button>
      </div>

      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setKeysExpanded(!keysExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-neutral-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-red-500" />
            <h2 className="text-xs font-bold text-gray-200">API Keys</h2>
            <span className="text-[10px] text-gray-500 font-mono">
              ({state.apiKeys.length === 0 ? 'mặc định' : `${state.apiKeys.filter(k => !k.quotaExceeded).length}/${state.apiKeys.length} hoạt động`})
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${keysExpanded ? 'rotate-180' : ''}`} />
        </button>

        {keysExpanded && (
          <div className="px-3 pb-3 border-t border-neutral-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-500">
                Key từ <span className="text-amber-400 font-mono">ag.beijixingxing.com</span>, <span className="text-amber-400 font-mono">catiecli.sukaka.top</span> hoặc nơi khác.
              </p>
              <button
                onClick={() => setIsAddingKey(!isAddingKey)}
                className="px-2 py-1 bg-neutral-800 border border-neutral-700 hover:border-red-500 hover:text-red-400 rounded-lg text-[10px] text-gray-300 flex items-center gap-1 transition-colors shrink-0 ml-2"
              >
                <Plus className="w-3 h-3" /> Thêm key
              </button>
            </div>

            {isAddingKey && (
              <div className="mb-3 p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Nhà cung cấp</label>
                    <select
                      value={newProvider}
                      onChange={(e) => handleProviderChange(e.target.value as ProviderValue)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-red-500"
                    >
                      {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    {providerHint && <p className="mt-0.5 text-[9px] text-gray-500 font-mono">Format: {providerHint}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Tên nhãn</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: AG Key chính"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Khóa API</label>
                  <input
                    type="password"
                    placeholder={`Nhập API Key (${providerHint || '...'})`}
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                {newProvider !== 'gemini' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] text-gray-400">
                        Model AI <span className="text-gray-600">(tự do — gõ tên model bất kỳ)</span>
                      </label>
                      {MODEL_LISTABLE_PROVIDERS.includes(newProvider) && (
                        <button
                          type="button"
                          onClick={handleFetchModels}
                          disabled={modelsLoading || !newKey.trim()}
                          className="px-2 py-0.5 bg-cyan-950/40 border border-cyan-800/40 hover:border-cyan-600/60 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-[9px] text-cyan-300 flex items-center gap-1 transition-colors"
                        >
                          {modelsLoading
                            ? <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Đang lấy...</>
                            : <><ListTree className="w-2.5 h-2.5" /> Lấy models</>}
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      list="model-suggestions"
                      placeholder="Ví dụ: gemini-2.5-flash, claude-3-5-sonnet-20241022, gpt-4o-mini..."
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 font-mono focus:outline-none focus:border-red-500"
                    />
                    <datalist id="model-suggestions">
                      {Array.from(new Map([...AG_MODELS, ...CATIECLI_MODELS].map(m => [m.value, m])).values()).map((m) => (
                        <option key={m.value} value={m.value} />
                      ))}
                      {fetchedModels.map((m) => <option key={m} value={m} />)}
                    </datalist>

                    {modelsError && (
                      <p className="mt-1 text-[9px] text-red-400 leading-relaxed">⚠ {modelsError}</p>
                    )}

                    {fetchedModels.length > 0 && (
                      <div className="mt-1.5 p-2 bg-neutral-900/60 border border-cyan-900/30 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-cyan-400 font-mono">
                            Đã lấy {fetchedModels.length} model — bấm để chọn:
                          </span>
                          <button type="button" onClick={() => { setFetchedModels([]); setModelSearch(''); }}
                            className="text-[9px] text-gray-500 hover:text-gray-300">✕ ẩn</button>
                        </div>
                        <input
                          type="text"
                          placeholder="Tìm trong danh sách model..."
                          value={modelSearch}
                          onChange={(e) => setModelSearch(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-md p-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-cyan-600"
                        />
                        <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1">
                          {filteredFetchedModels.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setNewModel(m)}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-mono border transition-colors ${
                                newModel === m
                                  ? 'border-cyan-600/60 bg-cyan-950/40 text-cyan-300'
                                  : 'border-neutral-700 bg-neutral-800/60 text-gray-500 hover:text-gray-300 hover:border-neutral-600'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                          {filteredFetchedModels.length === 0 && (
                            <span className="text-[9px] text-gray-600 italic">Không tìm thấy model khớp.</span>
                          )}
                        </div>
                      </div>
                    )}

                    {fetchedModels.length === 0 && (newProvider === 'antigravity' || newProvider === 'catiecli') && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(newProvider === 'antigravity' ? AG_MODELS : CATIECLI_MODELS).map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setNewModel(m.value)}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-mono border transition-colors ${
                              newModel === m.value
                                ? 'border-amber-600/60 bg-amber-950/40 text-amber-300'
                                : 'border-neutral-700 bg-neutral-800/60 text-gray-500 hover:text-gray-300 hover:border-neutral-600'
                            }`}
                          >
                            {m.value}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button onClick={() => { setIsAddingKey(false); setNewKey(''); setNewLabel(''); setFetchedModels([]); setModelsError(null); }} className="px-2.5 py-1 hover:bg-neutral-800 rounded-lg text-[10px] text-gray-400 transition-colors">Hủy</button>
                  <button onClick={handleAddKey} className="px-3 py-1 bg-red-900/70 border border-red-700 text-red-200 hover:bg-red-800/80 rounded-lg text-[10px] font-semibold transition-colors">Lưu Khóa</button>
                </div>
              </div>
            )}

            {state.apiKeys.length === 0 ? (
              <div className="py-3 text-center border border-dashed border-neutral-800 rounded-lg text-[10px] text-gray-500">
                Dùng API Key mặc định của Hosting. Thêm key của bạn để tăng quota.
              </div>
            ) : (
              <div className="space-y-1.5">
                {state.apiKeys.map((k) => {
                  const ts = testStatus[k.id];
                  return (
                    <div
                      key={k.id}
                      className={`rounded-lg border transition-colors ${
                        k.quotaExceeded ? 'bg-neutral-950/40 border-neutral-900 opacity-60'
                        : k.isActive ? 'bg-red-950/20 border-red-900/50'
                        : 'bg-neutral-950/40 border-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between p-2 gap-2">
                        <button
                          onClick={() => handleToggleActiveKey(k.id)}
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            k.isActive ? 'bg-red-600 border-red-500 text-white' : 'border-neutral-700 hover:border-red-500'
                          }`}
                        >
                          {k.isActive && <Check className="w-2.5 h-2.5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[11px] font-semibold text-gray-200 truncate">{k.label}</span>
                            <span className="px-1 py-0.5 rounded text-[8px] font-mono bg-neutral-800 text-gray-400 uppercase">{k.provider}</span>
                            {k.quotaExceeded && <span className="px-1 py-0.5 rounded text-[8px] bg-amber-950/60 text-amber-400">Hết quota</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleTest(k)}
                            disabled={ts?.loading}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-semibold flex items-center gap-1 transition-colors border ${
                              ts?.loading ? 'border-neutral-700 text-gray-500'
                              : ts?.ok === true ? 'border-green-800/60 bg-green-950/30 text-green-400'
                              : ts?.ok === false ? 'border-red-800/60 bg-red-950/30 text-red-400'
                              : 'border-neutral-700 bg-neutral-800/60 text-gray-400 hover:text-blue-400'
                            }`}
                          >
                            {ts?.loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              : ts?.ok === true ? <Wifi className="w-2.5 h-2.5" />
                              : ts?.ok === false ? <WifiOff className="w-2.5 h-2.5" />
                              : <Wifi className="w-2.5 h-2.5" />}
                            Test
                          </button>
                          <button onClick={() => handleDeleteKey(k.id)} className="p-1 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-md transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {ts && !ts.loading && ts.msg && (
                        <div className={`px-2.5 py-1.5 text-[10px] border-t flex items-center gap-1 rounded-b-lg ${
                          ts.ok ? 'border-green-900/30 bg-green-950/20 text-green-400' : 'border-red-900/30 bg-red-950/20 text-red-400'
                        }`}>
                          {ts.ok ? <CheckCircle2 className="w-2.5 h-2.5 shrink-0" /> : <AlertCircle className="w-2.5 h-2.5 shrink-0" />}
                          {ts.msg}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center pt-2 border-t border-neutral-800/50">
        <p className="text-[9px] text-gray-700">
          StoryCraft Pro v2.0 · Dữ liệu lưu trữ cục bộ ·
          <button onClick={handleExportProject} className="text-amber-700 hover:text-amber-600 ml-1 transition-colors">
            Xuất JSON
          </button>
        </p>
      </div>

      {showAnalyzer && (
        <FanficAnalyzer
          state={state}
          updateState={updateState}
          onClose={() => setShowAnalyzer(false)}
        />
      )}

      {confirmClearAll && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setConfirmClearAll(false)} />
          <div className="relative w-full max-w-sm bg-neutral-900 border border-red-900/50 rounded-2xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-gray-100">Xóa toàn bộ dữ liệu</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              ⚠️ Xóa <strong>TẤT CẢ</strong> truyện, ảnh, backup, API key đã lưu trong trình duyệt này. Không thể hoàn tác!
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmClearAll(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:bg-neutral-800 rounded-lg">Hủy</button>
              <button onClick={runClearAll} className="px-3 py-1.5 text-xs bg-red-900/70 border border-red-700 text-red-200 hover:bg-red-800/80 rounded-lg font-semibold">Xóa hết</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}