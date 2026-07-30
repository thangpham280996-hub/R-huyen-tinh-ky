import React, { useState, useCallback, useRef } from 'react';
import {
  FileText, Sparkles, BookOpen, Users, Globe, AlertCircle,
  CheckCircle2, Loader2, ChevronDown, ChevronUp, X, Check,
  Eye, Layers, Zap, Upload, Search, Download, FileJson
} from 'lucide-react';
import { NovelState, Character, WorldEntity } from '../types';

interface FanficAnalyzerProps {
  state: NovelState;
  updateState: (updater: (prev: NovelState) => void) => void;
  onClose: () => void;
}

interface AnalyzedCharacter {
  name: string; gender: string; age: string; role: string;
  appearance: string; personality: string; backStory: string;
  currentStatus: string; additionalInfo: string;
}

interface AnalyzedWorld {
  name: string; type: 'sect' | 'family' | 'place' | 'power' | 'system' | 'other'; description: string;
}

interface AnalysisResult {
  title: string; genres: string[]; context: string; writingStyle: string;
  narrativeVoice: string; // Ngôi kể + giọng điệu + nhịp câu của tác phẩm gốc — dùng để "xào nấu" góc nhìn khi viết truyện mới
  characters: AnalyzedCharacter[]; worldEntities: AnalyzedWorld[]; loreNotes: string;
}

const CHUNK_SIZE = 14000; // Tăng từ 6000 → giảm ~60% số lượt gọi AI, giảm mạnh tổng thời gian chờ giãn cách giữa các lượt
const CHARS_PER_CALL = 14000;

function estimateCalls(textLength: number): number {
  return Math.ceil(textLength / CHARS_PER_CALL) + 1;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Trích thời gian chờ Google/proxy yêu cầu trong lỗi 429 (VD: "retryDelay":"36s") ──
function parseRetryDelayMs(message: string): number | null {
  if (!message) return null;
  const m1 = message.match(/"retryDelay":"(\d+(?:\.\d+)?)s"/);
  const m2 = message.match(/retry in ([\d.]+)s/i);
  const match = m1 || m2;
  if (match) {
    const seconds = parseFloat(match[1]);
    if (!isNaN(seconds)) return Math.ceil(seconds * 1000);
  }
  return null;
}

// ─── Khoảng cách an toàn giữa các lượt gọi, theo giới hạn RPM (số lượt/phút) của từng nhà cung cấp ──
// Dashboard beijixingxing hiển thị: CLI RPM 3, AG RPM 5 → gọi dồn dập sẽ bị 429 dù quota tổng còn rất nhiều.
function getSafeGapMs(provider?: string): number {
  switch (provider) {
    case 'catiecli':    return 21000; // RPM 3 → tối thiểu 20s/lượt, có buffer
    case 'antigravity': return 13000; // RPM 5 → tối thiểu 12s/lượt, có buffer
    case 'gemini':      return 4500;  // Gemini free tier trực tiếp, RPM thường cao hơn
    default:            return 6000;  // openai/claude/grok qua proxy — mặc định thận trọng
  }
}

// ─── Key có đang "nghỉ" do vừa báo hết quota theo NGÀY không? Tự hết hạn sau 6 tiếng thay vì khoá vĩnh viễn ──
const QUOTA_COOLDOWN_MS = 6 * 60 * 60 * 1000;
function isKeyOnCooldown(k: any): boolean {
  if (!k.quotaExceeded) return false;
  if (!k.quotaExceededAt) return true; // dữ liệu cũ chưa có timestamp — vẫn coi là nghỉ, cần bấm Test thủ công
  return Date.now() - k.quotaExceededAt < QUOTA_COOLDOWN_MS;
}

// ─── Core API calls ──────────────────────────────────────────────────────────
async function callAI(prompt: string, systemInstruction: string, apiKeys: any[]): Promise<string> {
  const activeKey = apiKeys.find((k: any) => k.isActive && !k.quotaExceeded) || null;
  const body: Record<string, any> = { prompt, systemInstruction, provider: activeKey?.provider || 'gemini' };
  if (activeKey) {
    body.customApiKey = activeKey.key;
    if (activeKey.customModel) body.customModel = activeKey.customModel;
    if (['openai', 'claude', 'grok', 'antigravity'].includes(activeKey.provider)) {
      body.customEndpoint = 'https://ag.beijixingxing.com/v1/chat/completions';
    }
    if (activeKey.provider === 'catiecli') {
      body.customEndpoint = 'https://catiecli.sukaka.top/v1/chat/completions';
    }
  }
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
    const rawText = await res.text();
  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(
      `SERVER_NON_JSON::Máy chủ trả về dữ liệu không hợp lệ (có thể do timeout). HTTP ${res.status}. Nội dung: ${rawText.substring(0, 150)}`
    );
  }

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return (data.text || '').trim();
}

async function callAIWithRetry(prompt: string, systemInstruction: string, apiKeys: any[], updateState: any, maxRetries = 5): Promise<string> {
  const usableKeys = apiKeys.filter((k: any) => k.isActive && !isKeyOnCooldown(k));

  // Người dùng ĐÃ cấu hình key riêng nhưng tất cả đều đang "nghỉ" — TUYỆT ĐỐI không được âm thầm
  // rớt về key mặc định của hosting (key đó chỉ 20 lượt/ngày, dùng chung mọi người, sẽ hết ngay lập tức).
  if (apiKeys.length > 0 && usableKeys.length === 0) {
    throw new Error(
      'ALL_KEYS_COOLDOWN::Tất cả API Key bạn đã thêm đều đang tạm nghỉ do vừa báo hết quota. ' +
      'App sẽ KHÔNG tự chuyển sang key mặc định (key đó rất dễ hết vì dùng chung nhiều người). ' +
      'Hãy đợi ít lâu rồi bấm "Tiếp tục", hoặc vào trang Bắt Đầu bấm "Test" trên key để mở lại.'
    );
  }

  let lastErr: any = null;

  for (const key of usableKeys.length ? usableKeys : [null]) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const text = await callAI(prompt, systemInstruction, key ? [key] : apiKeys);
        // Gọi thành công — nếu key từng bị đánh dấu nghỉ, gỡ nhãn ngay
        if (key?.quotaExceeded) {
          key.quotaExceeded = false;
          key.quotaExceededAt = undefined;
          updateState((prev: any) => {
            const targetKey = prev.apiKeys?.find((k: any) => k.key === key.key);
            if (targetKey) { targetKey.quotaExceeded = false; targetKey.quotaExceededAt = undefined; }
          });
        }
        return text;
      } catch (err: any) {
        lastErr = err;
        const msg = err.message || '';
        const is429 = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource_exhausted');
        const isDailyQuota = /perday/i.test(msg);

        if (is429 && isDailyQuota) {
          // Hết quota theo NGÀY — chờ ngay tại đây vô ích, chuyển sang key khác (nếu còn) thay vì lặp lại
          if (key) {
            key.quotaExceeded = true;
            key.quotaExceededAt = Date.now();
            updateState((prev: any) => {
              const targetKey = prev.apiKeys?.find((k: any) => k.key === key.key);
              if (targetKey) { targetKey.quotaExceeded = true; targetKey.quotaExceededAt = Date.now(); }
            });
          }
          break; // ra khỏi vòng attempt, thử key tiếp theo trong danh sách
        }

        if (is429) {
          // Giới hạn tốc độ (RPM) tạm thời — CHỜ đúng thời gian Google/proxy yêu cầu rồi thử lại CÙNG key
          const suggested = parseRetryDelayMs(msg);
          const backoff = suggested ?? Math.min(60000, 2000 * Math.pow(2, attempt)); // 2s,4s,8s,16s,32s,60s
          await new Promise((r) => setTimeout(r, backoff + 500));
          continue; // thử lại cùng key
        }

        // Lỗi khác (mạng chập chờn, 500, v.v.) — chờ ngắn rồi thử lại
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastErr || new Error('Tất cả model/key đều hết quota hoặc lỗi.');
}

async function analyzeChunkWithRetry(chunk: string, chunkIndex: number, totalChunks: number, apiKeys: any[], updateState: any): Promise<string> {
  const system = `Bạn là chuyên gia phân tích tiểu thuyết. Đọc đoạn văn (phần ${chunkIndex + 1}/${totalChunks}).
Trả về JSON với format:
{
  "characters": [{"name":"...","role":"...","appearance":"...","personality":"...","gender":"Nam/Nữ","age":"...","backstory":"...","status":"..."}],
  "worldEntities": [{"name":"...","type":"sect/family/place/power/system/other","description":"..."}],
  "plotPoints": ["sự kiện 1", "sự kiện 2"],
  "lore": "hệ thống tu luyện, thuật ngữ",
  "genres": ["thể loại 1"],
  "pov": "Ngôi kể của đoạn này: ngôi 1 (xưng 'tôi/ta'...) / ngôi 3 giới hạn / ngôi 3 toàn tri / ngôi 2",
  "narratorVoice": "Giọng điệu người kể: hài hước/u uất/lạnh lùng/trữ tình..., nhịp câu ngắn hay dài, có hay dùng ẩn dụ/so sánh không, có tật ngôn ngữ lặp lại nào đặc trưng không"
}
CHỈ TRẢ JSON THUẦN, không markdown.`;

  const userPrompt = `Phân tích đoạn văn sau:\n\n${chunk}`;
  const raw = await callAIWithRetry(userPrompt, system, apiKeys, updateState);
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

// ─── CƠ CHẾ JS TIỀN HỢP NHẤT ──────────────────────────────────────────
function preMergeChunks(chunkResults: string[]) {
  const charMap = new Map<string, any[]>();
  const worldMap = new Map<string, any[]>();
  const plotPoints: string[] = [];
  const loreNotes: string[] = [];
  const povNotes: string[] = [];
  const voiceNotes: string[] = [];

  chunkResults.forEach(raw => {
    try {
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const data = JSON.parse(clean);

      (data.characters || []).forEach((c: any) => {
        if (!c.name) return;
        const name = c.name.trim();
        if (!charMap.has(name)) charMap.set(name, []);
        charMap.get(name)!.push(c);
      });

      (data.worldEntities || []).forEach((w: any) => {
        if (!w.name) return;
        const name = w.name.trim();
        if (!worldMap.has(name)) worldMap.set(name, []);
        worldMap.get(name)!.push(w);
      });

      if (Array.isArray(data.plotPoints)) plotPoints.push(...data.plotPoints);
      if (data.lore) loreNotes.push(data.lore);
      if (data.pov) povNotes.push(data.pov);
      if (data.narratorVoice) voiceNotes.push(data.narratorVoice);
    } catch (e) { console.warn('Lỗi parse JSON ở một đoạn, bỏ qua đoạn này.'); }
  });

  let summarizedText = `### NHÂN VẬT ĐÃ NHÓM ###\n`;
  charMap.forEach((instances, name) => {
    const roles = [...new Set(instances.map(i => i.role).filter(Boolean))].join(', ');
    const info = instances.map(i => i.backstory || i.personality || i.additionalInfo).filter(Boolean).join('; ');
    summarizedText += `- ${name}: Vai trò (${roles}). Thông tin: ${info.substring(0, 400)}...\n`;
  });

  summarizedText += `\n### THẾ LỰC ĐÃ NHÓM ###\n`;
  worldMap.forEach((instances, name) => {
    const types = [...new Set(instances.map(i => i.type).filter(Boolean))].join(', ');
    const desc = instances.map(i => i.description).filter(Boolean).join('; ');
    summarizedText += `- ${name}: Loại (${types}). Mô tả: ${desc.substring(0, 400)}...\n`;
  });

  summarizedText += `\n### LORE & CỐT TRUYỆN CHÍNH ###\nLORE: ${loreNotes.slice(0, 20).join('; ')}\nSỰ KIỆN: ${plotPoints.slice(0, 30).join('; ')}`;
  summarizedText += `\n\n### NGÔI KỂ GHI NHẬN TỪ CÁC ĐOẠN ###\n${[...new Set(povNotes)].slice(0, 10).join(' | ')}`;
  summarizedText += `\n\n### GIỌNG KỂ / VĂN PHONG NGƯỜI KỂ GHI NHẬN TỪ CÁC ĐOẠN ###\n${voiceNotes.slice(0, 15).join(' | ')}`;
  return summarizedText;
}

async function synthesizeResults(
  chunkResults: string[],
  workTitle: string,
  apiKeys: any[],
  updateState: any,
  onProgress?: (msg: string) => void
): Promise<AnalysisResult> {
  const BATCH_SIZE = 25; // Số đoạn thô gộp mỗi lần gọi AI trung gian — chỉnh nếu vẫn timeout thì giảm xuống 15

  // ── Bước 1: Tổng hợp từng nhóm nhỏ thành summary ngắn (gọi AI nhiều lần nhỏ) ──
  const batchSummaries: string[] = [];
  for (let i = 0; i < chunkResults.length; i += BATCH_SIZE) {
    const batch = chunkResults.slice(i, i + BATCH_SIZE);
    const batchText = preMergeChunks(batch); // vẫn dùng hàm gộp local có sẵn, không đổi

    if (onProgress) {
      onProgress(`Tổng hợp nhóm ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunkResults.length / BATCH_SIZE)}...`);
    }

    const systemBatch = `Bạn là AI tóm tắt dữ liệu tiểu thuyết. Nhận dữ liệu thô đã gộp nhóm từ một phần truyện.
Nhiệm vụ: rút gọn còn các nhân vật/thế lực/sự kiện QUAN TRỌNG NHẤT, loại trùng lặp trong nhóm này.
Trả về JSON CÙNG FORMAT với dữ liệu đầu vào (characters, worldEntities, plotPoints, lore, genres, pov, narratorVoice). CHỈ TRẢ JSON THUẦN.`;

    const raw = await callAIWithRetry(batchText, systemBatch, apiKeys, updateState);
    batchSummaries.push(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

    // Tránh gọi dồn dập giữa các nhóm
    if (i + BATCH_SIZE < chunkResults.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // ── Bước 2: Gộp các summary (đã ngắn hơn rất nhiều) rồi gọi AI lần cuối ──
  const finalText = preMergeChunks(batchSummaries);
  
  const system = `Bạn là AI tổng hợp phân tích tiểu thuyết. Nhận dữ liệu ĐÃ ĐƯỢC GỘP NHÓM từ nhiều chương.
Nhiệm vụ: Chắt lọc, loại bỏ trùng lặp triệt để và viết lại thành 1 hồ sơ JSON hoàn chỉnh, logic nhất.
Trả về JSON với format:
{
  "title": "tên tác phẩm", 
  "genres": ["thể loại"], 
  "context": "bối cảnh cốt truyện", 
  "writingStyle": "văn phong",
  "narrativeVoice": "Tổng hợp NGÔI KỂ chính của toàn truyện (ngôi 1/ngôi 3 giới hạn/ngôi 3 toàn tri) + giọng điệu người kể (hài hước/u uất/lạnh lùng...) + nhịp câu (ngắn gấp/dài trữ tình) + các tật ngôn ngữ hoặc mô-típ miêu tả lặp lại đặc trưng. Viết thành 1 đoạn mô tả rõ ràng, đủ chi tiết để một AI khác có thể bắt chước giọng văn này.",
  "characters": [{"name":"...","gender":"Nam/Nữ","age":"...","role":"...","appearance":"...","personality":"...","backStory":"...","currentStatus":"...","additionalInfo":"..."}],
  "worldEntities": [{"name":"...","type":"sect/family/place/power/system/other","description":"..."}],
  "loreNotes": "hệ thống tu luyện, thuật ngữ"
}
CHỈ TRẢ JSON THUẦN.`;

  const userPrompt = `Tên tác phẩm: "${workTitle}"\n\nDữ liệu thô đã nhóm:\n${finalText}`;
  const raw = await callAIWithRetry(userPrompt, system, apiKeys, updateState);
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ khi tổng hợp.');
  return JSON.parse(match[0]) as AnalysisResult;
}

// ─── Component chính ──────────────────────────────────────────────────────────
export default function FanficAnalyzer({ state, updateState, onClose }: FanficAnalyzerProps) {
  const [mode, setMode] = useState<'file' | 'name'>('file');
  const [workName, setWorkName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);

  const [step, setStep] = useState<'input' | 'confirm' | 'processing' | 'preview' | 'done'>('input');
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [chunkResults, setChunkResults] = useState<string[]>([]);
  const [importedProgressName, setImportedProgressName] = useState<string | null>(null);

  // ★ MỚI: file .txt vừa upload là TOÀN VĂN đầy đủ (mặc định true) hay chỉ chứa phần MỚI chưa phân tích.
  // Khi true và đang có tiến trình cũ (chunkResults.length > 0), app sẽ tự bỏ qua các đoạn đã xử lý
  // thay vì phân tích lại từ đầu — đây là fix cho lỗi "chạy tiếp bị đếm lại từ đầu".
  const [isFullFile, setIsFullFile] = useState(true);

  // ── Gộp nhiều file tiến trình (VD: 3 file JSON của cùng 1 bộ truyện) ──
  const [pendingProgressFiles, setPendingProgressFiles] = useState<
    { id: string; name: string; chunkResults: string[]; workName?: string }[]
  >([]);

  // ── Dừng thủ công khi đang chạy ──
  const stopRequestedRef = useRef(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [stoppedManually, setStoppedManually] = useState(false);

  const [selectedChars, setSelectedChars] = useState<Set<number>>(new Set());
  const [selectedWorlds, setSelectedWorlds] = useState<Set<number>>(new Set());
  const [importContext, setImportContext] = useState(true);
  const [importLore, setImportLore] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const estimatedCalls = mode === 'file' && fileContent ? estimateCalls(fileContent.length) : mode === 'name' ? 1 : 0;

  // ★ Số đoạn sẽ được bỏ qua nếu tick "toàn văn" khi có tiến trình cũ — dùng để hiển thị cho người dùng thấy rõ
  const skippableChunkCount = fileContent
    ? Math.min(chunkResults.length, Math.ceil(fileContent.length / CHUNK_SIZE))
    : 0;

  // ── Xử lý File txt ──
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!importedProgressName) setChunkResults([]); // Chỉ reset nếu chưa import file json nối tiến trình
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileContent(ev.target?.result as string);
      setFileName(file.name);
      setFileSize(file.size);
      if (!workName) setWorkName(file.name.replace(/\.[^.]+$/, ''));
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }, [importedProgressName, workName]);

  // ── Xử lý File JSON tiến trình — hỗ trợ chọn NHIỀU file cùng lúc để gộp ──
  const handleImportProgress = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    Promise.all(
      files.map(
        (file) =>
          new Promise<{ id: string; name: string; chunkResults: string[]; workName?: string } | null>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
              try {
                const data = JSON.parse(ev.target?.result as string);
                if (Array.isArray(data.chunkResults)) {
                  resolve({
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    chunkResults: data.chunkResults,
                    workName: data.workName,
                  });
                } else {
                  resolve(null);
                }
              } catch { resolve(null); }
            };
            reader.onerror = () => resolve(null);
            reader.readAsText(file, 'utf-8');
          })
      )
    ).then((parsed) => {
      const valid = parsed.filter(Boolean) as { id: string; name: string; chunkResults: string[]; workName?: string }[];
      const invalidCount = parsed.length - valid.length;
      if (valid.length === 0) {
        alert('Không có file JSON tiến trình hợp lệ nào được chọn (thiếu trường chunkResults).');
        return;
      }
      setPendingProgressFiles((prev) => [...prev, ...valid]);
      if (invalidCount > 0) {
        alert(`${invalidCount} file không đúng định dạng tiến trình Đồng nhân đã bị bỏ qua.`);
      }
    });
    e.target.value = '';
  }, []);

  // ── Đổi vị trí file trong danh sách chờ gộp (sắp đúng thứ tự chương trước-sau) ──
  const movePendingFile = (idx: number, dir: -1 | 1) => {
    setPendingProgressFiles((prev) => {
      const arr = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return prev;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const removePendingFile = (id: string) => {
    setPendingProgressFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // ── Gộp tất cả file đang chờ thành 1 tiến trình duy nhất, theo đúng thứ tự đã sắp ──
  const handleMergePendingFiles = () => {
    if (pendingProgressFiles.length === 0) return;
    const merged = pendingProgressFiles.flatMap((f) => f.chunkResults);
    setChunkResults((prev) => [...prev, ...merged]);
    const firstWorkName = pendingProgressFiles.find((f) => f.workName)?.workName;
    if (firstWorkName && !workName) setWorkName(firstWorkName);
    setImportedProgressName(`${pendingProgressFiles.length} file đã gộp`);
    setPendingProgressFiles([]);
    setError(null);
  };

  // ── Tải JSON xuống máy (Export Checkpoint) ──
  const handleDownloadProgress = () => {
    const dataStr = JSON.stringify({ workName, chunkResults, timestamp: new Date().toISOString() }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TienTrinh_${workName || 'Truyen'}_${chunkResults.length}doan.json`;
    a.click();
  };

  // ── Yêu cầu dừng thủ công — chờ xong đoạn đang gọi dở rồi mới dừng ──
  const handleRequestStop = () => {
    stopRequestedRef.current = true;
    setStopRequested(true);
  };

  const handleStartAnalysis = async (resume = false) => {
    setStep('processing');
    setError(null);
    stopRequestedRef.current = false;
    setStopRequested(false);
    setStoppedManually(false);

    try {
      let analysisResult: AnalysisResult;
      const chunks: string[] = [];
      for (let i = 0; i < fileContent.length; i += CHUNK_SIZE) {
        chunks.push(fileContent.slice(i, i + CHUNK_SIZE));
      }

      const previousChunkCount = resume ? chunkResults.length : 0;

      // ★ FIX CHÍNH: nếu đang resume VÀ file upload là toàn văn đầy đủ (isFullFile),
      // các đoạn đầu tiên của "chunks" (được cắt lại từ fileContent) trùng với các đoạn
      // đã phân tích trong chunkResults — bỏ qua chúng thay vì gọi AI lại từ đầu.
      // Nếu isFullFile = false (file chỉ chứa phần mới), giữ nguyên hành vi cũ: chạy từ i = 0.
      const skipCount = (resume && isFullFile) ? Math.min(previousChunkCount, chunks.length) : 0;
      const startIndex = skipCount;

      // Khi đã bỏ qua theo skipCount, previousChunkCount không còn cần cộng dồn vào total nữa
      // (vì các đoạn đó nằm trong chunks.length của lần chạy này). Chỉ cộng dồn khi KHÔNG bỏ qua
      // (trường hợp file mới chỉ chứa phần tiếp theo, previousChunkCount là số đoạn "ngoài" chunks).
      const total = skipCount > 0
        ? chunks.length + 1
        : chunks.length + previousChunkCount + 1;

      const results = resume ? [...chunkResults] : [];
      if (!resume) setChunkResults([]);

      let stoppedEarly = false;
      // Giãn cách theo giới hạn RPM thực tế của nhà cung cấp đang dùng — tránh gọi dồn dập gây 429
      const activeProvider = state.apiKeys.find((k: any) => k.isActive)?.provider;
      const safeGapMs = getSafeGapMs(activeProvider);

      if (skipCount > 0) {
        setProgress({ current: skipCount, total, label: `Đã bỏ qua ${skipCount} đoạn đã phân tích trước đó, tiếp tục từ đoạn ${skipCount + 1}...` });
      }

      for (let i = startIndex; i < chunks.length; i++) {
        // Kiểm tra cờ dừng TRƯỚC khi gọi đoạn tiếp theo — đoạn đang gọi dở vẫn được hoàn tất và lưu
        if (stopRequestedRef.current) {
          stoppedEarly = true;
          break;
        }

        // Chỉ số hiển thị: nếu đã bỏ qua theo skipCount thì global index = i + 1 (đã nằm trong chunks.length,
        // không cộng thêm previousChunkCount vì sẽ bị đếm 2 lần); nếu không thì cộng dồn như trước.
        const currentGlobalIndex = skipCount > 0 ? (i + 1) : (previousChunkCount + i + 1);
        setProgress({ current: currentGlobalIndex, total, label: `Đọc đoạn mới ${i + 1}/${chunks.length} (Tổng tiến trình: ${currentGlobalIndex})...` });

        const r = await analyzeChunkWithRetry(chunks[i], i, chunks.length, state.apiKeys, updateState);
        results.push(r);
        setChunkResults([...results]);
        if (i < chunks.length - 1) await new Promise(res => setTimeout(res, safeGapMs));
      }

      if (stoppedEarly) {
        setStoppedManually(true);
        setError(
          `Đã dừng theo yêu cầu. Đã lưu an toàn ${results.length} đoạn.\n` +
          `Bấm "Tải JSON tiến trình" để lưu về máy — hôm sau tải lại ở mục "2. Nối Tiến Trình" để làm tiếp, không mất công đọc lại từ đầu.`
        );
        setStep('confirm');
        return;
      }

      setProgress({ current: total - 1, total, label: 'Đang gộp và xử lý trùng lặp nhân vật/thế lực...' });
      analysisResult = await synthesizeResults(
      results,
      workName,
      state.apiKeys,
      updateState,
      (msg: string) => {
        setProgress(prev => ({ ...prev, label: msg }));
      }
    );

    setProgress({ current: total, total, label: 'Hoàn tất!' });

    setResult(analysisResult);
    setSelectedChars(new Set(analysisResult.characters?.map((_, i) => i) || []));
    setSelectedWorlds(new Set(analysisResult.worldEntities?.map((_, i) => i) || []));
    setStep('preview');

  } catch (err: any) {
    const msg = err?.message || 'Lỗi không xác định';
    if (msg.startsWith('ALL_KEYS_COOLDOWN::')) {
      setStoppedManually(true);
      setError(`${msg.replace('ALL_KEYS_COOLDOWN::', '')} Đã lưu an toàn ${chunkResults.length} đoạn.`);
    } else {
      setStoppedManually(false);
      setError(`Lỗi: ${msg}. Đã lưu an toàn ${chunkResults.length} đoạn. Vui lòng bấm Tải Tiến Trình hoặc thử Tiếp Tục.`);
    }
    setStep('confirm');
  }
};

  // ── NHẬP KẾT QUẢ ĐÃ PHÂN TÍCH VÀO DỰ ÁN (đã sửa — trước đây là hàm rỗng) ──
  const handleImport = () => {
    if (!result) return;

    updateState((prev) => {
      // ── Nhân vật đã chọn — merge theo tên, tránh tạo trùng ──
      const charsToImport = result.characters.filter((_, i) => selectedChars.has(i));
      charsToImport.forEach((c) => {
        const existing = prev.characters.find(
          pc => pc.name.trim().toLowerCase() === c.name.trim().toLowerCase()
        );
        if (existing) {
          // Nhân vật đã có sẵn trong dự án — cập nhật, không tạo trùng
          existing.appearance     = c.appearance || existing.appearance;
          existing.personality    = c.personality || existing.personality;
          existing.backStory      = c.backStory || existing.backStory;
          existing.currentStatus  = c.currentStatus || existing.currentStatus;
          existing.additionalInfo = c.additionalInfo || existing.additionalInfo;
          existing.gender          = existing.gender || c.gender || '';
          existing.age             = existing.age || c.age || '';
          existing.role            = existing.role || c.role || '';
        } else {
          prev.characters.push({
            id: Math.random().toString(36).substr(2, 9),
            name: c.name,
            gender: c.gender || '',
            age: c.age || '',
            role: c.role || '',
            appearance: c.appearance || '',
            personality: c.personality || '',
            backStory: c.backStory || '',
            currentStatus: c.currentStatus || '',
            additionalInfo: c.additionalInfo || '',
            relationships: [],
            images: [],
          });
        }
      });

      // ── Thế lực / địa danh đã chọn ──
      const worldsToImport = result.worldEntities.filter((_, i) => selectedWorlds.has(i));
      worldsToImport.forEach((w) => {
        const existing = prev.worldEntities.find(
          pw => pw.name.trim().toLowerCase() === w.name.trim().toLowerCase()
        );
        if (existing) {
          existing.description = w.description || existing.description;
        } else {
          prev.worldEntities.push({
            id: Math.random().toString(36).substr(2, 9),
            name: w.name,
            type: w.type || 'other',
            description: w.description || '',
          });
        }
      });

      // ── Bối cảnh & thể loại ──
      if (importContext) {
        if (result.context) prev.config.context = result.context;
        if (result.genres?.length) {
          const merged = new Set([...prev.config.genres, ...result.genres, 'Đồng nhân']);
          prev.config.genres = Array.from(merged);
        }
        if (result.writingStyle) prev.config.writingStyle = result.writingStyle;
        if (!prev.config.title && workName) prev.config.title = workName;

        // Ngôi kể & giọng kể gốc — dùng để "xào nấu" góc nhìn khi viết truyện mới
        if (result.narrativeVoice) {
          prev.config.originalNarrativeVoice = result.narrativeVoice;
          if (!prev.config.targetPOVMode) prev.config.targetPOVMode = 'giu_nguyen';
        }
      }

      // ── Lore ──
      if (importLore && result.loreNotes) {
        if (!prev.rules.loreEntries) prev.rules.loreEntries = [];
        prev.rules.loreEntries.push({
          id: Math.random().toString(36).substr(2, 9),
          category: '📖 Lore từ phân tích Đồng nhân',
          title: `${workName || 'Tác phẩm gốc'} — Lore`,
          content: result.loreNotes,
        });
      }
    });

    setStep('done');
  };

  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={step === 'processing' ? undefined : onClose} />

      <div className="relative w-full max-w-2xl bg-neutral-900 border border-amber-700/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-950/60 border border-amber-700/40 rounded-lg">
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-300">Phân Tích Đồng Nhân Siêu Dài</h3>
              <p className="text-[10px] text-gray-500">Hỗ trợ ngắt quãng, lưu tiến trình và gộp dữ liệu thông minh</p>
            </div>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-200 rounded-lg"><X className="w-4 h-4" /></button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* ── STEP: INPUT ── */}
          {step === 'input' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => setMode('file')} className="p-3 rounded-xl border text-left bg-amber-950/30 border-amber-700/50 text-amber-200">
                  <Upload className="w-4 h-4 mb-1.5" />
                  <p className="text-xs font-bold">1. Upload File .txt</p>
                  <p className="text-[10px] opacity-70 mt-0.5">Truyện cần phân tích</p>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl border text-left bg-neutral-950/60 border-neutral-800 text-gray-400 hover:border-neutral-700">
                  <FileJson className="w-4 h-4 mb-1.5" />
                  <p className="text-xs font-bold">2. Nối Tiến Trình (Tùy chọn)</p>
                  <p className="text-[10px] opacity-70 mt-0.5">Chọn 1 hoặc nhiều file .json tiến trình cũ</p>
                  <input type="file" accept=".json" multiple onChange={handleImportProgress} className="hidden" ref={fileInputRef} />
                </button>
              </div>

              {/* Danh sách file tiến trình đang chờ gộp — dùng khi có nhiều file JSON của cùng 1 bộ truyện */}
              {pendingProgressFiles.length > 0 && (
                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-lg space-y-2">
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Đã chọn <b className="text-amber-300">{pendingProgressFiles.length} file</b> — tổng{' '}
                    <b className="text-amber-300">{pendingProgressFiles.reduce((a, f) => a + f.chunkResults.length, 0)} đoạn</b>.{' '}
                    Sắp đúng thứ tự truyện (đầu → cuối) trước khi gộp:
                  </p>
                  <div className="space-y-1">
                    {pendingProgressFiles.map((f, i) => (
                      <div key={f.id} className="flex items-center gap-2 p-2 bg-neutral-900/60 rounded-lg text-[10px]">
                        <span className="text-gray-600 font-mono w-5 shrink-0">#{i + 1}</span>
                        <span className="flex-1 truncate text-gray-300">{f.name}</span>
                        <span className="text-gray-500 shrink-0">{f.chunkResults.length} đoạn</span>
                        <button onClick={() => movePendingFile(i, -1)} disabled={i === 0}
                          className="p-1 text-gray-500 hover:text-amber-400 disabled:opacity-20 disabled:cursor-not-allowed">
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => movePendingFile(i, 1)} disabled={i === pendingProgressFiles.length - 1}
                          className="p-1 text-gray-500 hover:text-amber-400 disabled:opacity-20 disabled:cursor-not-allowed">
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button onClick={() => removePendingFile(f.id)} className="p-1 text-gray-500 hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleMergePendingFiles}
                    className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold">
                    ✅ Gộp {pendingProgressFiles.length} file thành 1 tiến trình
                  </button>
                </div>
              )}

              {importedProgressName && (
                <div className="p-3 bg-green-950/20 border border-green-800/40 rounded-lg text-xs text-green-300 flex items-center justify-between">
                  <span>Dữ liệu cũ: <b>{chunkResults.length} đoạn</b> ({importedProgressName})</span>
                  <button onClick={() => {setChunkResults([]); setImportedProgressName(null);}} className="text-red-400 hover:text-red-300">Hủy</button>
                </div>
              )}

              <div className="space-y-3">
                <label className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer ${fileContent ? 'border-amber-700/50 bg-amber-950/20' : 'border-neutral-700 hover:border-amber-700/40'}`}>
                  <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                  {fileContent ? (
                    <div className="text-center">
                      <CheckCircle2 className="w-8 h-8 text-amber-400 mx-auto" />
                      <p className="text-sm font-bold text-amber-300">{fileName}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Đã sẵn sàng phân tích tiếp {Math.ceil(fileContent.length / CHUNK_SIZE)} đoạn mới.</p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <FileText className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                      <p className="text-sm">Bấm để chọn file .txt</p>
                      <p className="text-[10px]">Tải file truyện (VD: Chương 101-200.txt)</p>
                    </div>
                  )}
                </label>

                {/* ★ MỚI: chọn chế độ file khi đang có tiến trình cũ, để tránh phân tích lại từ đầu */}
                {fileContent && chunkResults.length > 0 && (
                  <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-lg space-y-2">
                    <p className="text-[10px] text-gray-400">
                      Đang có <b className="text-green-400">{chunkResults.length} đoạn</b> đã phân tích trước đó. File .txt bạn vừa chọn là:
                    </p>
                    <label className="flex items-start gap-2 text-[11px] text-gray-200 cursor-pointer p-2 rounded-lg hover:bg-neutral-900/60">
                      <input type="radio" name="fullFileMode" checked={isFullFile} onChange={() => setIsFullFile(true)} className="mt-0.5 accent-amber-600" />
                      <span>
                        <b>Toàn bộ truyện</b> (kể cả phần đã phân tích) — app sẽ tự động{' '}
                        <b className="text-amber-300">bỏ qua {skippableChunkCount} đoạn đầu</b> đã xử lý và chỉ chạy tiếp phần còn lại.
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-[11px] text-gray-200 cursor-pointer p-2 rounded-lg hover:bg-neutral-900/60">
                      <input type="radio" name="fullFileMode" checked={!isFullFile} onChange={() => setIsFullFile(false)} className="mt-0.5 accent-amber-600" />
                      <span>
                        <b>Chỉ phần mới</b> (file này chưa từng được phân tích) — app sẽ chạy toàn bộ file này và cộng dồn vào {chunkResults.length} đoạn cũ.
                      </span>
                    </label>
                    <p className="text-[9px] text-amber-500/80 leading-relaxed">
                      ⚠️ Chọn sai chế độ có thể khiến 1 phần truyện bị bỏ sót hoặc bị phân tích trùng lặp.
                      Nếu không chắc, chọn "Toàn bộ truyện" khi bạn re-upload đúng file gốc ban đầu.
                    </p>
                  </div>
                )}

                {(fileContent || importedProgressName) && (
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Tên tác phẩm (Để đồng bộ dữ liệu)</label>
                    <input type="text" value={workName} onChange={e => setWorkName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP: CONFIRM (Lỗi Quota & Tải Json) ── */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-950/20 border border-amber-800/30 rounded-xl space-y-3">
                {error && (
                  <div className={`px-3 py-3 rounded-lg text-xs whitespace-pre-line ${
                    stoppedManually
                      ? 'bg-amber-950/30 border border-amber-800/40 text-amber-300'
                      : 'bg-red-950/30 border border-red-800/40 text-red-300'
                  }`}>
                    <div className="flex gap-2 items-center mb-2">
                      <AlertCircle className="w-4 h-4" /> <b>{stoppedManually ? 'Đã tạm dừng' : 'Đã gián đoạn'}</b>
                    </div>
                    <p>{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                   <div className="bg-neutral-950/60 p-3 rounded-lg">
                      <p className="text-[10px] text-gray-500">File Text đang chạy</p>
                      <p className="text-amber-300 font-bold truncate">{fileName}</p>
                   </div>
                   <div className="bg-neutral-950/60 p-3 rounded-lg">
                      <p className="text-[10px] text-gray-500">Số đoạn đã lưu an toàn</p>
                      <p className="text-green-400 font-bold">{chunkResults.length} đoạn</p>
                   </div>
                </div>

                {/* ★ Nhắc lại chế độ đang chọn để người dùng xác nhận trước khi bấm "Chạy tiếp" */}
                {chunkResults.length > 0 && fileContent && (
                  <div className="bg-neutral-950/60 p-3 rounded-lg text-[10px] text-gray-400 leading-relaxed">
                    Chế độ hiện tại: <b className="text-amber-300">{isFullFile ? `Toàn bộ truyện — sẽ bỏ qua ${skippableChunkCount} đoạn đầu` : 'Chỉ phần mới — sẽ chạy toàn bộ file này'}</b>.{' '}
                    Muốn đổi thì bấm "Quay lại".
                  </div>
                )}

                {fileContent && (
                  <div className="bg-neutral-950/60 p-3 rounded-lg text-[10px] text-gray-400 leading-relaxed">
                    ⏱️ Ước tính thời gian chạy đoạn mới: khoảng{' '}
                    <b className="text-amber-300">
                      {Math.ceil((Math.max(0, Math.ceil(fileContent.length / CHUNK_SIZE) - (isFullFile ? skippableChunkCount : 0)) * getSafeGapMs(state.apiKeys.find((k: any) => k.isActive)?.provider)) / 60000)} phút
                    </b>{' '}
                    cho {Math.max(0, Math.ceil(fileContent.length / CHUNK_SIZE) - (isFullFile ? skippableChunkCount : 0))} đoạn còn lại — app đã tự giãn cách theo giới hạn tốc độ (RPM) của nhà cung cấp để tránh lỗi 429.
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-amber-300">{progress.label}</p>
              <div className="w-full h-2 bg-neutral-800 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
              {!stopRequested ? (
                <button onClick={handleRequestStop}
                  className="mt-2 px-4 py-2 bg-red-950/40 border border-red-800/50 hover:bg-red-900/40 text-red-300 rounded-xl text-xs font-bold transition-colors">
                  ⏸️ Dừng & Lưu Tạm
                </button>
              ) : (
                <p className="text-[10px] text-amber-400 animate-pulse">
                  Đang dừng sau khi xong đoạn hiện tại, vui lòng chờ...
                </p>
              )}
              <p className="text-[9px] text-gray-600 leading-relaxed max-w-sm mx-auto">
                Đang giãn cách ~{Math.round(getSafeGapMs(state.apiKeys.find((k: any) => k.isActive)?.provider) / 1000)}s giữa mỗi lượt gọi
                để tránh vượt giới hạn tốc độ (RPM) của nhà cung cấp — chậm hơn nhưng ổn định, không bị 429 giữa chừng.
              </p>
            </div>
          )}

          {/* ── STEP: PREVIEW — chọn nhân vật/thế lực/bối cảnh trước khi nhập vào dự án ── */}
          {step === 'preview' && result && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-1" />
                <h4 className="text-amber-300 font-bold text-sm">Tổng hợp thành công!</h4>
                <p className="text-[10px] text-gray-500 mt-1">
                  Đã gộp {chunkResults.length} đoạn phân tích. Chọn phần cần đưa vào dự án:
                </p>
              </div>

              {/* Chọn nhân vật */}
              {result.characters?.length > 0 && (
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-200">Nhân vật ({result.characters.length})</p>
                    <button
                      onClick={() => setSelectedChars(
                        selectedChars.size === result.characters.length
                          ? new Set()
                          : new Set(result.characters.map((_, i) => i))
                      )}
                      className="text-[10px] text-amber-400 hover:underline">
                      {selectedChars.size === result.characters.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {result.characters.map((c, i) => (
                      <label key={i} className="flex items-start gap-2 p-2 bg-neutral-900/60 rounded-lg cursor-pointer hover:bg-neutral-900">
                        <input
                          type="checkbox"
                          checked={selectedChars.has(i)}
                          onChange={() => setSelectedChars(prev => {
                            const n = new Set(prev);
                            n.has(i) ? n.delete(i) : n.add(i);
                            return n;
                          })}
                          className="mt-0.5 accent-amber-600"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-amber-200">
                            {c.name} <span className="text-gray-500 font-normal">· {c.role}</span>
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">{c.personality}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Chọn thế lực / địa danh */}
              {result.worldEntities?.length > 0 && (
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-200">Thế lực / Địa danh ({result.worldEntities.length})</p>
                    <button
                      onClick={() => setSelectedWorlds(
                        selectedWorlds.size === result.worldEntities.length
                          ? new Set()
                          : new Set(result.worldEntities.map((_, i) => i))
                      )}
                      className="text-[10px] text-amber-400 hover:underline">
                      {selectedWorlds.size === result.worldEntities.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {result.worldEntities.map((w, i) => (
                      <label key={i} className="flex items-start gap-2 p-2 bg-neutral-900/60 rounded-lg cursor-pointer hover:bg-neutral-900">
                        <input
                          type="checkbox"
                          checked={selectedWorlds.has(i)}
                          onChange={() => setSelectedWorlds(prev => {
                            const n = new Set(prev);
                            n.has(i) ? n.delete(i) : n.add(i);
                            return n;
                          })}
                          className="mt-0.5 accent-amber-600"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-amber-200">
                            {w.name} <span className="text-gray-500 font-normal">· {w.type}</span>
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">{w.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Toggle bối cảnh / lore */}
              <div className="flex gap-4 px-1">
                <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={importContext} onChange={e => setImportContext(e.target.checked)} className="accent-amber-600" />
                  Nhập bối cảnh & thể loại
                </label>
                <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={importLore} onChange={e => setImportLore(e.target.checked)} className="accent-amber-600" />
                  Nhập lore vào Quy Tắc
                </label>
              </div>

              {/* Giọng kể & ngôi kể gốc — chỉ hiện khi importContext bật vì sẽ được lưu cùng lúc */}
              {importContext && result.narrativeVoice && (
                <div className="bg-violet-950/20 border border-violet-800/30 rounded-xl p-3">
                  <p className="text-xs font-bold text-violet-300 mb-1">🎙️ Ngôi kể & giọng kể gốc (tự động phát hiện)</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">{result.narrativeVoice}</p>
                  <p className="text-[9px] text-gray-600 mt-1.5">
                    Sẽ được lưu vào cấu hình để dùng cho tính năng "Xào nấu ngôi kể" ở trang Sáng Tác.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === 'done' && (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
              <h4 className="text-green-300 font-bold text-sm">Đã nhập vào dự án!</h4>
              <p className="text-[11px] text-gray-500">
                Bạn có thể kiểm tra ở tab <b>Nhân Vật</b>, <b>Ý Tưởng</b> và <b>Quy Tắc</b>.
              </p>
              <button onClick={onClose} className="mt-2 px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-200 rounded-xl text-xs font-bold">
                Đóng
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {step !== 'done' && (
          <div className="px-5 py-4 border-t border-neutral-800 shrink-0 flex gap-2 justify-end">
            {step === 'input' && (
              <button onClick={() => setStep('confirm')} disabled={!fileContent && !importedProgressName}
                className="px-5 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold">Tiếp theo →</button>
            )}
            {step === 'confirm' && (
              <>
                {chunkResults.length > 0 && (
                  <button onClick={handleDownloadProgress} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-green-400 rounded-xl text-xs flex items-center gap-2 mr-auto">
                    <Download className="w-3.5 h-3.5" /> Tải JSON tiến trình
                  </button>
                )}
                <button onClick={() => setStep('input')} className="px-4 py-2 text-xs text-gray-400 hover:bg-neutral-800 rounded-xl">Quay lại</button>
                <button onClick={() => handleStartAnalysis(chunkResults.length > 0)}
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> {chunkResults.length > 0 ? `Chạy tiếp / Gộp file` : 'Bắt đầu phân tích'}
                </button>
              </>
            )}
            {step === 'preview' && (
              <>
                <button onClick={handleDownloadProgress} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-400 rounded-xl text-xs flex items-center gap-2 mr-auto">
                  <Download className="w-3.5 h-3.5" /> Tải JSON dữ liệu thô
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedChars.size === 0 && selectedWorlds.size === 0 && !importContext && !importLore}
                  className="px-5 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" /> Nhập vào dự án ({selectedChars.size} NV, {selectedWorlds.size} TL)
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
