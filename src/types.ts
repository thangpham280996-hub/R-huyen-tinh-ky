// ──────────────────────────────────────────────────────────────────────────────
// 1. CẤU HÌNH API KEY
// ──────────────────────────────────────────────────────────────────────────────
export interface ApiKeyConfig {
  id: string;
  provider: 'gemini' | 'openai' | 'claude' | 'grok' | 'antigravity' | 'catiecli';
  key: string;
  label: string;
  isActive: boolean;
  quotaExceeded: boolean;
  quotaExceededAt?: number;
  customModel?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. QUAN HỆ NHÂN VẬT
// ──────────────────────────────────────────────────────────────────────────────
export interface Relationship {
  targetCharacterId: string;
  relationType: string;
  description: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. ẢNH THAM CHIẾU NHÂN VẬT
// ──────────────────────────────────────────────────────────────────────────────
export interface CharacterImage {
  id: string;
  dataUrl: string;
  label: string;
  description: string;
  source: 'ai' | 'manual';
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. DÒNG THỜI GIAN (CharacterTimelineEntry)
// ──────────────────────────────────────────────────────────────────────────────
export interface CharacterTimelineEntry {
  id: string;
  order: number;
  chapterLabel: string;
  category: string;
  content: string;
  relatedCharacterId?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. SỰ KIỆN CỐT TRUYỆN TOÀN CỤC (StoryEvent)
// ──────────────────────────────────────────────────────────────────────────────
export interface StoryEvent {
  id: string;
  order: number;
  chapterLabel: string;
  title: string;
  content: string;
  relatedCharacterIds?: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. NHÂN VẬT (Character) - CẬP NHẬT
// ──────────────────────────────────────────────────────────────────────────────
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
  images: CharacterImage[];
  timeline?: CharacterTimelineEntry[];
  firstAppearanceOrder?: number;
  
  // 👈 MỚI: Lưu câu thoại gốc từ truyện
  originalQuotes?: string[];
  
  // 👈 MỚI: Đánh dấu nguồn thông tin
  source?: 'ai' | 'manual' | 'original' | 'merged';
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. THỰC THỂ THẾ GIỚI (WorldEntity) - CẬP NHẬT
// ──────────────────────────────────────────────────────────────────────────────
export interface WorldEntity {
  id: string;
  name: string;
  type: string;
  description: string;
  firstAppearanceOrder?: number;
  
  // 👈 MỚI: Lưu thông tin bổ sung (thành viên, xung đột, quy tắc...)
  additionalInfo?: string;
  
  // 👈 MỚI: Dòng thời gian của thế lực
  timeline?: CharacterTimelineEntry[];
}

// ──────────────────────────────────────────────────────────────────────────────
// 8. CẤU HÌNH TRUYỆN (NovelConfig)
// ──────────────────────────────────────────────────────────────────────────────
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
  originalNarrativeVoice?: string;
  targetPOVMode?: 'giu_nguyen' | 'ngoi_3_gioi_han' | 'ngoi_3_toan_tri' | 'ngoi_2';
  currentStoryPoint?: {
    order: number;
    label: string;
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 9. LORE & TÀI NGUYÊN TRUYỆN
// ──────────────────────────────────────────────────────────────────────────────
export interface LoreEntry {
  id: string;
  category: string;
  title: string;
  content: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// 10. RÀNG BUỘC CỨNG (HardRules)
// ──────────────────────────────────────────────────────────────────────────────
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
  noFutureCharacters: boolean;
  noSelfAddPlot: boolean;
  noDangerousTone: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// 11. QUY TẮC VIẾT (WritingRules)
// ──────────────────────────────────────────────────────────────────────────────
export interface WritingRules {
  forbidden: string;
  mandatory: string;
  minWords: number;
  consistencyRules: string;
  hardRules: HardRules;
  loreEntries: LoreEntry[];
}

// ──────────────────────────────────────────────────────────────────────────────
// 12. CHƯƠNG TRUYỆN (Chapter)
// ──────────────────────────────────────────────────────────────────────────────
export interface Chapter {
  id: string;
  title: string;
  content: string;
  prompt: string;
  outline: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// 13. STATE TỔNG (NovelState)
// ──────────────────────────────────────────────────────────────────────────────
export interface NovelState {
  config: NovelConfig;
  characters: Character[];
  worldEntities: WorldEntity[];
  rules: WritingRules;
  chapters: Chapter[];
  currentChapterId: string | null;
  apiKeys: ApiKeyConfig[];
  storyEvents: StoryEvent[];
}

// ──────────────────────────────────────────────────────────────────────────────
// 14. DEFAULT STATE
// ──────────────────────────────────────────────────────────────────────────────
export const defaultNovelState: NovelState = {
  config: {
    title: '',
    genres: [],
    customGenre: '',
    context: '',
    nsfwEnabled: false,
    intenseSmutEnabled: false,
    writingStyle: '',
    customStyle: '',
    referenceFileContent: '',
    referenceFileName: '',
    originalNarrativeVoice: '',
    targetPOVMode: 'giu_nguyen',
  },
  characters: [],
  worldEntities: [],
  rules: {
    forbidden: '',
    mandatory: '',
    minWords: 1500,
    consistencyRules: '',
    hardRules: {
      noSelfEnding: false,
      noNewCharacters: false,
      noOffTopicContent: false,
      noUnmentionedRefs: false,
      noFakeIntensity: false,
      noTimeskip: false,
      noRepeatContent: false,
      noMetaComments: false,
      noOOCPersonality: false,
      noModernSlangInAncient: false,
      noAncientToneInModern: false,
      noAbruptResolution: false,
      noSummaryMode: false,
      noExcessiveEllipsis: false,
      noFutureCharacters: false,
      noSelfAddPlot: false,
      noDangerousTone: false,
    },
    loreEntries: [],
  },
  chapters: [],
  currentChapterId: null,
  apiKeys: [],
  storyEvents: [],
};

// ──────────────────────────────────────────────────────────────────────────────
// 15. HELPER: Kiểm tra visible theo mốc
// ──────────────────────────────────────────────────────────────────────────────
export function isVisibleByCurrentPoint(
  item: { firstAppearanceOrder?: number } | { order?: number },
  currentOrder?: number
): boolean {
  if (currentOrder === undefined) return true;
  
  if ('firstAppearanceOrder' in item && item.firstAppearanceOrder !== undefined) {
    return item.firstAppearanceOrder <= currentOrder;
  }
  
  if ('order' in item && item.order !== undefined) {
    return item.order <= currentOrder;
  }
  
  return true;
}

// ──────────────────────────────────────────────────────────────────────────────
// 16. HELPER: Lọc mảng theo mốc
// ──────────────────────────────────────────────────────────────────────────────
export function filterByCurrentPoint<T extends { firstAppearanceOrder?: number } | { order?: number }>(
  items: T[],
  currentOrder?: number
): T[] {
  if (currentOrder === undefined) return items;
  return items.filter(item => isVisibleByCurrentPoint(item, currentOrder));
}

// ──────────────────────────────────────────────────────────────────────────────
// 17. HELPER: Kiểm tra chất lượng dự án
// ──────────────────────────────────────────────────────────────────────────────
export function validateProjectQuality(state: NovelState): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  if (!state.config?.referenceFileContent || state.config.referenceFileContent.length < 1000) {
    warnings.push('⚠️ Thiếu dữ liệu gốc (referenceFileContent) - Chức năng "Viết lại" sẽ không hoạt động');
  }
  
  if (!state.characters || state.characters.length === 0) {
    issues.push('❌ Chưa có nhân vật nào');
  }
  
  if (!state.chapters || state.chapters.length === 0) {
    issues.push('❌ Chưa có chương nào');
  }
  
  if (!state.storyEvents || state.storyEvents.length === 0) {
    warnings.push('⚠️ Chưa có sự kiện cốt truyện (storyEvents)');
  }
  
  return { isValid: issues.length === 0, issues, warnings };
}

// ──────────────────────────────────────────────────────────────────────────────
// 18. HELPER: Lấy danh sách rule đang bật
// ──────────────────────────────────────────────────────────────────────────────
export function getActiveRules(hardRules: HardRules): string[] {
  const active: string[] = [];
  const ruleLabels: Record<keyof HardRules, string> = {
    noSelfEnding: 'Cấm tự kết thúc cảnh',
    noNewCharacters: 'Cấm tự tạo nhân vật mới',
    noOffTopicContent: 'Cấm viết ngoài yêu cầu',
    noUnmentionedRefs: 'Cấm nhắc nhân vật không đề cập',
    noFakeIntensity: 'Cấm câu từ kích tính giả',
    noTimeskip: 'Cấm nhảy cóc thời gian',
    noRepeatContent: 'Cấm lặp lại nội dung',
    noMetaComments: 'Cấm chú thích meta',
    noOOCPersonality: 'Cấm OOC tính cách',
    noModernSlangInAncient: 'Cấm slang hiện đại trong cổ trang',
    noAncientToneInModern: 'Cấm từ cổ lỗi trong truyện hiện đại',
    noAbruptResolution: 'Cấm tự giải quyết xung đột',
    noSummaryMode: 'Cấm tóm tắt',
    noExcessiveEllipsis: 'Cấm dùng "..." thay thế',
    noFutureCharacters: 'Cấm nhắc nhân vật chưa xuất hiện',
    noSelfAddPlot: 'Cấm tự thêm tình tiết mới',
    noDangerousTone: 'Cấm câu từ đe dọa, xáo rỗng',
  };
  
  Object.entries(hardRules).forEach(([key, value]) => {
    if (value && ruleLabels[key as keyof HardRules]) {
      active.push(ruleLabels[key as keyof HardRules]);
    }
  });
  
  return active;
}