import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles, PenTool, Plus, Trash2, Undo, Loader2,
  AlertCircle, FileText, AlignLeft, Info,
  MessageSquare, Send, Bot, User, RotateCcw, ChevronDown, BookOpen, Clock,
  ChevronUp, Download
} from 'lucide-react';
import { buildHardRulesPrompt } from './Page4Rules';
import { NovelState, Chapter, Character, filterByCurrentPoint } from '../types';
import { callApi } from '../utils/api';

interface Page5ComposeProps {
  state: NovelState;
  updateState: (updater: (prev: NovelState) => void) => void;
  onNavigate: (tabId: string) => void;
}

const PRESET_PROMPTS = [
  { label: '🔞 Mây Mưa', text: 'Hãy viết một đoạn mây mưa sắc khí cực kỳ nồng cháy, chi tiết, tả dung nhan mỹ nhân ghen ghét hay mê man, sử dụng từ ngữ thô tục gợi tình tự nhiên.' },
  { label: '🔥 Tu Luyện', text: 'Mô tả quá trình đột phá tu vi đầy kịch tính, hấp thu linh khí, rèn luyện gân cốt và trải qua thiên lôi tẩy tủy vô cùng gian nan.' },
  { label: '💔 Ghen Tuông', text: 'Viết một cuộc đối thoại ghen tuông căng thẳng giữa các nữ chính, hoặc một bối cảnh NTR tâm lý đầy u uất và kích thích.' },
  { label: '😈 Harem', text: 'Viết cảnh các mỹ nhân trong hậu cung tranh giành sự chú ý của nam chính, những lời khêu gợi và ám muội đầy dâm mỹ.' },
  { label: '🌌 Kỳ Ngộ', text: 'Nhân vật chính vô tình rơi vào một mật cảnh cổ xưa nguy hiểm, phát hiện tàn hồn đại năng truyền thừa võ công tuyệt học.' },
  { label: '🐉 Chiến Đấu', text: 'Mô tả trận chiến khéo léo với yêu thú thượng cổ, chiêu thức bùng nổ, đấu trí và đấu lực hoành tráng.' },
];

const WORD_RANGE_OPTIONS = [
  { value: 800, label: '800–1200', desc: 'Cảnh ngắn', range: [800, 1200] as [number, number] },
  { value: 1500, label: '1500–2000', desc: 'Cân bằng', range: [1500, 2000] as [number, number] },
  { value: 2500, label: '2500–3500', desc: 'Cảnh dài', range: [2500, 3500] as [number, number] },
  { value: 4000, label: '4000–5000', desc: 'Chương đủ', range: [4000, 5000] as [number, number] },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const QUICK_ANALYSIS = [
  { icon: '📋', label: 'Tóm tắt', prompt: 'Hãy tóm tắt ngắn gọn nội dung chương đang mở (khoảng 100-150 từ), nêu bật các sự kiện chính, cảm xúc và điểm nhấn quan trọng.' },
  { icon: '🔍', label: 'Kiểm tra', prompt: 'Kiểm tra toàn bộ nội dung đã viết: nhân vật có hành động trái tính cách không? Có lỗi logic hay mâu thuẫn nào giữa các chương không? Liệt kê cụ thể.' },
  { icon: '🎭', label: 'Nhân vật', prompt: 'Phân tích sâu các nhân vật đã xuất hiện: chiều sâu tâm lý, sự phát triển qua các chương, điểm mạnh/yếu trong cách xây dựng nhân vật.' },
  { icon: '📈', label: 'Hướng đi', prompt: 'Dựa trên nội dung đã có, gợi ý 3-5 hướng phát triển cốt truyện thú vị và bất ngờ cho các chương tiếp theo. Giải thích tại sao mỗi hướng phù hợp.' },
  { icon: '✍️', label: 'Văn phong', prompt: 'Đánh giá văn phong của truyện: điểm mạnh, điểm cần cải thiện, tính nhất quán của giọng văn, chất lượng đối thoại và mô tả cảnh. Cho điểm từng tiêu chí.' },
  { icon: '⚠️', label: 'Lỗ hổng', prompt: 'Tìm các lỗ hổng logic, plot hole, điểm chưa giải thích, hoặc foreshadowing bị bỏ quên trong toàn bộ câu chuyện đã viết.' },
  { icon: '💡', label: 'Ý tưởng', prompt: 'Gợi ý 5-7 chi tiết nhỏ thú vị (vật phẩm, phong tục, cảnh quan, phản ứng nhân vật phụ...) có thể thêm vào để làm phong phú thế giới truyện.' },
  { icon: '❤️', label: 'Romance', prompt: 'Phân tích chemistry và tiến triển tình cảm giữa các cặp nhân vật: có tự nhiên không, nhịp độ có hợp lý không, điểm nào cần thêm tension?' },
];

const WRITE_MODES = [
  { v: 'continue' as const, label: 'Tiếp tục' },
  { v: 'rewrite' as const, label: 'Viết lại' },
  { v: 'scene' as const, label: 'Nhảy cảnh' },
  { v: 'reborn' as const, label: 'Trọng sinh' },
];

// ─── CONSTANTS - GIỚI HẠN CONTEXT ──────────────────────────────────────────
const MAX_PREV_CHAPTERS = 1;
const MAX_TAIL_LENGTH = 800;
const MAX_STORY_EVENTS = 10;
const MAX_LORE_ENTRIES = 5;
const MAX_REFERENCE_LENGTH = 500;
const MAX_CHAT_CONTEXT = 2000;

function splitIntoScenes(text: string): { label: string; content: string }[] {
  if (!text || text.trim().length < 50) return [];
  const scenes: { label: string; content: string }[] = [];
  
  const chapterMatches = [...text.matchAll(/(?:Chương|Chapter)\s+(\d+)[：:.\s]+([^\n]*)/gi)];
  if (chapterMatches.length > 1) {
    return chapterMatches.map((m, i) => {
      const start = m.index!;
      const end = i < chapterMatches.length - 1 ? chapterMatches[i + 1].index! : text.length;
      const chapterNum = m[1] || (i + 1);
      const title = m[2]?.trim() || `Chương ${chapterNum}`;
      return { label: `Chương ${chapterNum}: ${title}`, content: text.slice(start, end).trim() };
    });
  }
  
  const separators = text.match(/\n\s*[\*\-]{3,}\s*\n/g);
  if (separators && separators.length > 0) {
    const parts = text.split(/\n\s*[\*\-]{3,}\s*\n/);
    parts.forEach((part, i) => { if (part.trim()) scenes.push({ label: `Đoạn ${i + 1}`, content: part.trim() }); });
    return scenes;
  }
  
  const CHUNK_SIZE = 3000;
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    if (chunk.trim()) scenes.push({ label: `Đoạn ${scenes.length + 1}`, content: chunk.trim() });
  }
  return scenes;
}

function getAppearedCharacters(chapters: Chapter[], allCharacters: Character[]): string[] {
  const appeared = new Set<string>();
  chapters.forEach(ch => {
    const content = ch.content || '';
    allCharacters.forEach(c => {
      if (content.includes(c.name)) appeared.add(c.name);
    });
  });
  return Array.from(appeared);
}

function getWordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── RÚT GỌN: buildSystemInstruction ──────────────────────────────────────
export function buildSystemInstruction(state: NovelState): string {
  const { config, characters, worldEntities, rules } = state;
  const currentOrder = config.currentStoryPoint?.order;

  const visibleCharacters = filterByCurrentPoint(characters, currentOrder);
  const visibleWorldEntities = filterByCurrentPoint(worldEntities, currentOrder);
  const visibleCharIds = new Set(visibleCharacters.map(c => c.id));

  const charSummary = visibleCharacters.slice(0, 50).map(c => {
    const rels = (c.relationships || [])
      .filter(r => visibleCharIds.has(r.targetCharacterId))
      .map(r => {
        const target = characters.find(t => t.id === r.targetCharacterId);
        return target ? `${r.relationType}:${target.name}` : '';
      }).filter(Boolean).join('; ');
    
    const personality = c.personality?.slice(0, 60) || '';
    const appearance = c.appearance?.slice(0, 60) || '';
    return `${c.name}(${c.role},${c.gender}): ${personality}${appearance ? `, ${appearance}` : ''}${rels ? `, qh:${rels}` : ''}`;
  }).join('\n');

  const storyEvents = (state.storyEvents || [])
    .filter(e => currentOrder === undefined || e.order <= currentOrder)
    .sort((a, b) => a.order - b.order)
    .slice(-MAX_STORY_EVENTS)
    .map(e => `[${e.chapterLabel}] ${e.title}: ${e.content.slice(0, 80)}`)
    .join('\n');

  const loreSummary = (rules?.loreEntries ?? [])
    .slice(-MAX_LORE_ENTRIES)
    .map(e => `[${e.category}] ${e.title}: ${e.content.slice(0, 100)}`)
    .join('\n');

  const hardRulesBlock = rules?.hardRules
    ? Object.entries(rules.hardRules)
        .filter(([, v]) => v)
        .map(([k]) => `- CẤM ${k.replace(/([A-Z])/g, ' $1').trim()}`)
        .join('\n')
    : '';

  let refSection = '';
  if (config.referenceFileContent) {
    refSection = `\n[THAM KHẢO]\n${config.referenceFileContent.substring(0, MAX_REFERENCE_LENGTH)}...`;
  }
  if (config.originalNarrativeVoice) {
    refSection += `\n\n[GIỌNG KỂ GỐC]\n${config.originalNarrativeVoice.slice(0, 300)}`;
  }

  const existingCharNames = visibleCharacters.map(c => c.name).join(', ') || 'Chưa có';

  const behaviorConstraints = `
⛔ RÀNG BUỘC:
- CHỈ viết theo mệnh lệnh, KHÔNG tự thêm nhân vật/tình tiết
- KHÔNG kết thúc cảnh, KHÔNG nhảy thời gian
- KHÔNG nhắc nhân vật chưa xuất hiện: ${existingCharNames}
- Giữ đúng tính cách nhân vật
- Mô tả nhân vật/thế lực bên dưới là TÀI LIỆU THAM KHẢO, KHÔNG PHẢI cụm từ để chép lại nguyên văn. TUYỆT ĐỐI không lặp lại đúng nguyên cụm mô tả (ví dụ "mỹ nhân bác sĩ") nhiều lần trong bài viết — mỗi lần nhắc tới ngoại hình/thân phận nhân vật, hãy diễn đạt lại bằng câu chữ khác, góc nhìn khác, hoặc lồng ghép tự nhiên vào hành động/đối thoại thay vì lặp thành nhãn dán cố định.`;

  const timelineNotice = currentOrder !== undefined
    ? `\n[MỐC HIỆN TẠI]: ${config.currentStoryPoint?.label || `#${currentOrder}`}\nCHỈ dùng thông tin ĐẾN mốc này.`
    : '';

  return `Truyện: ${config.title || 'Chưa đặt tên'} - ${config.genres.join(', ')}
Bối cảnh: ${config.context?.slice(0, 150) || 'Chưa mô tả'}
Văn phong: ${config.writingStyle || ''} ${config.customStyle || ''}
NSFW: ${config.nsfwEnabled ? 'BẬT' : 'TẮT'}${timelineNotice}

NHÂN VẬT:
${charSummary || 'Chưa có'}

THẾ LỰC:
${visibleWorldEntities.map(w => `${w.name}(${w.type}): ${w.description.slice(0, 60)}`).join('\n') || 'Chưa có'}

SỰ KIỆN GẦN ĐÂY:
${storyEvents || 'Chưa có'}

LORE:
${loreSummary || 'Chưa có'}

${behaviorConstraints}
${hardRulesBlock}
${refSection}`;
}

// ─── RÚT GỌN: buildWritePrompt ────────────────────────────────────────────
function buildWritePrompt(
  activeChapter: Chapter,
  allChapters: Chapter[],
  authorDirective: string,
  targetRange: [number, number],
  state: NovelState,
  writeMode: 'continue' | 'rewrite' | 'scene' | 'reborn' = 'continue',
  sourceSceneText: string = '',
  rebornCharacterName: string = ''
): string {
  const chIdx = allChapters.findIndex(c => c.id === activeChapter.id);

  const prevChapter = chIdx > 0 ? allChapters[chIdx - 1] : null;
  const prevTail = prevChapter?.content?.slice(-MAX_TAIL_LENGTH) || '';

  const currentTail = activeChapter.content.trim().slice(-MAX_TAIL_LENGTH);

  const appeared = getAppearedCharacters(
    allChapters.slice(0, chIdx + 1),
    state.characters
  );
  const notAppeared = state.characters
    .filter(c => !appeared.includes(c.name))
    .map(c => c.name);

  const [minW, maxW] = targetRange;
  let prompt = '';

  if (writeMode === 'scene' && sourceSceneText.trim()) {
    prompt += `CẢNH GỐC:\n${sourceSceneText.trim().slice(0, 1500)}\n\nViết TIẾP từ đây, nội dung MỚI.\n\n`;
  } else if (writeMode === 'rewrite' && sourceSceneText.trim()) {
    prompt += `VIẾT LẠI:\n${sourceSceneText.trim().slice(0, 1500)}\n\n`;
  } else if (writeMode === 'reborn' && sourceSceneText.trim()) {
    prompt += `TRỌNG SINH: ${rebornCharacterName || 'NV'} biết trước:\n${sourceSceneText.trim().slice(0, 2000)}\n\n`;
  }

  if (prevTail) {
    prompt += `[CHƯƠNG TRƯỚC - KẾT]\n${prevTail}\n\n`;
  }

  if (currentTail) {
    prompt += `[ĐANG VIẾT - TIẾP NGAY SAU]\n${currentTail}\n\n`;
  }

  if (activeChapter.outline.trim()) {
    prompt += `[DÀN Ý]\n${activeChapter.outline.trim()}\n\n`;
  }

  prompt += `[NHÂN VẬT]\nĐã xuất hiện: ${appeared.join(', ') || 'Chưa có'}\n`;
  if (notAppeared.length) {
    prompt += `🚨 CẤM nhắc: ${notAppeared.join(', ')}\n`;
  }
  prompt += '\n';

  prompt += `[MỆNH LỆNH]\n${authorDirective.trim() || 'Tiếp tục tự nhiên.'}\n\n`;
  prompt += `[YÊU CẦU]\nĐộ dài: ${minW}-${maxW} chữ. Văn xuôi thuần túy.`;

  return prompt;
}

// ─── COMPONENT CHÍNH ──────────────────────────────────────────────────────────
export default function Page5Compose({ state, updateState, onNavigate }: Page5ComposeProps) {
  const { chapters, currentChapterId, apiKeys } = state;
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [previousContent, setPreviousContent] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<number>(1500);

  const [writeMode, setWriteMode] = useState<'continue' | 'rewrite' | 'scene' | 'reborn'>('continue');
  const [sourceSceneText, setSourceSceneText] = useState('');
  const [rebornCharacterId, setRebornCharacterId] = useState('');
  const [sceneSearch, setSceneSearch] = useState('');
  const scenes = useMemo(
    () => splitIntoScenes(state.config.referenceFileContent || ''),
    [state.config.referenceFileContent]
  );
  const filteredScenes = scenes.filter(s =>
    !sceneSearch || s.label.toLowerCase().includes(sceneSearch.toLowerCase())
  );

  const [rightTab, setRightTab] = useState<'write' | 'chat'>('write');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatScope, setChatScope] = useState<'current' | 'all'>('all');
  const [savedToLore, setSavedToLore] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── EXPORT: Tải text truyện ──────────────────────────────────────────────
  const handleExportText = () => {
    if (!state.chapters || state.chapters.length === 0) {
      alert('Chưa có chương nào để xuất!');
      return;
    }
    const textContent = state.chapters
      .map((ch, i) => {
        const title = ch.title || `Chương ${i + 1}`;
        const content = ch.content || '(Chương trống)';
        return `─────────────────────────────────\n${title}\n─────────────────────────────────\n\n${content}\n\n`;
      })
      .join('');

    const fullText = `Tên truyện: ${state.config.title || 'Chưa đặt tên'}\n` +
      `Tổng số chương: ${state.chapters.length}\n` +
      `Ngày xuất: ${new Date().toLocaleString('vi-VN')}\n` +
      `${'═'.repeat(50)}\n\n` +
      textContent;

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.config.title || 'truyen'}_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── EXPORT: Tải JSON dự án ──────────────────────────────────────────────
  const handleExportProject = () => {
    const exportData = JSON.parse(JSON.stringify(state));
    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_${state.config.title || 'Untitled'}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const saved = state.rules?.minWords;
    if (saved) {
      const match = WORD_RANGE_OPTIONS.find(o => o.value === saved);
      if (match) setSelectedRange(match.value);
    }
  }, []);

  useEffect(() => {
    if (chapters.length > 0 && !currentChapterId) {
      updateState((prev) => { prev.currentChapterId = prev.chapters[0].id; });
    }
  }, [chapters, currentChapterId, updateState]);

  const activeChapter = chapters.find((c) => c.id === currentChapterId) || chapters[0] || null;
  const activeKey = apiKeys.find(k => k.isActive && !k.quotaExceeded) || null;

  const currentWords = activeChapter ? getWordCount(activeChapter.content) : 0;
  const selectedOption = WORD_RANGE_OPTIONS.find(o => o.value === selectedRange) || WORD_RANGE_OPTIONS[1];

  const handleAddChapter = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    updateState((prev) => {
      prev.chapters.push({ id: newId, title: `Chương ${prev.chapters.length + 1}: Tiêu đề mới`, content: '', prompt: '', outline: '' });
      prev.currentChapterId = newId;
    });
    setPreviousContent(null);
  };

  const handleDeleteChapter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chapters.length <= 1) { alert('Không thể xóa chương cuối cùng!'); return; }
    if (!confirm('Xóa chương này? Nội dung sẽ mất.')) return;
    updateState((prev) => {
      prev.chapters = prev.chapters.filter(c => c.id !== id);
      if (prev.currentChapterId === id) prev.currentChapterId = prev.chapters[0].id;
    });
    setPreviousContent(null);
  };

  // ─── SỬA 1: handleUpdateField ─────────────────────────────────────────────
  const handleUpdateField = (field: keyof Omit<Chapter, 'id'>, value: string) => {
    if (!activeChapter) return;
    // 👈 CHUẨN HÓA UNICODE NGAY KHI NHẬP
    const normalized = value.normalize('NFC');
    updateState((prev) => {
      const ch = prev.chapters.find(c => c.id === activeChapter.id);
      if (ch) ch[field] = normalized;
    });
  };

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta || !activeChapter) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const newText = ta.value.substring(0, s) + text + ta.value.substring(e);
    handleUpdateField('content', newText);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + text.length, s + text.length); }, 50);
  };

  const handleUndo = () => {
    if (previousContent !== null && activeChapter) {
      handleUpdateField('content', previousContent);
      setPreviousContent(null);
    }
  };

  const handleRangeChange = (value: number) => {
    setSelectedRange(value);
    updateState((prev) => { prev.rules.minWords = value; });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ─── RÚT GỌN: buildChatContext ────────────────────────────────────────────
  const buildChatContext = useCallback((scope: 'current' | 'all' = 'all'): string => {
    const { config, characters, worldEntities, rules, chapters, storyEvents } = state;
    
    const charSummary = characters.slice(0, 30).map(c => {
      const imgDescs = (c.images || []).filter((img: any) => img.description?.trim())
        .map((img: any) => img.description).join('; ');
      return `${c.name}(${c.role},${c.gender}): ${c.personality?.slice(0, 60)}${imgDescs ? `. ${imgDescs.slice(0, 80)}` : ''}`;
    }).join(' | ');

    const worldSummary = worldEntities.map(w => `${w.name}(${w.type}): ${w.description.slice(0, 50)}`).join(' | ');
    const loreSummary = (rules.loreEntries || []).slice(-5).map((e: any) => `[${e.category}] ${e.title}: ${e.content.slice(0, 80)}`).join(' | ');
    
    const storyEventsSummary = (storyEvents || [])
      .slice(-20)
      .map(e => `[${e.chapterLabel}] ${e.title}: ${e.content.slice(0, 60)}`)
      .join(' | ');

    let chaptersSummary = '';
    if (scope === 'current' && activeChapter) {
      const words = getWordCount(activeChapter.content || '');
      const content = activeChapter.content?.slice(-MAX_TAIL_LENGTH) || '(trống)';
      chaptersSummary = `[CHƯƠNG: ${activeChapter.title}] (${words} từ)\n${content}`;
    } else {
      const recentChapters = chapters.slice(-5);
      chaptersSummary = recentChapters.map((ch, i) => {
        const words = getWordCount(ch.content || '');
        const content = ch.content?.slice(-MAX_TAIL_LENGTH) || '(trống)';
        return `[Chương ${i + 1}: ${ch.title}] (${words} từ)\n${content}`;
      }).join('\n\n---\n\n');
    }

    return `TRUYỆN: ${config.title || 'Chưa đặt tên'}
THỂ LOẠI: ${config.genres.join(', ')}
BỐI CẢNH: ${config.context?.slice(0, 150) || 'Chưa mô tả'}

NHÂN VẬT: ${charSummary || 'Chưa có'}
THẾ LỰC: ${worldSummary || 'Chưa có'}
${loreSummary ? `LORE: ${loreSummary}` : ''}
${storyEventsSummary ? `SỰ KIỆN: ${storyEventsSummary}` : ''}

${chaptersSummary}`;
  }, [state, activeChapter]);

  // ─── CHAT: Gửi tin nhắn ──────────────────────────────────────────────────
  const handleSendChat = async (customPrompt?: string) => {
    const input = (customPrompt || chatInput).trim();
    if (!input || chatLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const activeKey = state.apiKeys.find(k => k.isActive && !k.quotaExceeded) || null;
      const context = buildChatContext(chatScope);

      const systemPrompt = `Bạn là trợ lý sáng tác chuyên nghiệp. Dựa trên dữ liệu truyện sau:

${context.slice(0, MAX_CHAT_CONTEXT)}

Trả lời câu hỏi của tác giả: phân tích sâu, gợi ý thực tế, ngắn gọn. KHÔNG viết văn xuôi truyện.`;

      const recentHistory = chatMessages.slice(-4).map(m =>
        `${m.role === 'user' ? 'Tác giả' : 'AI'}: ${m.content}`
      ).join('\n');

      const fullPrompt = recentHistory
        ? `[Lịch sử]\n${recentHistory}\n\n[Câu hỏi mới]: ${input}`
        : input;

      const body: Record<string, any> = {
        prompt: fullPrompt,
        systemInstruction: systemPrompt,
        provider: activeKey?.provider || 'gemini',
      };
      if (activeKey) {
        body.customApiKey = activeKey.key;
        if (activeKey.customModel) body.customModel = activeKey.customModel;
        if (['openai','claude','grok','antigravity'].includes(activeKey.provider)) {
          body.customEndpoint = 'https://ag.beijixingxing.com/v1/chat/completions';
        }
        if (activeKey.provider === 'catiecli') {
          body.customEndpoint = 'https://catiecli.sukaka.top/v1/chat/completions';
        }
      }

      const data = await callApi('generate', body);

      const aiMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: (data.text || '').trim() || 'AI không trả về phản hồi.',
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: `⚠️ Lỗi: ${err.message || 'Không xác định'}`,
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSaveToLore = (msgId: string, content: string) => {
    updateState((prev) => {
      if (!prev.rules.loreEntries) prev.rules.loreEntries = [];
      prev.rules.loreEntries.push({
        id: Math.random().toString(36).substr(2, 9),
        category: '📝 Ghi chú tác giả',
        title: `Phân tích AI — ${new Date().toLocaleDateString('vi-VN')}`,
        content: content.substring(0, 3000),
      });
    });
    setSavedToLore(prev => new Set([...prev, msgId]));
  };

  const handleInsertToOutline = (content: string) => {
    if (!activeChapter) return;
    updateState((prev) => {
      const ch = prev.chapters.find(c => c.id === activeChapter.id);
      if (ch) {
        ch.outline = ch.outline
          ? ch.outline + '\n\n[Ghi chú AI]:\n' + content.substring(0, 500)
          : '[Ghi chú AI]:\n' + content.substring(0, 500);
      }
    });
  };

  // ─── AI VIẾT ──────────────────────────────────────────────────────────────
  const handleAIGenerateNext = async () => {
    if (aiLoading || !activeChapter) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const systemInstruction = buildSystemInstruction(state);
      const finalPrompt = buildWritePrompt(
        activeChapter,
        chapters,
        activeChapter.prompt.trim(),
        selectedOption.range,
        state,
        writeMode,
        sourceSceneText,
        state.characters.find(c => c.id === rebornCharacterId)?.name || ''
      );

      const body: Record<string, any> = {
        prompt: finalPrompt,
        systemInstruction,
        provider: activeKey?.provider || 'gemini',
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

      const data = await callApi('generate', body);

      // ─── SỬA 2: normalize từ AI ────────────────────────────────────────────
      const textGenerated = (data.text || '').trim().normalize('NFC');
      if (!textGenerated) throw new Error('AI trả về nội dung trống rỗng.');

      if (activeChapter.content.trim()) {
        const oldTail = activeChapter.content.slice(-300).trim();
        if (textGenerated.includes(oldTail.substring(0, 100))) {
          setAiError('⚠️ AI có thể đang lặp nội dung. Kiểm tra kết quả và thử lại với mệnh lệnh cụ thể hơn.');
        }
      }

      setPreviousContent(activeChapter.content);
      const appended = (activeChapter.content ? activeChapter.content + '\n\n' : '') + textGenerated;
      handleUpdateField('content', appended);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
      }, 100);

    } catch (err: any) {
      setAiError(err.message || 'Lỗi không xác định.');
    } finally {
      setAiLoading(false);
    }
  };

  const currentStoryPoint = state.config.currentStoryPoint;

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-140px)]" id="compose-workspace">

      {/* ─── SIDEBAR CHƯƠNG ─── */}
      <aside className="w-full lg:w-48 bg-neutral-950/40 border-b lg:border-b-0 lg:border-r border-neutral-900 flex flex-col shrink-0">
        <div className="p-3 border-b border-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlignLeft className="w-3.5 h-3.5 text-red-500" />
            <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider font-mono">Mục Lục</h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleExportText} className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-neutral-800 rounded-lg transition-colors" title="Tải text truyện">
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleExportProject} className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-neutral-800 rounded-lg transition-colors" title="Tải JSON dự án">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleAddChapter} className="p-1.5 bg-red-950/50 border border-red-800/40 hover:border-red-500/60 rounded-lg text-red-400 hover:text-red-200 transition-colors flex items-center gap-0.5 text-[10px] font-bold">
              <Plus className="w-3 h-3" /> Thêm
            </button>
          </div>
        </div>

        {currentStoryPoint && (
          <div className="px-3 py-1.5 border-b border-neutral-900 bg-cyan-950/10 flex items-center gap-1.5">
            <Clock className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
            <p className="text-[8px] text-cyan-300 leading-relaxed">Mốc: <strong>{currentStoryPoint.label || `#${currentStoryPoint.order}`}</strong></p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto max-h-[200px] lg:max-h-[50vh] p-1.5 space-y-0.5">
          {chapters.map((ch, i) => {
            const isSelected = activeChapter?.id === ch.id;
            const words = getWordCount(ch.content);
            return (
              <div key={ch.id} className={`flex items-center justify-between p-2 rounded-lg transition-all border ${isSelected ? 'bg-red-950/20 border-red-900/60 text-red-300' : 'bg-transparent border-transparent hover:bg-neutral-900/40 text-gray-400 hover:text-gray-200'}`}>
                <div className="min-w-0 flex-1 pr-1 cursor-pointer" onClick={() => { updateState(prev => { prev.currentChapterId = ch.id; }); setPreviousContent(null); }}>
                  <div className="flex items-center gap-1 truncate">
                    <span className="text-[8px] font-mono text-gray-600">#{i + 1}</span>
                    <h4 className="text-[10px] font-semibold truncate">{ch.title || 'Chưa đặt tên'}</h4>
                  </div>
                  <p className="text-[8px] font-mono text-gray-500">{words.toLocaleString()} từ</p>
                </div>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteChapter(ch.id, e); }} className="p-1 text-neutral-700 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-all shrink-0">
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ─── WORKSPACE ─── */}
      {!activeChapter ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
          <PenTool className="w-12 h-12 text-gray-700 mb-4 animate-pulse" />
          <h3 className="text-sm font-bold text-gray-400">Không có chương truyện nào</h3>
          <button onClick={handleAddChapter} className="mt-4 px-5 py-2 bg-red-800 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
            <Plus className="w-4 h-4" /> Khởi tạo chương mới
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-neutral-900">

          {/* ─── CỘT TRÁI: SOẠN THẢO ─── */}
          <section className="flex-[2] p-4 flex flex-col space-y-3 min-h-[500px]">
            <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block mb-0.5">Tiêu đề chương</span>
                <input type="text" value={activeChapter.title} onChange={e => handleUpdateField('title', e.target.value)} className="w-full bg-transparent text-base font-bold text-gray-100 focus:outline-none focus:border-b focus:border-red-500 pb-0.5" spellCheck={false} />
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <span className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${currentWords < selectedOption.range[0] ? 'text-amber-500 border-amber-900/40 bg-amber-950/20' : 'text-green-400 border-green-900/40 bg-green-950/20'}`}>
                  {currentWords.toLocaleString()} từ
                </span>
                {previousContent !== null && (
                  <button onClick={handleUndo} className="px-2.5 py-1 border border-amber-900/50 bg-amber-950/20 hover:bg-amber-950/50 text-amber-300 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1">
                    <Undo className="w-3 h-3" /> Hoàn tác
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col relative min-h-[400px]">
              <textarea 
                ref={textareaRef} 
                value={activeChapter.content} 
                onChange={e => handleUpdateField('content', e.target.value)} 
                placeholder="Nội dung chương truyện đang viết..." 
                className="w-full flex-1 bg-neutral-950 border border-neutral-850 focus:border-red-900/80 rounded-2xl p-5 text-[16px] leading-relaxed text-gray-200 focus:outline-none resize-none overflow-y-auto" 
                spellCheck={false} 
                style={{ 
                  lineHeight: '1.9', 
                  minHeight: '450px',
                  fontSize: '16px',
                  padding: '20px',
                  backgroundColor: '#0a0a0a'
                }} 
              />
              {currentWords === 0 && (
                <div className="absolute inset-x-4 top-16 pointer-events-none text-center p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl max-w-md mx-auto">
                  <AlignLeft className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Chương này đang để trống.</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Nhập dàn ý & mệnh lệnh bên phải rồi bấm AI viết, hoặc tự viết tay vào đây.</p>
                </div>
              )}
            </div>
          </section>

          {/* ─── CỘT PHẢI: AI CONTROLS + CHAT ─── */}
          <section className="w-full lg:w-72 bg-neutral-950/20 flex flex-col shrink-0 max-h-[100vh]">
            <div className="flex border-b border-neutral-800 shrink-0">
              <button onClick={() => setRightTab('write')} className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${rightTab === 'write' ? 'text-amber-400 border-b-2 border-amber-500 bg-neutral-900/40' : 'text-gray-500 hover:text-gray-300'}`}>
                <PenTool className="w-3.5 h-3.5" /> Viết
              </button>
              <button onClick={() => setRightTab('chat')} className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${rightTab === 'chat' ? 'text-violet-400 border-b-2 border-violet-500 bg-neutral-900/40' : 'text-gray-500 hover:text-gray-300'}`}>
                <MessageSquare className="w-3.5 h-3.5" /> Chat
                {chatMessages.length > 0 && <span className="w-4 h-4 bg-violet-600 rounded-full text-[8px] text-white flex items-center justify-center font-mono">{chatMessages.filter(m => m.role === 'assistant').length}</span>}
              </button>
            </div>

            {rightTab === 'write' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
                <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-3 space-y-2">
                  <span className="text-[11px] font-bold text-gray-200">🎬 Chế Độ</span>
                  <div className="grid grid-cols-2 gap-1">
                    {WRITE_MODES.map(m => (
                      <button key={m.v} onClick={() => setWriteMode(m.v)} className={`px-2 py-1.5 rounded-lg text-[10px] border transition-all ${writeMode === m.v ? 'bg-violet-900/40 border-violet-600/60 text-violet-200' : 'bg-neutral-950/60 border-neutral-800 text-gray-500 hover:border-neutral-600'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {writeMode === 'reborn' && (
                    <div className="pt-1">
                      <label className="block text-[9px] text-gray-500 mb-1">Nhân vật trọng sinh</label>
                      <select value={rebornCharacterId} onChange={e => setRebornCharacterId(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-violet-600">
                        <option value="">-- Chọn --</option>
                        {state.characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  {writeMode !== 'continue' && scenes.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <input placeholder="Tìm cảnh..." value={sceneSearch} onChange={e => setSceneSearch(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-violet-600" />
                      <select onChange={e => { const idx = Number(e.target.value); if (writeMode === 'reborn') { const future = scenes.slice(idx).map(s => s.content).join('\n'); setSourceSceneText(future); } else { setSourceSceneText(scenes[idx]?.content || ''); } }} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-violet-600">
                        <option value="">-- Chọn cảnh --</option>
                        {filteredScenes.map((s) => { const realIdx = scenes.indexOf(s); return <option key={realIdx} value={realIdx}>{s.label}</option>; })}
                      </select>
                    </div>
                  )}
                  {writeMode !== 'continue' && scenes.length === 0 && (
                    <p className="text-[10px] text-amber-500 pt-1">⚠️ Chưa có dữ liệu gốc — vào Đồng Nhân để phân tích.</p>
                  )}
                </div>

                <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-200"><FileText className="w-3.5 h-3.5 text-amber-500" /> Dàn Ý</div>
                  <textarea rows={2} placeholder="Phác thảo nội dung chương..." value={activeChapter.outline} onChange={e => handleUpdateField('outline', e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[11px] text-gray-300 focus:outline-none focus:border-amber-600 leading-relaxed resize-none" spellCheck={false} />
                </div>

                <div className="bg-neutral-900 border border-red-950/40 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-300"><PenTool className="w-3.5 h-3.5 text-red-500" /> Mệnh Lệnh</div>
                  <p className="text-[9px] text-gray-500 leading-relaxed">AI viết theo mệnh lệnh này</p>
                  <textarea rows={3} placeholder="Yêu cầu viết gì..." value={activeChapter.prompt} onChange={e => handleUpdateField('prompt', e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[11px] text-gray-300 focus:outline-none focus:border-red-500 leading-relaxed resize-none" spellCheck={false} />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_PROMPTS.slice(0, 4).map(p => (
                      <button key={p.label} onClick={() => handleUpdateField('prompt', p.text)} className="px-1.5 py-0.5 bg-neutral-950 border border-neutral-800 hover:border-red-900/60 rounded text-[8px] text-gray-400 hover:text-red-300 truncate max-w-[80px]" title={p.text}>{p.label.slice(0, 15)}</button>
                    ))}
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-gray-200">📏 Độ dài</span><span className="text-[10px] font-mono text-violet-400 bg-violet-950/30 px-2 py-0.5 rounded">{selectedOption.label}</span></div>
                  <div className="grid grid-cols-2 gap-1">
                    {WORD_RANGE_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => handleRangeChange(opt.value)} className={`px-2 py-1.5 rounded-lg border text-left transition-all text-[10px] ${selectedRange === opt.value ? 'bg-violet-900/40 border-violet-600/60 text-violet-200' : 'bg-neutral-950/60 border-neutral-800 text-gray-500 hover:border-neutral-600 hover:text-gray-300'}`}>
                        <p className="font-bold">{opt.label}</p>
                        <p className="text-[8px] opacity-70">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[9px] border-b border-neutral-800 pb-1.5">
                    <span className="text-gray-500 font-mono">AI ENGINE</span>
                    <span className="text-gray-300 font-bold font-mono">{activeKey ? activeKey.provider.toUpperCase() : 'FREE'}</span>
                  </div>
                  <button onClick={handleAIGenerateNext} disabled={aiLoading} className="w-full py-2.5 bg-gradient-to-r from-red-800 to-amber-700 hover:from-red-700 hover:to-amber-600 disabled:from-neutral-800 disabled:to-neutral-800 border border-red-700/50 disabled:border-transparent text-white disabled:text-gray-500 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 disabled:shadow-none transition-all">
                    {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin text-amber-400" /><span>Đang viết...</span></> : <><Sparkles className="w-4 h-4 text-amber-400" /><span>🤖 VIẾT TIẾP</span></>}
                  </button>
                  {aiError && <div className="p-2 bg-red-950/40 border border-red-800/40 rounded-xl text-[10px] text-red-300 leading-relaxed flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" /><div><span className="font-bold">LỖI:</span> {aiError}</div></div>}
                </div>

                <div className="p-2 bg-red-950/10 border border-red-900/20 rounded-xl text-[8px] text-red-400/80 leading-relaxed flex gap-1.5">
                  <Info className="w-3 h-3 shrink-0" />
                  <div>AI tự động đồng bộ nhân vật, lore và ràng buộc cứng. {currentStoryPoint && 'Thông tin sau mốc hiện tại đã bị ẩn.'}</div>
                </div>
              </div>
            )}

            {rightTab === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-3 pt-2 pb-1.5 border-b border-neutral-800 shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider font-mono">Context</span>
                    <div className="flex gap-1">
                      <button onClick={() => setChatScope('all')} className={`px-1.5 py-0.5 rounded text-[8px] border transition-colors ${chatScope === 'all' ? 'bg-violet-900/40 border-violet-700/50 text-violet-300' : 'border-neutral-800 text-gray-600 hover:text-gray-400'}`}>Tất cả</button>
                      <button onClick={() => setChatScope('current')} className={`px-1.5 py-0.5 rounded text-[8px] border transition-colors ${chatScope === 'current' ? 'bg-violet-900/40 border-violet-700/50 text-violet-300' : 'border-neutral-800 text-gray-600 hover:text-gray-400'}`}>Hiện tại</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-0.5">
                    {QUICK_ANALYSIS.slice(0, 8).map(q => (
                      <button key={q.label} onClick={() => handleSendChat(q.prompt)} disabled={chatLoading} title={q.label} className="flex flex-col items-center gap-0 py-1 bg-neutral-950/60 hover:bg-violet-950/20 border border-neutral-800 hover:border-violet-800/40 rounded-lg transition-colors disabled:opacity-40">
                        <span className="text-sm leading-none">{q.icon}</span>
                        <span className="text-[7px] text-gray-600 group-hover:text-violet-400 text-center leading-tight px-0.5 line-clamp-1">{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                  {chatMessages.length === 0 ? (
                    <div className="py-6 text-center text-gray-600 text-[10px] leading-relaxed"><Bot className="w-6 h-6 mx-auto mb-1 text-gray-700" /><p className="font-medium text-gray-500">Trợ lý phân tích</p></div>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className={`flex gap-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-red-900/60' : 'bg-violet-900/60'}`}>
                          {msg.role === 'user' ? <User className="w-2 h-2 text-red-400" /> : <Bot className="w-2 h-2 text-violet-400" />}
                        </div>
                        <div className={`flex-1 rounded-xl px-2.5 py-1.5 text-[10px] leading-relaxed ${msg.role === 'user' ? 'bg-red-950/30 border border-red-900/30 text-gray-200 ml-auto max-w-[80%]' : 'bg-neutral-900 border border-neutral-800 text-gray-300'}`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[7px] opacity-30">{new Date(msg.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                            {msg.role === 'assistant' && (<>
                              <button onClick={() => handleSaveToLore(msg.id, msg.content)} disabled={savedToLore.has(msg.id)} className={`text-[7px] px-1 py-0.5 rounded border transition-colors ${savedToLore.has(msg.id) ? 'border-green-800/40 text-green-600' : 'border-neutral-700 text-gray-600 hover:border-indigo-700/50 hover:text-indigo-400'}`}>📚</button>
                              <button onClick={() => handleInsertToOutline(msg.content)} className="text-[7px] px-1 py-0.5 rounded border border-neutral-700 text-gray-600 hover:border-amber-700/50 hover:text-amber-400 transition-colors">📋</button>
                            </>)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="flex gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-violet-900/60 flex items-center justify-center shrink-0"><Bot className="w-2 h-2 text-violet-400" /></div>
                      <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2">
                        <div className="flex gap-1 items-center">
                          <span className="w-1 h-1 rounded-full bg-violet-500 animate-bounce" style={{animationDelay:'0ms'}} />
                          <span className="w-1 h-1 rounded-full bg-violet-500 animate-bounce" style={{animationDelay:'150ms'}} />
                          <span className="w-1 h-1 rounded-full bg-violet-500 animate-bounce" style={{animationDelay:'300ms'}} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-2 border-t border-neutral-800 shrink-0">
                  <div className="flex gap-1.5">
                    <textarea rows={1} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }} placeholder="Hỏi AI..." className="flex-1 bg-neutral-950 border border-neutral-700 focus:border-violet-600/60 rounded-xl px-2 py-1.5 text-[10px] text-gray-200 focus:outline-none resize-none leading-relaxed" spellCheck={false} disabled={chatLoading} />
                    <button onClick={() => handleSendChat()} disabled={chatLoading || !chatInput.trim()} className="p-1.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 rounded-xl text-white transition-colors">
                      {chatLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}