import React, { useState } from 'react';
import { Users, Globe, Plus, Trash2, Edit2, Link, Sparkles, Loader2, CheckCircle2, RefreshCw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Check, ImagePlus, Image as ImageIcon, Wand2, Clock } from 'lucide-react';
import { NovelState, Character, Relationship, WorldEntity, CharacterImage, CharacterTimelineEntry } from '../types';

interface Page3CharactersProps {
  state: NovelState;
  updateState: (updater: (prev: NovelState) => void) => void;
  onNavigate: (tabId: string) => void;
}

// Vai trò - linh hoạt, không gò ép
const ROLES = [
  { value: 'Nam chính',      label: 'Nam chính' },
  { value: 'Nữ chính',       label: 'Nữ chính' },
  { value: 'Nam phụ',        label: 'Nam phụ' },
  { value: 'Nữ phụ',         label: 'Nữ phụ' },
  { value: 'Người yêu',      label: 'Người yêu / Người tình' },
  { value: 'Phản diện',      label: 'Phản diện' },
  { value: 'Tình địch',      label: 'Tình địch' },
  { value: 'Trợ thủ',        label: 'Trợ thủ' },
  { value: 'Sư phụ',         label: 'Sư phụ / Tiền bối' },
  { value: 'Bạn thân',       label: 'Bạn thân' },
  { value: 'Kẻ thù',         label: 'Kẻ thù' },
  { value: 'Gia đình',       label: 'Gia đình / Người thân' },
  { value: 'Nhân vật phụ',   label: 'Nhân vật phụ' },
];

// Gợi ý loại thế lực/thẻ thế giới — chỉ là gợi ý nhanh, ô bên dưới luôn cho phép tự nhập bất kỳ giá trị nào (VD: Yêu tinh tộc, Thần thú, Ma giáo)
// MỞ RỘNG: thêm Khái niệm, Địa danh/Địa điểm, Vật phẩm, Chủng tộc, Nguyên tắc — dùng chung cho cả form thêm thủ công VÀ bộ lọc danh mục khi tạo bằng AI.
const WORLD_TYPES = [
  { value: 'Tông môn',                    label: 'Tông môn' },
  { value: 'Gia tộc',                     label: 'Gia tộc' },
  { value: 'Địa danh / Địa điểm',         label: 'Địa danh / Địa điểm' },
  { value: 'Tập đoàn',                    label: 'Tập đoàn' },
  { value: 'Hệ thống',                    label: 'Hệ thống' },
  { value: 'Chủng tộc',                   label: 'Chủng tộc (yêu tinh, thần thú...)' },
  { value: 'Khái niệm',                   label: 'Khái niệm' },
  { value: 'Vật phẩm',                    label: 'Vật phẩm' },
  { value: 'Nguyên tắc',                  label: 'Nguyên tắc / Quy tắc thế giới' },
];

// ── MỚI: Gợi ý loại mốc trong "Dòng thời gian nhân vật" — CHỈ LÀ GỢI Ý, ô nhập luôn cho phép tự do ──
// Đồng nhân thường mang theo rất nhiều loại thông tin đi kèm nhân vật; danh sách này cố gắng bao quát
// càng nhiều càng tốt, nhưng người dùng có thể gõ bất kỳ loại nào khác không có trong danh sách.
const CATEGORY_SUGGESTIONS = [
  'Công pháp', 'Chiêu thức', 'Thể chất / Thể trạng', 'Kỳ ngộ', 'Đan dược đã dùng',
  'Cơ duyên', 'Vũ khí', 'Linh thú', 'Trợ giúp / Quý nhân', 'Thân phận',
  'Gia tộc / Thế lực đứng sau', 'Địa vị / Chức vụ', 'Mối quan hệ', 'Sự kiện lớn',
  'Phó bản / Thí luyện', 'Trận đánh lớn', 'Thương tích / Di chứng', 'Bí mật đang giữ',
  'Lời thề / Giao ước', 'Tài sản', 'Danh tiếng / Tin đồn', 'Kẻ thù', 'Món nợ ân tình',
  'Ngoại hình thay đổi', 'Tâm lý / Góc nhìn thay đổi', 'Khác',
];

// ── Gợi ý prompt nhanh cho AI tạo nhân vật ──
const QUICK_PROMPTS = [
  'Nữ chính tu tiên xinh đẹp lạnh lùng, ẩn chứa bí mật gia tộc',
  '3 nữ phụ harem cá tính khác nhau: tsundere, dịu dàng, điên cuồng',
  'Phản diện nam quyền lực, từng là người yêu cũ nữ chính',
  'Sư tôn nữ huyền bí, quan hệ thầy trò phức tạp với nam chính',
  'Tình địch nam đẹp trai, giàu có, si mê nữ chính',
  '2 nhân vật phụ hài hước, trung thành với nam chính',
];

// ── Khử lỗi object lồng nhau khi AI trả về dữ liệu phức tạp ──
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

// ── Gọi API tạo nhân vật ──
async function generateCharactersFromAI(
  prompt: string,
  novelContext: { title: string; genres: string[]; context: string; nsfwEnabled: boolean; existingChars: string[] },
  apiKeys: any[],
  refAppearanceHint?: string // Tổng hợp nhan sắc/vóc dáng/thần thái + gu thẩm mỹ từ ảnh mẫu (nếu có)
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

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

  // Parse JSON từ response
  let text = (data.text || '').trim();
  // Xóa markdown fences nếu có
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  // Tìm array JSON
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
  }));
}

// ─── MỚI: Gọi API tạo THẺ THẾ GIỚI bằng AI — dùng chung cho cả tạo 1 mục theo yêu cầu
// LẪN tạo hàng loạt (chỉ khác ở "quantity"). categories rỗng = để AI tự chọn đa dạng loại. ──
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

  const userPrompt = `Yêu cầu của tác giả: ${prompt}

Tạo đúng ${quantity} mục. Ví dụ format:
[{"name":"...","type":"...","description":"..."}]`;

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

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

  let text = (data.text || '').trim();
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

// ─── Resize ảnh trước khi lưu — tránh localStorage quá nặng ──────────────────
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

// ─── Trích nhiều khung hình rải đều từ video ngắn để phân tích như ảnh tĩnh ──
// Tránh lấy đúng 1 khung ở giây đầu/cuối (thường mờ hoặc đang chuyển cảnh) —
// lấy N khung rải đều trong thân video để đại diện chính xác hơn.
function extractVideoFrames(file: File, frameCount = 4, maxDim = 700): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    (video as any).playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('Canvas context lỗi')); return; }
    const frames: string[] = [];

    const captureAt = (time: number): Promise<void> => new Promise((res) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        let w = video.videoWidth, h = video.videoHeight;
        if (w > h && w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        frames.push(canvas.toDataURL('image/jpeg', 0.8));
        res();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = time;
    });

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        if (!duration || !isFinite(duration)) throw new Error('Không đọc được thời lượng video.');
        // Bỏ qua sát mép đầu/cuối — lấy N khung rải đều ở giữa video
        for (let i = 1; i <= frameCount; i++) {
          await captureAt((duration * i) / (frameCount + 1));
        }
        URL.revokeObjectURL(url);
        resolve(frames);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được video. Thử định dạng khác (mp4/webm) hoặc file nhỏ hơn.'));
    };
  });
}

// ─── Gọi AI Vision phân tích ảnh nhân vật (dùng khi sửa 1 nhân vật cụ thể) ───
async function analyzeImageWithAI(
  dataUrl: string,
  characterContext: { name: string; gender: string; role: string },
  apiKeys: any[],
  userHint?: string, // Gợi ý bổ sung từ tác giả — bù chi tiết ảnh không thể hiện rõ
  includeBackground: boolean = false // Mặc định CHỈ tập trung vào người, không mô tả bối cảnh xung quanh
): Promise<string> {
  const activeKey = apiKeys.find((k: any) => k.isActive && !k.quotaExceeded) || null;

  // Tách base64 thuần (bỏ "data:image/jpeg;base64,")
  const base64Data = dataUrl.split(',')[1] || '';
  const mediaType = dataUrl.match(/data:([^;]+);/)?.[1] || 'image/jpeg';

  const hintBlock = userHint?.trim()
    ? `\n\n[GỢI Ý BỔ SUNG TỪ TÁC GIẢ — ưu tiên kết hợp với ảnh, vì ảnh có thể không thể hiện đủ chi tiết]:\n${userHint.trim()}\nHãy kết hợp cả những gì thấy trong ảnh VÀ gợi ý này để tạo mô tả đầy đủ, chính xác nhất theo đúng ý tác giả.`
    : '';

  const backgroundInstruction = includeBackground
    ? 'Sau phần mô tả người, thêm 1-2 câu ngắn mô tả bối cảnh/không gian xung quanh (địa điểm, ánh sáng, không khí).'
    : 'CHỈ tập trung mô tả người trong ảnh — TUYỆT ĐỐI không mô tả bối cảnh, không gian, hay vật thể xung quanh, trừ khi nó là phụ kiện người đó đang đeo/cầm.';

  const systemPrompt = `Bạn là chuyên gia mô tả ngoại hình nhân vật cho tiểu thuyết. Nhìn hình ảnh được cung cấp và mô tả CHI TIẾT những gì thấy trong ảnh.
Ưu tiên hàng đầu, mô tả kỹ: khuôn mặt, thần thái/khí chất, vóc dáng cơ thể tổng thể (cân đối/mảnh mai/gợi cảm/đầy đặn...), làn da, kiểu tóc & màu tóc, gu trang điểm (đậm/nhẹ, tông màu), tư thế, biểu cảm, đặc điểm nổi bật.
VỀ TRANG PHỤC: KHÔNG liệt kê chi tiết từng món đồ, hoa văn, chất liệu cụ thể trong ảnh — vì nếu mô tả y nguyên, AI viết truyện sẽ bê nguyên bộ đồ đó vào mọi cảnh, làm giảm sáng tạo. Thay vào đó, hãy khái quát thành PHONG CÁCH / GU THẨM MỸ ăn mặc chung (VD: "ưa trang phục cổ trang thanh lịch, tông màu lạnh" hoặc "phong cách gợi cảm, táo bạo, nhiều phụ kiện kim loại") để khi viết truyện AI vẫn có thể sáng tạo trang phục đa dạng theo đúng gu đó.
VỀ VÓC DÁNG: mô tả ở mức tổng thể (dáng người, tỷ lệ hài hoà, đường nét chung), KHÔNG đưa ra số đo cụ thể hay mô tả kiểu liệt kê từng bộ phận cơ thể một cách trần trụi.
${backgroundInstruction}
Nhân vật trong truyện tên: ${characterContext.name || 'chưa đặt tên'} (${characterContext.gender}, vai trò: ${characterContext.role}).${hintBlock}
Trả lời bằng 1 đoạn văn mô tả tiếng Việt, súc tích nhưng đầy đủ chi tiết (khoảng 80-150 từ), để dùng làm tài liệu tham chiếu khi viết truyện — không thêm lời dẫn hay giải thích, chỉ trả mô tả thuần.`;

  const userPrompt = userHint?.trim()
    ? `Mô tả chi tiết nhan sắc, vóc dáng tổng thể, thần thái, tóc, gu trang điểm trong ảnh này (trang phục chỉ khái quát thành phong cách), kết hợp với gợi ý sau: ${userHint.trim()}`
    : 'Mô tả chi tiết nhan sắc, vóc dáng tổng thể, thần thái, tóc, gu trang điểm trong ảnh này. Trang phục chỉ khái quát thành phong cách/gu thẩm mỹ, không liệt kê chi tiết từng món đồ.';

  const body: Record<string, any> = {
    prompt: userPrompt,
    systemInstruction: systemPrompt,
    provider: activeKey?.provider || 'gemini',
    image: { data: base64Data, mediaType }, // backend cần hỗ trợ field này cho vision
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
  });

  const data = await res.json();
  if (!res.ok) {
    // Lỗi rõ ràng nếu backend chưa hỗ trợ ảnh
    const msg = data.error || `HTTP ${res.status}`;
    throw new Error(
      msg.toLowerCase().includes('image') || msg.toLowerCase().includes('unsupported')
        ? 'Backend chưa hỗ trợ phân tích ảnh (vision). Bạn vẫn có thể tự nhập mô tả bằng tay.'
        : msg
    );
  }
  const text = (data.text || '').trim();
  if (!text) throw new Error('AI không trả về mô tả. Thử lại hoặc tự nhập mô tả.');
  return text;
}

const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image'; // Tên model "Banana" trên AG — sửa lại nếu Model Plaza dùng tên khác

// ─── Sinh ẢNH nhân vật bằng AI (text → ảnh), CHỈ đọc dữ liệu hồ sơ nhân vật ──
// Độc lập hoàn toàn với các hàm viết truyện — lỗi ở đây không ảnh hưởng gì đến phần Sáng Tác.
async function generateCharacterImageAI(
  characterContext: { name: string; gender: string; role: string; appearance: string; personality: string },
  extraPrompt: string,
  modelName: string,
  apiKeys: any[]
): Promise<{ dataUrl: string }> {
  // Chỉ dùng key Antigravity — nơi duy nhất có quota "Banana"
  const activeKey = apiKeys.find((k: any) => k.isActive && !k.quotaExceeded && k.provider === 'antigravity') || null;
  if (!activeKey) {
    throw new Error('Cần 1 API Key loại "Antigravity" đang active (có quota Banana) để tạo ảnh. Vào trang Bắt Đầu kiểm tra lại API Key.');
  }

  const parts = [
    characterContext.name && `Nhân vật tên ${characterContext.name}`,
    characterContext.gender && `giới tính ${characterContext.gender}`,
    characterContext.role && `vai trò ${characterContext.role}`,
    characterContext.appearance?.trim() && `ngoại hình: ${characterContext.appearance.trim()}`,
    characterContext.personality?.trim() && `thần thái/tính cách toát ra: ${characterContext.personality.trim()}`,
    extraPrompt.trim() && `yêu cầu thêm: ${extraPrompt.trim()}`,
  ].filter(Boolean).join('. ');

  const fullPrompt = `Vẽ chân dung nhân vật phong cách bán tả thực, đẹp, chi tiết, dùng cho bìa tiểu thuyết mạng. ${parts}.`;

  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: fullPrompt,
      customApiKey: activeKey.key,
      customModel: modelName,
      customEndpoint: 'https://ag.beijixingxing.com/v1/chat/completions',
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  if (!data.imageBase64) throw new Error('Server không trả về dữ liệu ảnh.');

  return { dataUrl: `data:${data.mediaType || 'image/png'};base64,${data.imageBase64}` };
}

// ─── Gọi AI Vision phân tích 1 ảnh MẪU dùng để TẠO nhân vật mới ──────────────
// Khác với analyzeImageWithAI: không mô tả chi tiết từng món trang phục (mỗi ảnh mẫu
// mặc đồ khác nhau) — chỉ ưu tiên nhan sắc/vóc dáng/thần thái, còn trang phục khái quát
// thành GU THẨM MỸ để AI viết truyện tự sáng tạo, tránh lặp lại y nguyên 1 bộ đồ.
async function analyzeRefImageForGeneration(
  dataUrl: string,
  apiKeys: any[],
  includeBackground: boolean = false // Mặc định CHỈ tập trung vào người, không mô tả bối cảnh xung quanh
): Promise<string> {
  const activeKey = apiKeys.find((k: any) => k.isActive && !k.quotaExceeded) || null;
  const base64Data = dataUrl.split(',')[1] || '';
  const mediaType = dataUrl.match(/data:([^;]+);/)?.[1] || 'image/jpeg';

  const backgroundInstruction = includeBackground
    ? 'Sau phần mô tả người, thêm 1 câu ngắn mô tả bối cảnh/không gian xung quanh nếu có.'
    : 'CHỈ tập trung mô tả người trong ảnh — TUYỆT ĐỐI không mô tả bối cảnh hay không gian xung quanh.';

  const systemPrompt = `Bạn phân tích ảnh/khung hình mẫu để làm TÀI LIỆU THAM KHẢO khi TẠO MỚI một nhân vật tiểu thuyết — không phải để mô tả y nguyên rồi copy.
Ưu tiên mô tả: nhan sắc (khuôn mặt, khí chất), vóc dáng cơ thể tổng thể (cân đối/mảnh mai/gợi cảm/đầy đặn...), thần thái toát ra (kiêu sa/dịu dàng/lạnh lùng/gợi cảm...), kiểu tóc/màu tóc, gu trang điểm.
VỀ VÓC DÁNG: chỉ mô tả ở mức tổng thể, KHÔNG đưa số đo cụ thể hay liệt kê từng bộ phận cơ thể một cách trần trụi.
VỀ TRANG PHỤC: KHÔNG liệt kê chi tiết từng món đồ cụ thể trong ảnh (không tả chính xác kiểu áo, hoa văn, phụ kiện) — vì mỗi ảnh mẫu có thể mặc đồ khác nhau. Thay vào đó, hãy khái quát thành GU THẨM MỸ / phong cách ăn mặc chung (VD: "ưa trang phục cổ trang thanh lịch, tông màu lạnh" hoặc "phong cách gợi cảm, táo bạo, nhiều phụ kiện kim loại"). Mục đích là để AI viết truyện sáng tạo trang phục đa dạng đúng gu, thay vì lặp lại y nguyên 1 bộ đồ.
${backgroundInstruction}
Trả lời 1 đoạn ngắn gọn (50-90 từ) tiếng Việt, không lời dẫn, không giải thích.`;

  const body: Record<string, any> = {
    prompt: 'Phân tích nhan sắc, vóc dáng tổng thể, thần thái, tóc, gu trang điểm và gu thẩm mỹ trang phục (khái quát, không liệt kê chi tiết) từ ảnh này.',
    systemInstruction: systemPrompt,
    provider: activeKey?.provider || 'gemini',
    image: { data: base64Data, mediaType },
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
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.error || `HTTP ${res.status}`;
    throw new Error(
      msg.toLowerCase().includes('image') || msg.toLowerCase().includes('unsupported')
        ? 'Backend chưa hỗ trợ phân tích ảnh (vision).'
        : msg
    );
  }
  const text = (data.text || '').trim();
  if (!text) throw new Error('AI không trả về mô tả. Thử lại ảnh khác.');
  return text;
}

// ─── CharacterImageGallery — quản lý ảnh tham chiếu của 1 nhân vật ───────────
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
  const [uploading, setUploading]     = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [hintId, setHintId]           = useState<string | null>(null); // ảnh đang mở ô nhập gợi ý
  const [hints, setHints]             = useState<Record<string, string>>({}); // gợi ý theo từng ảnh
  const [includeBackground, setIncludeBackground] = useState(false); // Mặc định chỉ tập trung vào người

  // ── Sinh ảnh AI — state RIÊNG, tách biệt khỏi các state phân tích ảnh khác ──
  const [genOpen, setGenOpen]       = useState(false);
  const [genPrompt, setGenPrompt]   = useState('');
  const [genModel, setGenModel]     = useState(DEFAULT_IMAGE_MODEL);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError]     = useState<string | null>(null);

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
      // Lỗi chỉ hiện tại đúng widget này — không throw ra ngoài, không ảnh hưởng phần khác của form/app
      setGenError(err.message || 'Lỗi tạo ảnh');
    } finally {
      setGenLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const newImages: CharacterImage[] = [];
      for (const file of Array.from(files)) {
        if (file.type.startsWith('video/')) {
          const frames = await extractVideoFrames(file, 4);
          frames.forEach((dataUrl, i) => {
            newImages.push({
              id: Math.random().toString(36).substr(2, 9),
              dataUrl,
              label: `${file.name.replace(/\.[^.]+$/, '').substring(0, 20)} - khung ${i + 1}`,
              description: '',
              source: 'manual',
            });
          });
        } else if (file.type.startsWith('image/')) {
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
      setError(err.message || 'Lỗi xử lý ảnh/video');
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
      setHintId(null); // đóng ô gợi ý sau khi phân tích xong
    } catch (err: any) {
      setError(err.message || 'Lỗi phân tích ảnh');
    } finally {
      setAnalyzingId(null);
    }
  };

  const updateHint = (imgId: string, value: string) => {
    setHints(prev => ({ ...prev, [imgId]: value }));
  };

  const handleDelete = (imgId: string) => {
    if (!confirm('Xoá ảnh này?')) return;
    onChange(images.filter(i => i.id !== imgId));
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
          <button type="button" onClick={() => setGenOpen(!genOpen)}
            className="px-2.5 py-1 bg-amber-950/40 border border-amber-800/40 hover:border-amber-600/60 rounded-lg text-[10px] text-amber-300 flex items-center gap-1 transition-colors">
            <Wand2 className="w-3 h-3" /> Tạo ảnh AI
          </button>
          <label className="px-2.5 py-1 bg-violet-950/40 border border-violet-800/40 hover:border-violet-600/60 rounded-lg text-[10px] text-violet-300 cursor-pointer flex items-center gap-1 transition-colors">
            <input type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" disabled={uploading} />
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
            {uploading ? 'Đang tải...' : 'Thêm ảnh/video'}
          </label>
        </div>
      </div>

      <label className="flex items-center gap-2 text-[10px] text-gray-500 cursor-pointer">
        <input type="checkbox" checked={includeBackground} onChange={(e) => setIncludeBackground(e.target.checked)} className="accent-violet-600" />
        Phân tích cả bối cảnh xung quanh khi bấm "AI mô tả" (mặc định chỉ tập trung vào người)
      </label>

      {/* ── Khối Tạo ảnh AI (Banana qua Antigravity) — độc lập, lỗi không ảnh hưởng phần khác ── */}
      {genOpen && (
        <div className="p-3 bg-amber-950/10 border border-amber-900/30 rounded-xl space-y-2">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            AI sẽ dựa vào <strong className="text-gray-400">ngoại hình & tính cách đã điền ở trên</strong> để vẽ chân dung. Chỉ đọc dữ liệu, không thay đổi hồ sơ nhân vật.
          </p>
          <textarea rows={2} placeholder="Yêu cầu thêm cho ảnh (tuỳ chọn) — VD: đang cầm kiếm, mặc áo choàng đỏ..."
            value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[10px] text-gray-300 focus:outline-none focus:border-amber-600 resize-y"
            spellCheck={false} />
          <details className="text-[9px] text-gray-600">
            <summary className="cursor-pointer hover:text-gray-400">⚙️ Tên model ảnh (nâng cao)</summary>
            <input type="text" value={genModel} onChange={(e) => setGenModel(e.target.value)}
              className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-[10px] text-gray-300 focus:outline-none"
              spellCheck={false} />
            <p className="mt-1">Sửa nếu Model Plaza của AG dùng tên khác cho "Banana".</p>
          </details>
          <button type="button" onClick={handleGenerateImage} disabled={genLoading}
            className="w-full py-1.5 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-700/40 disabled:opacity-50 rounded-lg text-[11px] text-amber-300 flex items-center justify-center gap-1.5 transition-colors">
            {genLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang vẽ...</> : <><Wand2 className="w-3.5 h-3.5" /> Tạo ảnh</>}
          </button>
          {genError && (
            <div className="px-2.5 py-2 bg-red-950/30 border border-red-800/40 rounded-lg text-[10px] text-red-300">
              ⚠ {genError}
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-gray-600 leading-relaxed">
        Upload ảnh hoặc video ngắn (tự tách 4 khung hình rải đều). AI sẽ mô tả thành text để truyện bám sát hình tượng thật, tránh sáng tạo lệch ý.
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
                <button
                  onClick={() => handleDelete(img.id)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-900/80 rounded-lg text-white transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
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
                  onChange={(e) => updateField(img.id, 'label', e.target.value)}
                  placeholder="VD: Trang phục thường ngày..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-violet-600"
                  spellCheck={false}
                />

                {editingId === img.id ? (
                  <textarea
                    rows={4}
                    value={img.description}
                    onChange={(e) => updateField(img.id, 'description', e.target.value)}
                    onBlur={() => setEditingId(null)}
                    autoFocus
                    placeholder="Mô tả ngoại hình từ ảnh này..."
                    className="w-full bg-neutral-900 border border-violet-700/50 rounded-lg p-2 text-[10px] text-gray-300 focus:outline-none resize-none leading-relaxed"
                    spellCheck={false}
                  />
                ) : (
                  <div
                    onClick={() => setEditingId(img.id)}
                    className="min-h-[40px] px-2 py-1.5 bg-neutral-900/60 border border-neutral-800 rounded-lg text-[10px] text-gray-400 leading-relaxed cursor-text hover:border-neutral-700"
                  >
                    {img.description || <span className="text-gray-600 italic">Bấm để nhập mô tả, hoặc dùng AI bên dưới...</span>}
                  </div>
                )}

                {/* Ô nhập gợi ý bổ sung — mở khi bấm "Phân tích kèm gợi ý" */}
                {hintId === img.id && (
                  <textarea
                    rows={3}
                    autoFocus
                    placeholder="VD: Đây là trang phục mùa đông, có thêm áo choàng lông thú màu trắng. Mặt thật sắc sảo hơn trong ảnh, mắt phượng..."
                    value={hints[img.id] || ''}
                    onChange={(e) => updateHint(img.id, e.target.value)}
                    className="w-full bg-neutral-900 border border-amber-700/50 rounded-lg p-2 text-[10px] text-gray-300 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                    spellCheck={false}
                  />
                )}

                {/* 2 nút: phân tích thuần ảnh / phân tích kèm gợi ý */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => { setHintId(null); handleAnalyze(img.id); }}
                    disabled={analyzingId === img.id}
                    className="py-1.5 bg-violet-900/40 hover:bg-violet-800/50 border border-violet-700/40 disabled:opacity-50 rounded-lg text-[10px] text-violet-300 flex items-center justify-center gap-1 transition-colors"
                  >
                    {analyzingId === img.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Wand2 className="w-3 h-3" />}
                    {img.description ? 'Phân tích lại' : 'AI mô tả'}
                  </button>

                  {hintId === img.id ? (
                    <button
                      onClick={() => handleAnalyze(img.id)}
                      disabled={analyzingId === img.id || !hints[img.id]?.trim()}
                      className="py-1.5 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-700/40 disabled:opacity-50 rounded-lg text-[10px] text-amber-300 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="w-3 h-3" /> Phân tích ngay
                    </button>
                  ) : (
                    <button
                      onClick={() => setHintId(img.id)}
                      className="py-1.5 bg-neutral-900 hover:bg-amber-950/30 border border-neutral-700 hover:border-amber-800/40 rounded-lg text-[10px] text-gray-400 hover:text-amber-300 flex items-center justify-center gap-1 transition-colors"
                    >
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

// ─── MỚI: CharacterTimelineEditor — quản lý "dòng thời gian" chi tiết của 1 nhân vật ──────
// Mỗi mốc gắn 1 số thứ tự (order) + loại (tự do) + nội dung. Đây là nguồn chính để Page5
// lọc thông tin theo "Mốc hiện tại đang viết tới" — tự động ẩn phần chưa xảy ra.
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
    order: 0, chapterLabel: '', category: '', content: '', relatedCharacterId: '',
  });

  const sorted = [...entries].sort((a, b) => a.order - b.order);

  const startAdd = () => {
    const maxOrder = entries.length ? Math.max(...entries.map(e => e.order)) : 0;
    setDraft({ order: maxOrder + 1, chapterLabel: '', category: '', content: '', relatedCharacterId: '' });
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
    if (!draft.category.trim() || !draft.content.trim()) { alert('Cần nhập Loại và Nội dung!'); return; }
    if (editingId) {
      onChange(entries.map(e => e.id === editingId ? { ...e, ...draft } : e));
    } else {
      onChange([...entries, { id: Math.random().toString(36).substr(2, 9), ...draft }]);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDeleteEntry = (id: string) => {
    if (!confirm('Xoá mốc này?')) return;
    onChange(entries.filter(e => e.id !== id));
  };

  return (
    <div className="border-t border-neutral-800 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          Dòng Thời Gian Nhân Vật ({entries.length} mốc)
        </label>
        {!showForm && (
          <button type="button" onClick={startAdd}
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
              <input type="number" value={draft.order}
                onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-cyan-600" />
            </div>
            <div className="col-span-2">
              <label className="block text-[9px] text-gray-500 mb-1">Nhãn hiển thị (chương/thời điểm)</label>
              <input type="text" placeholder="VD: Chương 165 / Phó bản Huyết Vực" value={draft.chapterLabel}
                onChange={(e) => setDraft({ ...draft, chapterLabel: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-cyan-600" />
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Loại (tự nhập bất kỳ)</label>
            <input type="text" list="timeline-category-suggestions" placeholder="VD: công pháp, cơ duyên, mối quan hệ, địa vị..."
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-cyan-600" />
            <datalist id="timeline-category-suggestions">
              {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Nội dung</label>
            <textarea rows={2} placeholder="Chi tiết cụ thể..." value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-cyan-600 resize-y" />
          </div>

          <div>
            <label className="block text-[9px] text-gray-500 mb-1">Liên quan tới nhân vật khác (tuỳ chọn)</label>
            <select value={draft.relatedCharacterId} onChange={(e) => setDraft({ ...draft, relatedCharacterId: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-[11px] text-gray-200 focus:outline-none">
              <option value="">-- Không --</option>
              {characters.filter(c => c.id !== currentCharId).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-2.5 py-1 text-[10px] text-gray-400 hover:bg-neutral-800 rounded-lg">Hủy</button>
            <button type="button" onClick={handleSaveEntry}
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
                  <button type="button" onClick={() => startEdit(entry)} className="p-1 text-gray-500 hover:text-cyan-400"><Edit2 className="w-3 h-3" /></button>
                  <button type="button" onClick={() => handleDeleteEntry(entry.id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <p className="text-[10px] text-gray-600 italic">Chưa có mốc nào — bấm "Thêm mốc" để bắt đầu ghi lại công pháp, cơ duyên, quan hệ, sự kiện...</p>
      )}
    </div>
  );
}

// ─── RefImagePicker — ảnh mẫu (nhiều ảnh) dùng để "gợi hứng" khi AI TẠO nhân vật MỚI ──
// Khác CharacterImageGallery: không gắn vào 1 nhân vật cụ thể, không lưu vào state.characters,
// chỉ tổng hợp thành 1 đoạn mô tả (nhan sắc/vóc dáng/thần thái + gu thẩm mỹ trang phục)
// để đưa vào prompt sinh nhân vật.
function RefImagePicker({
  refImages,
  setRefImages,
  refAppearanceHint,
  setRefAppearanceHint,
  apiKeys,
  onError,
}: {
  refImages: { id: string; dataUrl: string }[];
  setRefImages: React.Dispatch<React.SetStateAction<{ id: string; dataUrl: string }[]>>;
  refAppearanceHint: string;
  setRefAppearanceHint: (v: string) => void;
  apiKeys: any[];
  onError: (msg: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [includeBackground, setIncludeBackground] = useState(false);
  const MAX_REF_IMAGES = 16; // Tăng lên vì 1 video có thể tách thành nhiều khung hình

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    onError(null);
    try {
      const newImgs: { id: string; dataUrl: string }[] = [];
      for (const file of Array.from(files)) {
        if (refImages.length + newImgs.length >= MAX_REF_IMAGES) break;
        if (file.type.startsWith('video/')) {
          const room = MAX_REF_IMAGES - refImages.length - newImgs.length;
          const frames = await extractVideoFrames(file, Math.min(4, Math.max(1, room)));
          frames.forEach(dataUrl => newImgs.push({ id: Math.random().toString(36).substr(2, 9), dataUrl }));
        } else if (file.type.startsWith('image/')) {
          const dataUrl = await resizeImage(file);
          newImgs.push({ id: Math.random().toString(36).substr(2, 9), dataUrl });
        }
      }
      setRefImages(prev => [...prev, ...newImgs]);
    } catch (err: any) {
      onError(err.message || 'Lỗi xử lý ảnh/video');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImg = (id: string) => setRefImages(prev => prev.filter(i => i.id !== id));

  const handleAnalyzeAll = async () => {
    if (refImages.length === 0) return;
    setAnalyzing(true);
    onError(null);
    try {
      const descriptions: string[] = [];
      for (const img of refImages) {
        const desc = await analyzeRefImageForGeneration(img.dataUrl, apiKeys, includeBackground);
        descriptions.push(desc);
      }
      const merged = descriptions.length === 1
        ? descriptions[0]
        : descriptions.map((d, i) => `(Ảnh/khung ${i + 1}) ${d}`).join('\n');
      setRefAppearanceHint(merged);
    } catch (err: any) {
      onError(err.message || 'Lỗi phân tích ảnh mẫu');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-2 border-t border-violet-900/30 pt-4">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
          Ảnh/Video mẫu tham khảo (tuỳ chọn, tối đa {MAX_REF_IMAGES} ảnh quy đổi)
        </label>
        <label className="px-2.5 py-1 bg-violet-950/40 border border-violet-800/40 hover:border-violet-600/60 rounded-lg text-[10px] text-violet-300 cursor-pointer flex items-center gap-1 transition-colors">
          <input type="file" accept="image/*,video/*" multiple onChange={handleSelect} className="hidden" disabled={uploading || refImages.length >= MAX_REF_IMAGES} />
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
          Thêm ảnh/video
        </label>
      </div>

      <p className="text-[10px] text-gray-600 leading-relaxed">
        AI sẽ ưu tiên nhan sắc, vóc dáng tổng thể, thần thái, tóc, gu trang điểm. Trang phục chỉ dùng để nhận diện <strong className="text-gray-500">gu thẩm mỹ</strong> chung — không sao chép y nguyên từng bộ đồ. Video ngắn sẽ tự tách 4 khung hình rải đều để phân tích chính xác hơn.
      </p>

      <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer">
        <input type="checkbox" checked={includeBackground} onChange={(e) => setIncludeBackground(e.target.checked)} className="accent-violet-600" />
        Phân tích cả bối cảnh xung quanh (mặc định chỉ tập trung vào người)
      </label>

      {refImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {refImages.map(img => (
            <div key={img.id} className="relative">
              <img src={img.dataUrl} className="w-14 h-14 object-cover rounded-lg border border-neutral-700" alt="Ảnh mẫu" />
              <button
                onClick={() => removeImg(img.id)}
                className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-900 hover:bg-red-800 rounded-full text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {refImages.length > 0 && (
        <button
          onClick={handleAnalyzeAll}
          disabled={analyzing}
          className="w-full py-2 bg-violet-900/40 hover:bg-violet-800/50 border border-violet-700/40 disabled:opacity-50 rounded-lg text-xs text-violet-300 flex items-center justify-center gap-1.5 transition-colors"
        >
          {analyzing
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang phân tích {refImages.length} ảnh...</>
            : <><Wand2 className="w-3.5 h-3.5" /> Phân tích ảnh mẫu</>}
        </button>
      )}

      {refAppearanceHint && (
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">Kết quả phân tích (có thể sửa trước khi tạo nhân vật)</label>
          <textarea
            rows={3}
            value={refAppearanceHint}
            onChange={(e) => setRefAppearanceHint(e.target.value)}
            className="w-full bg-neutral-950 border border-violet-800/40 rounded-lg p-2 text-[10px] text-gray-300 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}

// ── MỚI: kiểu form nhân vật — firstAppearanceOrder giữ dạng string để dễ nhập (rỗng = không đặt),
// timeline luôn là mảng (không optional) để component con không phải xử lý undefined ──
type CharFormState = Omit<Character, 'id' | 'firstAppearanceOrder' | 'timeline'> & {
  firstAppearanceOrder: string;
  timeline: CharacterTimelineEntry[];
};

export default function Page3Characters({ state, updateState, onNavigate }: Page3CharactersProps) {
  const { characters, worldEntities } = state;
  const [isAddingChar, setIsAddingChar] = useState(false);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [charForm, setCharForm] = useState<CharFormState>({
    name: '', gender: 'Nữ', age: '18', role: 'Nữ chính',
    appearance: '', personality: '', backStory: '',
    currentStatus: '', additionalInfo: '', relationships: [], images: [],
    timeline: [], firstAppearanceOrder: '',
  });
  const [isLinkingRelation, setIsLinkingRelation] = useState<string | null>(null);
  const [relForm, setRelForm] = useState({ targetCharacterId: '', relationType: 'Người tình', description: '' });
  const [customRelationType, setCustomRelationType] = useState('');
  const [isAddingWorldEntity, setIsAddingWorldEntity] = useState(false);
  const [worldForm, setWorldForm] = useState<Omit<WorldEntity, 'id' | 'firstAppearanceOrder'> & { firstAppearanceOrder: string }>({
    name: '', type: 'Tông môn', description: '', firstAppearanceOrder: '',
  });

  // ── MỚI: AI Tạo Thẻ Thế Giới — dùng chung 1 panel cho cả tạo đơn lẻ theo yêu cầu VÀ tạo hàng loạt (chỉnh "Số lượng") ──
  const [worldAiExpanded, setWorldAiExpanded]     = useState(false);
  const [worldAiPrompt, setWorldAiPrompt]         = useState('');
  const [worldAiQuantity, setWorldAiQuantity]     = useState(5);
  const [worldAiCategories, setWorldAiCategories] = useState<string[]>([]); // rỗng = để AI tự chọn đa dạng loại
  const [worldAiCustomCatInput, setWorldAiCustomCatInput] = useState('');
  const [worldAiCustomCats, setWorldAiCustomCats] = useState<string[]>([]); // danh mục tự thêm trong phiên này — cho các thứ "chưa nghĩ ra" từ trước
  const [worldAiLoading, setWorldAiLoading]       = useState(false);
  const [worldAiError, setWorldAiError]           = useState<string | null>(null);
  const [worldAiPreview, setWorldAiPreview]       = useState<Omit<WorldEntity, 'id'>[]>([]);
  const [worldAiSelected, setWorldAiSelected]     = useState<Set<number>>(new Set());

  // ── AI Section State ──
  const [aiExpanded, setAiExpanded]   = useState(false);
  const [aiPrompt, setAiPrompt]       = useState('');
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiError, setAiError]         = useState<string | null>(null);
  const [aiPreview, setAiPreview]     = useState<Omit<Character, 'id'>[]>([]);
  // Modal duyệt nhân vật
  const [reviewIdx, setReviewIdx]     = useState<number | null>(null); // index đang xem
  const [reviewEdits, setReviewEdits] = useState<Omit<Character, 'id'>[]>([]); // bản edit
  const [approved, setApproved]       = useState<Set<number>>(new Set()); // đã duyệt
  const [rejected, setRejected]       = useState<Set<number>>(new Set()); // đã từ chối

  // ── Ảnh mẫu tham khảo cho AI Tạo Nhân Vật (mới) ──
  const [refImages, setRefImages] = useState<{ id: string; dataUrl: string }[]>([]);
  const [refAppearanceHint, setRefAppearanceHint] = useState('');

  const resetCharForm = () => setCharForm({
    name: '', gender: 'Nữ', age: '18', role: 'Nữ chính',
    appearance: '', personality: '', backStory: '',
    currentStatus: '', additionalInfo: '', relationships: [], images: [],
    timeline: [], firstAppearanceOrder: '',
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

  const handleEditCharacterClick = (c: Character) => {
    setCharForm({
      name: c.name, gender: c.gender, age: c.age, role: c.role,
      appearance: c.appearance, personality: c.personality, backStory: c.backStory,
      currentStatus: c.currentStatus, additionalInfo: c.additionalInfo,
      relationships: c.relationships || [], images: c.images || [],
      timeline: c.timeline || [],
      firstAppearanceOrder: c.firstAppearanceOrder !== undefined ? String(c.firstAppearanceOrder) : '',
    });
    setEditingCharId(c.id);
    setIsAddingChar(true);
  };

  const handleDeleteCharacter = (id: string) => {
    if (!confirm('Xoá nhân vật này?')) return;
    updateState((prev) => {
      prev.characters = prev.characters.filter((c) => c.id !== id);
      prev.characters.forEach((c) => { c.relationships = c.relationships.filter((r) => r.targetCharacterId !== id); });
    });
  };

  const handleAddRelationship = (sourceCharId: string) => {
    if (!relForm.targetCharacterId) { alert('Chọn nhân vật mục tiêu!'); return; }
    const finalRelationType = relForm.relationType === '__custom__'
      ? (customRelationType.trim() || 'Quan hệ khác')
      : relForm.relationType;

    updateState((prev) => {
      const source = prev.characters.find((c) => c.id === sourceCharId);
      if (!source) return;
      if (!source.relationships) source.relationships = [];
      source.relationships = source.relationships.filter((r) => r.targetCharacterId !== relForm.targetCharacterId);
      source.relationships.push({ targetCharacterId: relForm.targetCharacterId, relationType: finalRelationType, description: relForm.description });
    });
    setRelForm({ targetCharacterId: '', relationType: 'Người tình', description: '' });
    setCustomRelationType('');
    setIsLinkingRelation(null);
  };

  const handleSaveWorldEntity = () => {
    if (!worldForm.name.trim()) { alert('Tên không được trống!'); return; }
    const { firstAppearanceOrder, ...rest } = worldForm;
    updateState((prev) => {
      prev.worldEntities.push({
        id: Math.random().toString(36).substr(2, 9),
        ...rest,
        firstAppearanceOrder: firstAppearanceOrder.trim() ? Number(firstAppearanceOrder) : undefined,
      });
    });
    setWorldForm({ name: '', type: 'Tông môn', description: '', firstAppearanceOrder: '' });
    setIsAddingWorldEntity(false);
  };

  // ── MỚI: Chọn/bỏ chọn 1 danh mục trong panel AI Tạo Thẻ Thế Giới (đa chọn) ──
  const toggleWorldAiCategory = (cat: string) => {
    setWorldAiCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  // ── MỚI: Thêm 1 danh mục tuỳ chỉnh (những thứ "chưa nghĩ ra" từ trước) — thêm chip mới trong phiên này và tự chọn luôn ──
  const handleAddWorldAiCustomCategory = () => {
    const val = worldAiCustomCatInput.trim();
    if (!val) return;
    setWorldAiCustomCats((prev) => (prev.includes(val) ? prev : [...prev, val]));
    setWorldAiCategories((prev) => (prev.includes(val) ? prev : [...prev, val]));
    setWorldAiCustomCatInput('');
  };

  // ── MỚI: Gọi AI tạo thẻ thế giới — dùng chung cho tạo 1 mục theo yêu cầu lẫn tạo hàng loạt (chỉ khác "Số lượng") ──
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
      setWorldAiSelected(new Set(items.map((_, i) => i))); // mặc định chọn hết
    } catch (err: any) {
      setWorldAiError(err.message || 'Lỗi không xác định. Thử lại.');
    } finally {
      setWorldAiLoading(false);
    }
  };

  // ── MỚI: Nhập các thẻ thế giới đã chọn (từ preview AI) vào dự án ──
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

  // ── AI Generate ──
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
      setReviewEdits(chars.map(c => ({ ...c }))); // clone để edit độc lập
      setReviewIdx(0); // Mở hồ sơ nhân vật đầu tiên ngay
    } catch (err: any) {
      setAiError(err.message || 'Lỗi không xác định. Thử lại.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Duyệt nhân vật (approve) ──
  const handleApprove = (idx: number) => {
    setApproved(prev => new Set([...prev, idx]));
    setRejected(prev => { const n = new Set(prev); n.delete(idx); return n; });
    // Tự động chuyển sang nhân vật tiếp theo chưa duyệt
    const next = aiPreview.findIndex((_, i) => i > idx && !approved.has(i) && !rejected.has(i));
    if (next !== -1) setReviewIdx(next);
    else setReviewIdx(null); // tất cả đã duyệt
  };

  const handleReject = (idx: number) => {
    setRejected(prev => new Set([...prev, idx]));
    setApproved(prev => { const n = new Set(prev); n.delete(idx); return n; });
    const next = aiPreview.findIndex((_, i) => i > idx && !approved.has(i) && !rejected.has(i));
    if (next !== -1) setReviewIdx(next);
    else setReviewIdx(null);
  };

  // ── Lưu tất cả nhân vật đã approve ──
  const handleSaveApproved = () => {
    const toAdd = reviewEdits.filter((_, i) => approved.has(i));
    if (toAdd.length === 0) { setAiError('Chưa duyệt nhân vật nào!'); return; }
    // Đóng modal trước khi clear state tránh render với reviewEdits rỗng
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

  // ── Update field trong review ──
  const updateReviewField = (idx: number, field: keyof Omit<Character, 'id' | 'relationships'>, value: string) => {
    setReviewEdits(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

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

      {/* ══════════════════════════════════════════════
          🕒 MỚI: Mốc hiện tại đang viết tới
          Dùng để tự động ẩn nhân vật/thông tin "tương lai" khỏi AI khi viết ở Page5
      ══════════════════════════════════════════════ */}
      <div className="mb-8 bg-cyan-950/10 border border-cyan-800/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300">Mốc hiện tại đang viết tới</span>
        </div>
        <input type="number" placeholder="Số thứ tự, VD: 165"
          value={state.config.currentStoryPoint?.order ?? ''}
          onChange={(e) => updateState((prev) => {
            if (e.target.value === '') { prev.config.currentStoryPoint = undefined; return; }
            const order = Number(e.target.value);
            prev.config.currentStoryPoint = { order, label: prev.config.currentStoryPoint?.label || '' };
          })}
          className="w-32 bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-600" />
        <input type="text" placeholder="Nhãn hiển thị, VD: Chương 165"
          value={state.config.currentStoryPoint?.label ?? ''}
          onChange={(e) => updateState((prev) => {
            if (!prev.config.currentStoryPoint) prev.config.currentStoryPoint = { order: 0, label: '' };
            prev.config.currentStoryPoint.label = e.target.value;
          })}
          className="flex-1 min-w-[140px] bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-600" />
        <p className="text-[9px] text-gray-500 leading-relaxed sm:max-w-[260px]">
          Khi viết ở trang Sáng Tác, mọi nhân vật hoặc mốc thông tin có số thứ tự lớn hơn giá trị này sẽ tự động bị ẩn khỏi AI — tránh nhắc chuyện chưa xảy ra.
        </p>
      </div>

      {/* ══════════════════════════════════════════════
          🤖 AI TẠO NHÂN VẬT — Section mới
      ══════════════════════════════════════════════ */}
      <div className="mb-8 bg-gradient-to-br from-violet-950/30 via-neutral-900 to-neutral-900 border border-violet-700/30 rounded-2xl overflow-hidden">
        {/* Header toggle */}
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
            {/* Context badges */}
            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              {state.config.genres.slice(0, 2).map(g => (
                <span key={g} className="px-1.5 py-0.5 bg-violet-950/60 border border-violet-800/40 rounded text-[9px] text-violet-400 font-mono">{g}</span>
              ))}
              {state.config.nsfwEnabled && (
                <span className="px-1.5 py-0.5 bg-red-950/60 border border-red-800/40 rounded text-[9px] text-red-400 font-mono">NSFW ON</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {aiPreview.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 bg-violet-900/40 border border-violet-700/40 rounded-full text-violet-300">
                {aiPreview.length} nhân vật đang chờ
              </span>
            )}
            {aiExpanded
              ? <ChevronUp className="w-4 h-4 text-gray-500" />
              : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </div>
        </button>

        {aiExpanded && (
          <div className="px-5 pb-5 border-t border-violet-900/30 pt-4 space-y-4">

            {/* Input gợi ý */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Mô tả nhân vật bạn muốn tạo</label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Tạo 3 nữ phụ harem cho nam chính tu tiên, mỗi người một tính cách: 1 lạnh lùng kiêu ngạo, 1 dịu dàng nhút nhát, 1 nghịch ngợm hoạt bát..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full bg-neutral-950 border border-violet-900/40 focus:border-violet-600/60 rounded-xl p-3 text-xs text-gray-200 focus:outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Gợi ý nhanh */}
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

            {/* Ảnh mẫu tham khảo — mới */}
            <RefImagePicker
              refImages={refImages}
              setRefImages={setRefImages}
              refAppearanceHint={refAppearanceHint}
              setRefAppearanceHint={setRefAppearanceHint}
              apiKeys={state.apiKeys}
              onError={setAiError}
            />

            {/* Nút sinh */}
            <button
              onClick={handleAIGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-violet-800/60 to-indigo-800/60 hover:from-violet-700/70 hover:to-indigo-700/70 border border-violet-700/40 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-violet-100 flex items-center justify-center gap-2 transition-all"
            >
              {aiLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo nhân vật...</>
                : <><Sparkles className="w-4 h-4" /> Sinh Nhân Vật Bằng AI</>}
            </button>

            {/* Error */}
            {aiError && (
              <div className="px-4 py-2.5 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <span className="text-red-400">⚠</span> {aiError}
              </div>
            )}

            {/* ── Kết quả AI: danh sách thumbnail + modal hồ sơ ── */}
            {aiPreview.length > 0 && (
              <div className="space-y-3">
                {/* Header tổng quan */}
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

                {/* Thumbnail list — bấm để mở hồ sơ */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {aiPreview.map((c, idx) => {
                    const isApproved = approved.has(idx);
                    const isRejected = rejected.has(idx);
                    const isPending  = !isApproved && !isRejected;
                    const edited     = reviewEdits[idx] || c;
                    return (
                      <button key={idx} onClick={() => setReviewIdx(idx)}
                        className={`relative text-left rounded-xl px-3 py-2.5 border transition-all ${
                          isApproved ? 'bg-green-950/30 border-green-700/50' :
                          isRejected ? 'bg-neutral-950/30 border-neutral-800 opacity-40' :
                          reviewIdx === idx ? 'bg-violet-950/40 border-violet-600/60' :
                          'bg-neutral-950/60 border-neutral-800 hover:border-violet-700/40'
                        }`}>
                        {/* Status badge */}
                        <span className={`absolute top-1.5 right-1.5 text-[8px] px-1 py-0.5 rounded font-bold ${
                          isApproved ? 'bg-green-900/60 text-green-400' :
                          isRejected ? 'bg-neutral-800 text-gray-600' :
                          isPending  ? 'bg-violet-900/50 text-violet-400' : ''
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

                {/* Gợi ý bấm xem */}
                {reviewIdx === null && approved.size + rejected.size < aiPreview.length && (
                  <p className="text-[10px] text-gray-500 text-center py-1">
                    👆 Bấm vào nhân vật để xem hồ sơ đầy đủ và duyệt
                  </p>
                )}

                {/* Nút lưu nhân vật đã duyệt */}
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
      {reviewIdx !== null && reviewEdits[reviewIdx] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setReviewIdx(null)} />
          <div className="relative w-full max-w-lg bg-neutral-900 border border-violet-700/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-bold text-violet-300">
                  Hồ Sơ AI — {reviewIdx + 1}/{aiPreview.length}
                </span>
              </div>
              {/* Prev/Next */}
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

            {/* Nội dung hồ sơ — có thể chỉnh sửa trực tiếp */}
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

            {/* Modal footer — duyệt / từ chối */}
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

      {/* ══════════════════════════════════════════════
          Grid nhân vật + thế giới (giữ nguyên)
      ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Nhân vật */}
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

          {/* Form nhân vật */}
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

              {/* ── MỚI: Mốc xuất hiện lần đầu ── */}
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

              {/* ── MỚI: Dòng thời gian nhân vật ── */}
              <CharacterTimelineEditor
                entries={charForm.timeline}
                onChange={(timeline) => setCharForm({ ...charForm, timeline })}
                characters={characters}
                currentCharId={editingCharId}
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

          {/* Danh sách nhân vật */}
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
                        {c.firstAppearanceOrder !== undefined && (
                          <span className="ml-1.5 text-[9px] text-gray-500">· xuất hiện từ #{c.firstAppearanceOrder}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditCharacterClick(c)} className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteCharacter(c.id)} className="p-1 text-neutral-400 hover:text-red-400 rounded hover:bg-neutral-800">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-gray-400 border-t border-neutral-800 pt-2 mt-2">
                    {c.appearance && <p className="line-clamp-1"><span className="text-gray-500">Ngoại hình:</span> {ensureString(c.appearance)}</p>}
                    {c.personality && <p className="line-clamp-1"><span className="text-gray-500">Tính cách:</span> {ensureString(c.personality)}</p>}
                    {c.additionalInfo && <p className="text-amber-400/70 text-[10px] line-clamp-1">✦ {ensureString(c.additionalInfo)}</p>}
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
                            <button onClick={() => updateState((prev) => {
                              const s = prev.characters.find((c2) => c2.id === c.id);
                              if (s) s.relationships = s.relationships.filter((rel) => rel.targetCharacterId !== r.targetCharacterId);
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
                              onClick={() => setRelForm({ ...relForm, relationType: rel })}
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

        {/* Thế giới */}
        <div className="space-y-5">

          {/* ══════════════════════════════════════════════
              🌍 MỚI: AI TẠO THẺ THẾ GIỚI — đơn lẻ theo yêu cầu HOẶC hàng loạt (chỉnh "Số lượng")
              Bao gồm: Khái niệm, Địa danh/Địa điểm, Vật phẩm, Chủng tộc, Nguyên tắc + tự thêm danh mục mới
          ══════════════════════════════════════════════ */}
          <div className="bg-gradient-to-br from-emerald-950/30 via-neutral-900 to-neutral-900 border border-emerald-700/30 rounded-2xl overflow-hidden">
            <button
              onClick={() => setWorldAiExpanded(!worldAiExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-950/20 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-emerald-900/50 border border-emerald-600/40 rounded-lg shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-xs font-bold text-emerald-300">AI Tạo Thẻ Thế Giới</span>
                  <p className="text-[9px] text-gray-500 mt-0.5 truncate">Khái niệm · Địa danh · Vật phẩm · Chủng tộc · Nguyên tắc · tự thêm</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {worldAiPreview.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-900/40 border border-emerald-700/40 rounded-full text-emerald-300">
                    {worldAiPreview.length} đang chờ
                  </span>
                )}
                {worldAiExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </button>

            {worldAiExpanded && (
              <div className="px-4 pb-4 border-t border-emerald-900/30 pt-3 space-y-3">

                {/* Chọn danh mục — đa chọn, để trống = AI tự chọn đa dạng */}
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1.5">
                    Danh mục <span className="text-gray-600">(chọn 1 hoặc nhiều — để trống = AI tự chọn đa dạng)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {WORLD_TYPES.filter(t => t.value !== 'Tông môn' || true).map((t) => (
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

                  {/* Tự thêm danh mục cụ thể chưa nghĩ ra sẵn */}
                  <div className="mt-2 flex gap-1.5">
                    <input type="text" placeholder="Danh mục khác chưa có sẵn... (VD: Lời nguyền, Sinh vật huyền bí)"
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

                {/* Yêu cầu tự do */}
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Yêu cầu / mô tả</label>
                  <textarea rows={3}
                    placeholder="VD: Tạo các loại đan dược đặc trưng của tông môn chính, mỗi loại có công dụng và tác dụng phụ riêng..."
                    value={worldAiPrompt}
                    onChange={(e) => setWorldAiPrompt(e.target.value)}
                    className="w-full bg-neutral-950 border border-emerald-900/40 focus:border-emerald-600/60 rounded-xl p-2.5 text-[11px] text-gray-200 focus:outline-none resize-none leading-relaxed"
                    spellCheck={false} />
                </div>

                {/* Số lượng — dùng số lớn để tạo hàng loạt */}
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">
                    Số lượng muốn tạo <span className="text-gray-600">(1 = tạo riêng 1 mục theo yêu cầu, số lớn hơn = tạo hàng loạt)</span>
                  </label>
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

                {/* Kết quả preview — chọn mục cần nhập vào dự án */}
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
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-500" /> Thế lực ({worldEntities.length})
            </h3>
            {!isAddingWorldEntity && (
              <button onClick={() => setIsAddingWorldEntity(true)}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs text-gray-300 border border-neutral-700">
                + Thêm
              </button>
            )}
          </div>

          {isAddingWorldEntity && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-amber-400">Tạo Thế Lực</span>
              <input type="text" placeholder="Tên tổ chức..." value={worldForm.name}
                onChange={(e) => setWorldForm({ ...worldForm, name: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-gray-200 focus:outline-none"
                spellCheck={false} />
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Loại</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {WORLD_TYPES.map(t => (
                    <button key={t.value} type="button"
                      onClick={() => setWorldForm({ ...worldForm, type: t.value })}
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
              <textarea rows={3} placeholder="Mô tả sức mạnh, quy tắc..." value={worldForm.description}
                onChange={(e) => setWorldForm({ ...worldForm, description: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-gray-200 focus:outline-none"
                spellCheck={false} />
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" /> Mốc xuất hiện lần đầu (tuỳ chọn)
                </label>
                <input type="number" placeholder="VD: 165" value={worldForm.firstAppearanceOrder}
                  onChange={(e) => setWorldForm({ ...worldForm, firstAppearanceOrder: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-600" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsAddingWorldEntity(false)} className="px-2.5 py-1 bg-neutral-800 rounded text-xs text-gray-400">Hủy</button>
                <button onClick={handleSaveWorldEntity} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold">Lưu</button>
              </div>
            </div>
          )}

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
                  <button onClick={() => updateState((prev) => { prev.worldEntities = prev.worldEntities.filter((x) => x.id !== e.id); })}
                    className="text-neutral-500 hover:text-red-400 p-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{ensureString(e.description)}</p>
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
