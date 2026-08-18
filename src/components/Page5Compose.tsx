import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles, PenTool, Plus, Trash2, Undo, Loader2,
  AlertCircle, FileText, AlignLeft, Info,
  MessageSquare, Send, Bot, User, RotateCcw, ChevronDown, BookOpen, Clock,
  ChevronUp, Download, CheckCircle2, RefreshCw
} from 'lucide-react';
import { buildHardRulesPrompt, buildLexiconPrompt } from './Page4Rules';
import { NovelState, Chapter, Character, filterByCurrentPoint } from '../types';
import { callApiWithRetry } from '../utils/api';
import { ADDRESS_TERM_PRESETS, buildAddressTermPrompt } from './addressTerms';

// ─── HẰNG SỐ ──────────────────────────────────────────────────────────────
const MAX_TAIL_LENGTH = 1500;
const MAX_REFERENCE_LENGTH = 500;

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
  { v: 'fresh' as const, label: '✨ Viết mới' },
  { v: 'continue' as const, label: 'Tiếp tục' },
  { v: 'rewrite' as const, label: 'Viết lại' },
  { v: 'scene' as const, label: 'Nhảy cảnh' },
  { v: 'reborn' as const, label: 'Trọng sinh' },
];

// ─── HÀM TIỆN ÍCH ──────────────────────────────────────────────────────────

function getPrevChapterSummary(prevChapter: Chapter | null, storyEvents: NovelState['storyEvents']): string {
  if (!prevChapter) return '';
  const summary = (storyEvents || []).find(
    e => e.chapterId === prevChapter.id && e.title === 'Tóm tắt'
  );
  return summary?.content || '';
}

function splitIntoScenes(text: string): { label: string; content: string }[] {
  if (!text || text.trim().length < 50) return [];
  const scenes: { label: string; content: string }[] = [];

  const chapterMatches = [...text.matchAll(
    /(?:Chương|Chapter|Đoạn|Phần|Arc)\s*(\d+)(?:[：:.\s\-]+([^\n]*))?/gi
  )];

  if (chapterMatches.length > 1) {
    return chapterMatches.map((m, i) => {
      const start = m.index!;
      const end = i < chapterMatches.length - 1 ? chapterMatches[i + 1].index! : text.length;
      const chapterNum = m[1] || (i + 1);
      const title = m[2]?.trim() || '';
      const prefix = m[0].match(/^[^\d]*/)?.[0]?.trim() || 'Chương';
      return {
        label: `${prefix} ${chapterNum}${title ? `: ${title}` : ''}`,
        content: text.slice(start, end).trim()
      };
    });
  }

  const separators = text.match(/\n\s*[\*\-=\#]{3,}\s*\n/g);
  if (separators && separators.length > 0) {
    const parts = text.split(/\n\s*[\*\-=\#]{3,}\s*\n/);
    parts.forEach((part, i) => {
      if (part.trim()) scenes.push({ label: `Đoạn ${i + 1}`, content: part.trim() });
    });
    return scenes;
  }

  if (text.length > 5000) {
    const CHUNK_SIZE = 3000;
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      const chunk = text.slice(i, i + CHUNK_SIZE);
      if (chunk.trim()) {
        const preview = chunk.trim().slice(0, 40).replace(/\n/g, ' ');
        scenes.push({
          label: `Khối ${scenes.length + 1}${preview ? ` — ${preview}...` : ''}`,
          content: chunk.trim()
        });
      }
    }
    return scenes;
  }

  scenes.push({ label: 'Toàn bộ nội dung', content: text.trim() });
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

// ─── buildSystemInstruction ──────────────────────────────────────────────
export function buildSystemInstruction(state: NovelState): string {
  const { config, characters, worldEntities, rules } = state;
  const currentOrder = config.currentStoryPoint?.order;

  const visibleCharacters = filterByCurrentPoint(characters, currentOrder);
  const visibleWorldEntities = filterByCurrentPoint(worldEntities, currentOrder);
  const visibleCharIds = new Set(visibleCharacters.map(c => c.id));

  // ─── NHÂN VẬT — FULL DATA, KHÔNG CẮT ──────────────────────────────────
  const charSummary = visibleCharacters.map(c => {
    const rels = (c.relationships || [])
      .filter(r => visibleCharIds.has(r.targetCharacterId))
      .map(r => {
        const target = characters.find(t => t.id === r.targetCharacterId);
        return target ? `${r.relationType} với ${target.name}${r.description ? ` — ${r.description}` : ''}` : '';
      }).filter(Boolean).join('; ');

    const abilities = (c.abilities || []).map(a =>
      `  • ${a.name}${a.tier ? ` [${a.tier}]` : ''} (${a.type}): ${a.description || ''}${a.condition ? `. Điều kiện: ${a.condition}` : ''}${a.origin ? `. Nguồn gốc: ${a.origin}` : ''}`
    ).join('\n');

    const fashion = (c.fashionStyles || []).map(f =>
      `  • ${f.name} [bối cảnh: ${f.context}]: ${f.description}${f.colorPalette ? `. Tông màu: ${f.colorPalette}` : ''}${f.material ? `. Chất liệu: ${f.material}` : ''}${f.significance ? `. Ý nghĩa: ${f.significance}` : ''}`
    ).join('\n');

    const timeline = (c.timeline || [])
      .filter(t => currentOrder === undefined || (t.order || 0) <= currentOrder)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(t => `  • [#${t.order}${t.chapterLabel ? ` · ${t.chapterLabel}` : ''}] (${t.category}): ${t.content}${t.relatedCharacterId ? ` [liên quan: ${characters.find(x => x.id === t.relatedCharacterId)?.name || ''}]` : ''}`)
      .join('\n');

    const imgDescs = (c.images || [])
      .filter(img => img.description?.trim())
      .map(img => `  • ${img.label || 'Ảnh'}: ${img.description}`)
      .join('\n');

    return `### ${c.name} (${c.role}, ${c.gender}, ${c.age} tuổi)
Tính cách: ${c.personality || 'Chưa mô tả'}
Ngoại hình: ${c.appearance || 'Chưa mô tả'}
Quá khứ: ${c.backStory || 'Chưa mô tả'}
Trạng thái hiện tại: ${c.currentStatus || 'Chưa mô tả'}
Bí mật/Kinks: ${c.additionalInfo || 'Chưa có'}${rels ? `\nMối quan hệ: ${rels}` : ''}${abilities ? `\nKỹ năng:\n${abilities}` : ''}${fashion ? `\nTrang phục:\n${fashion}` : ''}${timeline ? `\nDòng thời gian riêng:\n${timeline}` : ''}${imgDescs ? `\nẢnh tham chiếu:\n${imgDescs}` : ''}${c.currentData ? `\nDỮ LIỆU HIỆN HỮU (nguồn tham chiếu chính nếu có):\n${c.currentData}` : ''}`;
  }).join('\n\n');

  // ─── SỰ KIỆN CỐT TRUYỆN — FULL CONTENT, KHÔNG GIỚI HẠN SỐ LƯỢNG ───────
  const storyEvents = (state.storyEvents || [])
    .filter(e => currentOrder === undefined || (e.order || 0) <= currentOrder)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(e => `[#${e.order}${e.chapterLabel ? ` · ${e.chapterLabel}` : ''}] ${e.title || ''}: ${e.content || ''}`)
    .join('\n');

  // ─── LORE — FULL CONTENT, KHÔNG GIỚI HẠN SỐ LƯỢNG ─────────────────────
  const loreSummary = (rules?.loreEntries ?? [])
    .map(e => `[${e.category}] ${e.title}: ${e.content}`)
    .join('\n');

  const addressTermSet = ADDRESS_TERM_PRESETS.find(p => p.id === config.settingId);
  const addressTermBlock = buildAddressTermPrompt(addressTermSet);

  const hardRulesBlock = buildHardRulesPrompt(rules?.hardRules);
  const lexiconBlock = buildLexiconPrompt(state.rules.sexualLexicon);

  let refSection = '';
  if (config.referenceFileContent) {
    refSection = `\n[THAM KHẢO VĂN PHONG — CHỈ để học cách hành văn/giọng kể, TUYỆT ĐỐI KHÔNG lấy chi tiết, tình tiết, bối cảnh, thời gian, địa điểm trong đoạn dưới đây để đưa vào bài viết. Bài viết PHẢI bám theo [ĐANG VIẾT] và [MỆNH LỆNH] trong prompt chính]\n${config.referenceFileContent.substring(0, MAX_REFERENCE_LENGTH)}...`;
  }
  if (config.originalNarrativeVoice) {
    refSection += `\n\n[GIỌNG KỂ GỐC]\n${config.originalNarrativeVoice}`;
  }

  const existingCharNames = visibleCharacters.map(c => c.name).join(', ') || 'Chưa có';

  const behaviorConstraints = `
⛔ RÀNG BUỘC BỔ SUNG:
- CHỈ viết theo mệnh lệnh, KHÔNG tự thêm nhân vật/tình tiết
- KHÔNG nhắc nhân vật chưa xuất hiện: ${existingCharNames}
- Mô tả nhân vật/thế lực bên dưới là TÀI LIỆU THAM KHẢO ĐẦY ĐỦ để bạn HIỂU ĐÚNG nhân vật/thế giới, KHÔNG PHẢI cụm từ để chép lại nguyên văn. TUYỆT ĐỐI không lặp lại đúng nguyên cụm mô tả nhiều lần trong bài viết — mỗi lần nhắc tới ngoại hình/thân phận/năng lực nhân vật, hãy diễn đạt lại bằng câu chữ khác, góc nhìn khác, hoặc lồng ghép tự nhiên vào hành động/đối thoại thay vì đọc lại y hệt tài liệu.
- TUYỆT ĐỐI KHÔNG tự ý đổi bối cảnh thời gian trong ngày, địa điểm, hoạt động nhân vật đang làm so với đoạn văn được cung cấp trong prompt.`;

  const timelineNotice = currentOrder !== undefined
    ? `\n[MỐC HIỆN TẠI]: ${config.currentStoryPoint?.label || `#${currentOrder}`}\nCHỈ dùng thông tin ĐẾN mốc này.`
    : '';

  // ─── THẾ LỰC / THỰC THỂ — FULL DATA, KỂ CẢ speciesTraits ──────────────
  const worldSummary = visibleWorldEntities.map(w => {
    const traits = w.speciesTraits;
    let traitsBlock = '';
    if (traits) {
      const abilitiesText = (traits.abilities || []).map(a =>
        `    - ${a.name}: ${a.description}${a.trigger ? ` (Kích hoạt: ${a.trigger})` : ''}`
      ).join('\n');
      traitsBlock = `
  Ngoại hình: ${traits.appearance || ''}${traits.size ? ` | Kích thước: ${traits.size}` : ''}
  Đặc điểm nhận dạng: ${traits.distinguishing || ''}
  Tập tính: ${traits.behavior || ''} | Tính khí: ${traits.temperament || ''} | Trí thông minh: ${traits.intelligence || ''}
  Sinh thái: môi trường ${traits.habitat || ''}, thức ăn ${traits.diet || ''}
  Điểm yếu: ${traits.weakness || ''}
  Vật phẩm rơi: ${traits.drops || ''}
  Cấp độ nguy hiểm: ${traits.threatLevel || ''} | Độ hiếm: ${traits.rarity || ''}${abilitiesText ? `\n  Chiêu sức:\n${abilitiesText}` : ''}`;
    }
    const currentData = w.currentData ? `\n  DỮ LIỆU HIỆN HỮU: ${w.currentData}` : '';
    return `### ${w.name} (${w.type})\n${w.description || 'Chưa có mô tả'}${traitsBlock}${currentData}`;
  }).join('\n\n') || 'Chưa có';

  return `Truyện: ${config.title || 'Chưa đặt tên'} - ${config.genres.join(', ')}
Bối cảnh: ${config.context || 'Chưa mô tả'}
Văn phong: ${config.writingStyle || ''} ${config.customStyle || ''}
NSFW: ${config.nsfwEnabled ? 'BẬT' : 'TẮT'}${timelineNotice}

NHÂN VẬT:
${charSummary || 'Chưa có'}

THẾ LỰC:
${worldSummary}

SỰ KIỆN GẦN ĐÂY:
${storyEvents || 'Chưa có'}

LORE:
${loreSummary || 'Chưa có'}

${addressTermBlock}

${hardRulesBlock}

${behaviorConstraints}
${refSection}
${lexiconBlock}`;
}

// ─── buildWritePrompt ────────────────────────────────────────────────────
function buildWritePrompt(
  activeChapter: Chapter,
  allChapters: Chapter[],
  authorDirective: string,
  targetRange: [number, number],
  state: NovelState,
  writeMode: 'continue' | 'rewrite' | 'scene' | 'reborn' | 'fresh' = 'fresh',
  sourceSceneText: string = '',
  rebornCharacterName: string = ''
): string {
  const chIdx = allChapters.findIndex(c => c.id === activeChapter.id);

  const prevChapter = chIdx > 0 ? allChapters[chIdx - 1] : null;
  const prevTail = prevChapter?.content?.slice(-MAX_TAIL_LENGTH) || '';
  const currentTail = activeChapter.content.trim();

  const appeared = getAppearedCharacters(
    allChapters.slice(0, chIdx + 1),
    state.characters
  );
  const notAppeared = state.characters
    .filter(c => !appeared.includes(c.name))
    .map(c => c.name);

  const [minW, maxW] = targetRange;
  let prompt = '';

  if (writeMode === 'fresh') {
    if (activeChapter.content.trim()) {
      prompt += `🆕 VIẾT TIẾP CHƯƠNG: Chương đã có nội dung, hãy viết TIẾP nối liền mạch, logic với đoạn dở bên dưới. TUYỆT ĐỐI không lặp lại nội dung cũ, không viết lại từ đầu.\n\n`;
    } else {
      prompt += `🆕 VIẾT MỚI CHƯƠNG: Viết nội dung cho chương này từ đầu. Dựa vào dàn ý và mệnh lệnh bên dưới.\n\n`;
    }
  } else if (writeMode === 'scene' && sourceSceneText.trim()) {
    prompt += `CẢNH GỐC:\n${sourceSceneText.trim().slice(0, 1500)}\n\nViết TIẾP từ đây, nội dung MỚI.\n\n`;
  } else if (writeMode === 'rewrite' && sourceSceneText.trim()) {
    prompt += `VIẾT LẠI:\n${sourceSceneText.trim().slice(0, 1500)}\n\n`;
  } else if (writeMode === 'reborn' && sourceSceneText.trim()) {
    prompt += `TRỌNG SINH: ${rebornCharacterName || 'NV'} biết trước:\n${sourceSceneText.trim().slice(0, 2000)}\n\n`;
  }

  const prevSummary = getPrevChapterSummary(prevChapter, state.storyEvents);
  if (prevSummary) {
    prompt += `[TÓM TẮT CHƯƠNG TRƯỚC - MẠCH TRUYỆN]\n${prevSummary}\n\n`;
  }

  if (prevTail) {
    prompt += `[CHƯƠNG TRƯỚC - KẾT, để nối văn phong]\n${prevTail}\n\n`;
  }

  if ((writeMode === 'continue' || writeMode === 'fresh') && currentTail) {
    prompt += `[ĐANG VIẾT - TOÀN BỘ NỘI DUNG HIỆN TẠI]\n${currentTail}\n\n`;
    prompt += `⚠️ BẮT BUỘC GIỮ BỐI CẢNH: Đoạn viết tiếp PHẢI cùng thời điểm (buổi sáng/trưa/chiều/tối — lấy đúng theo đoạn trên), cùng địa điểm, cùng hoạt động nhân vật đang làm với đoạn "ĐANG VIẾT" ở trên. TUYỆT ĐỐI KHÔNG tự ý đổi thời gian trong ngày, KHÔNG tự chèn các cụm mở đầu sáo rỗng kiểu "sau một ngày mệt mỏi/dài đằng đẵng", KHÔNG nhảy sang cảnh khác — TRỪ KHI [MỆNH LỆNH] bên dưới yêu cầu rõ ràng.\n\n`;
  }

  if (activeChapter.outline.trim()) {
    prompt += `[DÀN Ý]\n${activeChapter.outline.trim()}\n\n`;
  }

  prompt += `[MỆNH LỆNH — ƯU TIÊN CAO NHẤT, bám sát đúng bối cảnh đoạn "ĐANG VIẾT" ở trên]\n${authorDirective.trim() || 'Tiếp tục tự nhiên, đúng bối cảnh hiện tại, không đổi cảnh, không đổi thời gian.'}\n\n`;

  const hardRules = state.rules?.hardRules;

  prompt += `⛔ ĐÂY LÀ ĐOẠN GIỮA CHƯƠNG — CHƯA PHẢI ĐOẠN KẾT:
- KHÔNG để nhân vật rời khỏi hiện trường trừ khi mệnh lệnh yêu cầu rõ.
- KHÔNG viết câu tổng kết/định hướng kiểu "và thế là...", "cuộc chiến đã bắt đầu...", "từ đây mọi chuyện thay đổi...", "một chương mới mở ra...", "định mệnh đã an bài..."
- KHÔNG viết câu mang tính "đóng màn" hay "mở màn cho tương lai".
- Dừng đúng tại hành động cuối trong mệnh lệnh.
- Viết ĐỦ từ, không tự rút ngắn.`;

  if (hardRules?.noSparseDialogue) {
    prompt += `\n- 💬 ĐỐI THOẠI: tối thiểu 30% nội dung đoạn viết. Mỗi nhân vật chính trong cảnh PHẢI có ít nhất 3-5 câu thoại, thoại phải thể hiện tính cách và cảm xúc, KHÔNG viết thoại chỉ để lấp chỗ.`;
  }

  if (hardRules?.requireBodyDetail) {
    prompt += `\n- 🧍 MIÊU TẢ CƠ THỂ: mỗi lần nhân vật xuất hiện hoặc có hành động quan trọng, PHẢI có 1-2 câu miêu tả cơ thể/thân hình (dáng vóc, tư thế, cử chỉ, chuyển động cơ thể) gắn với khoảnh khắc đó. KHÔNG viết kiểu "hắn đứng đó" mà không kèm miêu tả cơ thể.`;
  }

  prompt += '\n\n';

  prompt += `[NHÂN VẬT]\nĐã xuất hiện: ${appeared.join(', ') || 'Chưa có'}\n`;
  if (notAppeared.length) {
    prompt += `🚨 CẤM nhắc: ${notAppeared.join(', ')}\n`;
  }
  prompt += '\n';

  prompt += `[YÊU CẦU]\nĐộ dài: ${minW}-${maxW} chữ. Văn xuôi thuần túy.`;

  return prompt;
}

// ─── extractEntityUpdatesFromAI ──────────────────────────────────────────
interface EntityUpdate {
  name: string;
  type: 'character' | 'world';
  update: string;
}

async function extractEntityUpdatesFromAI(
  chapterContent: string,
  knownCharacterNames: string[],
  knownWorldNames: string[],
  activeKey: any
): Promise<EntityUpdate[]> {
  if (knownCharacterNames.length === 0 && knownWorldNames.length === 0) return [];

  const systemPrompt = `Bạn là AI trích xuất thông tin thay đổi cho tiểu thuyết mạng.
Danh sách nhân vật đã biết: ${knownCharacterNames.join(', ') || 'Không có'}
Danh sách thế lực/thực thể đã biết: ${knownWorldNames.join(', ') || 'Không có'}

Nhiệm vụ: Đọc đoạn chương truyện, chỉ ra NHỮNG nhân vật/thế lực (trong 2 danh sách trên) có THÔNG TIN MỚI/THAY ĐỔI xảy ra trong đoạn này (VD: đột phá cảnh giới, bị thương, đổi phe, lộ thân phận, quan hệ thay đổi, tổ chức bị tấn công/đổi chủ...).
BỎ QUA nhân vật/thế lực chỉ xuất hiện thoáng qua mà không có gì thay đổi thực sự.
Trả về JSON array, KHÔNG markdown, KHÔNG giải thích, chỉ JSON thuần. Nếu không có gì đáng ghi nhận, trả về [].
Mỗi phần tử gồm: name (đúng tên trong danh sách), type ("character" hoặc "world"), update (mô tả ngắn gọn 1-2 câu về điều gì đã thay đổi).`;

  const userPrompt = `Đoạn chương:\n${chapterContent.slice(0, 4000)}\n\nTrả về JSON array các cập nhật.`;

  const body: Record<string, any> = {
    prompt: userPrompt,
    systemInstruction: systemPrompt,
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

  try {
    const data = await callApiWithRetry('generate', body, { maxRetries: 1, baseDelay: 1000 });
    let text = (data.text || '').trim().normalize('NFC').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u: any) => u.name && u.update).map((u: any) => ({
      name: String(u.name),
      type: u.type === 'world' ? 'world' : 'character',
      update: String(u.update),
    }));
  } catch {
    return [];
  }
}

// ─── COMPONENT CHÍNH ──────────────────────────────────────────────────────
export default function Page5Compose({ state, updateState, onNavigate }: Page5ComposeProps) {
  const { chapters, currentChapterId, apiKeys } = state;
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [previousContent, setPreviousContent] = useState<string | null>(null);
  const [confirmDeleteChapterId, setConfirmDeleteChapterId] = useState<string | null>(null);
  const [chapterListError, setChapterListError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<number>(1500);

  const [writeMode, setWriteMode] = useState<'continue' | 'rewrite' | 'scene' | 'reborn' | 'fresh'>(
    state.config.writeMode || 'continue'
  );

  const handleSetWriteMode = (mode: 'continue' | 'rewrite' | 'scene' | 'reborn' | 'fresh') => {
    setWriteMode(mode);
    updateState((prev) => {
      prev.config.writeMode = mode;
    });
  };

  const [sourceSceneText, setSourceSceneText] = useState(state.config.sourceSceneText || '');
  const [rebornCharacterId, setRebornCharacterId] = useState(state.config.rebornCharacterId || '');

  useEffect(() => {
    updateState((prev) => {
      prev.config.sourceSceneText = sourceSceneText;
      prev.config.rebornCharacterId = rebornCharacterId;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceSceneText, rebornCharacterId]);

  const [sceneSearch, setSceneSearch] = useState('');
  const scenes = useMemo(
    () => splitIntoScenes(state.config.referenceFileContent || ''),
    [state.config.referenceFileContent]
  );
  const filteredScenes = scenes.filter(s =>
    !sceneSearch || s.label.toLowerCase().includes(sceneSearch.toLowerCase())
  );

  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const [rightTab, setRightTab] = useState<'write' | 'chat'>('write');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatScope, setChatScope] = useState<'current' | 'all'>('all');
  const [savedToLore, setSavedToLore] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [pendingSummaryOverwrite, setPendingSummaryOverwrite] = useState(false);

  const activeChapter = chapters.find((c) => c.id === currentChapterId) || chapters[0] || null;
  const activeKey = apiKeys.find(k => k.isActive && !k.quotaExceeded) || null;

  const currentWords = activeChapter ? getWordCount(activeChapter.content) : 0;
  const selectedOption = WORD_RANGE_OPTIONS.find(o => o.value === selectedRange) || WORD_RANGE_OPTIONS[1];

  // ─── useCallback cho handleUpdateField ──────────────────────────────
  const handleUpdateField = useCallback((field: keyof Omit<Chapter, 'id'>, value: string) => {
    if (!activeChapter) return;
    const normalized = value.normalize('NFC');
    updateState((prev) => {
      const ch = prev.chapters.find(c => c.id === activeChapter.id);
      if (ch) ch[field] = normalized;
    });
  }, [activeChapter, updateState]);

  // ─── buildChatContext ─────────────────────────────────────────────────
  const buildChatContext = useCallback((scope: 'current' | 'all' = 'all'): string => {
    const { config, characters, worldEntities, rules, chapters, storyEvents } = state;

    const charSummary = characters.map(c => {
      const rels = (c.relationships || []).map(r => {
        const target = characters.find(t => t.id === r.targetCharacterId);
        return target ? `${r.relationType} với ${target.name}` : '';
      }).filter(Boolean).join('; ');

      const abilities = (c.abilities || []).map(a => `${a.name}(${a.type}): ${a.description || ''}`).join('; ');
      const fashion = (c.fashionStyles || []).map(f => `${f.name}[${f.context}]: ${f.description}`).join('; ');
      const imgDescs = (c.images || []).filter((img: any) => img.description?.trim())
        .map((img: any) => img.description).join('; ');
      const timeline = (c.timeline || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(t => `[#${t.order}](${t.category}): ${t.content}`).join('; ');

      return `### ${c.name}(${c.role},${c.gender},${c.age})
Tính cách: ${c.personality || ''}
Ngoại hình: ${c.appearance || ''}
Quá khứ: ${c.backStory || ''}
Hiện tại: ${c.currentStatus || ''}
Bí mật: ${c.additionalInfo || ''}${rels ? `\nQuan hệ: ${rels}` : ''}${abilities ? `\nKỹ năng: ${abilities}` : ''}${fashion ? `\nTrang phục: ${fashion}` : ''}${imgDescs ? `\nẢnh: ${imgDescs}` : ''}${timeline ? `\nDòng thời gian: ${timeline}` : ''}${c.currentData ? `\nDữ liệu hiện hữu: ${c.currentData}` : ''}`;
    }).join('\n\n');

    const worldSummary = worldEntities.map(w => {
      const traits = w.speciesTraits;
      let traitsText = '';
      if (traits) {
        const abilitiesText = (traits.abilities || []).map(a => `${a.name}: ${a.description}`).join('; ');
        traitsText = ` | Ngoại hình: ${traits.appearance || ''}, Tập tính: ${traits.behavior || ''}, Điểm yếu: ${traits.weakness || ''}, Nguy hiểm: ${traits.threatLevel || ''}${abilitiesText ? `, Chiêu sức: ${abilitiesText}` : ''}`;
      }
      return `### ${w.name}(${w.type}): ${w.description || ''}${traitsText}${w.currentData ? ` | Dữ liệu hiện hữu: ${w.currentData}` : ''}`;
    }).join('\n\n');

    const loreSummary = (rules.loreEntries || []).map((e: any) => `[${e.category}] ${e.title}: ${e.content}`).join('\n');

    const storyEventsSummary = (storyEvents || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(e => `[#${e.order}${e.chapterLabel ? ` · ${e.chapterLabel}` : ''}] ${e.title || ''}: ${e.content || ''}`)
      .join('\n');

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
BỐI CẢNH: ${config.context || 'Chưa mô tả'}

NHÂN VẬT:
${charSummary || 'Chưa có'}

THẾ LỰC:
${worldSummary || 'Chưa có'}
${loreSummary ? `\nLORE:\n${loreSummary}` : ''}
${storyEventsSummary ? `\nSỰ KIỆN:\n${storyEventsSummary}` : ''}

${chaptersSummary}`;
  }, [state, activeChapter]);

  // ─── handleEventSelect ─────────────────────────────────────────────────
  const handleEventSelect = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
    if (!eventId) return;

    const ev = (state.storyEvents || []).find(se => se.id === eventId);
    if (!ev) return;

    const actionMap: Record<string, string> = {
      rewrite: 'Viết lại chi tiết sự kiện',
      scene: 'Viết tiếp ngay sau sự kiện',
      reborn: 'Lấy làm mốc ký ức trọng sinh cho sự kiện',
      fresh: 'Viết mới dựa trên bối cảnh sự kiện',
      continue: 'Viết tiếp dựa trên bối cảnh sự kiện',
    };
    
    const actionLabel = actionMap[writeMode] || 'Viết tiếp dựa trên bối cảnh sự kiện';
    const directive = `[${actionLabel}: "${ev.title}"]\n${ev.content}`;

    const existing = activeChapter?.prompt?.trim() || '';
    const merged = existing ? `${directive}\n\n${existing}` : directive;
    handleUpdateField('prompt', merged);
  }, [state.storyEvents, writeMode, activeChapter, handleUpdateField]);

  // ─── Các hàm xử lý ─────────────────────────────────────────────────────
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
    if (chapters.length <= 1) {
      setChapterListError('Không thể xóa chương cuối cùng!');
      setTimeout(() => setChapterListError(null), 3000);
      return;
    }
    setConfirmDeleteChapterId(id);
  };

  const confirmDeleteChapter = (id: string) => {
    updateState((prev) => {
      prev.chapters = prev.chapters.filter(c => c.id !== id);
      if (prev.currentChapterId === id) prev.currentChapterId = prev.chapters[0].id;
    });
    setPreviousContent(null);
    setConfirmDeleteChapterId(null);
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

  // ─── Export ────────────────────────────────────────────────────────────
  const handleExportText = () => {
    if (!state.chapters || state.chapters.length === 0) {
      setSummaryError('⚠️ Chưa có chương nào để xuất!');
      setTimeout(() => setSummaryError(null), 3000);
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

  // ─── handleSendChat ────────────────────────────────────────────────────
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

${context}

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

      const data = await callApiWithRetry('generate', body, {
        maxRetries: 1,
        baseDelay: 1000,
      });

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

  // ─── handleAIGenerateNext ─────────────────────────────────────────────
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
        maxWords: selectedOption.range[1],
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

      const data = await callApiWithRetry('generate', body, {
        maxRetries: 2,
        baseDelay: 1500,
      });

      const textGenerated = (data.text || '').trim().normalize('NFC');
      if (!textGenerated) throw new Error('AI trả về nội dung trống rỗng.');

      if (writeMode !== 'fresh' && activeChapter.content.trim()) {
        const oldTail = activeChapter.content.slice(-300).trim();
        if (textGenerated.includes(oldTail.substring(0, 100))) {
          setAiError('⚠️ AI có thể đang lặp nội dung. Kiểm tra kết quả và thử lại với mệnh lệnh cụ thể hơn.');
        }
      }

      setPreviousContent(activeChapter.content);
      
      let appended;
      if (writeMode === 'fresh' && !activeChapter.content.trim()) {
        appended = textGenerated;
      } else {
        appended = (activeChapter.content ? activeChapter.content + '\n\n' : '') + textGenerated;
      }
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

  // ─── handleSummarizeChapter ───────────────────────────────────────────
  const handleSummarizeChapter = async (skipConfirm = false) => {
    if (!activeChapter) return;
    
    if (!activeChapter.content.trim()) {
      setSummaryError('Chương đang trống, không có gì để tóm tắt.');
      setTimeout(() => setSummaryError(null), 3000);
      return;
    }

    const existingSummary = state.storyEvents?.find(
      e => e.chapterId === activeChapter.id && e.title === 'Tóm tắt'
    );

    if (existingSummary && !skipConfirm) {
      setPendingSummaryOverwrite(true);
      return;
    }
    setPendingSummaryOverwrite(false);

    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const prompt = `Tóm tắt chương sau thành 1-2 câu ngắn gọn (tối đa 80 từ), chỉ nêu sự kiện chính đã xảy ra, không bình luận thêm:\n\n${activeChapter.content}`;

      const body: Record<string, any> = {
        prompt: prompt,
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

      const data = await callApiWithRetry('generate', body, {
        maxRetries: 1,
        baseDelay: 1000,
      });

      const summaryText = (data.text || '').trim();
      if (!summaryText) {
        throw new Error('AI không trả về tóm tắt.');
      }

      const chapterIndex = chapters.findIndex(c => c.id === activeChapter.id);
      const order = chapterIndex + 1;

      const newEvent = {
        id: Math.random().toString(36).substr(2, 9),
        chapterId: activeChapter.id,
        order: order,
        chapterLabel: activeChapter.title || `Chương ${order}`,
        title: 'Tóm tắt',
        content: summaryText,
        relatedCharacterIds: [],
      };

      updateState((prev) => {
        if (!prev.storyEvents) prev.storyEvents = [];

        const existingIndex = prev.storyEvents.findIndex(
          e => e.chapterId === activeChapter.id && e.title === 'Tóm tắt'
        );

        if (existingIndex !== -1) {
          prev.storyEvents[existingIndex] = newEvent;
        } else {
          prev.storyEvents.push(newEvent);
        }
      });

      const chapterLabel = activeChapter.title || `Chương ${order}`;
      const updates = await extractEntityUpdatesFromAI(
        activeChapter.content,
        state.characters.map(c => c.name),
        state.worldEntities.map(w => w.name),
        activeKey
      );

      if (updates.length > 0) {
        updateState((prev) => {
          updates.forEach(u => {
            const entry = `[${chapterLabel}] ${u.update}`;
            if (u.type === 'character') {
              const char = prev.characters.find(c => c.name === u.name);
              if (char) {
                char.currentData = char.currentData
                  ? char.currentData + '\n\n' + entry
                  : entry;
              }
            } else {
              const world = prev.worldEntities.find(w => w.name === u.name);
              if (world) {
                world.currentData = world.currentData
                  ? world.currentData + '\n\n' + entry
                  : entry;
              }
            }
          });
        });
      }

      setSummaryError(
        updates.length > 0
          ? `✅ Đã lưu tóm tắt + cập nhật ${updates.length} hồ sơ liên quan!`
          : '✅ Đã lưu tóm tắt chương!'
      );
      setTimeout(() => setSummaryError(null), 2500);

    } catch (err: any) {
      setSummaryError(err.message || 'Lỗi không xác định khi tóm tắt chương.');
      setTimeout(() => setSummaryError(null), 4000);
    } finally {
      setSummaryLoading(false);
    }
  };

  const currentStoryPoint = state.config.currentStoryPoint;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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

        {chapterListError && (
          <div className="px-3 py-1.5 bg-red-950/30 border-b border-red-900/40 text-[9px] text-red-300">
            ⚠ {chapterListError}
          </div>
        )}

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
                <div className="min-w-0 flex-1 pr-1 cursor-pointer" onClick={() => { 
                  updateState(prev => { prev.currentChapterId = ch.id; }); 
                  setPreviousContent(null);
                  setPendingSummaryOverwrite(false);
                }}>
                  <div className="flex items-center gap-1 truncate">
                    <span className="text-[8px] font-mono text-gray-600">#{i + 1}</span>
                    <h4 className="text-[10px] font-semibold truncate">{ch.title || 'Chưa đặt tên'}</h4>
                  </div>
                  <p className="text-[8px] font-mono text-gray-500">{words.toLocaleString()} từ</p>
                </div>
                {confirmDeleteChapterId === ch.id ? (
                  <div className="flex items-center gap-1 shrink-0 bg-red-950/40 border border-red-800/50 rounded-lg px-1 py-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); confirmDeleteChapter(ch.id); }}
                      className="text-[8px] px-1 py-0.5 bg-red-800 hover:bg-red-700 text-red-100 rounded"
                    >
                      Xóa
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteChapterId(null); }}
                      className="text-[8px] px-1 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-gray-400 rounded"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteChapter(ch.id, e); }} className="p-1 text-neutral-700 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-all shrink-0">
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
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
          {summaryError && (
            <div className="mt-2 px-4 py-2 bg-amber-950/30 border border-amber-800/40 rounded-xl text-[10px] text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {summaryError}
            </div>
          )}
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
                {pendingSummaryOverwrite ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-950/30 border border-amber-800/50 rounded-lg">
                    <span className="text-[9px] text-amber-300 whitespace-nowrap">Đã có tóm tắt — Ghi đè?</span>
                    <button
                      onClick={() => handleSummarizeChapter(true)}
                      className="px-2 py-0.5 bg-amber-700 hover:bg-amber-600 text-white rounded text-[9px] font-bold"
                    >
                      Xác nhận
                    </button>
                    <button
                      onClick={() => setPendingSummaryOverwrite(false)}
                      className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-gray-300 rounded text-[9px]"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSummarizeChapter()}
                    disabled={summaryLoading || !activeChapter?.content.trim()}
                    className="px-2.5 py-1 border border-blue-800/50 bg-blue-950/20 hover:bg-blue-950/50 hover:border-blue-700/60 text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                    title="Tóm tắt chương hiện tại"
                  >
                    {summaryLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <FileText className="w-3 h-3" />
                    )}
                    {summaryLoading ? 'Đang tóm tắt...' : '📝 Tóm tắt chương'}
                  </button>
                )}
                {previousContent !== null && (
                  <button onClick={handleUndo} className="px-2.5 py-1 border border-amber-900/50 bg-amber-950/20 hover:bg-amber-950/50 text-amber-300 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1">
                    <Undo className="w-3 h-3" /> Hoàn tác
                  </button>
                )}
              </div>
            </div>

            {summaryError && (
              <div className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg border ${
                summaryError.includes('✅') 
                  ? 'text-green-400 bg-green-950/20 border-green-800/40'
                  : 'text-red-400 bg-red-950/20 border-red-800/40'
              }`}>
                {summaryError.includes('✅') ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                {summaryError}
              </div>
            )}

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
                {/* ─── Chế Độ ────────────────────────────────────────────────── */}
                <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-3 space-y-2">
                  <span className="text-[11px] font-bold text-gray-200">🎬 Chế Độ</span>
                  <div className="grid grid-cols-2 gap-1">
                    {WRITE_MODES.map(m => {
                      const isFreshRecommended = getWordCount(activeChapter.content) < 50;
                      const isWrongMode = m.v === 'continue' && isFreshRecommended;
                      return (
                        <button key={m.v} onClick={() => handleSetWriteMode(m.v)} 
                          className={`px-2 py-1.5 rounded-lg text-[10px] border transition-all relative ${
                            writeMode === m.v 
                              ? 'bg-violet-900/40 border-violet-600/60 text-violet-200' 
                              : 'bg-neutral-950/60 border-neutral-800 text-gray-500 hover:border-neutral-600'
                          } ${isWrongMode ? 'border-amber-800/50' : ''}`}>
                          {m.label}
                          {m.v === 'fresh' && isFreshRecommended && writeMode !== 'fresh' && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Đề xuất cho chương trống" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {writeMode === 'continue' && getWordCount(activeChapter.content) < 50 && (
                    <p className="text-[9px] text-amber-400 mt-1">💡 Chương đang trống. Nút "✨ Viết mới" sẽ phù hợp hơn.</p>
                  )}

                  {writeMode === 'reborn' && (
                    <div className="pt-1">
                      <label className="block text-[9px] text-gray-500 mb-1">Nhân vật trọng sinh</label>
                      <select 
                        value={rebornCharacterId} 
                        onChange={e => setRebornCharacterId(e.target.value)} 
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-violet-600"
                      >
                        <option value="">-- Chọn --</option>
                        {state.characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}

                  {writeMode !== 'continue' && writeMode !== 'fresh' && scenes.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-neutral-800/50 mt-2">
                      <label className="block text-[9px] text-amber-400 font-bold mb-1">
                        {writeMode === 'rewrite' && '📝 Chọn cảnh gốc để AI viết lại'}
                        {writeMode === 'scene' && '➡️ Chọn cảnh để AI viết tiếp'}
                        {writeMode === 'reborn' && '🔮 Chọn mốc bắt đầu "tương lai đã biết"'}
                      </label>
                      <input
                        placeholder="Tìm cảnh..."
                        value={sceneSearch}
                        onChange={e => setSceneSearch(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-violet-600"
                      />
                      <select
                        value={sourceSceneText ? scenes.findIndex(s => s.content === sourceSceneText) : ''}
                        onChange={e => {
                          if (e.target.value === '') { setSourceSceneText(''); return; }
                          const idx = Number(e.target.value);
                          if (writeMode === 'reborn') {
                            const future = scenes.slice(idx).map(s => s.content).join('\n\n');
                            setSourceSceneText(future);
                          } else {
                            setSourceSceneText(scenes[idx]?.content || '');
                          }
                        }}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-violet-600"
                      >
                        <option value="">-- Chọn cảnh --</option>
                        {filteredScenes.map((s) => {
                          const realIdx = scenes.indexOf(s);
                          const preview = s.content.slice(0, 60).replace(/\n/g, ' ');
                          return (
                            <option key={realIdx} value={realIdx}>
                              {s.label} {preview ? `— ${preview}...` : ''}
                            </option>
                          );
                        })}
                      </select>
                      {sourceSceneText && (
                        <div className="p-2 bg-neutral-950/80 border border-violet-900/30 rounded-lg">
                          <p className="text-[9px] text-green-400/90 flex items-center gap-1 mb-1">
                            <CheckCircle2 className="w-3 h-3" /> Đã chọn ({sourceSceneText.length.toLocaleString()} ký tự)
                          </p>
                          <p className="text-[9px] text-gray-500 leading-relaxed line-clamp-3">
                            {sourceSceneText.slice(0, 150).replace(/\n/g, ' ')}...
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {writeMode !== 'continue' && writeMode !== 'fresh' && scenes.length === 0 && (
                    <div className="p-2 bg-amber-950/20 border border-amber-900/30 rounded-lg text-[10px] text-amber-400">
                      ⚠️ Chưa có dữ liệu Đồng Nhân. Vào trang <strong>Ý Tưởng</strong> để upload file gốc.
                    </div>
                  )}
                </div>

                {/* ─── Dropdown chọn mốc sự kiện ────────────────────────────── */}
                <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-3 space-y-2">
                  <label className="block text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    🎯 Chọn mốc từ Dòng Thời Gian (tuỳ chọn)
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => handleEventSelect(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-amber-600"
                  >
                    <option value="">-- Chọn sự kiện --</option>
                    {filterByCurrentPoint(state.storyEvents || [], state.config.currentStoryPoint?.order)
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map(ev => (
                        <option key={ev.id} value={ev.id}>
                          #{ev.order} {ev.chapterLabel ? `· ${ev.chapterLabel}` : ''} · {ev.title}
                        </option>
                      ))}
                  </select>
                  {selectedEventId && (
                    <p className="text-[9px] text-green-400/80">
                      ✅ Đã thêm vào Mệnh Lệnh bên dưới (không xoá nội dung bạn đã gõ).
                    </p>
                  )}
                </div>

                {/* ─── Dàn Ý ────────────────────────────────────────────────── */}
                <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-200">
                    <FileText className="w-3.5 h-3.5 text-amber-500" /> 
                    Dàn Ý
                    <span className="text-[8px] text-gray-600 font-normal ml-1">(hướng dẫn tổng thể)</span>
                  </div>
                  <textarea 
                    rows={2} 
                    placeholder="📋 Phác thảo sự kiện chính của chương (không phải mệnh lệnh viết ngay)..." 
                    value={activeChapter.outline} 
                    onChange={e => handleUpdateField('outline', e.target.value)} 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[11px] text-gray-300 focus:outline-none focus:border-amber-600 leading-relaxed resize-none" 
                    spellCheck={false} 
                  />
                </div>

                {/* ─── Mệnh Lệnh ────────────────────────────────────────────── */}
                <div className="bg-neutral-900 border border-red-950/40 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-300">
                    <PenTool className="w-3.5 h-3.5 text-red-500" /> 
                    Mệnh Lệnh
                    <span className="text-[8px] text-gray-600 font-normal ml-1">(1 beat cụ thể cho lần gọi này)</span>
                  </div>
                  <p className="text-[9px] text-gray-500 leading-relaxed">AI viết theo mệnh lệnh này — luôn kết ở trạng thái "đang diễn ra" để lần sau viết tiếp</p>
                  <textarea 
                    rows={3} 
                    placeholder="VD: Viết tiếp: Trần Phong đã đạt tới đỉnh cảnh giới, mở mắt ra trong lôi đình, trước mặt là Lưu Ly đang khiếp sợ." 
                    value={activeChapter.prompt} 
                    onChange={e => handleUpdateField('prompt', e.target.value)} 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[11px] text-gray-300 focus:outline-none focus:border-red-500 leading-relaxed resize-none" 
                    spellCheck={false} 
                  />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_PROMPTS.slice(0, 4).map(p => (
                      <button key={p.label} onClick={() => handleUpdateField('prompt', p.text)} className="px-1.5 py-0.5 bg-neutral-950 border border-neutral-800 hover:border-red-900/60 rounded text-[8px] text-gray-400 hover:text-red-300 truncate max-w-[80px]" title={p.text}>{p.label.slice(0, 15)}</button>
                    ))}
                  </div>
                </div>

                {/* ─── Độ dài ────────────────────────────────────────────────── */}
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

                {/* ─── AI Engine ────────────────────────────────────────────── */}
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