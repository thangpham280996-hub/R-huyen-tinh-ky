import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles, PenTool, Plus, Trash2, Undo, Loader2,
  AlertCircle, FileText, AlignLeft, Info,
  MessageSquare, Send, Bot, User, RotateCcw, ChevronDown, BookOpen, Clock
} from 'lucide-react';
import { buildHardRulesPrompt } from './Page4Rules';
import { NovelState, Chapter } from '../types';
import { callApi } from '../utils/api';

interface Page5ComposeProps {
  state: NovelState;
  updateState: (updater: (prev: NovelState) => void) => void;
  onNavigate: (tabId: string) => void;
}

const PRESET_PROMPTS = [
  { label: '🔞 Cảnh Mây Mưa Thô Tục', text: 'Hãy viết một đoạn mây mưa sắc khí cực kỳ nồng cháy, chi tiết, tả dung nhan mỹ nhân ghen ghét hay mê man, sử dụng từ ngữ thô tục gợi tình tự nhiên.' },
  { label: '🔥 Tu Luyện & Đột Phá', text: 'Mô tả quá trình đột phá tu vi đầy kịch tính, hấp thu linh khí, rèn luyện gân cốt và trải qua thiên lôi tẩy tủy vô cùng gian nan.' },
  { label: '💔 Ghen Tuông & NTR', text: 'Viết một cuộc đối thoại ghen tuông căng thẳng giữa các nữ chính, hoặc một bối cảnh NTR tâm lý đầy u uất và kích thích.' },
  { label: '😈 Harem Tranh Sủng', text: 'Viết cảnh các mỹ nhân trong hậu cung tranh giành sự chú ý của nam chính, những lời khêu gợi và ám muội đầy dâm mỹ.' },
  { label: '🌌 Kỳ Ngộ Bí Cảnh', text: 'Nhân vật chính vô tình rơi vào một mật cảnh cổ xưa nguy hiểm, phát hiện tàn hồn đại năng truyền thừa võ công tuyệt học.' },
  { label: '🐉 Chiến Đấu Sinh Tử', text: 'Mô tả trận chiến khéo léo với yêu thú thượng cổ, chiêu thức bùng nổ, đấu trí và đấu lực hoành tráng.' },
];

// ─── Word count settings — range thay vì số cứng ──────────────────────────────
const WORD_RANGE_OPTIONS = [
  {
    value: 800,
    label: '800–1200 chữ',
    desc: 'Cảnh ngắn, hành động nhanh',
    range: [800, 1200] as [number, number],
  },
  {
    value: 1500,
    label: '1500–2000 chữ',
    desc: 'Đoạn trung bình, cân bằng',
    range: [1500, 2000] as [number, number],
  },
  {
    value: 2500,
    label: '2500–3500 chữ',
    desc: 'Cảnh dài, chi tiết sâu',
    range: [2500, 3500] as [number, number],
  },
  {
    value: 4000,
    label: '4000–5000 chữ',
    desc: 'Chương đầy đủ, toàn diện',
    range: [4000, 5000] as [number, number],
  },
];

// ─── Chat types ──────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ─── Gợi ý phân tích nhanh ───────────────────────────────────────────────────
const QUICK_ANALYSIS = [
  { icon: '📋', label: 'Tóm tắt chương hiện tại', prompt: 'Hãy tóm tắt ngắn gọn nội dung chương đang mở (khoảng 100-150 từ), nêu bật các sự kiện chính, cảm xúc và điểm nhấn quan trọng.' },
  { icon: '🔍', label: 'Kiểm tra nhất quán', prompt: 'Kiểm tra toàn bộ nội dung đã viết: nhân vật có hành động trái tính cách không? Có lỗi logic hay mâu thuẫn nào giữa các chương không? Liệt kê cụ thể.' },
  { icon: '🎭', label: 'Phân tích nhân vật', prompt: 'Phân tích sâu các nhân vật đã xuất hiện: chiều sâu tâm lý, sự phát triển qua các chương, điểm mạnh/yếu trong cách xây dựng nhân vật.' },
  { icon: '📈', label: 'Gợi ý hướng tiếp theo', prompt: 'Dựa trên nội dung đã có, gợi ý 3-5 hướng phát triển cốt truyện thú vị và bất ngờ cho các chương tiếp theo. Giải thích tại sao mỗi hướng phù hợp.' },
  { icon: '✍️', label: 'Đánh giá văn phong', prompt: 'Đánh giá văn phong của truyện: điểm mạnh, điểm cần cải thiện, tính nhất quán của giọng văn, chất lượng đối thoại và mô tả cảnh. Cho điểm từng tiêu chí.' },
  { icon: '⚠️', label: 'Tìm lỗ hổng cốt truyện', prompt: 'Tìm các lỗ hổng logic, plot hole, điểm chưa giải thích, hoặc foreshadowing bị bỏ quên trong toàn bộ câu chuyện đã viết.' },
  { icon: '💡', label: 'Ý tưởng chi tiết hay', prompt: 'Gợi ý 5-7 chi tiết nhỏ thú vị (vật phẩm, phong tục, cảnh quan, phản ứng nhân vật phụ...) có thể thêm vào để làm phong phú thế giới truyện.' },
  { icon: '❤️', label: 'Phân tích romance', prompt: 'Phân tích chemistry và tiến triển tình cảm giữa các cặp nhân vật: có tự nhiên không, nhịp độ có hợp lý không, điểm nào cần thêm tension?' },
];

// ─── Chế độ viết ───────────────────────────────────────────────────────────────
const WRITE_MODES = [
  { v: 'continue' as const, label: 'Tiếp tục' },
  { v: 'rewrite' as const, label: 'Viết lại' },
  { v: 'scene' as const, label: 'Nhảy cảnh' },
  { v: 'reborn' as const, label: 'Trọng sinh' },
];

// ─── Tách văn bản gốc (đã lưu từ Đồng Nhân) thành từng cảnh để chọn qua dropdown ──
// Ưu tiên tách theo mốc "Chương N" / "Chapter N"; nếu không tìm thấy thì chia đều theo độ dài.
function splitIntoScenes(text: string): { label: string; content: string }[] {
  if (!text) return [];
  const matches = [...text.matchAll(/(Chương|Chapter)\s+\d+[^\n]{0,50}/gi)];
  if (matches.length > 1) {
    return matches.map((m, i) => {
      const start = m.index!;
      const end = i < matches.length - 1 ? matches[i + 1].index! : text.length;
      return { label: m[0].trim(), content: text.slice(start, end).trim() };
    });
  }
  const scenes: { label: string; content: string }[] = [];
  for (let i = 0; i < text.length; i += 3000) {
    scenes.push({ label: `Đoạn ${scenes.length + 1}`, content: text.slice(i, i + 3000) });
  }
  return scenes;
}

// ── MỚI: Xây dựng system instruction — LỌC nhân vật/thế lực/dòng thời gian theo
// "Mốc hiện tại đang viết tới" (config.currentStoryPoint). Nếu người dùng KHÔNG đặt mốc này
// (viết truyện gốc từ đầu, không phải đồng nhân), currentOrder = undefined → mọi thứ hiển thị
// đầy đủ như trước đây, KHÔNG có gì thay đổi, không ảnh hưởng, không lỗi. ──
export function buildSystemInstruction(state: NovelState): string {
  const { config, characters, worldEntities, rules } = state;
  const currentOrder = config.currentStoryPoint?.order;

  // Nhân vật/thế lực chưa nên xuất hiện (firstAppearanceOrder > mốc hiện tại) bị ẩn hoàn toàn.
  // Nếu currentOrder chưa đặt, hoặc nhân vật chưa gán firstAppearanceOrder → luôn hiển thị (an toàn, không đổi hành vi cũ).
  const isVisible = (firstAppearanceOrder?: number) =>
    currentOrder === undefined || firstAppearanceOrder === undefined || firstAppearanceOrder <= currentOrder;

  const visibleCharacters = characters.filter(c => isVisible(c.firstAppearanceOrder));
  const visibleWorldEntities = worldEntities.filter(w => isVisible(w.firstAppearanceOrder));
  const visibleCharIds = new Set(visibleCharacters.map(c => c.id));

  const charSummary = visibleCharacters.map((c) => {
    const rels = (c.relationships || [])
      .filter(r => visibleCharIds.has(r.targetCharacterId)) // ẩn quan hệ với nhân vật chưa xuất hiện
      .map((r) => {
        const target = characters.find((t) => t.id === r.targetCharacterId);
        return target
          ? `${r.relationType} với ${target.name}${r.description ? ` (${r.description})` : ''}`
          : '';
      }).filter(Boolean).join('; ');
    // Mô tả từ ảnh tham chiếu — ưu tiên dùng để bám sát hình tượng thật, tránh AI tự sáng tạo lệch
    const imageDescs = (c.images || [])
      .filter(img => img.description?.trim())
      .map(img => `${img.label}: ${img.description}`)
      .join(' | ');

    // ── MỚI: Dòng thời gian nhân vật — chỉ lấy các mốc có order <= mốc hiện tại, sắp theo thứ tự ──
    const timelineEntries = (c.timeline || [])
      .filter(e => currentOrder === undefined || e.order <= currentOrder)
      .sort((a, b) => a.order - b.order);
    const timelineText = timelineEntries.length
      ? timelineEntries.map(e => `    · [${e.chapterLabel || '#' + e.order}] (${e.category}): ${e.content}`).join('\n')
      : '';

    return `- ${c.name} (${c.role}, ${c.gender}, ${c.age} tuổi): ${c.personality}.\n  Ngoại hình: ${c.appearance}.\n  Quá khứ: ${c.backStory}.\n  Hiện tại: ${c.currentStatus}.\n  Bí mật/Kinks: ${c.additionalInfo}.${rels ? `\n  Quan hệ: ${rels}.` : ''}${imageDescs ? `\n  [HÌNH ẢNH THAM CHIẾU — BÁM SÁT KHI MIÊU TẢ]: ${imageDescs}` : ''}${timelineText ? `\n  Dòng thời gian (đã xảy ra tính đến hiện tại):\n${timelineText}` : ''}`;
  }).join('\n\n');

  const worldSummary = visibleWorldEntities
    .map((w) => `- ${w.name} (${w.type}): ${w.description}`)
    .join('\n');

  const loreSummary = (rules?.loreEntries ?? [])
    .map(e => `[${e.category}] ${e.title}:\n${e.content}`)
    .join('\n\n');

  const hardRulesBlock = rules?.hardRules
    ? buildHardRulesPrompt(rules.hardRules)
    : '';

  let refSection = '';
  if (config.referenceFileContent) {
    refSection = `\n\n[TÀI LIỆU THAM KHẢO / BỐI CẢNH GỐC]\n${config.referenceFileContent.substring(0, 3000)}`;
  }
  if (config.originalNarrativeVoice) {
    refSection += `\n\n[GIỌNG KỂ GỐC — bám theo khi viết lại hoặc nhảy cảnh]\n${config.originalNarrativeVoice}`;
  }

  const existingCharNames = visibleCharacters.map(c => c.name).join(', ') || 'Chưa có';

  // ── MỚI: Thông báo mốc thời gian + lệnh cấm tuyệt đối nhắc chuyện tương lai ──
  // Chỉ xuất hiện khi người dùng CÓ đặt currentStoryPoint (dùng cho đồng nhân) — nếu không đặt, đoạn này rỗng.
  const timelineNotice = currentOrder !== undefined
    ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nMỐC THỜI GIAN\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n[MỐC HIỆN TẠI ĐANG VIẾT TỚI]: ${config.currentStoryPoint?.label || `#${currentOrder}`}\nToàn bộ nhân vật, mối quan hệ và dòng thời gian liệt kê ở trên ĐÃ ĐƯỢC LỌC sẵn — chỉ còn thông tin xảy ra tính đến mốc này.\nTUYỆT ĐỐI KHÔNG được nhắc đến, ám chỉ, dự đoán, hay để nhân vật biết trước bất kỳ nhân vật/sự kiện/vật phẩm/mối quan hệ nào SAU mốc này — kể cả khi bạn "biết" chúng sẽ xảy ra trong tương lai của nguyên tác. Nếu một nhân vật không có trong danh sách trên, coi như nhân vật đó CHƯA TỪNG TỒN TẠI trong truyện tính đến thời điểm này.`
    : '';

  return `Bạn là nhà văn AI chuyên viết tiểu thuyết mạng Việt Nam đỉnh cao — thể loại: ${[...config.genres, config.customGenre].filter(Boolean).join(', ')}.
Văn phong của bạn: sinh động, cuốn hút, đối thoại sắc bén, nội tâm sâu sắc, cảnh sắc chi tiết đến từng cử chỉ nhỏ.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TÁC PHẨM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[TIÊU ĐỀ]: ${config.title || 'Chưa đặt tên'}
[BỐI CẢNH]: ${config.context || 'Chưa mô tả'}
[VĂN PHONG]: ${config.writingStyle || ''} ${config.customStyle || ''}
[NSFW]: ${config.nsfwEnabled ? 'BẬT — viết cảnh 18+ tự nhiên, không kiểm duyệt' : 'TẮT'}
[INTENSE SMUT]: ${config.intenseSmutEnabled ? 'BẬT — mô tả chi tiết thô tục, ngôn ngữ khiêu khích' : 'TẮT'}
${timelineNotice}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NHÂN VẬT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${charSummary || 'Chưa có nhân vật'}

[THẾ GIỚI / TỔ CHỨC]
${worldSummary || 'Chưa có'}

[LORE & TÀI NGUYÊN]
${loreSummary || 'Chưa có'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHỈ THỊ TÁC GIẢ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rules.mandatory ? `BẮT BUỘC: ${rules.mandatory}` : ''}
${rules.forbidden ? `CẤM KỴ: ${rules.forbidden}` : ''}
${rules.consistencyRules ? `VĂN PHONG: ${rules.consistencyRules}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÀNG BUỘC CỨNG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${hardRulesBlock || ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHONG CÁCH VIẾT — ƯU TIÊN HÀNG ĐẦU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Viết VĂN XUÔI THUẦN TÚY — không markdown, không tiêu đề, không chú thích ngoài lề
• Mỗi cảnh phải có: không gian sống động + hành động cụ thể + đối thoại đặc trưng từng nhân vật + nội tâm chiều sâu
• Đối thoại phải phản ánh đúng tính cách — kẻ lạnh lùng nói ít, người nóng nảy nói nhiều, kẻ xảo quyệt nói vòng vo
• Cảm xúc thể hiện qua hành động và chi tiết vật lý — KHÔNG dùng câu sáo rỗng kiểu "trái tim nàng thắt lại"
• Nhân vật hành động đúng tính cách đã thiết lập, chỉ dùng: ${existingCharNames}
• Nếu nhân vật có [HÌNH ẢNH THAM CHIẾU], PHẢI miêu tả ngoại hình/trang phục/tóc đúng theo mô tả đó — không tự sáng tạo lệch hình tượng đã có
• CHỐNG LẶP TỪ NGỮ: Mô tả ngoại hình/tính cách trong hồ sơ nhân vật ở trên chỉ là DỮ LIỆU THAM CHIẾU để bạn hiểu nhân vật — TUYỆT ĐỐI không chép lại nguyên văn cùng một cụm từ/câu miêu tả đó nhiều lần trong truyện. Mỗi lần nhắc đến một đặc điểm, PHẢI diễn đạt bằng từ ngữ, góc nhìn hoặc chi tiết khác đi so với những lần trước (xem lại đoạn văn đã viết ở trên để tránh trùng). Chỉ nhắc lại đặc điểm ngoại hình khi thực sự phù hợp ngữ cảnh (cảnh cận, góc nhìn nhân vật khác, thay đổi cảm xúc...), không lặp lại rập khuôn ở mọi cảnh${refSection}`;
}

// ─── Build prompt với full context logic ──────────────────────────────────────
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

  // 1. Tóm tắt ngữ cảnh các chương trước (tối đa 3 chương, lấy đoạn cuối)
  const prevSummaries = allChapters
    .slice(Math.max(0, chIdx - 3), chIdx)
    .filter(c => c.content.trim())
    .map((c, i, arr) => {
      const chNumber = allChapters.indexOf(c) + 1;
      // Lấy 600 ký tự cuối — đủ để AI biết mạch truyện kết ở đâu
      const tail = c.content.slice(-600).trim();
      return `--- Chương ${chNumber}: ${c.title} ---\n[Đoạn kết chương]:\n${tail}`;
    })
    .join('\n\n');

  // 2. Nội dung chương hiện tại — lấy 2500 ký tự cuối
  const currentTail = activeChapter.content.trim();
  const contextWindow = currentTail.length > 2500
    ? currentTail.slice(-2500)
    : currentTail;

  // 3. Tóm tắt nhân vật xuất hiện trong mệnh lệnh
  const mentionedChars = state.characters
    .filter(c => authorDirective.includes(c.name))
    .map(c => `${c.name}(${c.role})`).join(', ');

  const [minW, maxW] = targetRange;

  let prompt = '';

  // ── Chế độ Viết lại / Nhảy cảnh — chèn cảnh gốc đã chọn (lấy từ dropdown, không cần copy tay) ──
  if (writeMode === 'scene' && sourceSceneText.trim()) {
    prompt += `════════ CẢNH GỐC (LÀM NỀN — KHÔNG SAO CHÉP NGUYÊN VĂN) ════════\n${sourceSceneText.trim().substring(0, 3000)}\n\n`;
    prompt += `Hãy viết TIẾP từ đúng điểm này, giữ nhân vật/bối cảnh/mạch cảm xúc của đoạn trên, nhưng là nội dung hoàn toàn mới.\n\n`;
  } else if (writeMode === 'rewrite' && sourceSceneText.trim()) {
    prompt += `════════ NỘI DUNG GỐC CẦN VIẾT LẠI ════════\n${sourceSceneText.trim().substring(0, 3000)}\n\n`;
    prompt += `Viết lại toàn bộ đoạn trên bằng văn phong/góc nhìn khác, giữ nguyên cốt truyện, nhân vật, các sự kiện chính.\n\n`;
  } else if (writeMode === 'reborn' && sourceSceneText.trim()) {
    prompt += `════════ TRỌNG SINH — DIỄN BIẾN GỐC MÀ NHÂN VẬT ĐÃ BIẾT TRƯỚC ════════\n${sourceSceneText.trim().substring(0, 4000)}\n\n`;
    prompt += `Nhân vật ${rebornCharacterName || '(chưa chọn)'} đã TRỌNG SINH và BIẾT TRƯỚC toàn bộ diễn biến nêu trên sẽ xảy ra. Hãy viết cảnh trong đó nhân vật này chủ động hành động dựa trên kiến thức biết trước — né tránh nguy hiểm, lợi dụng cơ hội, thay đổi lựa chọn — miễn là hợp lý với tính cách và bối cảnh hiện tại. Các nhân vật khác KHÔNG biết nhân vật này đang "biết trước", trừ khi mệnh lệnh tác giả yêu cầu khác.\n\n`;
  }

  if (prevSummaries) {
    prompt += `════════ BỐI CẢNH CHƯƠNG TRƯỚC ════════\n${prevSummaries}\n\n`;
  }

  if (contextWindow) {
    prompt += `════════ NỘI DUNG ĐANG VIẾT (tiếp ngay sau đây) ════════\n${contextWindow}\n\n`;
  } else {
    prompt += `════════ CHƯƠNG MỚI: ${activeChapter.title} ════════\n(Chương chưa có nội dung — mở đầu tự nhiên tiếp mạch từ chương trước)\n\n`;
  }

  if (activeChapter.outline.trim()) {
    prompt += `════════ DÀN Ý CHƯƠNG ════════\n${activeChapter.outline.trim()}\n\n`;
  }

  prompt += `════════ MỆNH LỆNH TÁC GIẢ ════════\n`;
  prompt += authorDirective.trim() || 'Tiếp tục tự nhiên, giữ mạch truyện và cảm xúc từ đoạn trước.';
  prompt += '\n\n';

  if (mentionedChars) {
    prompt += `[NHÂN VẬT TRỌNG TÂM]: ${mentionedChars}\n\n`;
  }

  prompt += `════════ YÊU CẦU ĐOẠN VIẾT NÀY ════════\n`;
  prompt += `📏 ĐỘ DÀI: Khoảng ${minW}–${maxW} chữ tiếng Việt.\n`;
  prompt += `   Hãy viết đủ chiều sâu — triển khai đầy đủ hành động, đối thoại, nội tâm, cảm giác thể xác.\n`;
  prompt += `   Đừng vội kết thúc cảnh — mỗi chi tiết nhỏ đều có giá trị tạo không khí.\n\n`;
  prompt += `✍️ CÁCH VIẾT:\n`;
  prompt += `   • Tiếp nối trực tiếp từ câu cuối cùng của đoạn trên — không mở lại từ đầu\n`;
  prompt += `   • Kéo dài cảm xúc — một cái nhìn, một hơi thở, một khoảnh khắc im lặng cũng xứng đáng được tả\n`;
  prompt += `   • Đối thoại phải có chiều sâu — nhân vật nói gì, ngập ngừng chỗ nào, giọng điệu ra sao\n`;
  prompt += `   • Nội tâm nhân vật xen kẽ hành động — họ nghĩ gì khi sự việc diễn ra\n`;
  prompt += `   • Cảnh sắc, mùi hương, âm thanh — dùng đủ giác quan để người đọc "sống" trong cảnh\n\n`;
  prompt += `📝 Chỉ trả văn xuôi — bắt đầu ngay vào câu văn, không có lời dẫn hay giải thích.`;

  return prompt;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Page5Compose({ state, updateState, onNavigate }: Page5ComposeProps) {
  const { chapters, currentChapterId, apiKeys } = state;
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiError, setAiError]           = useState<string | null>(null);
  const [previousContent, setPreviousContent] = useState<string | null>(null);
  // Range selector — mặc định 1500-2000
  const [selectedRange, setSelectedRange] = useState<number>(1500);

  // ── Chế độ viết & cảnh gốc (Viết lại / Nhảy cảnh) ──
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

  // ── Chat / Phân tích AI ──
  const [rightTab, setRightTab]         = useState<'write' | 'chat'>('write');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]       = useState('');
  const [chatLoading, setChatLoading]   = useState(false);
  const [chatScope, setChatScope]       = useState<'current' | 'all'>('all'); // context scope
  const [savedToLore, setSavedToLore]   = useState<Set<string>>(new Set());
  const chatEndRef                      = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Sync selectedRange với rules.minWords khi load
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
  const activeKey     = apiKeys.find(k => k.isActive && !k.quotaExceeded) || null;

  const getWordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
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

  const handleUpdateField = (field: keyof Omit<Chapter, 'id'>, value: string) => {
    if (!activeChapter) return;
    updateState((prev) => {
      const ch = prev.chapters.find(c => c.id === activeChapter.id);
      if (ch) ch[field] = value;
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

  // ── Auto scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Build context đầy đủ cho chat ──
  const buildChatContext = useCallback((scope: 'current' | 'all' = 'all'): string => {
    const { config, characters, worldEntities, rules, chapters } = state;
    const charSummary = characters.map(c => {
      const imgDescs = (c.images || []).filter((img: any) => img.description?.trim())
        .map((img: any) => img.description).join('; ');
      return `${c.name}(${c.role},${c.gender},${c.age}): ${c.personality}${imgDescs ? `. Hình ảnh: ${imgDescs.substring(0,150)}` : ''}`;
    }).join(' | ');
    const worldSummary = worldEntities.map(w => `${w.name}(${w.type}): ${w.description}`).join(' | ');
    const loreSummary = (rules.loreEntries || []).map((e: any) => `[${e.category}] ${e.title}: ${e.content.substring(0, 200)}`).join(' | ');

    let chaptersSummary = '';
    if (scope === 'current' && activeChapter) {
      const words = activeChapter.content?.split(/\s+/).filter(Boolean).length || 0;
      chaptersSummary = `[CHƯƠNG ĐANG MỞ: ${activeChapter.title}] (${words} từ)\n${activeChapter.content || '(trống)'}`;
    } else {
      chaptersSummary = chapters.map((ch, i) => {
        const words = ch.content?.split(/\s+/).filter(Boolean).length || 0;
        const snippet = ch.content
          ? (ch.content.length > 1500
              ? ch.content.substring(0, 750) + '\n...[lược bớt]...\n' + ch.content.slice(-400)
              : ch.content)
          : '(trống)';
        return `[Chương ${i+1}: ${ch.title}] (${words} từ)\n${snippet}`;
      }).join('\n\n---\n\n');
    }

    return `TRUYỆN: ${config.title || 'Chưa đặt tên'}
THỂ LOẠI: ${config.genres.join(', ')}
BỐI CẢNH: ${config.context || 'Chưa mô tả'}

NHÂN VẬT (${characters.length}): ${charSummary || 'Chưa có'}
THẾ LỰC (${worldEntities.length}): ${worldSummary || 'Chưa có'}
${loreSummary ? `LORE: ${loreSummary}` : ''}

${scope === 'current' ? 'NỘI DUNG CHƯƠNG ĐANG MỞ:' : `NỘI DUNG ${chapters.length} CHƯƠNG:`}
${chaptersSummary || 'Chưa có chương nào'}`;
  }, [state, activeChapter]);

  // ── Gửi tin nhắn chat ──
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

      const systemPrompt = `Bạn là trợ lý sáng tác chuyên nghiệp, hỗ trợ tác giả phân tích, tư vấn và cải thiện tiểu thuyết.
Bạn có toàn bộ thông tin về tác phẩm sau:

${context}

Nhiệm vụ: Trả lời câu hỏi/yêu cầu của tác giả dựa trên dữ liệu trên.
- Phân tích sâu sắc, có dẫn chứng cụ thể từ nội dung truyện
- Gợi ý thực tế, có thể áp dụng ngay
- Ngôn ngữ thân thiện, ngắn gọn, dễ hiểu
- KHÔNG viết văn xuôi truyện — chỉ phân tích, tư vấn, trả lời`;

      // Xây dựng lịch sử chat để AI có context hội thoại
      const recentHistory = chatMessages.slice(-6).map(m =>
        `${m.role === 'user' ? 'Tác giả' : 'AI'}: ${m.content}`
      ).join('\n');

      const fullPrompt = recentHistory
        ? `[Lịch sử hội thoại gần đây]
${recentHistory}

[Câu hỏi/yêu cầu mới]: ${input}`
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

  // ── Lưu tin nhắn AI vào Lore ──
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

  // ── Chèn phân tích vào dàn ý chương hiện tại ──
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

      const textGenerated = (data.text || '').trim();
      if (!textGenerated) throw new Error('AI trả về nội dung trống rỗng.');

      // Kiểm tra lặp — nếu AI copy > 40% nội dung cũ thì cảnh báo
      if (activeChapter.content.trim()) {
        const oldTail = activeChapter.content.slice(-300).trim();
        if (textGenerated.includes(oldTail.substring(0, 100))) {
          setAiError('⚠️ AI có thể đang lặp nội dung. Kiểm tra kết quả và thử lại với mệnh lệnh cụ thể hơn.');
        }
      }

      setPreviousContent(activeChapter.content);
      const appended = (activeChapter.content ? activeChapter.content + '\n\n' : '') + textGenerated;
      handleUpdateField('content', appended);

      // Scroll xuống cuối
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

  // ── MỚI: hiển thị mốc hiện tại (nếu có đặt) — chỉ đọc, sửa ở trang Nhân Vật ──
  const currentStoryPoint = state.config.currentStoryPoint;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-140px)]" id="compose-workspace">

      {/* ─── SIDEBAR CHƯƠNG ─── */}
      <aside className="w-full lg:w-64 bg-neutral-950/40 border-b lg:border-b-0 lg:border-r border-neutral-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">Mục Lục Chương</h3>
          </div>
          <button onClick={handleAddChapter}
            className="p-1.5 bg-red-950/50 border border-red-800/40 hover:border-red-500/60 rounded-lg text-red-400 hover:text-red-200 transition-colors flex items-center gap-1 text-[11px] font-bold">
            <Plus className="w-3.5 h-3.5" /> Thêm
          </button>
        </div>

        {/* MỚI: hiển thị mốc hiện tại đang viết tới (nếu có đặt ở Page3) */}
        {currentStoryPoint && (
          <div className="px-4 py-2 border-b border-neutral-900 bg-cyan-950/10 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
            <p className="text-[9px] text-cyan-300 leading-relaxed">
              Đang ở mốc: <strong>{currentStoryPoint.label || `#${currentStoryPoint.order}`}</strong> — nhân vật/thông tin sau mốc này đã bị ẩn khỏi AI. Sửa ở trang Nhân Vật.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto max-h-[250px] lg:max-h-[60vh] p-2 space-y-1">
          {chapters.map((ch, i) => {
            const isSelected = activeChapter?.id === ch.id;
            const words = getWordCount(ch.content);
            return (
              <div key={ch.id}
                className={`flex items-center justify-between p-3 rounded-xl transition-all border ${
                  isSelected ? 'bg-red-950/20 border-red-900/60 text-red-300' : 'bg-transparent border-transparent hover:bg-neutral-900/40 text-gray-400 hover:text-gray-200'
                }`}>
                {/* Vùng click chọn chương — flex-1 */}
                <div className="min-w-0 flex-1 pr-2 cursor-pointer"
                  onClick={() => { updateState(prev => { prev.currentChapterId = ch.id; }); setPreviousContent(null); }}>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[10px] font-mono text-gray-600">#{i + 1}</span>
                    <h4 className="text-xs font-semibold truncate">{ch.title || 'Chưa đặt tên'}</h4>
                  </div>
                  <p className="text-[9px] font-mono text-gray-500 mt-0.5">{words.toLocaleString()} từ</p>
                </div>
                {/* Nút xóa — luôn hiển thị, không ẩn sau hover */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteChapter(ch.id, e);
                  }}
                  className="p-1.5 text-neutral-700 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-all shrink-0 active:scale-95"
                  title="Xoá chương">
                  <Trash2 className="w-3.5 h-3.5" />
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

          {/* CỘT TRÁI: SOẠN THẢO */}
          <section className="flex-1 p-5 flex flex-col space-y-4">

            {/* Header chương */}
            <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-1">Tiêu đề chương</span>
                <input type="text" value={activeChapter.title} onChange={e => handleUpdateField('title', e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-gray-100 focus:outline-none focus:border-b focus:border-red-500 pb-0.5"
                  spellCheck={false} />
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <span className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
                  currentWords < selectedOption.range[0]
                    ? 'text-amber-500 border-amber-900/40 bg-amber-950/20'
                    : 'text-green-400 border-green-900/40 bg-green-950/20'
                }`}>
                  {currentWords.toLocaleString()} từ
                </span>
                {previousContent !== null && (
                  <button onClick={handleUndo}
                    className="px-2.5 py-1 border border-amber-900/50 bg-amber-950/20 hover:bg-amber-950/50 text-amber-300 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1">
                    <Undo className="w-3 h-3" /> Hoàn tác AI
                  </button>
                )}
              </div>
            </div>

            {/* Textarea */}
            <div className="flex-1 flex flex-col relative min-h-[350px]">
              <textarea ref={textareaRef} value={activeChapter.content} onChange={e => handleUpdateField('content', e.target.value)}
                placeholder="Nội dung chương truyện đang viết..."
                className="w-full flex-1 bg-neutral-950 border border-neutral-850 focus:border-red-900/80 rounded-2xl p-4 text-xs text-gray-300 focus:outline-none leading-relaxed resize-none overflow-y-auto font-sans"
                spellCheck={false} />
              {currentWords === 0 && (
                <div className="absolute inset-x-4 top-16 pointer-events-none text-center p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl max-w-md mx-auto">
                  <AlignLeft className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                  <p className="text-[11px] text-gray-400">Chương này đang để trống.</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                    Nhập dàn ý & mệnh lệnh bên phải rồi bấm AI viết, hoặc tự viết tay vào đây.
                  </p>
                </div>
              )}
            </div>

            {/* Chèn tên nhân vật nhanh */}
            {state.characters.length > 0 && (
              <div>
                <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mb-2">Chèn nhanh tên nhân vật:</p>
                <div className="flex flex-wrap gap-1.5">
                  {state.characters.map(char => (
                    <button key={char.id} onClick={() => insertAtCursor(char.name)}
                      className="px-2.5 py-1 bg-neutral-900/80 border border-neutral-800 hover:border-red-950 hover:text-red-400 rounded-lg text-[10px] text-gray-400 transition-all font-semibold">
                      +{char.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* CỘT PHẢI: AI CONTROLS + CHAT */}
          <section className="w-full lg:w-80 bg-neutral-950/20 flex flex-col shrink-0 max-h-[100vh]">

            {/* Tab chuyển đổi Viết / Chat */}
            <div className="flex border-b border-neutral-800 shrink-0">
              <button
                onClick={() => setRightTab('write')}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  rightTab === 'write'
                    ? 'text-amber-400 border-b-2 border-amber-500 bg-neutral-900/40'
                    : 'text-gray-500 hover:text-gray-300'
                }`}>
                <PenTool className="w-3.5 h-3.5" /> Viết Truyện
              </button>
              <button
                onClick={() => setRightTab('chat')}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  rightTab === 'chat'
                    ? 'text-violet-400 border-b-2 border-violet-500 bg-neutral-900/40'
                    : 'text-gray-500 hover:text-gray-300'
                }`}>
                <MessageSquare className="w-3.5 h-3.5" /> Phân Tích AI
                {chatMessages.length > 0 && (
                  <span className="w-4 h-4 bg-violet-600 rounded-full text-[8px] text-white flex items-center justify-center font-mono">
                    {chatMessages.filter(m => m.role === 'assistant').length}
                  </span>
                )}
              </button>
            </div>

            {/* ── TAB VIẾT ── */}
            {rightTab === 'write' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* ── Chế độ viết + chọn cảnh gốc — mới ── */}
            <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-gray-200">🎬 Chế Độ Viết</span>
              <div className="grid grid-cols-2 gap-1.5">
                {WRITE_MODES.map(m => (
                  <button key={m.v} onClick={() => setWriteMode(m.v)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] border transition-all ${
                      writeMode === m.v
                        ? 'bg-violet-900/40 border-violet-600/60 text-violet-200'
                        : 'bg-neutral-950/60 border-neutral-800 text-gray-500 hover:border-neutral-600'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>

              {writeMode === 'reborn' && (
                <div className="pt-1">
                  <label className="block text-[9px] text-gray-500 mb-1">Nhân vật trọng sinh</label>
                  <select value={rebornCharacterId} onChange={e => setRebornCharacterId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[11px] text-gray-300 focus:outline-none focus:border-violet-600">
                    <option value="">-- Chọn nhân vật --</option>
                    {state.characters.map(c => <option key={c.id} value={c.id}>{c.name} · {c.role}</option>)}
                  </select>
                  {state.characters.length === 0 && (
                    <p className="text-[9px] text-amber-500 mt-1">Chưa có nhân vật — vào trang Nhân Vật để thêm hoặc nhập từ Đồng Nhân.</p>
                  )}
                </div>
              )}

              {writeMode !== 'continue' && (
                scenes.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <input placeholder="Tìm cảnh (VD: Chương 45)..." value={sceneSearch}
                      onChange={e => setSceneSearch(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-[10px] text-gray-300 focus:outline-none focus:border-violet-600" />
                    <select
                      onChange={e => {
                        const idx = Number(e.target.value);
                        if (writeMode === 'reborn') {
                          // Trọng sinh: lấy TOÀN BỘ nội dung từ mốc đã chọn về sau (không chỉ 1 cảnh) — đó là "điều nhân vật đã biết trước"
                          const future = scenes.slice(idx).map(s => s.content).join('\n');
                          setSourceSceneText(future);
                        } else {
                          setSourceSceneText(scenes[idx]?.content || '');
                        }
                      }}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[11px] text-gray-300 focus:outline-none focus:border-violet-600">
                      <option value="">{writeMode === 'reborn' ? '-- Chọn mốc trọng sinh --' : '-- Chọn cảnh gốc --'}</option>
                      {filteredScenes.map((s) => {
                        const realIdx = scenes.indexOf(s);
                        return <option key={realIdx} value={realIdx}>{s.label}</option>;
                      })}
                    </select>
                    {sourceSceneText && (
                      <p className="text-[9px] text-gray-600">
                        {writeMode === 'reborn' ? 'Diễn biến đã biết trước: ' : 'Đã chọn: '}
                        {sourceSceneText.length.toLocaleString()} ký tự
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-500 pt-1">
                    Chưa có dữ liệu gốc — vào "Đồng Nhân" (nút ở trang Bắt Đầu) phân tích một truyện trước.
                  </p>
                )
              )}
            </div>

            {/* Dàn ý chương */}
            <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>Dàn Ý Chương (Phác thảo)</span>
              </div>
              <textarea rows={3}
                placeholder="Ví dụ: Trần Phong gặp gỡ Lý Vân trong rừng rậm, giải cứu nàng thoát khỏi truy sát..."
                value={activeChapter.outline} onChange={e => handleUpdateField('outline', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[11px] text-gray-300 focus:outline-none focus:border-amber-600 leading-relaxed resize-none"
                spellCheck={false} />
            </div>

            {/* Mệnh lệnh */}
            <div className="bg-neutral-900 border border-red-950/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-300">
                <PenTool className="w-4 h-4 text-red-500 animate-pulse" />
                <span>Mệnh Lệnh / Ý Muốn Tác Giả</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">AI viết tiếp theo đúng mệnh lệnh này — tự kết nối mạch với đoạn trước.</p>
              <textarea rows={4}
                placeholder="Yêu cầu đoạn tiếp theo viết gì... (Ví dụ: Viết cảnh Trần Phong dùng thần lôi áp đảo đối thủ...)"
                value={activeChapter.prompt} onChange={e => handleUpdateField('prompt', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[11px] text-gray-300 focus:outline-none focus:border-red-500 leading-relaxed resize-none"
                spellCheck={false} />
              <div>
                <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mb-2">Gợi ý nhanh sắc thái:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRESET_PROMPTS.map(p => (
                    <button key={p.label} onClick={() => handleUpdateField('prompt', p.text)}
                      className="px-2 py-1.5 bg-neutral-950 border border-neutral-800 hover:border-red-900/60 rounded text-[9px] text-gray-400 hover:text-red-300 text-left transition-all font-medium leading-tight truncate"
                      title={p.text}>{p.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Chọn độ dài — mới ── */}
            <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-200">📏 Độ Dài Đoạn Viết</span>
                <span className="text-[10px] font-mono text-violet-400 bg-violet-950/30 px-2 py-0.5 rounded border border-violet-800/30">
                  {selectedOption.label}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                AI sẽ viết trong <strong className="text-gray-300">khoảng</strong> này — không nhồi chữ, không cắt cụt.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {WORD_RANGE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => handleRangeChange(opt.value)}
                    className={`px-2.5 py-2 rounded-xl border text-left transition-all ${
                      selectedRange === opt.value
                        ? 'bg-violet-900/40 border-violet-600/60 text-violet-200'
                        : 'bg-neutral-950/60 border-neutral-800 text-gray-500 hover:border-neutral-600 hover:text-gray-300'
                    }`}>
                    <p className="text-[11px] font-bold">{opt.label}</p>
                    <p className="text-[9px] opacity-70 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Cảnh báo chọn quá dài */}
              {selectedRange >= 4000 && (
                <div className="px-3 py-2 bg-amber-950/30 border border-amber-800/30 rounded-lg text-[10px] text-amber-400">
                  ⚠️ Đoạn rất dài — AI có thể bị lặp hoặc giảm chất lượng cuối đoạn. Nên dùng 1500–3500 chữ và gọi nhiều lần.
                </div>
              )}
            </div>

            {/* AI Action */}
            <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-[10px] border-b border-neutral-800 pb-2">
                <span className="text-gray-500 font-mono">AI ENGINE</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${activeKey && !activeKey.quotaExceeded ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                  <span className="text-gray-300 font-bold font-mono">{activeKey ? activeKey.provider.toUpperCase() : 'FREE HOSTING'}</span>
                </div>
              </div>

              {activeKey && (
                <div className="text-[9px] text-gray-500 font-mono flex items-center justify-between">
                  <span>MODEL:</span>
                  <span className="text-amber-500/80 truncate max-w-[130px]">{activeKey.customModel || 'default'}</span>
                </div>
              )}

              <button onClick={handleAIGenerateNext} disabled={aiLoading}
                className="w-full py-3 bg-gradient-to-r from-red-800 to-amber-700 hover:from-red-700 hover:to-amber-600 disabled:from-neutral-800 disabled:to-neutral-800 border border-red-700/50 disabled:border-transparent text-white disabled:text-gray-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 disabled:shadow-none transition-all disabled:cursor-not-allowed">
                {aiLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin text-amber-400" /><span>AI đang viết tiếp...</span></>
                  : <><Sparkles className="w-4 h-4 text-amber-400" /><span>🤖 AI VIẾT ĐOẠN TIẾP THEO</span></>}
              </button>

              {aiLoading && (
                <p className="text-[10px] text-gray-500 text-center animate-pulse">
                  Đang xử lý {selectedOption.label}... (~5–20 giây)
                </p>
              )}

              {aiError && (
                <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-xl text-[10px] text-red-300 leading-relaxed flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">LỖI:</span> {aiError}
                    <p className="mt-1 text-gray-500 text-[9px]">Thử đổi API Key hoặc giảm độ dài đoạn viết.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-red-950/10 border border-red-900/20 rounded-xl text-[9px] text-red-400/80 leading-relaxed flex gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <div>
                Hệ thống tự động đồng bộ bối cảnh chương trước, nhân vật, lore và ràng buộc cứng vào AI.
                Mỗi lần viết đều kết nối <strong>liền mạch</strong> với đoạn cuối cùng.
                {currentStoryPoint && ' Nhân vật/thông tin sau mốc hiện tại đã được tự động ẩn.'}
              </div>
            </div>
            </div>
            )}

            {/* ── TAB CHAT / PHÂN TÍCH ── */}
            {rightTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0">

              {/* Context scope selector */}
              <div className="px-3 pt-2.5 pb-2 border-b border-neutral-800 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono">AI đọc context</span>
                  <div className="flex gap-1">
                    <button onClick={() => setChatScope('all')}
                      className={`px-2 py-0.5 rounded-lg text-[9px] border transition-colors ${chatScope === 'all' ? 'bg-violet-900/40 border-violet-700/50 text-violet-300' : 'border-neutral-800 text-gray-600 hover:text-gray-400'}`}>
                      Tất cả ({state.chapters.length} chương)
                    </button>
                    <button onClick={() => setChatScope('current')}
                      className={`px-2 py-0.5 rounded-lg text-[9px] border transition-colors ${chatScope === 'current' ? 'bg-violet-900/40 border-violet-700/50 text-violet-300' : 'border-neutral-800 text-gray-600 hover:text-gray-400'}`}>
                      Chương hiện tại
                    </button>
                  </div>
                </div>

                {/* Gợi ý nhanh dạng icon grid */}
                <div className="grid grid-cols-4 gap-1">
                  {QUICK_ANALYSIS.slice(0, 8).map(q => (
                    <button key={q.label} onClick={() => handleSendChat(q.prompt)}
                      disabled={chatLoading}
                      title={q.label}
                      className="flex flex-col items-center gap-0.5 py-1.5 bg-neutral-950/60 hover:bg-violet-950/20 border border-neutral-800 hover:border-violet-800/40 rounded-lg transition-colors disabled:opacity-40 group">
                      <span className="text-base leading-none">{q.icon}</span>
                      <span className="text-[8px] text-gray-600 group-hover:text-violet-400 text-center leading-tight px-0.5 line-clamp-2">{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lịch sử chat */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {chatMessages.length === 0 ? (
                  <div className="py-8 text-center text-gray-600 text-[11px] leading-relaxed">
                    <Bot className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                    <p className="font-medium text-gray-500">Trợ lý phân tích sáng tác</p>
                    <p className="text-[10px] mt-1 text-gray-700">Bấm gợi ý nhanh hoặc tự gõ câu hỏi bên dưới</p>
                  </div>
                ) : (
                  chatMessages.map(msg => (
                    <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        msg.role === 'user' ? 'bg-red-900/60' : 'bg-violet-900/60'
                      }`}>
                        {msg.role === 'user'
                          ? <User className="w-2.5 h-2.5 text-red-400" />
                          : <Bot className="w-2.5 h-2.5 text-violet-400" />}
                      </div>
                      <div className={`flex-1 rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-red-950/30 border border-red-900/30 text-gray-200 ml-auto max-w-[85%]'
                          : 'bg-neutral-900 border border-neutral-800 text-gray-300'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center gap-1.5 mt-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[9px] opacity-30">
                            {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                          </span>
                          {msg.role === 'assistant' && (
                            <>
                              <button
                                onClick={() => handleSaveToLore(msg.id, msg.content)}
                                disabled={savedToLore.has(msg.id)}
                                title="Lưu vào Lore (Trang 4)"
                                className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                                  savedToLore.has(msg.id)
                                    ? 'border-green-800/40 text-green-600'
                                    : 'border-neutral-700 text-gray-600 hover:border-indigo-700/50 hover:text-indigo-400'
                                }`}>
                                {savedToLore.has(msg.id) ? '✓ Đã lưu lore' : '📚 Lưu lore'}
                              </button>
                              <button
                                onClick={() => handleInsertToOutline(msg.content)}
                                title="Chèn vào dàn ý chương"
                                className="text-[9px] px-1.5 py-0.5 rounded border border-neutral-700 text-gray-600 hover:border-amber-700/50 hover:text-amber-400 transition-colors">
                                📋 Dàn ý
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex gap-2">
                    <div className="w-5 h-5 rounded-full bg-violet-900/60 flex items-center justify-center shrink-0">
                      <Bot className="w-2.5 h-2.5 text-violet-400" />
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{animationDelay:'0ms'}} />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{animationDelay:'150ms'}} />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{animationDelay:'300ms'}} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input gửi tin nhắn */}
              <div className="p-3 border-t border-neutral-800 shrink-0 space-y-2">
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    placeholder="Hỏi AI về truyện... (Enter gửi, Shift+Enter xuống dòng)"
                    className="flex-1 bg-neutral-950 border border-neutral-700 focus:border-violet-600/60 rounded-xl px-3 py-2 text-[11px] text-gray-200 focus:outline-none resize-none leading-relaxed"
                    spellCheck={false}
                    disabled={chatLoading}
                  />
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => handleSendChat()}
                      disabled={chatLoading || !chatInput.trim()}
                      className="p-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white transition-colors">
                      {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                    {chatMessages.length > 0 && (
                      <button onClick={() => { setChatMessages([]); setSavedToLore(new Set()); }}
                        title="Xoá lịch sử chat"
                        className="p-2 bg-neutral-800 hover:bg-red-950/40 hover:text-red-400 text-gray-500 rounded-xl transition-colors">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[9px] text-gray-700 text-center">
                  {chatScope === 'all'
                    ? `Đọc ${state.chapters.length} chương · ${state.characters.length} nhân vật`
                    : `Chỉ đọc: ${activeChapter?.title || 'chưa chọn chương'}`}
                  · {chatMessages.filter(m=>m.role==='assistant').length} phản hồi
                </p>
              </div>
            </div>
            )} {/* end tab chat */}

          </section>
        </div>
      )}
    </div>
  );
}
