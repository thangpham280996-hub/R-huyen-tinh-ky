import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  FileText, Sparkles, BookOpen, Users, Globe, AlertCircle,
  CheckCircle2, Loader2, ChevronDown, ChevronUp, X, Check,
  Eye, Layers, Zap, Upload, Search, Download, FileJson, Clock
} from 'lucide-react';
import { NovelState, Character, WorldEntity } from '../types';

interface FanficAnalyzerProps {
  state: NovelState;
  updateState: (updater: (prev: NovelState) => void) => void;
  onClose: () => void;
}

// ─── INTERFACE: AnalyzedCharacter ──────────────────────────────────────────
interface AnalyzedCharacter {
  name: string;
  gender: string;
  age: string;
  role: string;
  importance?: string;
  appearance: string;
  personality: string;
  backStory: string;
  currentStatus: string;
  additionalInfo: string;
  relationships?: string;
  keyEvents?: string[];
  firstAppearanceOrder?: number;
  quotes?: string[];
}

// ─── INTERFACE: AnalyzedWorld ──────────────────────────────────────────────
interface AnalyzedWorld {
  name: string;
  type: 'sect' | 'family' | 'place' | 'power' | 'system' | 'other';
  description: string;
  keyMembers?: string;
  relationships?: string;
  firstAppearanceOrder?: number;
}

// ─── INTERFACE: ExtractedTimelineEvent ────────────────────────────────────
interface ExtractedTimelineEvent {
  order: number;
  chapterLabel: string;
  category: string;
  content: string;
}

// ─── INTERFACE: ExtractedStoryEvent ───────────────────────────────────────
interface ExtractedStoryEvent {
  order: number;
  chapterLabel: string;
  content: string;
}

// ─── INTERFACE: AnalysisResult ────────────────────────────────────────────
interface AnalysisResult {
  title: string;
  genres: string[];
  context: string;
  writingStyle: string;
  narrativeVoice: string;
  characters: AnalyzedCharacter[];
  worldEntities: AnalyzedWorld[];
  loreNotes: string;
  characterTimelines?: Record<string, ExtractedTimelineEvent[]>;
  storyTimeline?: ExtractedStoryEvent[];
  computedFirstAppearance?: {
    characters: Record<string, number>;
    worldEntities: Record<string, number>;
  };
}

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const CHUNK_SIZE = 14000;
const CHARS_PER_CALL = 14000;
const PARALLEL_CONCURRENCY = 3;
const MAX_PLOT_POINTS = 500;
const MAX_EVENTS_PER_CHAR = 60;
const MAX_STORY_EVENTS = 400;
const MAX_CHARACTERS_FOR_TIMELINE = 150;
const BATCH_SIZE = 30;

// ─── CACHE CHO PARSED JSON ────────────────────────────────────────────────
const parseCache = new Map<string, any>();

function getCachedParse(raw: string): any | null {
  const key = raw.substring(0, 200);
  if (parseCache.has(key)) return parseCache.get(key);
  
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(clean);
    parseCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

function clearParseCache() {
  parseCache.clear();
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
function estimateCalls(textLength: number): number {
  return Math.ceil(textLength / CHARS_PER_CALL) + 1;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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

function getSafeGapMs(provider?: string): number {
  switch (provider) {
    case 'catiecli':    return 21000;
    case 'antigravity': return 13000;
    case 'gemini':      return 4500;
    default:            return 6000;
  }
}

const QUOTA_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function isKeyOnCooldown(k: any): boolean {
  if (!k.quotaExceeded) return false;
  if (!k.quotaExceededAt) return true;
  return Date.now() - k.quotaExceededAt < QUOTA_COOLDOWN_MS;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── HÀM: callAI ────────────────────────────────────────────────────────────
async function callAI(
  prompt: string, 
  systemInstruction: string, 
  apiKeys: any[], 
  signal?: AbortSignal
): Promise<string> {
  const activeKey = apiKeys.find((k: any) => k.isActive && !k.quotaExceeded) || null;
  const body: Record<string, any> = { 
    prompt, 
    systemInstruction, 
    provider: activeKey?.provider || 'gemini' 
  };
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
    signal,
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
  
  // 👈 THÊM: chuẩn hóa Unicode NFC
  return (data.text || '').trim().normalize('NFC');
}

// ─── HÀM: callAIWithRetry ──────────────────────────────────────────────────
async function callAIWithRetry(
  prompt: string, 
  systemInstruction: string, 
  apiKeys: any[], 
  updateState: any, 
  signal?: AbortSignal,
  maxRetries = 5
): Promise<string> {
  const usableKeys = apiKeys.filter((k: any) => k.isActive && !isKeyOnCooldown(k));

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
      if (signal?.aborted) {
        throw new Error('REQUEST_ABORTED::Người dùng đã hủy yêu cầu.');
      }

      try {
        const text = await callAI(prompt, systemInstruction, key ? [key] : apiKeys, signal);
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
        
        if (msg.includes('REQUEST_ABORTED') || msg.includes('AbortError')) {
          throw err;
        }
        
        const is429 = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource_exhausted');
        const isDailyQuota = /perday/i.test(msg);

        if (is429 && isDailyQuota) {
          if (key) {
            key.quotaExceeded = true;
            key.quotaExceededAt = Date.now();
            updateState((prev: any) => {
              const targetKey = prev.apiKeys?.find((k: any) => k.key === key.key);
              if (targetKey) { targetKey.quotaExceeded = true; targetKey.quotaExceededAt = Date.now(); }
            });
          }
          break;
        }

        if (is429) {
          const suggested = parseRetryDelayMs(msg);
          const backoff = suggested ?? Math.min(60000, 2000 * Math.pow(2, attempt));
          await sleep(backoff + 500);
          continue;
        }

        await sleep(1500 * (attempt + 1));
      }
    }
  }
  throw lastErr || new Error('Tất cả model/key đều hết quota hoặc lỗi.');
}

// ─── HÀM: analyzeChunkWithRetry ────────────────────────────────────────────
async function analyzeChunkWithRetry(
  chunk: string, 
  chunkIndex: number, 
  totalChunks: number, 
  apiKeys: any[], 
  updateState: any,
  signal?: AbortSignal
): Promise<string> {
  const system = `Phân tích đoạn văn (${chunkIndex + 1}/${totalChunks}), trích xuất ĐẦY ĐỦ NHÂN VẬT + THẾ LỰC + SỰ KIỆN.

⚠️ BẮT BUỘC:
- Trích TẤT CẢ nhân vật có tên riêng, kể cả xuất hiện thoáng qua 1 lần — không bỏ sót, không bịa thêm.

- NHÂN VẬT: Với MỖI nhân vật, viết CHI TIẾT 2-4 câu cho mỗi trường (appearance, personality, backstory, status) — KHÔNG viết cụt lủn 1-2 từ hay để trống nếu đoạn văn có thông tin.
  keyEvents: liệt kê ĐẦY ĐỦ mọi hành động/sự kiện nhân vật đó tham gia trong đoạn này (KHÔNG giới hạn số lượng cứng), mỗi sự kiện viết đủ ý (1-2 câu).

- THẾ LỰC: Với MỖI thế lực, viết CHI TIẾT 2-3 câu cho description (bối cảnh, sức mạnh, vai trò), và ghi keyMembers/relationships nếu đoạn văn có đề cập.

- plotPoints: liệt kê ĐẦY ĐỦ các sự kiện/biến cố xảy ra trong đoạn (KHÔNG giới hạn 3-5), mỗi sự kiện viết 1-2 câu đủ ngữ cảnh (ai, làm gì, hệ quả gì).
- Phân loại vai trò: chính/phụ/phản diện/khách mời.

JSON OUTPUT (chỉ JSON thuần, không markdown):
{
  "characters": [{"name":"","role":"","importance":"cao/trung bình/thấp","appearance":"","personality":"","gender":"","age":"","backstory":"","status":"","relationships":"","keyEvents":[""]}],
  "worldEntities": [{"name":"","type":"sect|family|place|power|system|other","description":"","keyMembers":"","relationships":""}],
  "plotPoints": ["sự kiện chi tiết 1", "sự kiện chi tiết 2"],
  "lore": "lore",
  "pov": "ngôi kể",
  "narratorVoice": "giọng kể"
}`;

  const userPrompt = `Đoạn ${chunkIndex + 1}/${totalChunks}:\n\n${chunk}`;
  const raw = await callAIWithRetry(userPrompt, system, apiKeys, updateState, signal);
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

// ─── HÀM: processChunksParallel ─────────────────────────────────────────────
async function processChunksParallel(
  chunks: string[],
  startIndex: number,
  apiKeys: any[],
  updateState: any,
  signal?: AbortSignal,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];
  let completed = 0;
  let index = startIndex;
  const total = chunks.length;
  
  const activeProvider = apiKeys.find((k: any) => k.isActive)?.provider;
  const concurrency = (activeProvider === 'antigravity' || activeProvider === 'catiecli')
    ? 1
    : PARALLEL_CONCURRENCY;
  
  return new Promise((resolve, reject) => {
    let activeWorkers = 0;
    let hasError = false;
    
    async function worker(workerId: number) {
      while (index < total && !hasError && !signal?.aborted) {
        const i = index++;
        const chunk = chunks[i];
        
        try {
          const result = await analyzeChunkWithRetry(
            chunk, i, total, apiKeys, updateState, signal
          );
          results[i] = result;
          completed++;
          onProgress?.(completed, total);
          await sleep(getSafeGapMs(activeProvider));
        } catch (err: any) {
          if (err.message?.includes('ABORTED') || signal?.aborted) {
            // Bỏ qua lỗi abort
          } else {
            hasError = true;
            reject(err);
            return;
          }
        }
      }
    }
    
    for (let w = 0; w < Math.min(concurrency, total); w++) {
      activeWorkers++;
      worker(w).finally(() => {
        activeWorkers--;
        if (activeWorkers === 0 && !hasError) {
          resolve(results);
        }
      });
    }
    
    if (total === 0) {
      resolve(results);
    }
  });
}

// ─── HÀM: validateChunkResults ─────────────────────────────────────────────
function validateChunkResults(chunks: string[]): { valid: boolean; issues: string[]; totalCharacters: number } {
  const issues: string[] = [];
  let totalCharacters = 0;
  
  if (chunks.length === 0) {
    issues.push('Không có chunk nào để phân tích');
    return { valid: false, issues, totalCharacters: 0 };
  }
  
  const emptyChunks = chunks.filter(c => !c || c.trim().length < 100);
  if (emptyChunks.length > 0) {
    issues.push(`${emptyChunks.length} chunk bị rỗng hoặc quá ngắn`);
  }
  
  chunks.forEach(raw => {
    const data = getCachedParse(raw);
    if (data) {
      totalCharacters += (data.characters || []).length;
    }
  });
  
  return { valid: issues.length === 0, issues, totalCharacters };
}

// ─── HÀM: deduplicateChunks ─────────────────────────────────────────────────
function deduplicateChunks(chunks: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  
  for (const chunk of chunks) {
    const key = chunk.substring(0, 200);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(chunk);
    }
  }
  
  return unique;
}

// ─── HÀM: computeFirstAppearanceOrders ──────────────────────────────────────
function computeFirstAppearanceOrders(chunkResults: string[]): {
  characters: Record<string, number>;
  worldEntities: Record<string, number>;
} {
  const charFirst: Record<string, number> = {};
  const worldFirst: Record<string, number> = {};
  
  chunkResults.forEach((raw, idx) => {
    const data = getCachedParse(raw);
    if (!data) return;
    
    (data.characters || []).forEach((c: any) => {
      if (!c.name) return;
      const key = c.name.trim().toLowerCase();
      if (!(key in charFirst)) charFirst[key] = idx;
    });
    
    (data.worldEntities || []).forEach((w: any) => {
      if (!w.name) return;
      const key = w.name.trim().toLowerCase();
      if (!(key in worldFirst)) worldFirst[key] = idx;
    });
  });
  
  return { characters: charFirst, worldEntities: worldFirst };
}

// ─── HÀM: preMergeChunks ────────────────────────────────────────────────────
function preMergeChunks(chunkResults: string[]) {
  const charMap = new Map<string, any[]>();
  const worldMap = new Map<string, any[]>();
  const plotPoints: string[] = [];
  const loreNotes: string[] = [];
  const povNotes: string[] = [];
  const voiceNotes: string[] = [];

  let plotPointCount = 0;

  chunkResults.forEach(raw => {
    const data = getCachedParse(raw);
    if (!data) return;

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

    if (Array.isArray(data.plotPoints)) {
      for (const p of data.plotPoints) {
        if (plotPointCount >= MAX_PLOT_POINTS) break;
        const text = typeof p === 'string' ? p : (p?.event || p?.content || p?.description || '');
        if (text?.trim()) {
          plotPoints.push(text.trim());
          plotPointCount++;
        }
      }
    }
    
    if (data.lore) loreNotes.push(data.lore);
    if (data.pov) povNotes.push(data.pov);
    if (data.narratorVoice) voiceNotes.push(data.narratorVoice);
  });

  let summarizedText = `### NHÂN VẬT ĐÃ NHÓM ###\n`;

  const sortedChars = Array.from(charMap.entries()).sort((a, b) => {
    const aImportance = a[1].some((i: any) => i.importance === 'cao') ? 0 : 1;
    const bImportance = b[1].some((i: any) => i.importance === 'cao') ? 0 : 1;
    return aImportance - bImportance;
  });

  sortedChars.forEach(([name, instances]) => {
    const roles = [...new Set(instances.map(i => i.role).filter(Boolean))].join(', ');
    const info = instances.map(i => {
      const parts = [
        i.personality && `Tính cách: ${i.personality}`,
        i.backstory && `Quá khứ: ${i.backstory}`,
        i.additionalInfo && `Bổ sung: ${i.additionalInfo}`,
        i.relationships && `Quan hệ: ${i.relationships}`,
        Array.isArray(i.keyEvents) && i.keyEvents.length ? `Sự kiện: ${i.keyEvents.join('; ')}` : '',
      ].filter(Boolean);
      return parts.join('. ');
    }).filter(Boolean).join(' || ');
    summarizedText += `- ${name}: Vai trò (${roles}). Thông tin: ${info}\n`;
  });

  summarizedText += `\n### THẾ LỰC ĐÃ NHÓM ###\n`;
  worldMap.forEach((instances, name) => {
    const types = [...new Set(instances.map((i: any) => i.type).filter(Boolean))].join(', ');
    const desc = instances.map((i: any) => i.description).filter(Boolean).join('; ');
    const members = instances.map((i: any) => i.keyMembers).filter(Boolean).join('; ');
    const rels = instances.map((i: any) => i.relationships).filter(Boolean).join('; ');
    summarizedText += `- ${name}: Loại (${types}). Mô tả: ${desc}`;
    if (members) summarizedText += ` | Thành viên: ${members}`;
    if (rels) summarizedText += ` | Quan hệ: ${rels}`;
    summarizedText += `\n`;
  });

  summarizedText += `\n### LORE & CỐT TRUYỆN CHÍNH ###\n`;
  summarizedText += `LORE: ${loreNotes.slice(0, 10).join('; ')}\n`;
  summarizedText += `SỰ KIỆN QUAN TRỌNG (${plotPoints.length}/${MAX_PLOT_POINTS}): ${plotPoints.slice(0, 50).join('; ')}`;
  
  if (plotPoints.length > 50) {
    summarizedText += `\n... và ${plotPoints.length - 50} sự kiện khác`;
  }
  
  summarizedText += `\n\n### NGÔI KỂ GHI NHẬN TỪ CÁC ĐOẠN ###\n${[...new Set(povNotes)].slice(0, 10).join(' | ')}`;
  summarizedText += `\n\n### GIỌNG KỂ / VĂN PHONG NGƯỜI KỂ GHI NHẬN TỪ CÁC ĐOẠN ###\n${voiceNotes.slice(0, 15).join(' | ')}`;
  return summarizedText;
}

// ─── HÀM: buildCharacterTimelines ──────────────────────────────────────────
function buildCharacterTimelines(chunkResults: string[]): Record<string, ExtractedTimelineEvent[]> {
  const map: Record<string, ExtractedTimelineEvent[]> = {};
  
  const appearanceCount: Record<string, number> = {};
  
  chunkResults.forEach((raw) => {
    const data = getCachedParse(raw);
    if (!data) return;
    
    (data.characters || []).forEach((c: any) => {
      if (!c.name) return;
      const key = c.name.trim().toLowerCase();
      appearanceCount[key] = (appearanceCount[key] || 0) + 1;
    });
  });
  
  const importantChars = Object.entries(appearanceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CHARACTERS_FOR_TIMELINE)
    .map(([name]) => name);

  chunkResults.forEach((raw, idx) => {
    const data = getCachedParse(raw);
    if (!data) return;
    
    (data.characters || []).forEach((c: any) => {
      if (!c.name) return;
      const key = c.name.trim().toLowerCase();
      
      if (!importantChars.includes(key)) return;
      
      let keyEvents: string[] = [];
      if (typeof c.keyEvents === 'string') {
        keyEvents = [c.keyEvents];
      } else if (Array.isArray(c.keyEvents)) {
        keyEvents = c.keyEvents.map((e: any) => 
          typeof e === 'string' ? e : (e?.event || e?.content || e?.description || '')
        );
      }
      
      let eventCount = 0;
      keyEvents.forEach((eventText: string) => {
        if (!eventText?.trim()) return;
        if (eventCount >= MAX_EVENTS_PER_CHAR) return;
        
        if (!map[key]) map[key] = [];
        const category = c.role ? `Vai trò: ${c.role}` : 'Sự kiện';
        
        map[key].push({ 
          order: idx, 
          chapterLabel: `Đoạn ${idx + 1}`, 
          category, 
          content: eventText.trim() 
        });
        eventCount++;
      });
    });
  });
  
  return map;
}

// ─── HÀM: buildStoryTimeline ───────────────────────────────────────────────
function buildStoryTimeline(chunkResults: string[]): ExtractedStoryEvent[] {
  const events: ExtractedStoryEvent[] = [];
  
  chunkResults.forEach((raw, idx) => {
    const data = getCachedParse(raw);
    if (!data) return;
    
    (data.plotPoints || []).forEach((p: any, j: number) => {
      const text = typeof p === 'string' ? p : (p?.event || p?.content || p?.description || '');
      if (!text?.trim()) return;
      events.push({ 
        order: idx * 100 + j, 
        chapterLabel: `Đoạn ${idx + 1}`, 
        content: text.trim() 
      });
    });
  });
  
  return events.sort((a, b) => a.order - b.order);
}

// ─── HÀM: synthesizeResults ─────────────────────────────────────────────────
async function synthesizeResults(
  chunkResults: string[],
  workTitle: string,
  apiKeys: any[],
  updateState: any,
  signal?: AbortSignal,
  onProgress?: (msg: string) => void
): Promise<AnalysisResult> {
  const BATCH_SIZE = 30;

  const batchSummaries: string[] = [];
  for (let i = 0; i < chunkResults.length; i += BATCH_SIZE) {
    if (signal?.aborted) {
      throw new Error('REQUEST_ABORTED::Người dùng đã hủy yêu cầu.');
    }
    
    const batch = chunkResults.slice(i, i + BATCH_SIZE);
    const batchText = preMergeChunks(batch);

    if (onProgress) {
      onProgress(`Tổng hợp nhóm ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunkResults.length / BATCH_SIZE)}...`);
    }

    const systemBatch = `Tóm tắt dữ liệu tiểu thuyết, gộp trùng nhân vật/thế lực.
GIỮ ĐẦY ĐỦ tất cả nhân vật - KHÔNG LƯỢC BỎ.
KHÔNG được rút gọn appearance/personality/backStory/currentStatus xuống dưới 3-4 câu nếu dữ liệu gốc có đủ.
Trả về JSON cùng format (characters, worldEntities, plotPoints, lore, genres, pov, narratorVoice).
CHỈ TRẢ JSON.`;

    const raw = await callAIWithRetry(batchText, systemBatch, apiKeys, updateState, signal);
    batchSummaries.push(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

    if (i + BATCH_SIZE < chunkResults.length) {
      await sleep(2000);
    }
  }

  const finalText = preMergeChunks(batchSummaries);

  const system = `Tổng hợp phân tích tiểu thuyết.

QUY TẮC:
1. GIỮ ĐẦY ĐỦ 100% NHÂN VẬT - KHÔNG ĐƯỢC LƯỢC BỎ
2. HỢP NHẤT thông tin của cùng 1 nhân vật từ nhiều lần xuất hiện
3. GIỮ NGUYÊN firstAppearanceOrder nếu có
4. CHỈ GIỮ 20 PLOT POINTS QUAN TRỌNG NHẤT
5. THẾ LỰC: description ≥2 câu, giữ keyMembers/relationships nếu có.
6. NHÂN VẬT: appearance/personality/backStory/currentStatus PHẢI giữ 3-4 câu mỗi trường nếu dữ liệu gốc có đủ — KHÔNG rút gọn xuống 1 câu.

JSON:
{
  "title": "",
  "genres": [],
  "context": "",
  "writingStyle": "",
  "narrativeVoice": "",
  "characters": [{"name":"","gender":"","age":"","role":"","importance":"","appearance":"","personality":"","backStory":"","currentStatus":"","additionalInfo":"","relationships":"","keyEvents":[""],"firstAppearanceOrder":0}],
  "worldEntities": [{"name":"","type":"","description":"","keyMembers":"","relationships":"","firstAppearanceOrder":0}],
  "loreNotes": "",
  "plotPoints": []
}
CHỈ TRẢ JSON.`;

  const userPrompt = `Tên tác phẩm: "${workTitle}"\n\n${finalText}`;
  const raw = await callAIWithRetry(userPrompt, system, apiKeys, updateState, signal);
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ khi tổng hợp.');
  return JSON.parse(match[0]) as AnalysisResult;
}

// ─── COMPONENT CHÍNH ──────────────────────────────────────────────────────
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

  const chunkResultsRef = useRef<string[]>([]);
  const [chunkResults, setChunkResults] = useState<string[]>([]);
  
  const [importedProgressName, setImportedProgressName] = useState<string | null>(null);
  const [mergeStats, setMergeStats] = useState<{ totalChunks: number; totalCharacters: number } | null>(null);

  const [isFullFile, setIsFullFile] = useState(true);

  const [pendingProgressFiles, setPendingProgressFiles] = useState<
    { id: string; name: string; chunkResults: string[]; workName?: string }[]
  >([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [stoppedManually, setStoppedManually] = useState(false);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const [selectedChars, setSelectedChars] = useState<Set<number>>(new Set());
  const [selectedWorlds, setSelectedWorlds] = useState<Set<number>>(new Set());
  const [importContext, setImportContext] = useState(true);
  const [importLore, setImportLore] = useState(true);
  const [importTimeline, setImportTimeline] = useState(true);
  const [importStoryEvents, setImportStoryEvents] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const estimatedCalls = mode === 'file' && fileContent ? estimateCalls(fileContent.length) : mode === 'name' ? 1 : 0;

  const skippableChunkCount = fileContent
    ? Math.min(chunkResults.length, Math.ceil(fileContent.length / CHUNK_SIZE))
    : 0;

  // ─── HANDLE: File Upload ──────────────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!importedProgressName) {
      chunkResultsRef.current = [];
      setChunkResults([]);
      clearParseCache();
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setFileContent(content);
      setFileName(file.name);
      setFileSize(file.size);
      if (!workName) setWorkName(file.name.replace(/\.[^.]+$/, ''));
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }, [importedProgressName, workName]);

  // ─── HANDLE: Import Progress ──────────────────────────────────────────────
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

  const handleMergePendingFiles = () => {
    if (pendingProgressFiles.length === 0) return;
    
    const merged = pendingProgressFiles.flatMap((f) => f.chunkResults);
    const uniqueChunks = deduplicateChunks(merged);
    
    const validation = validateChunkResults(uniqueChunks);
    
    if (!validation.valid) {
      alert(`⚠️ Cảnh báo:\n${validation.issues.join('\n')}\n\nVẫn tiếp tục gộp?`);
      if (!confirm('Tiếp tục gộp dữ liệu?')) return;
    }
    
    setMergeStats({
      totalChunks: uniqueChunks.length,
      totalCharacters: validation.totalCharacters
    });
    
    const newResults = [...chunkResultsRef.current, ...uniqueChunks];
    chunkResultsRef.current = newResults;
    setChunkResults(newResults);
    
    const firstWorkName = pendingProgressFiles.find((f) => f.workName)?.workName;
    if (firstWorkName && !workName) setWorkName(firstWorkName);
    setImportedProgressName(`${pendingProgressFiles.length} file đã gộp (${uniqueChunks.length} đoạn, ~${validation.totalCharacters} nhân vật)`);
    setPendingProgressFiles([]);
    setError(null);
  };

  const handleDownloadProgress = () => {
    const dataStr = JSON.stringify({ workName, chunkResults: chunkResultsRef.current, timestamp: new Date().toISOString() }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TienTrinh_${workName || 'Truyen'}_${chunkResultsRef.current.length}doan.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRequestStop = () => {
    stopRequestedRef.current = true;
    setStopRequested(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // ─── HANDLE: Start Analysis ──────────────────────────────────────────────
  const handleStartAnalysis = async (resume = false) => {
    setStep('processing');
    setError(null);
    stopRequestedRef.current = false;
    setStopRequested(false);
    setStoppedManually(false);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      let analysisResult: AnalysisResult;
      const chunks: string[] = [];
      for (let i = 0; i < fileContent.length; i += CHUNK_SIZE) {
        chunks.push(fileContent.slice(i, i + CHUNK_SIZE));
      }

      const previousChunkCount = resume ? chunkResultsRef.current.length : 0;
      const skipCount = (resume && isFullFile) ? Math.min(previousChunkCount, chunks.length) : 0;
      const startIndex = skipCount;

      const total = skipCount > 0
        ? chunks.length + 1
        : chunks.length + previousChunkCount + 1;

      const results = resume ? [...chunkResultsRef.current] : [];
      if (!resume) {
        chunkResultsRef.current = [];
        setChunkResults([]);
        clearParseCache();
      }

      let stoppedEarly = false;

      if (skipCount > 0) {
        setProgress({ current: skipCount, total, label: `Đã bỏ qua ${skipCount} đoạn đã phân tích trước đó, tiếp tục từ đoạn ${skipCount + 1}...` });
      }

      const newResults = await processChunksParallel(
        chunks.slice(startIndex),
        startIndex,
        state.apiKeys,
        updateState,
        signal,
        (current, totalChunks) => {
          const globalCurrent = skipCount + current;
          setProgress({ 
            current: globalCurrent, 
            total: chunks.length + skipCount, 
            label: `Đang phân tích ${current}/${totalChunks} (Tổng: ${globalCurrent})...` 
          });
        }
      );

      const allResults = [...results, ...newResults];
      chunkResultsRef.current = allResults;
      setChunkResults(allResults);

      if (signal.aborted || stopRequestedRef.current) {
        stoppedEarly = true;
        setStoppedManually(true);
        setError(
          `Đã dừng theo yêu cầu. Đã lưu an toàn ${allResults.length} đoạn.\n` +
          `Bấm "Tải JSON tiến trình" để lưu về máy — hôm sau tải lại ở mục "2. Nối Tiến Trình" để làm tiếp.`
        );
        setStep('confirm');
        return;
      }

      setProgress({ current: total - 1, total, label: 'Đang gộp và xử lý trùng lặp nhân vật/thế lực...' });
      analysisResult = await synthesizeResults(
        allResults,
        workName,
        state.apiKeys,
        updateState,
        signal,
        (msg: string) => {
          setProgress(prev => ({ ...prev, label: msg }));
        }
      );

      setProgress({ current: total - 1, total, label: 'Đang xây dựng timeline nhân vật từ dữ liệu thô...' });
      analysisResult.characterTimelines = buildCharacterTimelines(allResults);

      setProgress({ current: total - 1, total, label: 'Đang xây dựng dòng thời gian cốt truyện...' });
      analysisResult.storyTimeline = buildStoryTimeline(allResults);
      
      analysisResult.computedFirstAppearance = computeFirstAppearanceOrders(allResults);

      setProgress({ current: total, total, label: 'Hoàn tất!' });

      setResult(analysisResult);
      setSelectedChars(new Set(analysisResult.characters?.map((_, i) => i) || []));
      setSelectedWorlds(new Set(analysisResult.worldEntities?.map((_, i) => i) || []));
      setStep('preview');

    } catch (err: any) {
      const msg = err?.message || 'Lỗi không xác định';
      
      if (msg.includes('ABORTED') || msg.includes('AbortError') || signal?.aborted) {
        setStoppedManually(true);
        setError(
          `Đã dừng theo yêu cầu. Đã lưu an toàn ${chunkResultsRef.current.length} đoạn.\n` +
          `Bấm "Tải JSON tiến trình" để lưu về máy.`
        );
        setStep('confirm');
        return;
      }
      
      if (msg.startsWith('ALL_KEYS_COOLDOWN::')) {
        setStoppedManually(true);
        setError(`${msg.replace('ALL_KEYS_COOLDOWN::', '')} Đã lưu an toàn ${chunkResultsRef.current.length} đoạn.`);
      } else {
        setStoppedManually(false);
        setError(`Lỗi: ${msg}. Đã lưu an toàn ${chunkResultsRef.current.length} đoạn. Vui lòng bấm Tải Tiến Trình hoặc thử Tiếp Tục.`);
      }
      setStep('confirm');
    } finally {
      abortControllerRef.current = null;
    }
  };

  // ─── HANDLE: Import ────────────────────────────────────────────────────────
  const handleImport = () => {
    if (!result) return;

    updateState((prev) => {
      // ── Nhập nhân vật ──
      const charsToImport = result.characters.filter((_, i) => selectedChars.has(i));
      charsToImport.forEach((c) => {
        const existing = prev.characters.find(
          pc => pc.name.trim().toLowerCase() === c.name.trim().toLowerCase()
        );

        const timelineEvents = (result.characterTimelines?.[c.name.trim().toLowerCase()] || [])
          .map(e => ({
            id: Math.random().toString(36).substr(2, 9),
            order: e.order,
            chapterLabel: e.chapterLabel,
            category: e.category,
            content: e.content,
            relatedCharacterId: undefined
          }));

        const firstOrder = timelineEvents.length
          ? Math.min(...timelineEvents.map(e => e.order))
          : undefined;

        if (existing) {
          type StringField = 'appearance' | 'personality' | 'backStory' | 'currentStatus' | 'additionalInfo';
          const updateIfBetter = (field: StringField, newValue: string) => {
            if (newValue && (!existing[field] || newValue.length > (existing[field] || '').length)) {
              existing[field] = newValue;
            }
          };
          
          updateIfBetter('appearance', c.appearance);
          updateIfBetter('personality', c.personality);
          updateIfBetter('backStory', c.backStory);
          updateIfBetter('currentStatus', c.currentStatus);
          updateIfBetter('additionalInfo', c.additionalInfo);
          
          if (c.gender && !existing.gender) existing.gender = c.gender;
          if (c.age && !existing.age) existing.age = c.age;
          if (c.role && !existing.role) existing.role = c.role;

          if (existing.firstAppearanceOrder === undefined) {
            existing.firstAppearanceOrder = result.computedFirstAppearance?.characters[c.name.trim().toLowerCase()];
          }

          if (importTimeline && timelineEvents.length > 0) {
            const existingTimeline = existing.timeline || [];
            const existingOrders = new Set(existingTimeline.map(t => t.order));
            const newEvents = timelineEvents.filter(e => !existingOrders.has(e.order));
            existing.timeline = [...existingTimeline, ...newEvents];
          }
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
            timeline: importTimeline ? timelineEvents : [],
            firstAppearanceOrder: result.computedFirstAppearance?.characters[c.name.trim().toLowerCase()],
          });
        }
      });

      // ── Nhập thế lực ──
      const worldsToImport = result.worldEntities.filter((_, i) => selectedWorlds.has(i));
      worldsToImport.forEach((w) => {
        const existing = prev.worldEntities.find(
          pw => pw.name.trim().toLowerCase() === w.name.trim().toLowerCase()
        );
        const extra = [];
        if (w.keyMembers) extra.push(`Thành viên: ${w.keyMembers}`);
        if (w.relationships) extra.push(`Quan hệ: ${w.relationships}`);
        const extraInfo = extra.join('\n');

        if (existing) {
          if (w.description && (!existing.description || w.description.length > existing.description.length)) {
            existing.description = w.description;
          }
          if (extraInfo) {
            existing.additionalInfo = existing.additionalInfo ? existing.additionalInfo + '\n' + extraInfo : extraInfo;
          }
          if (existing.firstAppearanceOrder === undefined) {
            existing.firstAppearanceOrder = result.computedFirstAppearance?.worldEntities[w.name.trim().toLowerCase()];
          }
        } else {
          prev.worldEntities.push({
            id: Math.random().toString(36).substr(2, 9),
            name: w.name,
            type: w.type || 'other',
            description: w.description || '',
            firstAppearanceOrder: result.computedFirstAppearance?.worldEntities[w.name.trim().toLowerCase()],
            additionalInfo: extraInfo || undefined,
          });
        }
      });

      // ── Nhập context ──
      if (importContext) {
        if (result.context) prev.config.context = result.context;
        if (result.genres?.length) {
          const merged = new Set([...prev.config.genres, ...result.genres, 'Đồng nhân']);
          prev.config.genres = Array.from(merged);
        }
        if (result.writingStyle) prev.config.writingStyle = result.writingStyle;
        if (!prev.config.title && workName) prev.config.title = workName;

        if (result.narrativeVoice) {
          prev.config.originalNarrativeVoice = result.narrativeVoice;
          if (!prev.config.targetPOVMode) prev.config.targetPOVMode = 'giu_nguyen';
        }
      }

      // ── Nhập lore ──
      if (importLore && result.loreNotes) {
        if (!prev.rules.loreEntries) prev.rules.loreEntries = [];
        prev.rules.loreEntries.push({
          id: Math.random().toString(36).substr(2, 9),
          category: '📖 Lore từ phân tích Đồng nhân',
          title: `${workName || 'Tác phẩm gốc'} — Lore`,
          content: result.loreNotes,
        });
      }

      // ── Nhập story events ──
      if (importStoryEvents && result.storyTimeline?.length) {
        if (!prev.storyEvents) prev.storyEvents = [];
        const existingOrders = new Set((prev.storyEvents || []).map(e => e.order));
        const newEvents = result.storyTimeline
          .filter(e => !existingOrders.has(e.order))
          .map(e => ({
            id: Math.random().toString(36).substr(2, 9),
            order: e.order,
            chapterLabel: e.chapterLabel,
            title: e.content.length > 40 ? e.content.slice(0, 40) + '…' : e.content,
            content: e.content,
            relatedCharacterIds: [],
          }));
        prev.storyEvents.push(...newEvents);
      }

      // ── Lưu nội dung gốc ──
      if (fileContent && fileContent.length > 0) {
        prev.config.referenceFileContent = fileContent;
        prev.config.referenceFileName = fileName || workName || 'Truyện gốc';
      }

      if (!prev.config.referenceFileContent && result.context) {
        prev.config.referenceFileContent = result.context;
        prev.config.referenceFileName = workName || 'Truyện gốc (context)';
      }
    });

    setStep('done');
  };

  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  // ─── RENDER ──────────────────────────────────────────────────────────────
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
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-200 rounded-lg">
              <X className="w-4 h-4" />
            </button>
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

              {pendingProgressFiles.length > 0 && (
                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-lg space-y-2">
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Đã chọn <b className="text-amber-300">{pendingProgressFiles.length} file</b> — tổng{' '}
                    <b className="text-amber-300">{pendingProgressFiles.reduce((a, f) => a + f.chunkResults.length, 0)} đoạn</b>
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
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
                  
                  <div className="grid grid-cols-2 gap-2 text-[9px] text-gray-500 bg-neutral-900/60 p-2 rounded-lg">
                    <div>
                      <span className="text-gray-400">Tổng đoạn:</span>
                      <span className="ml-1 text-amber-400 font-mono">
                        {pendingProgressFiles.reduce((a, f) => a + f.chunkResults.length, 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Số file:</span>
                      <span className="ml-1 text-amber-400 font-mono">{pendingProgressFiles.length}</span>
                    </div>
                  </div>
                  
                  <button onClick={handleMergePendingFiles}
                    className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold">
                    ✅ Gộp {pendingProgressFiles.length} file thành 1 tiến trình
                  </button>
                </div>
              )}

              {mergeStats && (
                <div className="p-3 bg-green-950/20 border border-green-800/40 rounded-lg text-xs text-green-300 flex items-center justify-between">
                  <span>✅ Đã gộp: <b>{mergeStats.totalChunks} đoạn</b>, ~{mergeStats.totalCharacters} nhân vật</span>
                  <button onClick={() => setMergeStats(null)} className="text-gray-500 hover:text-gray-300 text-[10px]">✕</button>
                </div>
              )}

              {importedProgressName && (
                <div className="p-3 bg-green-950/20 border border-green-800/40 rounded-lg text-xs text-green-300 flex items-center justify-between">
                  <span>Dữ liệu cũ: <b>{chunkResults.length} đoạn</b> ({importedProgressName})</span>
                  <button onClick={() => {
                    chunkResultsRef.current = [];
                    setChunkResults([]);
                    setImportedProgressName(null);
                    clearParseCache();
                  }} className="text-red-400 hover:text-red-300">Hủy</button>
                </div>
              )}

              <div className="space-y-3">
                <label className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer ${fileContent ? 'border-amber-700/50 bg-amber-950/20' : 'border-neutral-700 hover:border-amber-700/40'}`}>
                  <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                  {fileContent ? (
                    <div className="text-center">
                      <CheckCircle2 className="w-8 h-8 text-amber-400 mx-auto" />
                      <p className="text-sm font-bold text-amber-300">{fileName}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Đã sẵn sàng phân tích {Math.ceil(fileContent.length / CHUNK_SIZE)} đoạn.</p>
                      <p className="text-[9px] text-gray-600 mt-1">Dung lượng: {formatFileSize(fileSize)}</p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <FileText className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                      <p className="text-sm">Bấm để chọn file .txt</p>
                      <p className="text-[10px]">Tải file truyện (VD: Chương 101-200.txt)</p>
                    </div>
                  )}
                </label>

                {fileContent && chunkResults.length > 0 && (
                  <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-lg space-y-2">
                    <p className="text-[10px] text-gray-400">
                      Đang có <b className="text-green-400">{chunkResults.length} đoạn</b> đã phân tích trước đó.
                    </p>
                    <label className="flex items-start gap-2 text-[11px] text-gray-200 cursor-pointer p-2 rounded-lg hover:bg-neutral-900/60">
                      <input type="radio" name="fullFileMode" checked={isFullFile} onChange={() => setIsFullFile(true)} className="mt-0.5 accent-amber-600" />
                      <span>
                        <b>Toàn bộ truyện</b> — app sẽ tự động{' '}
                        <b className="text-amber-300">bỏ qua {skippableChunkCount} đoạn đầu</b> đã xử lý và chỉ chạy tiếp phần còn lại.
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-[11px] text-gray-200 cursor-pointer p-2 rounded-lg hover:bg-neutral-900/60">
                      <input type="radio" name="fullFileMode" checked={!isFullFile} onChange={() => setIsFullFile(false)} className="mt-0.5 accent-amber-600" />
                      <span>
                        <b>Chỉ phần mới</b> — app sẽ chạy toàn bộ file này và cộng dồn vào {chunkResults.length} đoạn cũ.
                      </span>
                    </label>
                  </div>
                )}

                {(fileContent || importedProgressName) && (
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Tên tác phẩm</label>
                    <input type="text" value={workName} onChange={e => setWorkName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP: CONFIRM ── */}
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
                    <p className="text-[9px] text-gray-600">{formatFileSize(fileSize)}</p>
                  </div>
                  <div className="bg-neutral-950/60 p-3 rounded-lg">
                    <p className="text-[10px] text-gray-500">Số đoạn đã lưu an toàn</p>
                    <p className="text-green-400 font-bold">{chunkResults.length} đoạn</p>
                  </div>
                </div>

                {fileContent && (
                  <div className="bg-neutral-950/60 p-3 rounded-lg text-[10px] text-gray-400 leading-relaxed">
                    ⏱️ Ước tính thời gian chạy: khoảng{' '}
                    <b className="text-amber-300">
                      {Math.ceil((Math.max(0, Math.ceil(fileContent.length / CHUNK_SIZE) - (isFullFile ? skippableChunkCount : 0)) * getSafeGapMs(state.apiKeys.find((k: any) => k.isActive)?.provider)) / 60000)} phút
                    </b>
                    {chunkResults.length > 0 && (
                      <span className="block text-amber-400/60 mt-1">
                        ⚡ Đã có {chunkResults.length} đoạn, sẽ bỏ qua {isFullFile ? skippableChunkCount : 0} đoạn đầu
                      </span>
                    )}
                    <span className="block text-gray-500 mt-1 text-[9px]">
                      📊 Giới hạn: {MAX_PLOT_POINTS} plot points, {MAX_EVENTS_PER_CHAR} events/nhân vật, {MAX_STORY_EVENTS} story events
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP: PROCESSING ── */}
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
            </div>
          )}

          {/* ── STEP: PREVIEW ── */}
          {step === 'preview' && result && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-1" />
                <h4 className="text-amber-300 font-bold text-sm">Tổng hợp thành công!</h4>
                <p className="text-[10px] text-gray-500 mt-1">
                  Đã gộp {chunkResults.length} đoạn phân tích. Chọn phần cần đưa vào dự án:
                </p>
                <p className="text-[9px] text-gray-600">
                  👤 {result.characters?.length || 0} nhân vật · 🌍 {result.worldEntities?.length || 0} thế lực · 📅 {result.storyTimeline?.length || 0} sự kiện
                </p>
              </div>

              {/* ── Nhân vật ── */}
              {result.characters?.length > 0 && (
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-200">
                      Nhân vật ({result.characters.length})
                      <span className="ml-2 text-[10px] text-amber-400">
                        ✅ {result.characters.filter(c => c.importance === 'cao').length} chính, 
                        {result.characters.filter(c => c.importance === 'thấp' || !c.importance).length} phụ
                      </span>
                    </p>
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
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {result.characters.map((c, i) => {
                      const eventCount = result.characterTimelines?.[c.name.trim().toLowerCase()]?.length || 0;
                      const firstOrder = result.computedFirstAppearance?.characters[c.name.trim().toLowerCase()];
                      return (
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
                              {c.name}
                              <span className="text-gray-500 font-normal">· {c.role}</span>
                              {c.importance === 'cao' && (
                                <span className="ml-1.5 text-[9px] text-red-400 bg-red-950/30 px-1.5 py-0.5 rounded">Chính</span>
                              )}
                              {firstOrder !== undefined && (
                                <span className="ml-1.5 text-[9px] text-cyan-400 bg-cyan-950/30 px-1.5 py-0.5 rounded">
                                  #{firstOrder}
                                </span>
                              )}
                              {eventCount > 0 && (
                                <span className="ml-1.5 text-[9px] text-blue-400 bg-blue-950/30 px-1.5 py-0.5 rounded">
                                  {Math.min(eventCount, MAX_EVENTS_PER_CHAR)} mốc
                                  {eventCount > MAX_EVENTS_PER_CHAR && `+${eventCount - MAX_EVENTS_PER_CHAR}`}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">{c.personality || c.appearance || 'Chưa có mô tả'}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Thế lực ── */}
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
                    {result.worldEntities.map((w, i) => {
                      const firstOrder = result.computedFirstAppearance?.worldEntities[w.name.trim().toLowerCase()];
                      return (
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
                              {firstOrder !== undefined && (
                                <span className="ml-1.5 text-[9px] text-cyan-400">#{firstOrder}</span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">{w.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Checkboxes ── */}
              <div className="flex gap-4 px-1 flex-wrap">
                <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={importContext} onChange={e => setImportContext(e.target.checked)} className="accent-amber-600" />
                  Nhập bối cảnh & thể loại
                </label>
                <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={importLore} onChange={e => setImportLore(e.target.checked)} className="accent-amber-600" />
                  Nhập lore vào Quy Tắc
                </label>
                <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={importTimeline} onChange={e => setImportTimeline(e.target.checked)} className="accent-amber-600" />
                  Nhập timeline sự kiện ({result.characterTimelines ? Object.values(result.characterTimelines).reduce((a, b) => a + b.length, 0) : 0} mốc)
                </label>
                <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={importStoryEvents} onChange={e => setImportStoryEvents(e.target.checked)} className="accent-amber-600" />
                  Nhập sự kiện cốt truyện ({result.storyTimeline?.length || 0} sự kiện)
                </label>
              </div>

              {/* ── Narrative Voice ── */}
              {importContext && result.narrativeVoice && (
                <div className="bg-violet-950/20 border border-violet-800/30 rounded-xl p-3">
                  <p className="text-xs font-bold text-violet-300 mb-1">🎙️ Ngôi kể & giọng kể gốc (tự động phát hiện)</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">{result.narrativeVoice}</p>
                </div>
              )}

              {/* ── Cảnh báo dung lượng ── */}
              {fileContent && fileContent.length > 0 && (
                <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-3">
                  <p className="text-[10px] text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    ✅ Dữ liệu gốc sẽ được lưu ({formatFileSize(new Blob([fileContent]).size)}) để dùng cho "Viết lại" và "Nhảy cảnh"
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
                {fileContent && ' Dữ liệu gốc đã được lưu để dùng "Viết lại" và "Nhảy cảnh".'}
              </p>
              <button onClick={onClose} className="mt-2 px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-200 rounded-xl text-xs font-bold">
                Đóng
              </button>
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        {step !== 'done' && (
          <div className="px-5 py-4 border-t border-neutral-800 shrink-0 flex gap-2 justify-end">
            {step === 'input' && (
              <button onClick={() => setStep('confirm')} disabled={!fileContent && !importedProgressName}
                className="px-5 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold">
                Tiếp theo →
              </button>
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