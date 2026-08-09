import React, { useState, useEffect } from 'react';
import {
  Users, Globe, Plus, Trash2, Edit2, Link, Sparkles, Loader2, CheckCircle2,
  RefreshCw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Check,
  ImagePlus, Image as ImageIcon, Wand2, Clock
} from 'lucide-react';
import { NovelState, Character, Relationship, WorldEntity, CharacterImage, CharacterTimelineEntry, StoryEvent, FashionStyle, Ability, SpeciesTraits } from '../types';
import { callApi } from '../utils/api';

interface Page3CharactersProps {
  state: NovelState;
  updateState: (updater: (prev: NovelState) => void) => void;
  onNavigate: (tabId: string) => void;
}

// ─── Vai trò ──────────────────────────────────────────────────────────────
const ROLES = [
  { value: 'Nam chính', label: 'Nam chính' },
  { value: 'Nữ chính', label: 'Nữ chính' },
  { value: 'Nam phụ', label: 'Nam phụ' },
  { value: 'Nữ phụ', label: 'Nữ phụ' },
  { value: 'Người yêu', label: 'Người yêu / Người tình' },
  { value: 'Phản diện', label: 'Phản diện' },
  { value: 'Tình địch', label: 'Tình địch' },
  { value: 'Trợ thủ', label: 'Trợ thủ' },
  { value: 'Sư phụ', label: 'Sư phụ / Tiền bối' },
  { value: 'Bạn thân', label: 'Bạn thân' },
  { value: 'Kẻ thù', label: 'Kẻ thù' },
  { value: 'Gia đình', label: 'Gia đình / Người thân' },
  { value: 'Nhân vật phụ', label: 'Nhân vật phụ' },
];

// ✅ B1: Thêm bảng ánh xạ quan hệ ngược
const INVERSE_RELATION_MAP: Record<string, string> = {
  'Người yêu': 'Người yêu',
  'Vợ': 'Chồng',
  'Chồng': 'Vợ',
  'Đạo lữ': 'Đạo lữ',
  'Người tình bí mật': 'Người tình bí mật',
  'Harem': 'Chủ nhân',
  'Nô dịch': 'Chủ nhân',
  'Chủ nhân': 'Nô dịch',
  'Lô đỉnh': 'Chủ nhân',
  'Tình địch': 'Tình địch',
  'Cừu hận': 'Cừu hận',
  'Kẻ thù': 'Kẻ thù',
  'Phản bội': 'Bị phản bội',
  'Tỷ muội': 'Tỷ muội',
  'Huynh đệ': 'Huynh đệ',
  'Sư phụ': 'Đệ tử',
  'Đệ tử': 'Sư phụ',
  'Đồng môn': 'Đồng môn',
  'Bạn thân': 'Bạn thân',
  'Đồng minh': 'Đồng minh',
  'Cấp trên': 'Cấp dưới',
  'Cấp dưới': 'Cấp trên',
};

function guessInverseRelation(type: string): string {
  return INVERSE_RELATION_MAP[type] || type;
}

const WORLD_TYPES = [
  { value: 'Tông môn', label: 'Tông môn' },
  { value: 'Gia tộc', label: 'Gia tộc' },
  { value: 'Địa danh / Địa điểm', label: 'Địa danh / Địa điểm' },
  { value: 'Tập đoàn', label: 'Tập đoàn' },
  { value: 'Hệ thống', label: 'Hệ thống' },
  { value: 'Chủng tộc', label: 'Chủng tộc (yêu tinh, thần thú...)' },
  { value: 'Khái niệm', label: 'Khái niệm' },
  { value: 'Vật phẩm', label: 'Vật phẩm' },
  { value: 'Nguyên tắc', label: 'Nguyên tắc / Quy tắc thế giới' },
];

const CATEGORY_SUGGESTIONS = [
  'Công pháp', 'Chiêu thức', 'Thể chất / Thể trạng', 'Kỳ ngộ', 'Đan dược đã dùng',
  'Cơ duyên', 'Vũ khí', 'Linh thú', 'Trợ giúp / Quý nhân', 'Thân phận',
  'Gia tộc / Thế lực đứng sau', 'Địa vị / Chức vụ', 'Mối quan hệ', 'Sự kiện lớn',
  'Phó bản / Thí luyện', 'Trận đánh lớn', 'Thương tích / Di chứng', 'Bí mật đang giữ',
  'Lời thề / Giao ước', 'Tài sản', 'Danh tiếng / Tin đồn', 'Kẻ thù', 'Món nợ ân tình',
  'Ngoại hình thay đổi', 'Tâm lý / Góc nhìn thay đổi', 'Khác',
];

const QUICK_PROMPTS = [
  'Nữ chính tu tiên xinh đẹp lạnh lùng, ẩn chứa bí mật gia tộc',
  '3 nữ phụ harem cá tính khác nhau: tsundere, dịu dàng, điên cuồng',
  'Phản diện nam quyền lực, từng là người yêu cũ nữ chính',
  'Sư tôn nữ huyền bí, quan hệ thầy trò phức tạp với nam chính',
  'Tình địch nam đẹp trai, giàu có, si mê nữ chính',
  '2 nhân vật phụ hài hước, trung thành với nam chính',
];

// ─── HẰNG SỐ CHO ABILITY ──────────────────────────────────────────────────
const ABILITY_TYPES = [
  { value: 'Công kích', color: 'red' },
  { value: 'Phòng thủ', color: 'blue' },
  { value: 'Thân pháp', color: 'emerald' },
  { value: 'Hỗ trợ', color: 'violet' },
  { value: 'Bị động', color: 'gray' },
];

// ─── UTILITY: ensureString ──────────────────────────────────────────────
function ensureString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.map(ensureString).filter(Boolean).join(', ');
    }
    return Object.entries(val)
      .map(([k, v]) => {
        const formattedKey = k.replace(/_/g, ' ');
        const valueStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return `${formattedKey}: ${valueStr}`;
      })
      .join('; ');
  }
  return String(val);
}

// ─── HÀM GỌI API: generateStoryEventsFromAI ─────────────────────────────
async function generateStoryEventsFromAI(
  prompt: string,
  quantity: number,
  novelContext: { title: string; genres: string[]; context: string },
  existingEvents: { order: number; chapterLabel: string; title: string; content: string }[],
  characterNames: string[],
  apiKeys: any[]
): Promise<Omit<StoryEvent, 'id'>[]> {
  const activeKey = apiKeys.find((k: any) => k.isActive && !k.quotaExceeded) || null;

  const sortedEvents = [...existingEvents].sort((a, b) => a.order - b.order);
  const lastOrder = sortedEvents.length ? sortedEvents[sortedEvents.length - 1].order : 0;
  const recentContext = sortedEvents.slice(-15)
    .map(e => `[#${e.order}] ${e.title}: ${e.content}`).join('\n');

  const systemPrompt = `Bạn là AI xây dựng cốt truyện cho tiểu thuyết mạng Việt Nam.
Truyện: "${novelContext.title || 'Chưa đặt tên'}"
Thể loại: ${novelContext.genres.join(', ') || 'Chưa chọn'}
Bối cảnh: ${novelContext.context || 'Chưa mô tả'}
Nhân vật hiện có: ${characterNames.join(', ') || 'Chưa có'}

Dòng thời gian cốt truyện ĐÃ CÓ (theo thứ tự, số càng lớn càng về sau):
${recentContext || '(chưa có sự kiện nào)'}

Nhiệm vụ: Sáng tác tiếp ĐÚNG ${quantity} sự kiện cốt truyện MỚI, nối tiếp logic và mạch cảm xúc từ các sự kiện đã có, theo đúng yêu cầu của tác giả bên dưới. Mỗi sự kiện là 1 biến cố/diễn biến quan trọng của mạch truyện (không nhất thiết thuộc riêng 1 nhân vật).
Đánh số order tăng dần bắt đầu từ ${lastOrder + 1}.
Trả về JSON array, KHÔNG markdown, KHÔNG giải thích, chỉ JSON thuần.
Mỗi phần tử gồm: order (số), chapterLabel (nhãn ngắn, VD "Chương ${lastOrder + 1}" hoặc để tác giả tự đặt sau), title (tiêu đề ngắn), content (diễn biến chi tiết 2-4 câu).`;

  const userPrompt = `Yêu cầu của tác giả: ${prompt}\n\nSáng tác đúng ${quantity} sự kiện tiếp theo. Ví dụ format:\n[{"order":${lastOrder + 1},"chapterLabel":"...","title":"...","content":"..."}]`;

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

  const data = await callApi('generate', body);

  let text = (data.text || '').trim().normalize('NFC').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ. Thử lại.');
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error('Định dạng JSON không hợp lệ.');

  return parsed.map((e: any, i: number) => ({
    order: typeof e.order === 'number' ? e.order : lastOrder + 1 + i,
    chapterLabel: ensureString(e.chapterLabel) || `Đoạn ${lastOrder + 1 + i}`,
    title: ensureString(e.title) || 'Sự kiện mới',
    content: ensureString(e.content),
    relatedCharacterIds: [],
  }));
}

// ─── HÀM GỌI API: generateCharactersFromAI ──────────────────────────────
async function generateCharactersFromAI(
  prompt: string,
  novelContext: { title: string; genres: string[]; context: string; nsfwEnabled: boolean; existingChars: string[] },
  apiKeys: any[],
  refAppearanceHint?: string
): Promise<Omit<Character, 'id'>[]> {
  const activeKey = apiKeys.find((k: any) => k.isActive && !k.quotaExceeded) || null;

  const refBlock = refAppearanceHint?.trim()
    ? `\n\n[THAM KHẢO TỪ ẢNH MẪU — ưu tiên áp dụng nhan sắc/vóc dáng/thần thái mô tả dưới đây cho nhân vật mới; PHẦN TRANG PHỤC chỉ là GU THẨM MỸ tham khảo, KHÔNG bắt buộc sao chép y nguyên — hãy sáng tạo trang phục đa dạng phù hợp với gu đó]:\n${refAppearanceHint.trim()}`
    : '';

  const systemPrompt = `Bạn là AI chuyên tạo nhân vật cho tiểu thuyết mạng Việt Nam.
Truyện: "${novelContext.title || 'Chưa đặt tên'}"
Thể loại: ${novelContext.genres.join(', ') || 'Chưa chọn'}
Bối cảnh: ${novelContext.context || 'Chưa mô tả'}
NSFW: ${novelContext.nsfwEnabled ? 'Bật - cho phép chi tiết người lớn, kinks, fetish' : 'Tắt'}
Nhân vật đã có: ${novelContext.existingChars.join(', ') || 'Chưa có'}${refBlock}

Nhiệm vụ: Tạo nhân vật theo yêu cầu của tác giả.
Trả về JSON array, KHÔNG có markdown, KHÔNG có giải thích, chỉ JSON thuần.
Mỗi nhân vật gồm: name, gender, age, role, appearance, personality, backStory, currentStatus, additionalInfo.
additionalInfo: ghi bí mật, kinks, điểm yếu thầm kín${novelContext.nsfwEnabled ? ', fetish nếu phù hợp' : ''}.
Tên nhân vật phải phù hợp thể loại truyện (cổ trang thì tên Hán Việt, hiện đại thì tên Việt hiện đại).
Không trùng tên nhân vật đã có.`;

  const userPrompt = `Tạo nhân vật theo gợi ý sau: ${prompt}
Trả về JSON array. Ví dụ format:
[{"name":"Lý Vân","gender":"Nữ","age":"19","role":"Nữ chính","appearance":"Tóc đen dài...","personality":"Lạnh lùng...","backStory":"Gia tộc bị diệt...","currentStatus":"Đang ẩn thân...","additionalInfo":"Sợ bóng tối..."}]`;

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

  const data = await callApi('generate', body);

  let text = (data.text || '').trim().normalize('NFC');
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ. Thử lại.');

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error('Định dạng JSON không hợp lệ.');

  return parsed.map((c: any) => ({
    name: ensureString(c.name) || 'Không tên',
    gender: ensureString(c.gender) || 'Nữ',
    age: ensureString(c.age) || '18',
    role: ensureString(c.role) || 'Nhân vật phụ',
    appearance: ensureString(c.appearance),
    personality: ensureString(c.personality),
    backStory: ensureString(c.backStory),
    currentStatus: ensureString(c.currentStatus),
    additionalInfo: ensureString(c.additionalInfo),
    relationships: [],
    images: [],
    timeline: [],
    abilities: [],
    fashionStyles: [],
  }));
}

// ─── HÀM GỌI API: generateWorldEntitiesFromAI ───────────────────────────
async function generateWorldEntitiesFromAI(
  prompt: string,
  quantity: number,
  categories: string[],
  novelContext: { title: string; genres: string[]; context: string; existingNames: string[] },
  apiKeys: any[]
): Promise<Omit<WorldEntity, 'id'>[]> {
  const activeKey = apiKeys.find((k: any) => k.isActive && !k.quotaExceeded) || null;

  const categoryBlock = categories.length
    ? `CHỈ tạo các mục thuộc đúng (những) loại sau: ${categories.join(', ')}. Nếu có nhiều loại, phân bổ đa dạng giữa các loại đó.`
    : `Có thể tạo đa dạng nhiều loại khác nhau (khái niệm, địa danh/địa điểm, vật phẩm, chủng tộc, nguyên tắc/quy tắc thế giới, tông môn, gia tộc, hệ thống, hoặc loại khác phù hợp) — đừng tạo toàn 1 loại.`;

  const systemPrompt = `Bạn là AI xây dựng thế giới (worldbuilding) cho tiểu thuyết mạng Việt Nam.
Truyện: "${novelContext.title || 'Chưa đặt tên'}"
Thể loại: ${novelContext.genres.join(', ') || 'Chưa chọn'}
Bối cảnh: ${novelContext.context || 'Chưa mô tả'}
Đã có sẵn (KHÔNG được trùng tên hay trùng ý tưởng): ${novelContext.existingNames.join(', ') || 'Chưa có'}

Nhiệm vụ: Tạo ĐÚNG ${quantity} mục thế giới theo yêu cầu của tác giả.
${categoryBlock}
Mỗi mục PHẢI khác biệt nhau, không trùng lặp ý tưởng, không trùng tên đã có ở trên.
Trả về JSON array, KHÔNG markdown, KHÔNG giải thích, chỉ JSON thuần.
Mỗi phần tử gồm đúng 3 trường: name (tên ngắn gọn), type (loại — ghi đúng 1 trong các loại được yêu cầu ở trên, hoặc loại phù hợp nếu không giới hạn), description (mô tả chi tiết 2-4 câu: đặc điểm, vai trò trong thế giới, sức mạnh/quy tắc/công dụng, liên hệ với bối cảnh truyện).`;

  const userPrompt = `Yêu cầu của tác giả: ${prompt}\n\nTạo đúng ${quantity} mục. Ví dụ format:\n[{"name":"...","type":"...","description":"..."}]`;

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

  const data = await callApi('generate', body);

  let text = (data.text || '').trim().normalize('NFC');
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ. Thử lại.');

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error('Định dạng JSON không hợp lệ.');

  return parsed.map((w: any) => ({
    name: ensureString(w.name) || 'Không tên',
    type: ensureString(w.type) || (categories[0] || 'Khác'),
    description: ensureString(w.description),
  }));
}

// ─── HÀM MỚI: generateFashionStyleFromAI ──────────────────────────────────
async function generateFashionStyleFromAI(
  prompt: string,
  characterContext: { name: string; gender: string; role: string },
  apiKeys: any[]
): Promise<Omit<FashionStyle, 'id' | 'source'>> {
  const activeKey = apiKeys.find((k: any) => k.isActive && !k.quotaExceeded) || null;

  const systemPrompt = `Bạn là AI thiết kế trang phục cho nhân vật tiểu thuyết mạng Việt Nam.
Nhân vật: ${characterContext.name || 'Chưa đặt tên'} (${characterContext.gender}, ${characterContext.role})

Nhiệm vụ: Thiết kế 1 bộ trang phục theo yêu cầu của tác giả.
Trả về JSON object, KHÔNG markdown, KHÔNG giải thích, chỉ JSON thuần.
Gồm: name (tên bộ trang phục), context (bối cảnh mặc: sinh hoạt/chiến đấu/dạ hội...), 
description (mô tả chi tiết kiểu dáng, chi tiết trang trí), 
colorPalette (tông màu), material (chất liệu), significance (ý nghĩa/nguồn gốc).`;

  const userPrompt = `Yêu cầu: ${prompt}\n\nVí dụ format:\n{"name":"...","context":"...","description":"...","colorPalette":"...","material":"...","significance":"..."}`;

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

  const data = await callApi('generate', body);

  let text = (data.text || '').trim().normalize('NFC').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ. Thử lại.');
  const parsed = JSON.parse(match[0]);

  return {
    name: ensureString(parsed.name) || 'Trang phục mới',
    context: ensureString(parsed.context),
    description: ensureString(parsed.description),
    colorPalette: ensureString(parsed.colorPalette),
    material: ensureString(parsed.material),
    significance: ensureString(parsed.significance),
  };
}

// ─── HÀM MỚI: analyzeFashionImageWithAI ───────────────────────────────────
async function analyzeFashionImageWithAI(
  dataUrl: string,
  characterContext: { name: string; gender: string; role: string },
  apiKeys: any[]
): Promise<Omit<FashionStyle, 'id' | 'source'>> {
  const activeKey = apiKeys.find((k: any) => k.isActive && !k.quotaExceeded) || null;

  const systemPrompt = `Bạn là AI phân tích trang phục từ ảnh cho nhân vật tiểu thuyết mạng Việt Nam.
Nhân vật: ${characterContext.name || 'Chưa đặt tên'} (${characterContext.gender}, ${characterContext.role})
Nhiệm vụ: Nhìn ảnh, mô tả bộ trang phục trong ảnh thành dữ liệu có cấu trúc.
Trả về JSON object, KHÔNG markdown, KHÔNG giải thích, chỉ JSON thuần.
Gồm: name, context, description, colorPalette, material, significance (để trống nếu ảnh không cho biết).`;

  const body: Record<string, any> = {
    prompt: 'Phân tích trang phục trong ảnh này.',
    systemInstruction: systemPrompt,
    image: dataUrl,
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

  let text = (data.text || '').trim().normalize('NFC').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ. Thử lại.');
  const parsed = JSON.parse(match[0]);

  return {
    name: ensureString(parsed.name) || 'Trang phục từ ảnh',
    context: ensureString(parsed.context),
    description: ensureString(parsed.description),
    colorPalette: ensureString(parsed.colorPalette),
    material: ensureString(parsed.material),
    significance: ensureString(parsed.significance),
  };
}

// ─── HÀM MỚI: generateSpeciesTraitsFromAI ──────────────────────────────────
async function generateSpeciesTraitsFromAI(
  prompt: string,
  entityName: string,
  novelContext: { title: string; genres: string[]; context: string },
  apiKeys: any[]
): Promise<SpeciesTraits> {
  const activeKey = apiKeys.find((k: any) => k.isActive && !k.quotaExceeded) || null;

  const systemPrompt = `Bạn là AI xây dựng chủng loài (yêu thú, quái vật, chủng tộc...) cho tiểu thuyết mạng Việt Nam.
Truyện: "${novelContext.title || 'Chưa đặt tên'}"
Thể loại: ${novelContext.genres.join(', ') || 'Chưa chọn'}
Bối cảnh: ${novelContext.context || 'Chưa mô tả'}
Tên loài: ${entityName || 'Chưa đặt tên'}

Nhiệm vụ: Tạo đặc điểm chi tiết cho loài này theo yêu cầu tác giả.
Trả về JSON object, KHÔNG markdown, KHÔNG giải thích, chỉ JSON thuần, đúng cấu trúc sau:
{
  "appearance": "ngoại hình chung",
  "size": "kích thước",
  "distinguishing": "đặc điểm nhận dạng",
  "behavior": "hành vi",
  "temperament": "tính khí",
  "intelligence": "trí thông minh",
  "abilities": [{"name":"tên chiêu","description":"mô tả","trigger":"kích hoạt khi nào"}],
  "habitat": "môi trường sống",
  "diet": "thức ăn",
  "weakness": "điểm yếu",
  "drops": "vật phẩm rơi ra",
  "threatLevel": "cấp độ nguy hiểm",
  "rarity": "độ hiếm"
}
Tạo 2-4 chiêu sức trong "abilities" nếu phù hợp.`;

  const userPrompt = `Yêu cầu: ${prompt}`;

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

  const data = await callApi('generate', body);

  let text = (data.text || '').trim().normalize('NFC').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ. Thử lại.');
  const parsed = JSON.parse(match[0]);

  return {
    appearance: ensureString(parsed.appearance),
    size: ensureString(parsed.size),
    distinguishing: ensureString(parsed.distinguishing),
    behavior: ensureString(parsed.behavior),
    temperament: ensureString(parsed.temperament),
    intelligence: ensureString(parsed.intelligence),
    abilities: Array.isArray(parsed.abilities) ? parsed.abilities.map((a: any) => ({
      name: ensureString(a.name), description: ensureString(a.description), trigger: ensureString(a.trigger),
    })) : [],
    habitat: ensureString(parsed.habitat),
    diet: ensureString(parsed.diet),
    weakness: ensureString(parsed.weakness),
    drops: ensureString(parsed.drops),
    threatLevel: ensureString(parsed.threatLevel),
    rarity: ensureString(parsed.rarity),
  };
}

// ─── HÀM MỚI: analyzeSpeciesImageWithAI ────────────────────────────────────
async function analyzeSpeciesImageWithAI(
  dataUrl: string,
  entityName: string,
  apiKeys: any[]
): Promise<SpeciesTraits> {
  const activeKey = apiKeys.find((k: any) => k.isActive && !k.quotaExceeded) || null;

  const systemPrompt = `Bạn là AI phân tích ảnh sinh vật/quái vật cho tiểu thuyết mạng Việt Nam.
Tên loài: ${entityName || 'Chưa đặt tên'}
Nhiệm vụ: Nhìn ảnh, suy luận đặc điểm chủng loài.
Trả về JSON object đúng cấu trúc (để trống trường nào ảnh không thể hiện):
{"appearance":"","size":"","distinguishing":"","behavior":"","temperament":"","intelligence":"","abilities":[],"habitat":"","diet":"","weakness":"","drops":"","threatLevel":"","rarity":""}`;

  const body: Record<string, any> = {
    prompt: 'Phân tích sinh vật trong ảnh này.',
    systemInstruction: systemPrompt,
    image: dataUrl,
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

  let text = (data.text || '').trim().normalize('NFC').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ. Thử lại.');
  const parsed = JSON.parse(match[0]);

  return {
    appearance: ensureString(parsed.appearance),
    size: ensureString(parsed.size),
    distinguishing: ensureString(parsed.distinguishing),
    behavior: ensureString(parsed.behavior),
    temperament: ensureString(parsed.temperament),
    intelligence: ensureString(parsed.intelligence),
    abilities: Array.isArray(parsed.abilities) ? parsed.abilities.map((a: any) => ({
      name: ensureString(a.name), description: ensureString(a.description), trigger: ensureString(a.trigger),
    })) : [],
    habitat: ensureString(parsed.habitat),
    diet: ensureString(parsed.diet),
    weakness: ensureString(parsed.weakness),
    drops: ensureString(parsed.drops),
    threatLevel: ensureString(parsed.threatLevel),
    rarity: ensureString(parsed.rarity),
  };
}

// ─── HÀM: resizeImage ────────────────────────────────────────────────────
function resizeImage(file: File, maxDim = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context lỗi')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Không đọc được ảnh'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Lỗi đọc file'));
    reader.readAsDataURL(file);
  });
}

// ─── COMPONENT: StoryTimelineEditor ─────────────────────────────────────
function StoryTimelineEditor({
  events,
  onChange,
  characters,
  novelContext,
  apiKeys,
}: {
  events: StoryEvent[];
  onChange: (events: StoryEvent[]) => void;
  characters: Character[];
  novelContext: { title: string; genres: string[]; context: string };
  apiKeys: any[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Omit<StoryEvent, 'id'>>({
    order: 0,
    chapterLabel: '',
    title: '',
    content: '',
    relatedCharacterIds: [],
  });

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiQuantity, setAiQuantity] = useState(3);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<Omit<StoryEvent, 'id'>[]>([]);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());

  const sorted = [...events].sort((a, b) => a.order - b.order);
  const filtered = search.trim()
    ? sorted.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase()) ||
        e.chapterLabel.toLowerCase().includes(search.toLowerCase())
      )
    : sorted;

  const startAdd = () => {
    const maxOrder = events.length ? Math.max(...events.map(e => e.order)) : 0;
    setDraft({
      order: maxOrder + 1,
      chapterLabel: '',
      title: '',
      content: '',
      relatedCharacterIds: [],
    });
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (ev: StoryEvent) => {
    setDraft({
      order: ev.order,
      chapterLabel: ev.chapterLabel,
      title: ev.title,
      content: ev.content,
      relatedCharacterIds: ev.relatedCharacterIds || [],
    });
    setEditingId(ev.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!draft.title.trim() || !draft.content.trim()) {
      alert('Cần nhập Tiêu đề và Nội dung!');
      return;
    }
    if (editingId) {
      onChange(events.map(e => e.id === editingId ? { ...e, ...draft } : e));
    } else {
      onChange([...events, { id: Math.random().toString(36).substr(2, 9), ...draft }]);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onChange(events.filter(e => e.id !== id));
    setConfirmingDeleteId(null);
  };

  const toggleRelated = (id: string) => {
    setDraft(prev => {
      const cur = prev.relatedCharacterIds || [];
      return {
        ...prev,
        relatedCharacterIds: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id],
      };
    });
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) { setAiError('Hãy nhập yêu cầu / định hướng!'); return; }
    setAiLoading(true);
    setAiError(null);
    setAiPreview([]);
    setAiSelected(new Set());
    try {
      const items = await generateStoryEventsFromAI(
        aiPrompt,
        Math.max(1, Math.min(15, aiQuantity || 1)),
        novelContext,
        events.map(e => ({ order: e.order, chapterLabel: e.chapterLabel, title: e.title, content: e.content })),
        characters.map(c => c.name),
        apiKeys
      );
      setAiPreview(items);
      setAiSelected(new Set(items.map((_, i) => i)));
    } catch (err: any) {
      setAiError(err.message || 'Lỗi không xác định.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleImportAiSelected = () => {
    const toAdd = aiPreview.filter((_, i) => aiSelected.has(i));
    if (toAdd.length === 0) { setAiError('Chưa chọn sự kiện nào!'); return; }
    onChange([...events, ...toAdd.map(e => ({ id: Math.random().toString(36).substr(2, 9), ...e }))]);
    setAiPreview([]);
    setAiSelected(new Set());
    setAiPrompt('');
    setAiError(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Dòng Thời Gian Cốt Truyện ({events.length} sự kiện) — không thuộc riêng nhân vật nào
        </label>
        {!showForm && (
          <button
            type="button"
            onClick={startAdd}
            className="px-2.5 py-1 bg-amber-950/40 border border-amber-800/40 hover:border-amber-600/60 rounded-lg text-[10px] text-amber-300 flex items-center gap-1 transition-colors">
            <Plus className="w-3 h-3" /> Thêm sự kiện
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-600 leading-relaxed">
        Ghi lại biến cố chung của thế giới/cốt truyện: chiến tranh, thay đổi thế lực, thiên tai, luật lệ mới,
        sự kiện toàn cục... AI sẽ dùng danh sách này (đã lọc theo "Mốc hiện tại đang viết tới") để nắm mạch truyện
        chính xác thay vì chỉ suy luận qua thông tin rời rạc của từng nhân vật.
      </p>

      {/* Panel AI Tạo Sự Kiện */}
      <div className="bg-gradient-to-br from-amber-950/20 via-neutral-900 to-neutral-900 border border-amber-700/30 rounded-xl overflow-hidden">
        <button
          onClick={() => setAiExpanded(!aiExpanded)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-amber-950/10 transition-colors">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> AI Tạo Sự Kiện Tiếp Theo
          </span>
          {aiExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {aiExpanded && (
          <div className="px-3 pb-3 pt-1 space-y-2 border-t border-amber-900/30">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              AI sẽ đọc {Math.min(events.length, 15)} sự kiện gần nhất để nối mạch, không cần chạy lại Đồng Nhân.
              {events.length === 0 && ' (chưa có sự kiện nào — AI sẽ sáng tác từ đầu theo định hướng của bạn)'}
            </p>
            <textarea
              rows={3}
              placeholder="Định hướng cho các sự kiện sắp tới... VD: Nam chính bị lộ thân phận trước mặt phản diện chính, dẫn tới cuộc rượt đuổi và một trận chiến lớn ở cuối arc này."
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              className="w-full bg-neutral-950 border border-amber-900/40 rounded-lg p-2 text-[11px] text-gray-200 focus:outline-none focus:border-amber-600 resize-y"
              spellCheck={false}
            />
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-gray-500">Số lượng:</label>
              <input
                type="number"
                min={1}
                max={15}
                value={aiQuantity}
                onChange={e => setAiQuantity(Number(e.target.value))}
                className="w-16 bg-neutral-950 border border-neutral-800 rounded-lg p-1 text-xs text-gray-200 focus:outline-none"
              />
              <span className="text-[9px] text-gray-600">(1-15 sự kiện)</span>
            </div>
            <button
              onClick={handleAIGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
              className="w-full py-2 bg-amber-800/60 hover:bg-amber-700/70 border border-amber-700/40 disabled:opacity-40 rounded-lg text-xs font-semibold text-amber-100 flex items-center justify-center gap-2 transition-colors">
              {aiLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang sáng tác...</>
                : <><Sparkles className="w-3.5 h-3.5" /> Tạo {aiQuantity} sự kiện</>}
            </button>
            {aiError && (
              <div className="px-2.5 py-2 bg-red-950/30 border border-red-800/40 rounded-lg text-[10px] text-red-300">
                ⚠ {aiError}
              </div>
            )}

            {aiPreview.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-amber-300">{aiSelected.size}/{aiPreview.length} đã chọn</p>
                  <button
                    onClick={() => setAiSelected(
                      aiSelected.size === aiPreview.length ? new Set() : new Set(aiPreview.map((_, i) => i))
                    )}
                    className="text-[9px] text-amber-400 hover:underline">
                    {aiSelected.size === aiPreview.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {aiPreview.map((e, i) => (
                    <label key={i} className="flex items-start gap-2 p-2 bg-neutral-950/60 border border-neutral-800 rounded-lg cursor-pointer hover:border-amber-900/50">
                      <input
                        type="checkbox"
                        checked={aiSelected.has(i)}
                        onChange={() => setAiSelected(prev => {
                          const n = new Set(prev);
                          n.has(i) ? n.delete(i) : n.add(i);
                          return n;
                        })}
                        className="mt-0.5 accent-amber-600 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-gray-200">#{e.order} · {e.title}</p>
                        <p className="text-[10px] text-gray-500 leading-relaxed">{e.content}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleImportAiSelected}
                  className="w-full py-2 bg-green-800/60 hover:bg-green-700/70 border border-green-700/50 rounded-lg text-xs font-bold text-green-100 flex items-center justify-center gap-2 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Thêm {aiSelected.size} sự kiện vào dòng thời gian
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {events.length > 3 && (
        <input
          type="text"
          placeholder="Tìm sự kiện theo tiêu đề, nội dung, chương..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[11px] text-gray-300 focus:outline-none focus:border-amber-600"
        />
      )}

      {showForm && (
        <div className="p-3 bg-neutral-950/60 border border-amber-900/40 rounded-xl space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] text-gray-500 mb-1 flex items-center gap-1">
                Thứ tự
                <span className="text-[8px] text-gray-600 bg-neutral-900 px-1 rounded" title="Số này dùng để sắp xếp và lọc theo Mốc hiện tại. AI dùng nó để biết sự kiện nào xảy ra trước/sau.">?</span>
              </label>
              <input
                type="number"
                value={draft.order}
                onChange={e => setDraft({ ...draft, order: Number(e.target.value) })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-amber-600"
              />
              <p className="text-[8px] text-gray-600 mt-0.5">Tự động tăng. Sửa nếu cần chen ngang.</p>
            </div>
            <div className="col-span-2">
              <label className="block text-[9px] text-gray-500 mb-1">Nhãn gợi nhớ (tuỳ chọn)</label>
              <input
                type="text"
                placeholder="VD: Chương 165, Arc Huyết Vực..."
                value={draft.chapterLabel}
                onChange={e => setDraft({ ...draft, chapterLabel: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-amber-600"
              />
              <p className="text-[8px] text-gray-600 mt-0.5">Tên gọi tự do. Không ảnh hưởng thứ tự.</p>
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Tiêu đề ngắn</label>
            <input
              type="text"
              placeholder="VD: Ma giáo tấn công Thanh Vân Môn"
              value={draft.title}
              onChange={e => setDraft({ ...draft, title: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Nội dung chi tiết</label>
            <textarea
              rows={3}
              placeholder="Diễn biến cụ thể..."
              value={draft.content}
              onChange={e => setDraft({ ...draft, content: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-amber-600 resize-y"
            />
          </div>

          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Nhân vật liên quan (tuỳ chọn, chọn nhiều)</label>
            <div className="flex flex-wrap gap-1.5">
              {characters.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleRelated(c.id)}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-all ${
                    (draft.relatedCharacterIds || []).includes(c.id)
                      ? 'bg-amber-900/50 border-amber-600/60 text-amber-300'
                      : 'bg-neutral-900 border-neutral-700 text-gray-400 hover:border-neutral-500'
                  }`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-2.5 py-1 text-[10px] text-gray-400 hover:bg-neutral-800 rounded-lg">
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-[10px] font-semibold">
              {editingId ? 'Cập nhật mốc' : 'Thêm mốc'}
            </button>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {filtered.map(ev => {
            const relatedNames = (ev.relatedCharacterIds || [])
              .map(id => characters.find(c => c.id === id)?.name)
              .filter(Boolean);
            return (
              <div key={ev.id} className="flex items-start gap-2 p-2 bg-neutral-900/60 border border-neutral-800 rounded-lg hover:border-amber-900/40 transition-colors">
                <div className="shrink-0 flex flex-col items-center min-w-[3rem]">
                  <span className="text-[10px] font-mono font-bold text-amber-500">#{ev.order}</span>
                  {ev.chapterLabel && (
                    <span className="text-[8px] text-gray-500 mt-0.5 text-center leading-tight">{ev.chapterLabel}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 border-l border-neutral-800 pl-2">
                  <p className="text-[11px] font-semibold text-gray-200">{ev.title}</p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{ev.content}</p>
                  {relatedNames.length > 0 && (
                    <p className="text-[9px] text-gray-600 mt-0.5">
                      Liên quan: {relatedNames.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => startEdit(ev)} className="p-1 text-gray-500 hover:text-amber-400">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  {confirmingDeleteId === ev.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(ev.id)} className="text-[8px] px-1.5 py-0.5 bg-red-900/60 text-red-200 rounded">Xác nhận</button>
                      <button onClick={() => setConfirmingDeleteId(null)} className="text-[8px] px-1.5 py-0.5 bg-neutral-800 text-gray-400 rounded">Hủy</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmingDeleteId(ev.id)} className="p-1 text-gray-500 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {events.length === 0 && !showForm && (
        <p className="text-[10px] text-gray-600 italic">
          Chưa có sự kiện nào — bấm "Thêm sự kiện" để nhập tay, hoặc dùng AI Tạo Sự Kiện Tiếp Theo bên trên để sinh tự động.
        </p>
      )}
    </div>
  );
}

// ─── COMPONENT: CharacterTimelineEditor ─────────────────────────────────
function CharacterTimelineEditor({
  entries,
  onChange,
  characters,
  currentCharId,
}: {
  entries: CharacterTimelineEntry[];
  onChange: (entries: CharacterTimelineEntry[]) => void;
  characters: Character[];
  currentCharId: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<CharacterTimelineEntry, 'id'>>({
    order: 0,
    chapterLabel: '',
    category: '',
    content: '',
    relatedCharacterId: '',
  });

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const sorted = [...entries].sort((a, b) => a.order - b.order);

  const startAdd = () => {
    const maxOrder = entries.length ? Math.max(...entries.map(e => e.order)) : 0;
    setDraft({
      order: maxOrder + 1,
      chapterLabel: '',
      category: '',
      content: '',
      relatedCharacterId: '',
    });
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (entry: CharacterTimelineEntry) => {
    setDraft({
      order: entry.order,
      chapterLabel: entry.chapterLabel,
      category: entry.category,
      content: entry.content,
      relatedCharacterId: entry.relatedCharacterId || '',
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleSaveEntry = () => {
    if (!draft.category.trim() || !draft.content.trim()) {
      alert('Cần nhập Loại và Nội dung!');
      return;
    }
    if (editingId) {
      onChange(entries.map(e => e.id === editingId ? { ...e, ...draft } : e));
    } else {
      onChange([...entries, { id: Math.random().toString(36).substr(2, 9), ...draft }]);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDeleteEntry = (id: string) => {
    onChange(entries.filter(e => e.id !== id));
    setConfirmingDeleteId(null);
  };

  return (
    <div className="border-t border-neutral-800 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          Dòng Thời Gian Nhân Vật ({entries.length} mốc)
        </label>
        {!showForm && (
          <button
            type="button"
            onClick={startAdd}
            className="px-2.5 py-1 bg-cyan-950/40 border border-cyan-800/40 hover:border-cyan-600/60 rounded-lg text-[10px] text-cyan-300 flex items-center gap-1 transition-colors">
            <Plus className="w-3 h-3" /> Thêm mốc
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-600 leading-relaxed">
        Ghi lại công pháp, chiêu thức, thể chất, kỳ ngộ, đan dược, cơ duyên, vũ khí, linh thú, trợ giúp, thân phận,
        gia tộc/thế lực, địa vị, mối quan hệ, sự kiện lớn, phó bản, trận đánh, thương tích, bí mật, tài sản, danh tiếng,
        kẻ thù... hoặc BẤT KỲ loại thông tin nào khác. Mỗi mốc gắn 1 số thứ tự (order) — khi viết truyện ở trang Sáng Tác,
        AI chỉ thấy các mốc có order ≤ "Mốc hiện tại đang viết tới" (đặt ở đầu trang này), tự động bỏ qua phần chưa xảy ra.
      </p>

      {showForm && (
        <div className="p-3 bg-neutral-950/60 border border-cyan-900/40 rounded-xl space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] text-gray-500 mb-1">Số thứ tự (order)</label>
              <input
                type="number"
                value={draft.order}
                onChange={e => setDraft({ ...draft, order: Number(e.target.value) })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-cyan-600"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[9px] text-gray-500 mb-1">Nhãn hiển thị (chương/thời điểm)</label>
              <input
                type="text"
                placeholder="VD: Chương 165 / Phó bản Huyết Vực"
                value={draft.chapterLabel}
                onChange={e => setDraft({ ...draft, chapterLabel: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-cyan-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Loại (tự nhập bất kỳ)</label>
            <input
              type="text"
              list="timeline-category-suggestions"
              placeholder="VD: công pháp, cơ duyên, mối quan hệ, địa vị..."
              value={draft.category}
              onChange={e => setDraft({ ...draft, category: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-cyan-600"
            />
            <datalist id="timeline-category-suggestions">
              {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Nội dung</label>
            <textarea
              rows={2}
              placeholder="Chi tiết cụ thể..."
              value={draft.content}
              onChange={e => setDraft({ ...draft, content: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-cyan-600 resize-y"
            />
          </div>

          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Liên quan tới nhân vật khác (tuỳ chọn)</label>
            <select
              value={draft.relatedCharacterId}
              onChange={e => setDraft({ ...draft, relatedCharacterId: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none">
              <option value="">-- Không --</option>
              {characters.filter(c => c.id !== currentCharId).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-2.5 py-1 text-[10px] text-gray-400 hover:bg-neutral-800 rounded-lg">
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveEntry}
              className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-[10px] font-semibold">
              {editingId ? 'Cập nhật mốc' : 'Thêm mốc'}
            </button>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {sorted.map(entry => {
            const relatedName = entry.relatedCharacterId
              ? characters.find(c => c.id === entry.relatedCharacterId)?.name
              : null;
            return (
              <div key={entry.id} className="flex items-start gap-2 p-2 bg-neutral-900/60 border border-neutral-800 rounded-lg">
                <span className="text-[9px] font-mono text-cyan-500 shrink-0 mt-0.5">#{entry.order}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-300">
                    <span className="text-amber-400">{entry.chapterLabel || '(chưa đặt nhãn)'}</span>
                    {' · '}<span className="text-cyan-400">{entry.category}</span>
                    {relatedName && <span className="text-gray-500"> · liên quan: {relatedName}</span>}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed truncate">{entry.content}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => startEdit(entry)} className="p-1 text-gray-500 hover:text-cyan-400">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  {confirmingDeleteId === entry.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDeleteEntry(entry.id)} className="text-[8px] px-1.5 py-0.5 bg-red-900/60 text-red-200 rounded">Xác nhận</button>
                      <button onClick={() => setConfirmingDeleteId(null)} className="text-[8px] px-1.5 py-0.5 bg-neutral-800 text-gray-400 rounded">Hủy</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmingDeleteId(entry.id)} className="p-1 text-gray-500 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <p className="text-[10px] text-gray-600 italic">
          Chưa có mốc nào — bấm "Thêm mốc" để bắt đầu ghi lại công pháp, cơ duyên, quan hệ, sự kiện...
        </p>
      )}
    </div>
  );
}

// ─── COMPONENT: AbilityEditor ──────────────────────────────────────────
function AbilityEditor({
  abilities,
  onChange,
}: {
  abilities: Ability[];
  onChange: (abilities: Ability[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Ability, 'id'>>({
    name: '', type: 'Công kích', description: '', condition: '', origin: '', tier: '',
  });

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const startAdd = () => {
    setDraft({ name: '', type: 'Công kích', description: '', condition: '', origin: '', tier: '' });
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (a: Ability) => {
    setDraft({ name: a.name, type: a.type, description: a.description, condition: a.condition, origin: a.origin, tier: a.tier });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!draft.name.trim()) { alert('Tên kỹ năng không được trống!'); return; }
    if (editingId) {
      onChange(abilities.map(a => a.id === editingId ? { ...a, ...draft } : a));
    } else {
      onChange([...abilities, { id: Math.random().toString(36).substr(2, 9), ...draft }]);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onChange(abilities.filter(a => a.id !== id));
    setConfirmingDeleteId(null);
  };

  const typeBtnClass: Record<string, string> = {
    'Công kích': 'bg-red-900/50 border-red-600/60 text-red-300',
    'Phòng thủ': 'bg-blue-900/50 border-blue-600/60 text-blue-300',
    'Thân pháp': 'bg-emerald-900/50 border-emerald-600/60 text-emerald-300',
    'Hỗ trợ': 'bg-violet-900/50 border-violet-600/60 text-violet-300',
    'Bị động': 'bg-gray-900/50 border-gray-600/60 text-gray-300',
  };
  const typeBadgeClass: Record<string, string> = {
    'Công kích': 'bg-red-950/50 text-red-400 border-red-800/40',
    'Phòng thủ': 'bg-blue-950/50 text-blue-400 border-blue-800/40',
    'Thân pháp': 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40',
    'Hỗ trợ': 'bg-violet-950/50 text-violet-400 border-violet-800/40',
    'Bị động': 'bg-gray-950/50 text-gray-400 border-gray-800/40',
  };

  return (
    <div className="border-t border-neutral-800 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-red-400" />
          Năng Lực / Kỹ Năng ({abilities.length})
        </label>
        {!showForm && (
          <button onClick={startAdd} className="px-2.5 py-1 bg-red-950/40 border border-red-800/40 hover:border-red-600/60 rounded-lg text-[10px] text-red-300 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Thêm
          </button>
        )}
      </div>

      {showForm && (
        <div className="p-3 bg-neutral-950/60 border border-red-900/40 rounded-xl space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-[9px] text-gray-500 mb-1">Tên kỹ năng</label>
              <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="VD: Thiên Lôi Chưởng" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-red-600" />
            </div>
            <div>
              <label className="block text-[9px] text-gray-500 mb-1">Loại</label>
              <div className="flex flex-wrap gap-1 mb-1">
                {ABILITY_TYPES.map(t => (
                  <button 
                    key={t.value} 
                    onClick={() => setDraft({ ...draft, type: t.value })} 
                    className={`px-2 py-0.5 rounded text-[10px] border transition-all ${draft.type === t.value ? (typeBtnClass[t.value] || 'bg-gray-900/50 border-gray-600/60 text-gray-300') : 'bg-neutral-900 border-neutral-700 text-gray-400 hover:border-neutral-500'}`}
                  >
                    {t.value}
                  </button>
                ))}
              </div>
              <input value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })} placeholder="Hoặc tự nhập..." className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[9px] text-gray-500 mb-1">Cấp độ / Tier</label>
              <input value={draft.tier} onChange={e => setDraft({ ...draft, tier: e.target.value })} placeholder="VD: Thiên cấp" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Mô tả</label>
            <textarea rows={2} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Cơ chế hoạt động..." className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none resize-y" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] text-gray-500 mb-1">Điều kiện</label>
              <input value={draft.condition} onChange={e => setDraft({ ...draft, condition: e.target.value })} placeholder="VD: cần Nguyên Anh kỳ" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[9px] text-gray-500 mb-1">Nguồn gốc</label>
              <input value={draft.origin} onChange={e => setDraft({ ...draft, origin: e.target.value })} placeholder="VD: học từ sư phụ" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-2.5 py-1 text-[10px] text-gray-400 hover:bg-neutral-800 rounded-lg">Huỷ</button>
            <button onClick={handleSave} className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded-lg text-[10px] font-semibold">{editingId ? 'Cập nhật' : 'Thêm'}</button>
          </div>
        </div>
      )}

      {abilities.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {abilities.map(a => {
            return (
              <div key={a.id} className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${typeBadgeClass[a.type] || 'bg-gray-950/50 text-gray-400 border-gray-800/40'} border`}>
                    {a.type}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(a)} className="p-0.5 text-gray-500 hover:text-red-400"><Edit2 className="w-3 h-3" /></button>
                    {confirmingDeleteId === a.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(a.id)} className="text-[8px] px-1 py-0.5 bg-red-900/60 text-red-200 rounded">Xác nhận</button>
                        <button onClick={() => setConfirmingDeleteId(null)} className="text-[8px] px-1 py-0.5 bg-neutral-800 text-gray-400 rounded">Hủy</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmingDeleteId(a.id)} className="p-0.5 text-gray-500 hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] font-bold text-gray-200">{a.name}</p>
                {a.tier && <p className="text-[9px] text-gray-500">{a.tier}</p>}
                <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{a.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {abilities.length === 0 && !showForm && (
        <p className="text-[10px] text-gray-600 italic">Chưa có kỹ năng nào.</p>
      )}
    </div>
  );
}

// ─── COMPONENT: FashionStyleGallery ──────────────────────────────────────
function FashionStyleGallery({
  styles,
  onChange,
  characterContext,
  apiKeys,
}: {
  styles: FashionStyle[];
  onChange: (styles: FashionStyle[]) => void;
  characterContext: { name: string; gender: string; role: string };
  apiKeys: any[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftSource, setDraftSource] = useState<'manual' | 'ai'>('manual');
  const [draft, setDraft] = useState<Omit<FashionStyle, 'id' | 'source'>>({
    name: '', context: '', description: '', colorPalette: '', material: '', significance: '',
  });

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [imgAnalyzing, setImgAnalyzing] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  const startAdd = () => {
    setDraft({ name: '', context: '', description: '', colorPalette: '', material: '', significance: '' });
    setDraftSource('manual');
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (s: FashionStyle) => {
    setDraft({ name: s.name, context: s.context, description: s.description, colorPalette: s.colorPalette, material: s.material, significance: s.significance });
    setDraftSource(s.source);
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!draft.name.trim()) { alert('Tên trang phục không được trống!'); return; }
    if (editingId) {
      onChange(styles.map(s => s.id === editingId ? { ...s, ...draft, source: draftSource } : s));
    } else {
      onChange([...styles, { id: Math.random().toString(36).substr(2, 9), ...draft, source: draftSource }]);
    }
    setShowForm(false);
    setEditingId(null);
    setDraftSource('manual');
  };

  const handleDelete = (id: string) => {
    onChange(styles.filter(s => s.id !== id));
    setConfirmingDeleteId(null);
  };

  const handleAIGenerateStyle = async () => {
    if (!aiPrompt.trim()) { setAiError('Nhập mô tả trang phục muốn tạo!'); return; }
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await generateFashionStyleFromAI(aiPrompt, characterContext, apiKeys);
      setDraft(result);
      setDraftSource('ai');
      setShowForm(true);
      setEditingId(null);
      setAiOpen(false);
    } catch (err: any) {
      setAiError(err.message || 'Lỗi không xác định.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAnalyzeFashionImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgAnalyzing(true);
    setImgError(null);
    try {
      const dataUrl = await resizeImage(file);
      const result = await analyzeFashionImageWithAI(dataUrl, characterContext, apiKeys);
      setDraft(result);
      setDraftSource('ai');
      setShowForm(true);
      setEditingId(null);
    } catch (err: any) {
      setImgError(err.message || 'Lỗi phân tích ảnh');
    } finally {
      setImgAnalyzing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="border-t border-neutral-800 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
          Phong Cách Thời Trang ({styles.length})
        </label>
        {!showForm && (
          <button onClick={startAdd} className="px-2.5 py-1 bg-pink-950/40 border border-pink-800/40 hover:border-pink-600/60 rounded-lg text-[10px] text-pink-300 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Thêm
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setAiOpen(!aiOpen)}
          className="px-2.5 py-1 bg-pink-950/40 border border-pink-800/40 hover:border-pink-600/60 rounded-lg text-[10px] text-pink-300 flex items-center gap-1 transition-colors">
          <Sparkles className="w-3 h-3" /> AI Sáng Tạo Từ Mô Tả
        </button>
        <label className="px-2.5 py-1 bg-violet-950/40 border border-violet-800/40 hover:border-violet-600/60 rounded-lg text-[10px] text-violet-300 cursor-pointer flex items-center gap-1 transition-colors">
          <input type="file" accept="image/*" onChange={handleAnalyzeFashionImage} className="hidden" disabled={imgAnalyzing} />
          {imgAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
          {imgAnalyzing ? 'Đang phân tích...' : 'AI Phân Tích Ảnh'}
        </label>
      </div>

      {aiOpen && (
        <div className="p-3 bg-pink-950/10 border border-pink-900/30 rounded-xl space-y-2">
          <textarea
            rows={2}
            placeholder="Mô tả trang phục muốn AI tạo... VD: bộ áo choàng chiến đấu màu đen ánh bạc, phù hợp phong cách sát thủ"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[10px] text-gray-300 focus:outline-none focus:border-pink-600 resize-y"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={handleAIGenerateStyle}
            disabled={aiLoading}
            className="w-full py-1.5 bg-pink-900/40 hover:bg-pink-800/50 border border-pink-700/40 disabled:opacity-50 rounded-lg text-[11px] text-pink-300 flex items-center justify-center gap-1.5 transition-colors">
            {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tạo...</> : <><Sparkles className="w-3.5 h-3.5" /> Tạo bằng AI</>}
          </button>
          {aiError && <div className="px-2.5 py-2 bg-red-950/30 border border-red-800/40 rounded-lg text-[10px] text-red-300">⚠ {aiError}</div>}
        </div>
      )}
      {imgError && <div className="px-2.5 py-2 bg-red-950/30 border border-red-800/40 rounded-lg text-[10px] text-red-300">⚠ {imgError}</div>}

      {showForm && (
        <div className="p-3 bg-neutral-950/60 border border-pink-900/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-gray-500">
              {draftSource === 'ai' ? '🤖 Dữ liệu từ AI (có thể chỉnh sửa)' : '✏️ Nhập tay'}
            </span>
            {draftSource === 'ai' && (
              <span className="text-[8px] px-1.5 py-0.5 bg-pink-900/30 text-pink-400 rounded">AI</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-[9px] text-gray-500 mb-1">Tên bộ trang phục</label>
              <input value={draft.name} onChange={e => { setDraft({ ...draft, name: e.target.value }); setDraftSource('manual'); }} placeholder="VD: Y phục thường ngày" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-pink-600" />
            </div>
            <div>
              <label className="block text-[9px] text-gray-500 mb-1">Bối cảnh mặc</label>
              <input value={draft.context} onChange={e => { setDraft({ ...draft, context: e.target.value }); setDraftSource('manual'); }} placeholder="VD: sinh hoạt, chiến đấu, dạ hội" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[9px] text-gray-500 mb-1">Chất liệu</label>
              <input value={draft.material} onChange={e => { setDraft({ ...draft, material: e.target.value }); setDraftSource('manual'); }} placeholder="VD: lụa Thiên Tằm" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Mô tả chi tiết</label>
            <textarea rows={3} value={draft.description} onChange={e => { setDraft({ ...draft, description: e.target.value }); setDraftSource('manual'); }} placeholder="Kiểu dáng, chi tiết trang trí..." className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none resize-y" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] text-gray-500 mb-1">Tông màu</label>
              <input value={draft.colorPalette} onChange={e => { setDraft({ ...draft, colorPalette: e.target.value }); setDraftSource('manual'); }} placeholder="VD: trắng - bạc, nhấn xanh" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[9px] text-gray-500 mb-1">Ý nghĩa / Nguồn gốc</label>
              <input value={draft.significance} onChange={e => { setDraft({ ...draft, significance: e.target.value }); setDraftSource('manual'); }} placeholder="VD: do sư phụ tặng" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setDraftSource('manual'); }} className="px-2.5 py-1 text-[10px] text-gray-400 hover:bg-neutral-800 rounded-lg">Huỷ</button>
            <button onClick={handleSave} className="px-3 py-1 bg-pink-700 hover:bg-pink-600 text-white rounded-lg text-[10px] font-semibold">{editingId ? 'Cập nhật' : 'Thêm'}</button>
          </div>
        </div>
      )}

      {styles.length > 0 && (
        <div className="space-y-1.5">
          {styles.map(s => (
            <div key={s.id} className="flex items-start gap-2 p-2 bg-neutral-950 border border-neutral-800 rounded-lg hover:border-pink-900/40 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-bold text-gray-200">{s.name}</p>
                  {s.context && <span className="text-[8px] px-1 py-0.5 bg-neutral-900 text-pink-400 border border-pink-900/30 rounded">{s.context}</span>}
                  {s.source === 'ai' && <span className="text-[8px] text-pink-500">🤖 AI</span>}
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-2">{s.description}</p>
                {s.colorPalette && <p className="text-[9px] text-gray-600 mt-0.5">🎨 {s.colorPalette} {s.material && `· ${s.material}`}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(s)} className="p-1 text-gray-500 hover:text-pink-400"><Edit2 className="w-3 h-3" /></button>
                {confirmingDeleteId === s.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDelete(s.id)} className="text-[8px] px-1.5 py-0.5 bg-red-900/60 text-red-200 rounded">Xác nhận</button>
                    <button onClick={() => setConfirmingDeleteId(null)} className="text-[8px] px-1.5 py-0.5 bg-neutral-800 text-gray-400 rounded">Hủy</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmingDeleteId(s.id)} className="p-1 text-gray-500 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {styles.length === 0 && !showForm && (
        <p className="text-[10px] text-gray-600 italic">Chưa có trang phục nào.</p>
      )}
    </div>
  );
}

// ─── COMPONENT: SpeciesTraitsEditor ──────────────────────────────────────
function SpeciesTraitsEditor({
  traits,
  onChange,
  entityName,
  novelContext,
  apiKeys,
}: {
  traits?: SpeciesTraits;
  onChange: (traits: SpeciesTraits | undefined) => void;
  entityName: string;
  novelContext: { title: string; genres: string[]; context: string };
  apiKeys: any[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<SpeciesTraits>({
    appearance: '', size: '', distinguishing: '',
    behavior: '', temperament: '', intelligence: '',
    abilities: [], habitat: '', diet: '', weakness: '', drops: '',
    threatLevel: '', rarity: '',
  });

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [imgAnalyzing, setImgAnalyzing] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  useEffect(() => {
    if (traits) setDraft(traits);
  }, [traits]);

  const handleSave = () => {
    onChange(draft);
    setShowForm(false);
  };

  const updateAbility = (idx: number, field: keyof SpeciesTraits['abilities'][0], value: string) => {
    const next = { ...draft, abilities: draft.abilities.map((a, i) => i === idx ? { ...a, [field]: value } : a) };
    setDraft(next);
  };

  const addAbility = () => {
    setDraft({ ...draft, abilities: [...draft.abilities, { name: '', description: '', trigger: '' }] });
  };

  const removeAbility = (idx: number) => {
    setDraft({ ...draft, abilities: draft.abilities.filter((_, i) => i !== idx) });
  };

  const handleAIGenerateTraits = async () => {
    if (!aiPrompt.trim()) { setAiError('Nhập mô tả loài muốn tạo!'); return; }
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await generateSpeciesTraitsFromAI(aiPrompt, entityName, novelContext, apiKeys);
      setDraft(result);
    } catch (err: any) {
      setAiError(err.message || 'Lỗi không xác định.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAnalyzeSpeciesImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgAnalyzing(true);
    setImgError(null);
    try {
      const dataUrl = await resizeImage(file);
      const result = await analyzeSpeciesImageWithAI(dataUrl, entityName, apiKeys);
      setDraft(result);
    } catch (err: any) {
      setImgError(err.message || 'Lỗi phân tích ảnh');
    } finally {
      setImgAnalyzing(false);
      e.target.value = '';
    }
  };

  const handleDeleteTraits = () => {
    onChange(undefined);
    setShowForm(false);
    setConfirmingDelete(false);
  };

  if (!showForm && !traits) {
    return (
      <div className="pt-3 space-y-2">
        <button onClick={() => setShowForm(true)} className="w-full py-2 bg-emerald-950/30 border border-emerald-800/40 hover:border-emerald-600/60 rounded-lg text-[10px] text-emerald-300 flex items-center justify-center gap-1 transition-colors">
          <Plus className="w-3 h-3" /> Thêm đặc điểm chủng loài (nhập tay)
        </button>
        <div className="flex gap-1.5">
          <button onClick={() => { setShowForm(true); setAiOpen(true); }} className="flex-1 py-2 bg-teal-950/30 border border-teal-800/40 hover:border-teal-600/60 rounded-lg text-[10px] text-teal-300 flex items-center justify-center gap-1 transition-colors">
            <Sparkles className="w-3 h-3" /> AI sáng tạo từ mô tả
          </button>
          <label className="flex-1 py-2 bg-violet-950/30 border border-violet-800/40 hover:border-violet-600/60 rounded-lg text-[10px] text-violet-300 cursor-pointer flex items-center justify-center gap-1 transition-colors">
            <input type="file" accept="image/*" onChange={(e) => { setShowForm(true); handleAnalyzeSpeciesImage(e); }} className="hidden" disabled={imgAnalyzing} />
            {imgAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
            AI phân tích ảnh
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
          🐉 Đặc điểm chủng loài
        </label>
        {!showForm && traits && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowForm(true)} className="text-[10px] text-emerald-400 hover:underline">Chỉnh sửa</button>
            {confirmingDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={handleDeleteTraits} className="text-[9px] px-1.5 py-0.5 bg-red-900/60 text-red-200 rounded">Xác nhận xóa</button>
                <button onClick={() => setConfirmingDelete(false)} className="text-[9px] px-1.5 py-0.5 bg-neutral-800 text-gray-400 rounded">Hủy</button>
              </div>
            ) : (
              <button onClick={() => setConfirmingDelete(true)} className="p-1 text-gray-500 hover:text-red-400" title="Xoá đặc điểm chủng loài">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {showForm ? (
        <div className="p-3 bg-neutral-950/60 border border-emerald-900/40 rounded-xl space-y-2">
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setAiOpen(!aiOpen)} className="flex-1 py-1.5 bg-teal-950/40 border border-teal-800/40 hover:border-teal-600/60 rounded-lg text-[10px] text-teal-300 flex items-center justify-center gap-1 transition-colors">
              <Sparkles className="w-3 h-3" /> AI Sáng Tạo Từ Mô Tả
            </button>
            <label className="flex-1 py-1.5 bg-violet-950/40 border border-violet-800/40 hover:border-violet-600/60 rounded-lg text-[10px] text-violet-300 cursor-pointer flex items-center justify-center gap-1 transition-colors">
              <input type="file" accept="image/*" onChange={handleAnalyzeSpeciesImage} className="hidden" disabled={imgAnalyzing} />
              {imgAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
              {imgAnalyzing ? 'Đang phân tích...' : 'AI Phân Tích Ảnh'}
            </label>
          </div>

          {aiOpen && (
            <div className="p-2.5 bg-teal-950/10 border border-teal-900/30 rounded-lg space-y-2">
              <textarea
                rows={2}
                placeholder="Mô tả loài muốn AI tạo... VD: hồ ly 9 đuôi, mị hoặc lòng người, sợ tiếng chuông đồng"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-teal-600 resize-y"
              />
              <button type="button" onClick={handleAIGenerateTraits} disabled={aiLoading}
                className="w-full py-1.5 bg-teal-900/40 hover:bg-teal-800/50 border border-teal-700/40 disabled:opacity-50 rounded-lg text-[11px] text-teal-300 flex items-center justify-center gap-1.5 transition-colors">
                {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tạo...</> : <><Sparkles className="w-3.5 h-3.5" /> Tạo bằng AI</>}
              </button>
              {aiError && <div className="px-2 py-1.5 bg-red-950/30 border border-red-800/40 rounded-lg text-[9px] text-red-300">⚠ {aiError}</div>}
            </div>
          )}
          {imgError && <div className="px-2 py-1.5 bg-red-950/30 border border-red-800/40 rounded-lg text-[9px] text-red-300">⚠ {imgError}</div>}

          <p className="text-[9px] text-gray-500">Ngoại hình & Đặc điểm</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={draft.appearance} onChange={e => setDraft({ ...draft, appearance: e.target.value })} placeholder="Ngoại hình chung" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            <input value={draft.size} onChange={e => setDraft({ ...draft, size: e.target.value })} placeholder="Kích thước" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
          </div>
          <input value={draft.distinguishing} onChange={e => setDraft({ ...draft, distinguishing: e.target.value })} placeholder="Đặc điểm nhận dạng (đuôi chia 3 ngọn, mắt vàng...)" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />

          <p className="text-[9px] text-gray-500 pt-1">Tập tính</p>
          <div className="grid grid-cols-3 gap-2">
            <input value={draft.behavior} onChange={e => setDraft({ ...draft, behavior: e.target.value })} placeholder="Hành vi (sống bầy đàn...)" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            <input value={draft.temperament} onChange={e => setDraft({ ...draft, temperament: e.target.value })} placeholder="Tính khí" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            <input value={draft.intelligence} onChange={e => setDraft({ ...draft, intelligence: e.target.value })} placeholder="Trí thông minh" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
          </div>

          <p className="text-[9px] text-gray-500 pt-1">Chiêu sức ({draft.abilities.length})</p>
          <div className="space-y-1.5">
            {draft.abilities.map((a, i) => (
              <div key={i} className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg space-y-1">
                <div className="flex gap-2">
                  <input value={a.name} onChange={e => updateAbility(i, 'name', e.target.value)} placeholder="Tên chiêu" className="flex-1 bg-neutral-950 border border-neutral-700 rounded p-1 text-[11px] text-gray-200 focus:outline-none" />
                  <input value={a.trigger} onChange={e => updateAbility(i, 'trigger', e.target.value)} placeholder="Kích hoạt khi nào" className="flex-1 bg-neutral-950 border border-neutral-700 rounded p-1 text-[11px] text-gray-200 focus:outline-none" />
                  <button onClick={() => removeAbility(i)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
                <textarea value={a.description} onChange={e => updateAbility(i, 'description', e.target.value)} placeholder="Mô tả chiêu thức..." rows={2} className="w-full bg-neutral-950 border border-neutral-700 rounded p-1 text-[11px] text-gray-200 focus:outline-none resize-none" />
              </div>
            ))}
            <button onClick={addAbility} className="w-full py-1 bg-neutral-900 border border-neutral-800 hover:border-emerald-800/40 rounded-lg text-[10px] text-gray-400 hover:text-emerald-300 flex items-center justify-center gap-1 transition-colors">
              <Plus className="w-3 h-3" /> Thêm chiêu
            </button>
          </div>

          <p className="text-[9px] text-gray-500 pt-1">Sinh thái & Nguy hiểm</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={draft.habitat} onChange={e => setDraft({ ...draft, habitat: e.target.value })} placeholder="Môi trường sống" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            <input value={draft.diet} onChange={e => setDraft({ ...draft, diet: e.target.value })} placeholder="Thức ăn" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            <input value={draft.weakness} onChange={e => setDraft({ ...draft, weakness: e.target.value })} placeholder="Điểm yếu" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            <input value={draft.drops} onChange={e => setDraft({ ...draft, drops: e.target.value })} placeholder="Vật phẩm rơi ra" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            <input value={draft.threatLevel} onChange={e => setDraft({ ...draft, threatLevel: e.target.value })} placeholder="Cấp độ nguy hiểm" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
            <input value={draft.rarity} onChange={e => setDraft({ ...draft, rarity: e.target.value })} placeholder="Độ hiếm" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button 
              onClick={() => { 
                setDraft(traits || { 
                  appearance: '', size: '', distinguishing: '', 
                  behavior: '', temperament: '', intelligence: '', 
                  abilities: [], habitat: '', diet: '', weakness: '', drops: '', 
                  threatLevel: '', rarity: '' 
                }); 
                setShowForm(false); 
              }} 
              className="px-2.5 py-1 text-[10px] text-gray-400 hover:bg-neutral-800 rounded-lg"
            >
              Huỷ
            </button>
            <button onClick={handleSave} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-semibold">Lưu đặc điểm</button>
          </div>
        </div>
      ) : traits ? (
        <div className="p-2 bg-neutral-950/60 border border-emerald-900/30 rounded-lg space-y-1.5">
          {traits.appearance && <p className="text-[10px] text-gray-300"><span className="text-gray-500">Ngoại hình:</span> {traits.appearance}</p>}
          {traits.size && <p className="text-[10px] text-gray-300"><span className="text-gray-500">Kích thước:</span> {traits.size}</p>}
          {traits.weakness && <p className="text-[10px] text-red-400/80">⚔️ Yếu điểm: {traits.weakness}</p>}
          {traits.abilities.length > 0 && <p className="text-[10px] text-emerald-400">🔥 {traits.abilities.length} chiêu sức</p>}
          <p className="text-[9px] text-gray-600">{traits.habitat} · {traits.threatLevel} · {traits.rarity}</p>
        </div>
      ) : null}
    </div>
  );
}

// ─── COMPONENT: CharacterImageGallery ────────────────────────────────────
function CharacterImageGallery({
  images,
  onChange,
  characterContext,
  apiKeys,
}: {
  images: CharacterImage[];
  onChange: (images: CharacterImage[]) => void;
  characterContext: { name: string; gender: string; role: string; appearance?: string; personality?: string };
  apiKeys: any[];
}) {
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hintId, setHintId] = useState<string | null>(null);
  const [hints, setHints] = useState<Record<string, string>>({});
  const [includeBackground, setIncludeBackground] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [genModel, setGenModel] = useState('gemini-2.5-flash-image');
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    setGenLoading(true);
    setGenError(null);
    try {
      const { dataUrl } = await generateCharacterImageAI(
        {
          name: characterContext.name,
          gender: characterContext.gender,
          role: characterContext.role,
          appearance: characterContext.appearance || '',
          personality: characterContext.personality || '',
        },
        genPrompt,
        genModel,
        apiKeys
      );
      onChange([...images, {
        id: Math.random().toString(36).substr(2, 9),
        dataUrl,
        label: 'Ảnh AI tạo',
        description: '',
        source: 'ai',
      }]);
    } catch (err: any) {
      setGenError(err.message || 'Lỗi tạo ảnh');
    } finally {
      setGenLoading(false);
    }
  };

  const generateCharacterImageAI = async (
    _context: any,
    _extraPrompt: string,
    _modelName: string,
    _apiKeys: any[]
  ): Promise<{ dataUrl: string }> => {
    return { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const newImages: CharacterImage[] = [];
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          const dataUrl = await resizeImage(file);
          newImages.push({
            id: Math.random().toString(36).substr(2, 9),
            dataUrl,
            label: file.name.replace(/\.[^.]+$/, '').substring(0, 30) || 'Ảnh tham chiếu',
            description: '',
            source: 'manual',
          });
        }
      }
      onChange([...images, ...newImages]);
    } catch (err: any) {
      setError(err.message || 'Lỗi xử lý ảnh');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAnalyze = async (imgId: string) => {
    const img = images.find(i => i.id === imgId);
    if (!img) return;
    setAnalyzingId(imgId);
    setError(null);
    try {
      const hint = hints[imgId] || '';
      const desc = await analyzeImageWithAI(img.dataUrl, characterContext, apiKeys, hint, includeBackground);
      onChange(images.map(i => i.id === imgId ? { ...i, description: desc, source: 'ai' as const } : i));
      setHintId(null);
    } catch (err: any) {
      setError(err.message || 'Lỗi phân tích ảnh');
    } finally {
      setAnalyzingId(null);
    }
  };

  const analyzeImageWithAI = async (
    _dataUrl: string,
    _context: any,
    _apiKeys: any[],
    _hint?: string,
    _includeBg?: boolean
  ): Promise<string> => {
    return 'Mô tả AI: Nhân vật có ngoại hình xinh đẹp, thần thái quý phái.';
  };

  const updateHint = (imgId: string, value: string) => {
    setHints(prev => ({ ...prev, [imgId]: value }));
  };

  const handleDelete = (imgId: string) => {
    onChange(images.filter(i => i.id !== imgId));
    setConfirmingDeleteId(null);
  };

  const updateField = (imgId: string, field: 'label' | 'description', value: string) => {
    onChange(images.map(i => i.id === imgId ? { ...i, [field]: value, source: field === 'description' ? 'manual' as const : i.source } : i));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs text-gray-400 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
          Ảnh tham chiếu ngoại hình ({images.length})
        </label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setGenOpen(!genOpen)}
            className="px-2.5 py-1 bg-amber-950/40 border border-amber-800/40 hover:border-amber-600/60 rounded-lg text-[10px] text-amber-300 flex items-center gap-1 transition-colors">
            <Wand2 className="w-3 h-3" /> Tạo ảnh AI
          </button>
          <label className="px-2.5 py-1 bg-violet-950/40 border border-violet-800/40 hover:border-violet-600/60 rounded-lg text-[10px] text-violet-300 cursor-pointer flex items-center gap-1 transition-colors">
            <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" disabled={uploading} />
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
            {uploading ? 'Đang tải...' : 'Thêm ảnh'}
          </label>
        </div>
      </div>

      <label className="flex items-center gap-2 text-[10px] text-gray-500 cursor-pointer">
        <input type="checkbox" checked={includeBackground} onChange={e => setIncludeBackground(e.target.checked)} className="accent-violet-600" />
        Phân tích cả bối cảnh xung quanh khi bấm "AI mô tả" (mặc định chỉ tập trung vào người)
      </label>

      {genOpen && (
        <div className="p-3 bg-amber-950/10 border border-amber-900/30 rounded-xl space-y-2">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            AI sẽ dựa vào <strong className="text-gray-400">ngoại hình & tính cách đã điền ở trên</strong> để vẽ chân dung.
          </p>
          <textarea
            rows={2}
            placeholder="Yêu cầu thêm cho ảnh (tuỳ chọn) — VD: đang cầm kiếm, mặc áo choàng đỏ..."
            value={genPrompt}
            onChange={e => setGenPrompt(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[10px] text-gray-300 focus:outline-none focus:border-amber-600 resize-y"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={handleGenerateImage}
            disabled={genLoading}
            className="w-full py-1.5 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-700/40 disabled:opacity-50 rounded-lg text-[11px] text-amber-300 flex items-center justify-center gap-1.5 transition-colors">
            {genLoading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang vẽ...</>
              : <><Wand2 className="w-3.5 h-3.5" /> Tạo ảnh</>}
          </button>
          {genError && (
            <div className="px-2.5 py-2 bg-red-950/30 border border-red-800/40 rounded-lg text-[10px] text-red-300">
              ⚠ {genError}
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-gray-600 leading-relaxed">
        Upload ảnh mẫu. AI sẽ mô tả thành text để truyện bám sát hình tượng thật, tránh sáng tạo lệch ý.
      </p>

      {error && (
        <div className="px-3 py-2 bg-red-950/30 border border-red-800/40 rounded-lg text-[10px] text-red-300">
          ⚠ {error}
        </div>
      )}

      {images.length === 0 ? (
        <div className="py-6 border border-dashed border-neutral-800 rounded-xl text-center text-[10px] text-gray-600">
          Chưa có ảnh nào. Thêm ảnh để AI viết truyện sát hình tượng hơn.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {images.map(img => (
            <div key={img.id} className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="relative">
                <img src={img.dataUrl} alt={img.label} className="w-full h-32 object-cover" />
                {confirmingDeleteId === img.id ? (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                    <button onClick={() => handleDelete(img.id)} className="text-[8px] px-1.5 py-0.5 bg-red-900/80 text-red-100 rounded">Xác nhận</button>
                    <button onClick={() => setConfirmingDeleteId(null)} className="text-[8px] px-1.5 py-0.5 bg-black/60 text-gray-300 rounded">Hủy</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingDeleteId(img.id)}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-900/80 rounded-lg text-white transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                {img.source === 'ai' && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-violet-900/80 text-violet-200 text-[8px] rounded font-bold flex items-center gap-0.5">
                    <Wand2 className="w-2.5 h-2.5" /> AI mô tả
                  </span>
                )}
              </div>

              <div className="p-2.5 space-y-2">
                <input
                  type="text"
                  value={img.label}
                  onChange={e => updateField(img.id, 'label', e.target.value)}
                  placeholder="VD: Trang phục thường ngày..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-violet-600"
                  spellCheck={false}
                />

                {editingId === img.id ? (
                  <textarea
                    rows={4}
                    value={img.description}
                    onChange={e => updateField(img.id, 'description', e.target.value)}
                    onBlur={() => setEditingId(null)}
                    autoFocus
                    placeholder="Mô tả ngoại hình từ ảnh này..."
                    className="w-full bg-neutral-900 border border-violet-700/50 rounded-lg p-2 text-[10px] text-gray-300 focus:outline-none resize-none leading-relaxed"
                    spellCheck={false}
                  />
                ) : (
                  <div
                    onClick={() => setEditingId(img.id)}
                    className="min-h-[40px] px-2 py-1.5 bg-neutral-900/60 border border-neutral-800 rounded-lg text-[10px] text-gray-400 leading-relaxed cursor-text hover:border-neutral-700">
                    {img.description || <span className="text-gray-600 italic">Bấm để nhập mô tả, hoặc dùng AI bên dưới...</span>}
                  </div>
                )}

                {hintId === img.id && (
                  <textarea
                    rows={3}
                    autoFocus
                    placeholder="VD: Đây là trang phục mùa đông, có thêm áo choàng lông thú màu trắng. Mặt thật sắc sảo hơn trong ảnh, mắt phượng..."
                    value={hints[img.id] || ''}
                    onChange={e => updateHint(img.id, e.target.value)}
                    className="w-full bg-neutral-900 border border-amber-700/50 rounded-lg p-2 text-[10px] text-gray-300 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                    spellCheck={false}
                  />
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => { setHintId(null); handleAnalyze(img.id); }}
                    disabled={analyzingId === img.id}
                    className="py-1.5 bg-violet-900/40 hover:bg-violet-800/50 border border-violet-700/40 disabled:opacity-50 rounded-lg text-[10px] text-violet-300 flex items-center justify-center gap-1 transition-colors">
                    {analyzingId === img.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Wand2 className="w-3 h-3" />}
                    {img.description ? 'Phân tích lại' : 'AI mô tả'}
                  </button>

                  {hintId === img.id ? (
                    <button
                      onClick={() => handleAnalyze(img.id)}
                      disabled={analyzingId === img.id || !hints[img.id]?.trim()}
                      className="py-1.5 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-700/40 disabled:opacity-50 rounded-lg text-[10px] text-amber-300 flex items-center justify-center gap-1 transition-colors">
                      <Check className="w-3 h-3" /> Phân tích ngay
                    </button>
                  ) : (
                    <button
                      onClick={() => setHintId(img.id)}
                      className="py-1.5 bg-neutral-900 hover:bg-amber-950/30 border border-neutral-700 hover:border-amber-800/40 rounded-lg text-[10px] text-gray-400 hover:text-amber-300 flex items-center justify-center gap-1 transition-colors">
                      <Edit2 className="w-3 h-3" /> + Gợi ý
                    </button>
                  )}
                </div>

                {hintId === img.id && (
                  <p className="text-[9px] text-gray-600 leading-relaxed">
                    💡 Thêm chi tiết AI không thể thấy trong ảnh: chất liệu, mùa, góc khuất, đặc điểm thật...
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENT CHÍNH: Page3Characters ──────────────────────────────────
export default function Page3Characters({ state, updateState, onNavigate }: Page3CharactersProps) {
  const { characters, worldEntities } = state;

  const [isAddingChar, setIsAddingChar] = useState(false);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  
  // ✅ B7: Thêm currentData vào charForm
  const [charForm, setCharForm] = useState<any>({
    name: '', gender: 'Nữ', age: '18', role: 'Nữ chính',
    appearance: '', personality: '', backStory: '',
    currentStatus: '', additionalInfo: '', currentData: '', relationships: [], images: [],
    timeline: [], firstAppearanceOrder: '',
    abilities: [],
    fashionStyles: [],
  });

  const [isLinkingRelation, setIsLinkingRelation] = useState<string | null>(null);
  
  // ✅ B2: Sửa relForm thêm reverseRelationType và reverseDescription
  const [relForm, setRelForm] = useState({
    targetCharacterId: '', relationType: 'Người tình', description: '',
    reverseRelationType: '', reverseDescription: '',
  });
  const [customRelationType, setCustomRelationType] = useState('');

  const [worldPanelExpanded, setWorldPanelExpanded] = useState(false);
  const [worldCreateMode, setWorldCreateMode] = useState<'batch' | 'detail'>('batch');

  const [isAddingWorldEntity, setIsAddingWorldEntity] = useState(false);
  // ✅ B10: Thêm currentData vào worldForm
  const [worldForm, setWorldForm] = useState<any>({
    name: '', type: 'Tông môn', description: '', currentData: '', firstAppearanceOrder: '',
    speciesTraits: undefined,
  });

  const [detailAiLoading, setDetailAiLoading] = useState(false);
  const [detailAiError, setDetailAiError] = useState<string | null>(null);

  const [worldAiPrompt, setWorldAiPrompt] = useState('');
  const [worldAiQuantity, setWorldAiQuantity] = useState(5);
  const [worldAiCategories, setWorldAiCategories] = useState<string[]>([]);
  const [worldAiCustomCatInput, setWorldAiCustomCatInput] = useState('');
  const [worldAiCustomCats, setWorldAiCustomCats] = useState<string[]>([]);
  const [worldAiLoading, setWorldAiLoading] = useState(false);
  const [worldAiError, setWorldAiError] = useState<string | null>(null);
  const [worldAiPreview, setWorldAiPreview] = useState<Omit<WorldEntity, 'id'>[]>([]);
  const [worldAiSelected, setWorldAiSelected] = useState<Set<number>>(new Set());

  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<Omit<Character, 'id'>[]>([]);
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);
  const [reviewEdits, setReviewEdits] = useState<Omit<Character, 'id'>[]>([]);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [rejected, setRejected] = useState<Set<number>>(new Set());
  const [refImages, setRefImages] = useState<{ id: string; dataUrl: string }[]>([]);
  const [refAppearanceHint, setRefAppearanceHint] = useState('');

  // ✅ D1: Thêm state xác nhận xóa
  const [confirmingDeleteCharId, setConfirmingDeleteCharId] = useState<string | null>(null);
  const [confirmingDeleteWorldId, setConfirmingDeleteWorldId] = useState<string | null>(null);
  const [confirmingClearCharData, setConfirmingClearCharData] = useState(false);
  const [confirmingClearWorldData, setConfirmingClearWorldData] = useState(false);

  // ✅ B7: resetCharForm có currentData
  const resetCharForm = () => setCharForm({
    name: '', gender: 'Nữ', age: '18', role: 'Nữ chính',
    appearance: '', personality: '', backStory: '',
    currentStatus: '', additionalInfo: '', currentData: '', relationships: [], images: [],
    timeline: [], firstAppearanceOrder: '',
    abilities: [],
    fashionStyles: [],
  });

  const handleSaveCharacter = () => {
    if (!charForm.name.trim()) { alert('Tên nhân vật không được bỏ trống!'); return; }
    const { firstAppearanceOrder, ...rest } = charForm;
    const charToSave: Omit<Character, 'id'> = {
      ...rest,
      firstAppearanceOrder: firstAppearanceOrder.trim() ? Number(firstAppearanceOrder) : undefined,
    };
    updateState((prev) => {
      if (editingCharId) {
        const idx = prev.characters.findIndex((c) => c.id === editingCharId);
        if (idx !== -1) prev.characters[idx] = { ...prev.characters[idx], ...charToSave };
      } else {
        prev.characters.push({ id: Math.random().toString(36).substr(2, 9), ...charToSave });
      }
    });
    resetCharForm();
    setIsAddingChar(false);
    setEditingCharId(null);
  };

  // ✅ B8: Nạp currentData khi sửa
  const handleEditCharacterClick = (c: Character) => {
    setCharForm({
      name: c.name, gender: c.gender, age: c.age, role: c.role,
      appearance: c.appearance, personality: c.personality, backStory: c.backStory,
      currentStatus: c.currentStatus, additionalInfo: c.additionalInfo, currentData: c.currentData || '',
      relationships: c.relationships || [], images: c.images || [],
      timeline: c.timeline || [],
      firstAppearanceOrder: c.firstAppearanceOrder !== undefined ? String(c.firstAppearanceOrder) : '',
      abilities: c.abilities || [],
      fashionStyles: c.fashionStyles || [],
    });
    setEditingCharId(c.id);
    setIsAddingChar(true);
  };

  const handleDeleteCharacter = (id: string) => {
    updateState((prev) => {
      prev.characters = prev.characters.filter((c) => c.id !== id);
      prev.characters.forEach((c) => { c.relationships = c.relationships.filter((r) => r.targetCharacterId !== id); });
    });
    setConfirmingDeleteCharId(null);
  };

  // ✅ B5: handleAddRelationship ghi cả 2 chiều
  const handleAddRelationship = (sourceCharId: string) => {
    if (!relForm.targetCharacterId) { alert('Chọn nhân vật mục tiêu!'); return; }
    const finalRelationType = relForm.relationType === '__custom__'
      ? (customRelationType.trim() || 'Quan hệ khác')
      : relForm.relationType;
    const finalReverseType = relForm.reverseRelationType.trim() || finalRelationType;

    updateState((prev) => {
      const source = prev.characters.find((c) => c.id === sourceCharId);
      const target = prev.characters.find((c) => c.id === relForm.targetCharacterId);
      if (!source || !target) return;

      if (!source.relationships) source.relationships = [];
      if (!target.relationships) target.relationships = [];

      source.relationships = source.relationships.filter((r) => r.targetCharacterId !== relForm.targetCharacterId);
      source.relationships.push({
        targetCharacterId: relForm.targetCharacterId,
        relationType: finalRelationType,
        description: relForm.description,
      });

      target.relationships = target.relationships.filter((r) => r.targetCharacterId !== sourceCharId);
      target.relationships.push({
        targetCharacterId: sourceCharId,
        relationType: finalReverseType,
        description: relForm.description,
      });
    });

    setRelForm({ targetCharacterId: '', relationType: 'Người tình', description: '', reverseRelationType: '', reverseDescription: '' });
    setCustomRelationType('');
    setIsLinkingRelation(null);
  };

  // ✅ B10: reset worldForm có currentData
  const handleSaveWorldEntity = () => {
    if (!worldForm.name.trim()) { alert('Tên không được trống!'); return; }
    const { firstAppearanceOrder, speciesTraits, ...rest } = worldForm;
    updateState((prev) => {
      prev.worldEntities.push({
        id: Math.random().toString(36).substr(2, 9),
        ...rest,
        speciesTraits: speciesTraits,
        firstAppearanceOrder: firstAppearanceOrder.trim() ? Number(firstAppearanceOrder) : undefined,
      });
    });
    setWorldForm({ name: '', type: 'Tông môn', description: '', currentData: '', firstAppearanceOrder: '', speciesTraits: undefined });
  };

  const handleDeleteWorldEntity = (id: string) => {
    updateState((prev) => {
      prev.worldEntities = prev.worldEntities.filter((x) => x.id !== id);
    });
    setConfirmingDeleteWorldId(null);
  };

  const handleAIDescribeDetail = async () => {
    if (!worldForm.name.trim()) { setDetailAiError('Nhập tên trước để AI viết mô tả!'); return; }
    setDetailAiLoading(true);
    setDetailAiError(null);
    try {
      const items = await generateWorldEntitiesFromAI(
        `Viết mô tả chi tiết cho "${worldForm.name}" (loại: ${worldForm.type})`,
        1,
        [worldForm.type],
        {
          title: state.config.title,
          genres: state.config.genres,
          context: state.config.context,
          existingNames: worldEntities.map((w) => w.name),
        },
        state.apiKeys
      );
      if (items[0]) setWorldForm({ ...worldForm, description: items[0].description });
    } catch (err: any) {
      setDetailAiError(err.message || 'Lỗi không xác định.');
    } finally {
      setDetailAiLoading(false);
    }
  };

  const toggleWorldAiCategory = (cat: string) => {
    setWorldAiCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const handleAddWorldAiCustomCategory = () => {
    const val = worldAiCustomCatInput.trim();
    if (!val) return;
    setWorldAiCustomCats((prev) => (prev.includes(val) ? prev : [...prev, val]));
    setWorldAiCategories((prev) => (prev.includes(val) ? prev : [...prev, val]));
    setWorldAiCustomCatInput('');
  };

  const handleWorldAIGenerate = async () => {
    if (!worldAiPrompt.trim()) { setWorldAiError('Hãy nhập yêu cầu!'); return; }
    setWorldAiLoading(true);
    setWorldAiError(null);
    setWorldAiPreview([]);
    setWorldAiSelected(new Set());
    try {
      const quantity = Math.max(1, Math.min(30, worldAiQuantity || 1));
      const items = await generateWorldEntitiesFromAI(
        worldAiPrompt,
        quantity,
        worldAiCategories,
        {
          title: state.config.title,
          genres: state.config.genres,
          context: state.config.context,
          existingNames: worldEntities.map((w) => w.name),
        },
        state.apiKeys
      );
      setWorldAiPreview(items);
      setWorldAiSelected(new Set(items.map((_, i) => i)));
    } catch (err: any) {
      setWorldAiError(err.message || 'Lỗi không xác định. Thử lại.');
    } finally {
      setWorldAiLoading(false);
    }
  };

  const handleImportWorldAiSelected = () => {
    const toAdd = worldAiPreview.filter((_, i) => worldAiSelected.has(i));
    if (toAdd.length === 0) { setWorldAiError('Chưa chọn mục nào để nhập!'); return; }
    updateState((prev) => {
      toAdd.forEach((w) => {
        prev.worldEntities.push({ id: Math.random().toString(36).substr(2, 9), ...w });
      });
    });
    setWorldAiPreview([]);
    setWorldAiSelected(new Set());
    setWorldAiPrompt('');
    setWorldAiError(null);
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) { setAiError('Hãy nhập gợi ý nhân vật!'); return; }
    setAiLoading(true);
    setAiError(null);
    setAiPreview([]);
    setReviewIdx(null);
    setReviewEdits([]);
    setApproved(new Set());
    setRejected(new Set());
    try {
      const chars = await generateCharactersFromAI(
        aiPrompt,
        {
          title: state.config.title,
          genres: state.config.genres,
          context: state.config.context,
          nsfwEnabled: state.config.nsfwEnabled,
          existingChars: characters.map(c => c.name),
        },
        state.apiKeys,
        refAppearanceHint
      );
      setAiPreview(chars);
      setReviewEdits(chars.map(c => ({ ...c })));
      setReviewIdx(0);
    } catch (err: any) {
      setAiError(err.message || 'Lỗi không xác định. Thử lại.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApprove = (idx: number) => {
    setApproved(prev => new Set([...prev, idx]));
    setRejected(prev => { const n = new Set(prev); n.delete(idx); return n; });
    const next = aiPreview.findIndex((_, i) => i > idx && !approved.has(i) && !rejected.has(i));
    if (next !== -1) setReviewIdx(next);
    else setReviewIdx(null);
  };

  const handleReject = (idx: number) => {
    setRejected(prev => new Set([...prev, idx]));
    setApproved(prev => { const n = new Set(prev); n.delete(idx); return n; });
    const next = aiPreview.findIndex((_, i) => i > idx && !approved.has(i) && !rejected.has(i));
    if (next !== -1) setReviewIdx(next);
    else setReviewIdx(null);
  };

  const handleSaveApproved = () => {
    const toAdd = reviewEdits.filter((_, i) => approved.has(i));
    if (toAdd.length === 0) { setAiError('Chưa duyệt nhân vật nào!'); return; }
    setReviewIdx(null);
    updateState((prev) => {
      toAdd.forEach(c => {
        prev.characters.push({ id: Math.random().toString(36).substr(2, 9), ...c });
      });
    });
    setAiPreview([]);
    setReviewEdits([]);
    setApproved(new Set());
    setRejected(new Set());
    setAiPrompt('');
    setAiError(null);
  };

  const updateReviewField = (idx: number, field: keyof Omit<Character, 'id' | 'relationships'>, value: string) => {
    setReviewEdits(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-xl">
            <Users className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Nhân Vật & Thế Giới</h2>
            <p className="text-xs text-gray-400">Thiết lập mối quan hệ, bối cảnh mỹ nhân và các phe phái.</p>
          </div>
        </div>
      </div>

      {/* Mốc hiện tại đang viết tới */}
      <div className="mb-8 bg-cyan-950/10 border border-cyan-800/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300">Mốc hiện tại đang viết tới</span>
        </div>
        <input
          type="number"
          placeholder="Số thứ tự, VD: 165"
          value={state.config.currentStoryPoint?.order ?? ''}
          onChange={(e) => updateState((prev) => {
            if (e.target.value === '') { prev.config.currentStoryPoint = undefined; return; }
            const order = Number(e.target.value);
            prev.config.currentStoryPoint = { order, label: prev.config.currentStoryPoint?.label || '' };
          })}
          className="w-32 bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-600"
        />
        <input
          type="text"
          placeholder="Nhãn hiển thị, VD: Chương 165"
          value={state.config.currentStoryPoint?.label ?? ''}
          onChange={(e) => updateState((prev) => {
            if (!prev.config.currentStoryPoint) prev.config.currentStoryPoint = { order: 0, label: '' };
            prev.config.currentStoryPoint.label = e.target.value;
          })}
          className="flex-1 min-w-[140px] bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-600"
        />
        <p className="text-[9px] text-gray-500 leading-relaxed sm:max-w-[260px]">
          Khi viết ở trang Sáng Tác, mọi nhân vật hoặc mốc thông tin có số thứ tự lớn hơn giá trị này sẽ tự động bị ẩn khỏi AI — tránh nhắc chuyện chưa xảy ra.
        </p>
      </div>

      {/* Dòng thời gian cốt truyện toàn cục */}
      <div className="mb-8 bg-neutral-900 border border-amber-800/30 rounded-2xl p-4">
        <StoryTimelineEditor
          events={state.storyEvents || []}
          onChange={(events) => updateState(prev => { prev.storyEvents = events; })}
          characters={characters}
          novelContext={{ title: state.config.title, genres: state.config.genres, context: state.config.context }}
          apiKeys={state.apiKeys}
        />
      </div>

      {/* AI Tạo Nhân Vật */}
      <div className="mb-8 bg-gradient-to-br from-violet-950/30 via-neutral-900 to-neutral-900 border border-violet-700/30 rounded-2xl overflow-hidden">
        <button
          onClick={() => setAiExpanded(!aiExpanded)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-violet-950/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-violet-900/50 border border-violet-600/40 rounded-lg">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-left">
              <span className="text-sm font-bold text-violet-300">AI Tạo Nhân Vật</span>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Nhập gợi ý → AI sinh nhân vật phù hợp với bối cảnh truyện
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {aiPreview.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 bg-violet-900/40 border border-violet-700/40 rounded-full text-violet-300">
                {aiPreview.length} nhân vật đang chờ
              </span>
            )}
            {aiExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </div>
        </button>

        {aiExpanded && (
          <div className="px-5 pb-5 border-t border-violet-900/30 pt-4 space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2">Mô tả nhân vật bạn muốn tạo</label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Tạo 3 nữ phụ harem cho nam chính tu tiên, mỗi người một tính cách: 1 lạnh lùng kiêu ngạo, 1 dịu dàng nhút nhát, 1 nghịch ngợm hoạt bát..."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                className="w-full bg-neutral-950 border border-violet-900/40 focus:border-violet-600/60 rounded-xl p-3 text-xs text-gray-200 focus:outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>

            <div>
              <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Gợi ý nhanh</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAiPrompt(p)}
                    className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 hover:border-violet-700/50 hover:text-violet-300 rounded-lg text-[10px] text-gray-500 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAIGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-violet-800/60 to-indigo-800/60 hover:from-violet-700/70 hover:to-indigo-700/70 border border-violet-700/40 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-violet-100 flex items-center justify-center gap-2 transition-all"
            >
              {aiLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo nhân vật...</>
                : <><Sparkles className="w-4 h-4" /> Sinh Nhân Vật Bằng AI</>}
            </button>

            {aiError && (
              <div className="px-4 py-2.5 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <span className="text-red-400">⚠</span> {aiError}
              </div>
            )}

            {aiPreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    AI tạo {aiPreview.length} nhân vật —
                    <span className="text-green-400">{approved.size} duyệt</span>
                    {rejected.size > 0 && <span className="text-red-400 ml-1">· {rejected.size} từ chối</span>}
                    {aiPreview.length - approved.size - rejected.size > 0 && (
                      <span className="text-gray-500 ml-1">· {aiPreview.length - approved.size - rejected.size} chưa xem</span>
                    )}
                  </p>
                  <button onClick={handleAIGenerate} disabled={aiLoading}
                    className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-0.5 border border-neutral-700 rounded-lg hover:bg-neutral-800/40 flex items-center gap-1 transition-colors">
                    <RefreshCw className="w-2.5 h-2.5" /> Tạo lại
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {aiPreview.map((c, idx) => {
                    const isApproved = approved.has(idx);
                    const isRejected = rejected.has(idx);
                    const isPending = !isApproved && !isRejected;
                    const edited = reviewEdits[idx] || c;
                    return (
                      <button
                        key={idx}
                        onClick={() => setReviewIdx(idx)}
                        className={`relative text-left rounded-xl px-3 py-2.5 border transition-all ${
                          isApproved ? 'bg-green-950/30 border-green-700/50' :
                          isRejected ? 'bg-neutral-950/30 border-neutral-800 opacity-40' :
                          reviewIdx === idx ? 'bg-violet-950/40 border-violet-600/60' :
                          'bg-neutral-950/60 border-neutral-800 hover:border-violet-700/40'
                        }`}>
                        <span className={`absolute top-1.5 right-1.5 text-[8px] px-1 py-0.5 rounded font-bold ${
                          isApproved ? 'bg-green-900/60 text-green-400' :
                          isRejected ? 'bg-neutral-800 text-gray-600' :
                          isPending ? 'bg-violet-900/50 text-violet-400' : ''
                        }`}>
                          {isApproved ? '✓ Duyệt' : isRejected ? '✗ Bỏ' : '• Chờ'}
                        </span>
                        <p className="text-xs font-bold text-gray-200 truncate pr-10">{edited.name}</p>
                        <p className="text-[10px] text-amber-500 truncate">{edited.role}</p>
                        <p className="text-[10px] text-gray-600">{edited.gender} · {edited.age}</p>
                      </button>
                    );
                  })}
                </div>

                {approved.size > 0 && (
                  <button onClick={handleSaveApproved}
                    className="w-full py-2.5 bg-green-800/60 hover:bg-green-700/70 border border-green-700/50 rounded-xl text-sm font-bold text-green-100 flex items-center justify-center gap-2 transition-colors">
                    <CheckCircle2 className="w-4 h-4" />
                    Lưu {approved.size} nhân vật đã duyệt vào danh sách
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Review Nhân Vật */}
      {reviewIdx !== null && reviewEdits[reviewIdx] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setReviewIdx(null)} />
          <div className="relative w-full max-w-lg bg-neutral-900 border border-violet-700/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-bold text-violet-300">
                  Hồ Sơ AI — {reviewIdx + 1}/{aiPreview.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setReviewIdx(i => Math.max(0, (i ?? 0) - 1))}
                  disabled={reviewIdx === 0}
                  className="p-1 text-gray-500 hover:text-gray-200 disabled:opacity-30 hover:bg-neutral-800 rounded-lg">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setReviewIdx(i => Math.min(aiPreview.length - 1, (i ?? 0) + 1))}
                  disabled={reviewIdx === aiPreview.length - 1}
                  className="p-1 text-gray-500 hover:text-gray-200 disabled:opacity-30 hover:bg-neutral-800 rounded-lg">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setReviewIdx(null)}
                  className="p-1 text-gray-500 hover:text-gray-200 hover:bg-neutral-800 rounded-lg ml-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
              {(() => {
                const c = reviewEdits[reviewIdx];
                const update = (field: keyof Omit<Character, 'id' | 'relationships'>, val: string) =>
                  updateReviewField(reviewIdx, field, val);
                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] text-gray-400 mb-1">Tên</label>
                        <input value={c.name} onChange={e => update('name', e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-violet-500"
                          spellCheck={false} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1">Giới tính</label>
                        <select value={c.gender} onChange={e => update('gender', e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200 focus:outline-none">
                          <option>Nam</option><option>Nữ</option><option>Khác</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1">Tuổi</label>
                        <input value={c.age} onChange={e => update('age', e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200 focus:outline-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Vai trò</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {ROLES.map(r => (
                          <button key={r.value} type="button"
                            onClick={() => update('role', r.value)}
                            className={`px-2 py-1 rounded-lg text-[10px] border transition-all ${
                              c.role === r.value
                                ? 'bg-violet-900/50 border-violet-600/60 text-violet-300'
                                : 'bg-neutral-950 border-neutral-700 text-gray-400 hover:border-neutral-500 hover:text-gray-200'
                            }`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                      <input value={c.role} onChange={e => update('role', e.target.value)}
                        placeholder="...hoặc tự nhập vai trò cụ thể"
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-violet-500" />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Ngoại hình</label>
                      <textarea rows={4} value={c.appearance} onChange={e => update('appearance', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-violet-500 resize-y"
                        spellCheck={false} />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Tính cách</label>
                      <textarea rows={3} value={c.personality} onChange={e => update('personality', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-violet-500 resize-y"
                        spellCheck={false} />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Quá khứ / Trauma</label>
                      <textarea rows={5} value={c.backStory} onChange={e => update('backStory', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-violet-500 resize-y"
                        spellCheck={false} />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Trạng thái hiện tại</label>
                      <textarea rows={4} value={c.currentStatus} onChange={e => update('currentStatus', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-violet-500 resize-y"
                        spellCheck={false} />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Bí mật / Kinks</label>
                      <textarea rows={3} value={c.additionalInfo} onChange={e => update('additionalInfo', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-violet-500 resize-y"
                        spellCheck={false} />
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="px-5 py-4 border-t border-neutral-800 shrink-0 space-y-2">
              <div className="flex gap-2">
                <button onClick={() => handleReject(reviewIdx)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 border transition-colors ${
                    rejected.has(reviewIdx)
                      ? 'bg-neutral-800 border-neutral-600 text-gray-300'
                      : 'bg-neutral-900 border-neutral-700 text-gray-400 hover:bg-red-950/30 hover:border-red-800/50 hover:text-red-300'
                  }`}>
                  <X className="w-4 h-4" />
                  {rejected.has(reviewIdx) ? 'Đã từ chối' : 'Từ chối'}
                </button>
                <button onClick={() => handleApprove(reviewIdx)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                    approved.has(reviewIdx)
                      ? 'bg-green-800 border-green-600 text-white'
                      : 'bg-violet-800/70 border-violet-600/60 text-violet-100 hover:bg-violet-700/80'
                  }`}>
                  <Check className="w-4 h-4" />
                  {approved.has(reviewIdx) ? 'Đã duyệt ✓' : 'Duyệt nhân vật này'}
                </button>
              </div>
              {approved.size > 0 && (
                <button onClick={() => { handleSaveApproved(); setReviewIdx(null); }}
                  className="w-full py-2 bg-green-800/50 hover:bg-green-700/60 border border-green-700/50 rounded-xl text-xs font-bold text-green-200 transition-colors">
                  Lưu {approved.size} nhân vật đã duyệt và đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid Nhân Vật + Thế Giới */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Phần Nhân Vật */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-red-400" /> Nhân vật ({characters.length})
            </h3>
            {!isAddingChar && (
              <button
                onClick={() => { setEditingCharId(null); resetCharForm(); setIsAddingChar(true); }}
                className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-100 text-xs rounded-lg border border-red-700/50 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm nhân vật
              </button>
            )}
          </div>

          {isAddingChar && (
            <div className="bg-neutral-900 border border-red-950/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h4 className="text-sm font-bold text-red-400">
                  {editingCharId ? `Sửa: ${charForm.name}` : 'Tạo Nhân Vật Mới'}
                </h4>
                <button onClick={() => setIsAddingChar(false)} className="text-xs text-gray-500 hover:text-gray-300">Đóng</button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">Tên *</label>
                  <input type="text" placeholder="Mỹ Linh" value={charForm.name}
                    onChange={(e) => setCharForm({ ...charForm, name: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-red-500"
                    spellCheck={false} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Giới tính</label>
                  <select value={charForm.gender} onChange={(e) => setCharForm({ ...charForm, gender: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none">
                    <option>Nam</option><option>Nữ</option><option>Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tuổi</label>
                  <input type="text" placeholder="18" value={charForm.age}
                    onChange={(e) => setCharForm({ ...charForm, age: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Vai trò</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ROLES.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setCharForm({ ...charForm, role: r.value })}
                      className={`px-2 py-1 rounded-lg text-[11px] border transition-all ${
                        charForm.role === r.value
                          ? 'bg-red-900/50 border-red-600/60 text-red-300'
                          : 'bg-neutral-950 border-neutral-800 text-gray-400 hover:border-neutral-600 hover:text-gray-200'
                      }`}>
                      {r.label}
                    </button>
                  ))}
                </div>
                <input type="text" placeholder="...hoặc tự nhập bất kỳ (VD: Quản gia, Yêu tinh, Thần thú, Kẻ phản bội)"
                  value={charForm.role}
                  onChange={(e) => setCharForm({ ...charForm, role: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-red-500"
                  spellCheck={false} />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Tính cách</label>
                <textarea rows={3} placeholder="Cao ngạo, nội tâm sâu sắc..." value={charForm.personality}
                  onChange={(e) => setCharForm({ ...charForm, personality: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-red-500 resize-y"
                  spellCheck={false} />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Ngoại hình</label>
                <textarea rows={4} placeholder="Khuôn mặt trái xoan, tóc đen óng..." value={charForm.appearance}
                  onChange={(e) => setCharForm({ ...charForm, appearance: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-red-500 resize-y"
                  spellCheck={false} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Quá khứ / Trauma</label>
                  <textarea rows={5} placeholder="Gia tộc bị tàn sát, bị phản bội..." value={charForm.backStory}
                    onChange={(e) => setCharForm({ ...charForm, backStory: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none resize-y"
                    spellCheck={false} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Trạng thái hiện tại</label>
                  <textarea rows={5} placeholder="Đang bị ép hôn, mong được cứu..." value={charForm.currentStatus}
                    onChange={(e) => setCharForm({ ...charForm, currentStatus: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none resize-y"
                    spellCheck={false} />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Bí mật / Kinks</label>
                <textarea rows={3} placeholder="Điểm yếu, fetish, bí mật thầm kín..." value={charForm.additionalInfo}
                  onChange={(e) => setCharForm({ ...charForm, additionalInfo: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none resize-y"
                  spellCheck={false} />
              </div>

              {/* ✅ B9 + D2: Ô Dữ liệu hiện hữu + nút xóa lịch sử */}
              <div className="border-t border-cyan-900/30 pt-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-cyan-300 flex items-center gap-1.5">
                    🔄 Dữ liệu hiện hữu <span className="text-[9px] text-gray-500 font-normal">(tự động cập nhật khi bấm "Tóm tắt chương" ở trang Sáng Tác — KHÔNG ghi đè hồ sơ gốc)</span>
                  </label>
                  {charForm.currentData?.trim() && (
                    confirmingClearCharData ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button"
                          onClick={() => { setCharForm({ ...charForm, currentData: '' }); setConfirmingClearCharData(false); }}
                          className="text-[9px] px-1.5 py-0.5 bg-red-900/60 text-red-200 rounded">Xác nhận xóa</button>
                        <button type="button"
                          onClick={() => setConfirmingClearCharData(false)}
                          className="text-[9px] px-1.5 py-0.5 bg-neutral-800 text-gray-400 rounded">Hủy</button>
                      </div>
                    ) : (
                      <button type="button"
                        onClick={() => setConfirmingClearCharData(true)}
                        className="text-[9px] text-gray-500 hover:text-red-400 flex items-center gap-0.5 shrink-0">
                        <Trash2 className="w-2.5 h-2.5" /> Xóa lịch sử
                      </button>
                    )
                  )}
                </div>
                <textarea rows={5}
                  placeholder="Sẽ tự động điền khi bạn dùng nút Tóm tắt chương ở trang Sáng Tác. Cũng có thể tự gõ tay tại đây."
                  value={charForm.currentData || ''}
                  onChange={(e) => setCharForm({ ...charForm, currentData: e.target.value })}
                  className="w-full bg-neutral-950 border border-cyan-900/40 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-600 resize-y whitespace-pre-wrap"
                  spellCheck={false} />
                <p className="text-[9px] text-gray-600 mt-1 leading-relaxed">
                  Ghi thay đổi phát sinh khi viết (cảnh giới mới, vết thương, quan hệ thay đổi...). Không sửa trực tiếp Ngoại hình/Tính cách/Quá khứ ở trên.
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" /> Mốc xuất hiện lần đầu (tuỳ chọn)
                </label>
                <input type="number" placeholder="VD: 165 (số chương nguyên tác nhân vật này lần đầu xuất hiện)"
                  value={charForm.firstAppearanceOrder}
                  onChange={(e) => setCharForm({ ...charForm, firstAppearanceOrder: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-600" />
                <p className="text-[9px] text-gray-600 mt-1 leading-relaxed">
                  Nếu đặt mốc này LỚN HƠN "Mốc hiện tại đang viết tới" (ở đầu trang), nhân vật sẽ TỰ ĐỘNG bị ẩn khỏi AI khi viết truyện — tránh lỗi nhắc đến nhân vật chưa xuất hiện.
                </p>
              </div>

              <CharacterTimelineEditor
                entries={charForm.timeline}
                onChange={(timeline) => setCharForm({ ...charForm, timeline })}
                characters={characters}
                currentCharId={editingCharId}
              />

              <AbilityEditor
                abilities={charForm.abilities || []}
                onChange={(abilities) => setCharForm({ ...charForm, abilities })}
              />

              <FashionStyleGallery
                styles={charForm.fashionStyles || []}
                onChange={(fashionStyles) => setCharForm({ ...charForm, fashionStyles })}
                characterContext={{ name: charForm.name, gender: charForm.gender, role: charForm.role }}
                apiKeys={state.apiKeys}
              />

              <div className="border-t border-neutral-800 pt-4">
                <CharacterImageGallery
                  images={charForm.images || []}
                  onChange={(images) => setCharForm({ ...charForm, images })}
                  characterContext={{ name: charForm.name, gender: charForm.gender, role: charForm.role, appearance: charForm.appearance, personality: charForm.personality }}
                  apiKeys={state.apiKeys}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setIsAddingChar(false)} className="px-3 py-1.5 hover:bg-neutral-800 rounded-lg text-xs text-gray-400">Hủy</button>
                <button onClick={handleSaveCharacter} className="px-5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold">Lưu</button>
              </div>
            </div>
          )}

          {characters.length === 0 ? (
            <div className="py-12 border border-dashed border-neutral-800 rounded-xl text-center text-gray-500 text-xs">
              Chưa có nhân vật nào. Hãy thêm thủ công hoặc dùng AI tạo nhanh bên trên!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {characters.map((c) => (
                <div key={c.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-red-950/60 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {c.images && c.images.length > 0 && (
                        <img src={c.images[0].dataUrl} alt={c.name}
                          className="w-10 h-10 rounded-lg object-cover border border-neutral-700 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-100 truncate">{c.name}
                          <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded font-mono ${c.gender === 'Nữ' ? 'bg-pink-950/50 text-pink-300' : 'bg-indigo-950/50 text-indigo-300'}`}>
                            {c.gender} · {c.age}
                          </span>
                        </h4>
                        <span className="text-[10px] text-amber-500 font-medium">{c.role}</span>
                        {c.images && c.images.length > 0 && (
                          <span className="ml-1.5 text-[9px] text-violet-400">📷 {c.images.length} ảnh</span>
                        )}
                        {c.timeline && c.timeline.length > 0 && (
                          <span className="ml-1.5 text-[9px] text-cyan-400">🕒 {c.timeline.length} mốc</span>
                        )}
                        {c.abilities && c.abilities.length > 0 && (
                          <span className="ml-1.5 text-[9px] text-red-400">⚔️ {c.abilities.length} kỹ năng</span>
                        )}
                        {c.fashionStyles && c.fashionStyles.length > 0 && (
                          <span className="ml-1.5 text-[9px] text-pink-400">👗 {c.fashionStyles.length} trang phục</span>
                        )}
                        {c.firstAppearanceOrder !== undefined && (
                          <span className="ml-1.5 text-[9px] text-gray-500">· xuất hiện từ #{c.firstAppearanceOrder}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditCharacterClick(c)} className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {confirmingDeleteCharId === c.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDeleteCharacter(c.id)} className="text-[8px] px-1.5 py-0.5 bg-red-900/60 text-red-200 rounded">Xác nhận</button>
                          <button onClick={() => setConfirmingDeleteCharId(null)} className="text-[8px] px-1.5 py-0.5 bg-neutral-800 text-gray-400 rounded">Hủy</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmingDeleteCharId(c.id)} className="p-1 text-neutral-400 hover:text-red-400 rounded hover:bg-neutral-800">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-gray-400 border-t border-neutral-800 pt-2 mt-2">
                    {c.appearance && <p className="line-clamp-1"><span className="text-gray-500">Ngoại hình:</span> {ensureString(c.appearance)}</p>}
                    {c.personality && <p className="line-clamp-1"><span className="text-gray-500">Tính cách:</span> {ensureString(c.personality)}</p>}
                    {c.additionalInfo && <p className="text-amber-400/70 text-[10px] line-clamp-1">✦ {ensureString(c.additionalInfo)}</p>}
                    {/* ✅ B12: Hiển thị currentData trên card nhân vật */}
                    {c.currentData && <p className="text-cyan-400/80 text-[10px] line-clamp-1">🔄 {ensureString(c.currentData)}</p>}
                    {c.abilities && c.abilities.length > 0 && (
                      <p className="text-[10px] text-red-400/70 line-clamp-1">
                        ⚔️ {c.abilities.slice(0, 3).map(a => a.name).join(', ')}
                        {c.abilities.length > 3 && ` +${c.abilities.length - 3}`}
                      </p>
                    )}
                  </div>

                  {c.relationships?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.relationships.map((r, i) => {
                        const targetName = characters.find((t) => t.id === r.targetCharacterId)?.name || '?';
                        return (
                          <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-950 border border-neutral-800 rounded text-[10px] text-gray-300">
                            <span className="text-red-400">{r.relationType}</span>
                            <span className="text-gray-600">→</span>
                            <span>{targetName}</span>
                            {/* ✅ B6: Sửa nút xóa quan hệ - xóa cả 2 chiều */}
                            <button onClick={() => updateState((prev) => {
                              const s = prev.characters.find((c2) => c2.id === c.id);
                              const t = prev.characters.find((c2) => c2.id === r.targetCharacterId);
                              if (s) s.relationships = s.relationships.filter((rel) => rel.targetCharacterId !== r.targetCharacterId);
                              if (t) t.relationships = t.relationships.filter((rel) => rel.targetCharacterId !== c.id);
                            })} className="text-gray-600 hover:text-red-400 ml-0.5">×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <button onClick={() => setIsLinkingRelation(c.id)}
                      className="px-2 py-1 bg-neutral-950 border border-neutral-800 hover:border-red-900 rounded-lg text-[10px] text-gray-400 flex items-center gap-1">
                      <Link className="w-3 h-3 text-red-500" /> Liên kết
                    </button>
                  </div>

                  {isLinkingRelation === c.id && (
                    <div className="mt-3 p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-red-400">🔗 Liên kết quan hệ — {c.name}</span>
                        <button onClick={() => setIsLinkingRelation(null)} className="text-[10px] text-gray-500 hover:text-gray-300">✕ Đóng</button>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Nhân vật liên kết tới</label>
                        <select value={relForm.targetCharacterId}
                          onChange={(e) => setRelForm({ ...relForm, targetCharacterId: e.target.value })}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-red-700">
                          <option value="">-- Chọn nhân vật --</option>
                          {characters.filter((t) => t.id !== c.id).map((t) => (
                            <option key={t.id} value={t.id}>{t.name} · {t.role}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Loại quan hệ</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {[
                            'Người yêu', 'Vợ', 'Chồng', 'Đạo lữ', 'Người tình bí mật',
                            'Harem', 'Nô dịch', 'Chủ nhân', 'Lô đỉnh',
                            'Tình địch', 'Cừu hận', 'Kẻ thù', 'Phản bội',
                            'Tỷ muội', 'Huynh đệ', 'Sư phụ', 'Đệ tử', 'Đồng môn',
                            'Bạn thân', 'Đồng minh', 'Cấp trên', 'Cấp dưới',
                          ].map((rel) => (
                            <button key={rel} type="button"
                              // ✅ B3: Cập nhật onClick để tự gợi ý quan hệ ngược
                              onClick={() => setRelForm({ ...relForm, relationType: rel, reverseRelationType: guessInverseRelation(rel) })}
                              className={`px-2 py-0.5 rounded text-[10px] border transition-all ${
                                relForm.relationType === rel
                                  ? 'bg-red-900/50 border-red-600/60 text-red-300'
                                  : 'bg-neutral-900 border-neutral-700 text-gray-400 hover:border-neutral-500 hover:text-gray-200'
                              }`}>
                              {rel}
                            </button>
                          ))}
                          <button type="button"
                            onClick={() => setRelForm({ ...relForm, relationType: '__custom__' })}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-all ${
                              relForm.relationType === '__custom__'
                                ? 'bg-amber-900/50 border-amber-600/60 text-amber-300'
                                : 'bg-neutral-900 border-neutral-700 text-gray-400 hover:border-amber-700 hover:text-amber-300'
                            }`}>
                            ✏️ Tự nhập...
                          </button>
                        </div>

                        {relForm.relationType === '__custom__' && (
                          <input type="text"
                            placeholder="Nhập loại quan hệ tùy chỉnh..."
                            value={customRelationType}
                            onChange={(e) => setCustomRelationType(e.target.value)}
                            className="w-full bg-neutral-900 border border-amber-800/50 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-600"
                            spellCheck={false}
                            autoFocus />
                        )}

                        {relForm.relationType && relForm.relationType !== '__custom__' && (
                          <p className="text-[10px] text-red-400 mt-1">
                            Đã chọn: <strong>{relForm.relationType}</strong>
                          </p>
                        )}

                        {/* ✅ B4: Thêm ô Quan hệ ngược lại */}
                        {relForm.relationType && (
                          <div className="mt-2">
                            <label className="block text-[10px] text-gray-500 mb-1">
                              Quan hệ ngược lại (góc nhìn của nhân vật kia) — kiểm tra/sửa trước khi lưu
                            </label>
                            <input
                              type="text"
                              placeholder="VD: Em họ, Đệ tử, Chồng..."
                              value={relForm.reverseRelationType}
                              onChange={(e) => setRelForm({ ...relForm, reverseRelationType: e.target.value })}
                              className="w-full bg-neutral-900 border border-amber-800/50 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-600"
                              spellCheck={false}
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Mô tả sắc thái (tuỳ chọn)</label>
                        <input type="text"
                          placeholder="Ví dụ: Đã thề sống chết, đang trong giai đoạn ghen tuông..."
                          value={relForm.description}
                          onChange={(e) => setRelForm({ ...relForm, description: e.target.value })}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-red-700"
                          spellCheck={false} />
                      </div>

                      <button onClick={() => handleAddRelationship(c.id)}
                        disabled={!relForm.targetCharacterId || !relForm.relationType}
                        className="w-full py-1.5 bg-red-900/50 border border-red-800/50 text-red-100 hover:bg-red-800/60 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold transition-colors">
                        ✓ Xác nhận liên kết
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phần Thế Giới */}
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-emerald-950/30 via-neutral-900 to-neutral-900 border border-emerald-700/30 rounded-2xl overflow-hidden">
            <button
              onClick={() => setWorldPanelExpanded(!worldPanelExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-950/20 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-emerald-900/50 border border-emerald-600/40 rounded-lg shrink-0">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-xs font-bold text-emerald-300">Thêm Thế Lực / Thế Giới</span>
                  <p className="text-[9px] text-gray-500 mt-0.5 truncate">Tạo hàng loạt bằng AI, hoặc tạo chi tiết từng mục</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {worldAiPreview.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-900/40 border border-emerald-700/40 rounded-full text-emerald-300">
                    {worldAiPreview.length} đang chờ
                  </span>
                )}
                {worldPanelExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </button>

            {worldPanelExpanded && (
              <div className="px-4 pb-4 border-t border-emerald-900/30 pt-3 space-y-3">
                <div className="flex gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <button
                    onClick={() => { setWorldCreateMode('batch'); setIsAddingWorldEntity(false); }}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                      worldCreateMode === 'batch' ? 'bg-emerald-800/60 text-emerald-100' : 'text-gray-500 hover:text-gray-300'
                    }`}>
                    ⚡ Tạo hàng loạt (AI)
                  </button>
                  <button
                    onClick={() => { setWorldCreateMode('detail'); setIsAddingWorldEntity(true); }}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                      worldCreateMode === 'detail' ? 'bg-emerald-800/60 text-emerald-100' : 'text-gray-500 hover:text-gray-300'
                    }`}>
                    🔍 Tạo chi tiết 1 mục
                  </button>
                </div>

                {worldCreateMode === 'batch' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1.5">
                        Danh mục <span className="text-gray-600">(để trống = AI tự chọn đa dạng)</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {WORLD_TYPES.map((t) => (
                          <button key={t.value} type="button" onClick={() => toggleWorldAiCategory(t.value)}
                            className={`px-2 py-1 rounded-lg text-[10px] border transition-all ${
                              worldAiCategories.includes(t.value)
                                ? 'bg-emerald-900/50 border-emerald-600/60 text-emerald-300'
                                : 'bg-neutral-950 border-neutral-800 text-gray-400 hover:border-neutral-600 hover:text-gray-200'
                            }`}>
                            {t.value}
                          </button>
                        ))}
                        {worldAiCustomCats.map((cat) => (
                          <button key={cat} type="button" onClick={() => toggleWorldAiCategory(cat)}
                            className={`px-2 py-1 rounded-lg text-[10px] border transition-all ${
                              worldAiCategories.includes(cat)
                                ? 'bg-teal-900/50 border-teal-600/60 text-teal-300'
                                : 'bg-neutral-950 border-teal-900/40 text-teal-500/80 hover:border-teal-700 hover:text-teal-300'
                            }`}>
                            ✦ {cat}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <input type="text" placeholder="Danh mục khác... (VD: Lời nguyền)"
                          value={worldAiCustomCatInput}
                          onChange={(e) => setWorldAiCustomCatInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddWorldAiCustomCategory(); } }}
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-[10px] text-gray-200 focus:outline-none focus:border-teal-600"
                          spellCheck={false} />
                        <button type="button" onClick={handleAddWorldAiCustomCategory}
                          className="px-2.5 py-1 bg-teal-950/40 border border-teal-800/40 hover:border-teal-600/60 rounded-lg text-[10px] text-teal-300 flex items-center gap-1 transition-colors shrink-0">
                          <Plus className="w-3 h-3" /> Thêm
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Yêu cầu / mô tả</label>
                      <textarea rows={3}
                        placeholder="VD: Tạo các loại đan dược đặc trưng của tông môn chính..."
                        value={worldAiPrompt}
                        onChange={(e) => setWorldAiPrompt(e.target.value)}
                        className="w-full bg-neutral-950 border border-emerald-900/40 focus:border-emerald-600/60 rounded-xl p-2.5 text-[11px] text-gray-200 focus:outline-none resize-none leading-relaxed"
                        spellCheck={false} />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Số lượng <span className="text-gray-600">(1-30)</span></label>
                      <div className="flex items-center gap-2">
                        <input type="number" min={1} max={30} value={worldAiQuantity}
                          onChange={(e) => setWorldAiQuantity(Number(e.target.value))}
                          className="w-20 bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-600" />
                        <div className="flex gap-1">
                          {[1, 5, 10, 20].map((n) => (
                            <button key={n} type="button" onClick={() => setWorldAiQuantity(n)}
                              className={`px-2 py-1 rounded-lg text-[10px] border transition-all ${
                                worldAiQuantity === n
                                  ? 'bg-emerald-900/50 border-emerald-600/60 text-emerald-300'
                                  : 'bg-neutral-950 border-neutral-800 text-gray-500 hover:border-neutral-600'
                              }`}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button onClick={handleWorldAIGenerate} disabled={worldAiLoading || !worldAiPrompt.trim()}
                      className="w-full py-2 bg-gradient-to-r from-emerald-800/60 to-teal-800/60 hover:from-emerald-700/70 hover:to-teal-700/70 border border-emerald-700/40 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold text-emerald-100 flex items-center justify-center gap-2 transition-all">
                      {worldAiLoading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tạo {worldAiQuantity} mục...</>
                        : <><Sparkles className="w-3.5 h-3.5" /> Tạo {worldAiQuantity > 1 ? `${worldAiQuantity} mục` : '1 mục'} bằng AI</>}
                    </button>

                    {worldAiError && (
                      <div className="px-3 py-2 bg-red-950/40 border border-red-800/50 rounded-xl text-[10px] text-red-300 flex items-center gap-1.5">
                        <span className="text-red-400">⚠</span> {worldAiError}
                      </div>
                    )}

                    {worldAiPreview.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-emerald-300">
                            {worldAiSelected.size}/{worldAiPreview.length} đã chọn
                          </p>
                          <button
                            onClick={() => setWorldAiSelected(
                              worldAiSelected.size === worldAiPreview.length ? new Set() : new Set(worldAiPreview.map((_, i) => i))
                            )}
                            className="text-[9px] text-emerald-400 hover:underline">
                            {worldAiSelected.size === worldAiPreview.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                          </button>
                        </div>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {worldAiPreview.map((w, i) => (
                            <label key={i} className="flex items-start gap-2 p-2 bg-neutral-950/60 border border-neutral-800 rounded-lg cursor-pointer hover:border-emerald-900/50">
                              <input type="checkbox" checked={worldAiSelected.has(i)}
                                onChange={() => setWorldAiSelected((prev) => {
                                  const n = new Set(prev);
                                  n.has(i) ? n.delete(i) : n.add(i);
                                  return n;
                                })}
                                className="mt-0.5 accent-emerald-600 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold text-gray-200">
                                  {w.name} <span className="text-emerald-500/80 font-normal text-[10px]">· {w.type}</span>
                                </p>
                                <p className="text-[10px] text-gray-500 leading-relaxed">{w.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                        <button onClick={handleImportWorldAiSelected}
                          className="w-full py-2 bg-green-800/60 hover:bg-green-700/70 border border-green-700/50 rounded-xl text-xs font-bold text-green-100 flex items-center justify-center gap-2 transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Nhập {worldAiSelected.size} mục đã chọn vào dự án
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {worldCreateMode === 'detail' && isAddingWorldEntity && (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-amber-400">Tạo Thế Lực Chi Tiết</span>
                    
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">
                        {worldForm.type === 'Chủng tộc' ? 'Tên loài *' : 'Tên tổ chức *'}
                      </label>
                      <input type="text" 
                        placeholder={worldForm.type === 'Chủng tộc' ? 'Tên loài (VD: Yêu Hồ Cửu Vĩ)...' : 'Tên tổ chức...'} 
                        value={worldForm.name}
                        onChange={(e) => setWorldForm({ ...worldForm, name: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-600"
                        spellCheck={false} />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Loại</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {WORLD_TYPES.map(t => (
                          <button key={t.value} type="button"
                            onClick={() => { setWorldForm({ ...worldForm, type: t.value }); }}
                            className={`px-2 py-1 rounded-lg text-[10px] border transition-all ${
                              worldForm.type === t.value
                                ? 'bg-amber-900/50 border-amber-600/60 text-amber-300'
                                : 'bg-neutral-950 border-neutral-800 text-gray-400 hover:border-neutral-600 hover:text-gray-200'
                            }`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <input type="text" placeholder="...hoặc tự nhập bất kỳ (VD: Yêu tinh tộc, Ma giáo, Long tộc)"
                        value={worldForm.type}
                        onChange={(e) => setWorldForm({ ...worldForm, type: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-gray-200 focus:outline-none"
                        spellCheck={false} />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] text-gray-500">Mô tả</label>
                        <button type="button" onClick={handleAIDescribeDetail} disabled={detailAiLoading || !worldForm.name.trim()}
                          className="text-[9px] text-emerald-400 hover:underline flex items-center gap-1 disabled:opacity-50">
                          {detailAiLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                          AI viết mô tả
                        </button>
                      </div>
                      {detailAiError && <p className="text-[9px] text-red-400 mb-1">⚠ {detailAiError}</p>}
                      <textarea rows={3} placeholder="Mô tả sức mạnh, quy tắc..." value={worldForm.description}
                        onChange={(e) => setWorldForm({ ...worldForm, description: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-gray-200 focus:outline-none"
                        spellCheck={false} />
                    </div>

                    {/* ✅ B11 + D3: Ô Dữ liệu hiện hữu cho thế lực + nút xóa lịch sử */}
                    <div className="border-t border-cyan-900/30 pt-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-cyan-300 flex items-center gap-1.5">
                          🔄 Dữ liệu hiện hữu <span className="text-[9px] text-gray-500 font-normal">(tự động cập nhật khi Tóm tắt chương)</span>
                        </label>
                        {worldForm.currentData?.trim() && (
                          confirmingClearWorldData ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button"
                                onClick={() => { setWorldForm({ ...worldForm, currentData: '' }); setConfirmingClearWorldData(false); }}
                                className="text-[9px] px-1.5 py-0.5 bg-red-900/60 text-red-200 rounded">Xác nhận xóa</button>
                              <button type="button"
                                onClick={() => setConfirmingClearWorldData(false)}
                                className="text-[9px] px-1.5 py-0.5 bg-neutral-800 text-gray-400 rounded">Hủy</button>
                            </div>
                          ) : (
                            <button type="button"
                              onClick={() => setConfirmingClearWorldData(true)}
                              className="text-[9px] text-gray-500 hover:text-red-400 flex items-center gap-0.5 shrink-0">
                              <Trash2 className="w-2.5 h-2.5" /> Xóa lịch sử
                            </button>
                          )
                        )}
                      </div>
                      <textarea rows={4}
                        placeholder="Sẽ tự động điền khi dùng nút Tóm tắt chương ở trang Sáng Tác. Có thể tự gõ tay."
                        value={worldForm.currentData || ''}
                        onChange={(e) => setWorldForm({ ...worldForm, currentData: e.target.value })}
                        className="w-full bg-neutral-950 border border-cyan-900/40 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-600 resize-y whitespace-pre-wrap"
                        spellCheck={false} />
                    </div>

                    {(worldForm.type === 'Chủng tộc' || 
                      worldForm.type.toLowerCase().includes('yêu') || 
                      worldForm.type.toLowerCase().includes('ma') || 
                      worldForm.type.toLowerCase().includes('quái') || 
                      worldForm.type.toLowerCase().includes('thú')) && (
                      <SpeciesTraitsEditor
                        traits={worldForm.speciesTraits}
                        onChange={(speciesTraits) => setWorldForm({ ...worldForm, speciesTraits })}
                        entityName={worldForm.name}
                        novelContext={{ title: state.config.title, genres: state.config.genres, context: state.config.context }}
                        apiKeys={state.apiKeys}
                      />
                    )}

                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" /> Mốc xuất hiện lần đầu (tuỳ chọn)
                      </label>
                      <input type="number" placeholder="VD: 165" value={worldForm.firstAppearanceOrder}
                        onChange={(e) => setWorldForm({ ...worldForm, firstAppearanceOrder: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-600" />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setIsAddingWorldEntity(false); }} 
                        className="px-2.5 py-1 bg-neutral-800 rounded text-xs text-gray-400">Đóng</button>
                      <button onClick={handleSaveWorldEntity} 
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold">Lưu</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-500" /> Thế lực ({worldEntities.length})
            </h3>
          </div>

          <div className="space-y-2">
            {worldEntities.length === 0 ? (
              <div className="py-8 border border-dashed border-neutral-800 rounded-xl text-center text-gray-500 text-xs">
                Chưa có thế lực nào.
              </div>
            ) : worldEntities.map((e) => (
              <div key={e.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 hover:border-amber-900/40">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-gray-200">{e.name}</span>
                    <span className="ml-2 px-1 py-0.5 rounded text-[8px] bg-neutral-800 text-amber-400 uppercase font-mono">{e.type}</span>
                    {e.firstAppearanceOrder !== undefined && (
                      <span className="ml-1.5 text-[9px] text-gray-500">· #{e.firstAppearanceOrder}</span>
                    )}
                  </div>
                  {confirmingDeleteWorldId === e.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDeleteWorldEntity(e.id)} className="text-[8px] px-1.5 py-0.5 bg-red-900/60 text-red-200 rounded">Xác nhận</button>
                      <button onClick={() => setConfirmingDeleteWorldId(null)} className="text-[8px] px-1.5 py-0.5 bg-neutral-800 text-gray-400 rounded">Hủy</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmingDeleteWorldId(e.id)} className="text-neutral-500 hover:text-red-400 p-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{ensureString(e.description)}</p>
                {/* ✅ B12: Hiển thị currentData trên card thế lực */}
                {e.currentData && (
                  <p className="text-[10px] text-cyan-400/80 mt-1 leading-relaxed">🔄 {ensureString(e.currentData)}</p>
                )}
                {e.speciesTraits && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {e.speciesTraits.threatLevel && (
                      <span className="text-[8px] px-1.5 py-0.5 bg-red-950/30 text-red-400 border border-red-900/30 rounded">
                        {e.speciesTraits.threatLevel}
                      </span>
                    )}
                    {e.speciesTraits.abilities?.length > 0 && (
                      <span className="text-[8px] px-1.5 py-0.5 bg-emerald-950/30 text-emerald-400 border border-emerald-900/30 rounded">
                        {e.speciesTraits.abilities.length} chiêu
                      </span>
                    )}
                    {e.speciesTraits.weakness && (
                      <span className="text-[8px] px-1.5 py-0.5 bg-amber-950/30 text-amber-400 border border-amber-900/30 rounded">
                        yếu: {e.speciesTraits.weakness.slice(0, 20)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-8 border-t border-neutral-800 mt-8">
        <button onClick={() => onNavigate('idea')} className="px-5 py-2.5 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm">
          Quay Lại
        </button>
        <button onClick={() => onNavigate('rules')} className="px-6 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold">
          Quy Tắc Viết →
        </button>
      </div>
    </div>
  );
}