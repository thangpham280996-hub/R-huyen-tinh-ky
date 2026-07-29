export interface ApiKeyConfig {
  id: string;
  provider: 'gemini' | 'openai' | 'claude' | 'grok' | 'antigravity' | 'catiecli';
  key: string;
  label: string;
  isActive: boolean;
  quotaExceeded: boolean;
  quotaExceededAt?: number; // Thời điểm bị đánh dấu hết quota (ms epoch) — dùng để tự mở lại sau ~6 tiếng thay vì khoá vĩnh viễn
  customModel?: string;
}

export interface Relationship {
  targetCharacterId: string;
  relationType: string;
  description: string;
}

// Ảnh tham chiếu nhân vật — lưu base64 nén nhỏ + mô tả text do AI/người dùng viết
export interface CharacterImage {
  id: string;
  dataUrl: string;       // base64 ảnh đã resize nhỏ (để lưu localStorage không quá nặng)
  label: string;         // VD: "Trang phục thường ngày", "Khi chiến đấu"
  description: string;   // Text mô tả — do AI sinh hoặc tác giả tự viết/sửa
  source: 'ai' | 'manual'; // mô tả này do AI sinh hay tự viết
}

// ── MỚI: Một mốc thông tin trong "dòng thời gian" của nhân vật ──────────────────────────
// Mục đích: giải quyết 2 vấn đề cùng lúc —
//  1) Cho phép ghi RẤT NHIỀU loại thông tin (công pháp, cơ duyên, quan hệ, địa vị, thương tích,
//     danh tiếng, tài sản, kẻ thù, lời thề, v.v.) mà không cần thêm field cứng mỗi khi phát sinh loại mới.
//     `category` là free-text — người dùng tự nhập bất kỳ, có datalist gợi ý ở UI.
//  2) Mỗi mốc có `order` để so sánh với NovelConfig.currentStoryPoint — khi build prompt cho Page5,
//     chỉ lấy các mốc có order <= currentStoryPoint.order, tự động ẩn hết thông tin "tương lai"
//     (tránh AI tự nhắc chuyện chưa xảy ra hoặc nhân vật/sự kiện chưa xuất hiện theo timeline).
export interface CharacterTimelineEntry {
  id: string;
  order: number;               // Thứ tự mốc trong nguyên tác — số càng lớn càng về sau. Dùng để lọc & sắp xếp.
  chapterLabel: string;        // Nhãn hiển thị, VD: "Chương 165", "Phó bản Huyết Vực", "Trước khi truyện bắt đầu"
  category: string;            // Tự nhập tự do — không giới hạn danh sách cố định
  content: string;             // Nội dung chi tiết
  relatedCharacterId?: string; // Tùy chọn — nếu mốc liên quan trực tiếp 1 nhân vật khác (VD: "mối quan hệ", "kẻ thù"...)
}

export interface Character {
  id: string;
  name: string;
  gender: string;
  age: string;
  role: string;
  appearance: string;
  personality: string;
  backStory: string;
  currentStatus: string;
  additionalInfo: string;
  relationships: Relationship[];
  images: CharacterImage[]; // Hồ sơ hình ảnh tham chiếu

  // ── MỚI ──
  timeline?: CharacterTimelineEntry[]; // Dòng thời gian chi tiết — nguồn chính để build ngữ cảnh AI theo mốc
  firstAppearanceOrder?: number;       // Mốc xuất hiện lần đầu trong nguyên tác — nếu > currentStoryPoint.order,
                                         // nhân vật này bị ẨN HOÀN TOÀN khỏi ngữ cảnh AI khi viết (Page5)
}

export interface WorldEntity {
  id: string;
  name: string;
  type: string; // Gợi ý: 'sect' | 'family' | 'place' | 'power' | 'system' | 'other', hoặc bất kỳ giá trị tự nhập nào (VD: 'Yêu tinh tộc', 'Thần thú')
  description: string;
  firstAppearanceOrder?: number; // MỚI — cùng cơ chế ẩn/hiện theo mốc như Character
}

export interface NovelConfig {
  title: string;
  genres: string[];
  customGenre: string;
  context: string;
  nsfwEnabled: boolean;
  intenseSmutEnabled: boolean;
  writingStyle: string;
  customStyle: string;
  referenceFileContent: string;
  referenceFileName: string;
  // ── Giọng kể & ngôi kể — dùng để "xào nấu" góc nhìn khi viết truyện mới ──
  originalNarrativeVoice?: string; // Mô tả ngôi kể + giọng điệu của tác phẩm gốc, tự động điền sau khi phân tích Đồng nhân
  targetPOVMode?: 'giu_nguyen' | 'ngoi_3_gioi_han' | 'ngoi_3_toan_tri' | 'ngoi_2'; // Ngôi kể muốn dùng cho truyện MỚI

  // ── MỚI: Mốc hiện tại đang viết tới trong nguyên tác ──
  // Dùng để lọc timeline của MỌI nhân vật/thế lực khi build prompt (Page5) —
  // chỉ lấy thông tin có order <= currentStoryPoint.order, ẩn hoàn toàn phần "tương lai".
  currentStoryPoint?: {
    order: number;
    label: string; // VD: "Chương 165" — hiển thị cho người dùng dễ hình dung đang ở đâu
  };
}

// ── Lore & Tài nguyên truyện ──────────────────────────────────────────────────
export interface LoreEntry {
  id: string;
  category: string;   // Hệ thống tu luyện, Địa lý, Thuật ngữ, Plot, v.v.
  title: string;
  content: string;
}

// ── Ràng buộc cứng dạng toggle ────────────────────────────────────────────────
export interface HardRules {
  noSelfEnding: boolean;
  noNewCharacters: boolean;
  noOffTopicContent: boolean;
  noUnmentionedRefs: boolean;
  noFakeIntensity: boolean;
  noTimeskip: boolean;
  noRepeatContent: boolean;
  noMetaComments: boolean;
  noOOCPersonality: boolean;
  noModernSlangInAncient: boolean;
  noAncientToneInModern: boolean;
  noAbruptResolution: boolean;
  noSummaryMode: boolean;
  noExcessiveEllipsis: boolean;
}

export interface WritingRules {
  forbidden: string;
  mandatory: string;
  minWords: number;
  consistencyRules: string;
  hardRules: HardRules;
  loreEntries: LoreEntry[];   // Tài nguyên lore mới
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  prompt: string;
  outline: string;
}

export interface NovelState {
  config: NovelConfig;
  characters: Character[];
  worldEntities: WorldEntity[];
  rules: WritingRules;
  chapters: Chapter[];
  currentChapterId: string | null;
  apiKeys: ApiKeyConfig[];
}
