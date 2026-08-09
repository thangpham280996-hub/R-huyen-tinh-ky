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
// 4.5. FASHION STYLE - THỜI TRANG NHÂN VẬT
// ──────────────────────────────────────────────────────────────────────────────
export interface FashionStyle {
  id: string;
  name: string;
  context: string;
  description: string;
  colorPalette: string;
  material: string;
  significance: string;
  source: 'ai' | 'manual';
}

// ──────────────────────────────────────────────────────────────────────────────
// 4.6. ABILITY - NĂNG LỰC/KỸ NĂNG
// ──────────────────────────────────────────────────────────────────────────────
export interface Ability {
  id: string;
  name: string;
  type: string;
  description: string;
  condition: string;
  origin: string;
  tier: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// 4.7. SPECIES TRAITS - ĐẶC ĐIỂM CHỦNG LOÀI
// ──────────────────────────────────────────────────────────────────────────────
export interface SpeciesAbility {
  name: string;
  description: string;
  trigger: string;
}

export interface SpeciesTraits {
  appearance: string;
  size: string;
  distinguishing: string;
  behavior: string;
  temperament: string;
  intelligence: string;
  abilities: SpeciesAbility[];
  habitat: string;
  diet: string;
  weakness: string;
  drops: string;
  threatLevel: string;
  rarity: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// 4.8. SEXUAL LEXICON - BỘ TỪ VỰNG MIÊU TẢ
// ──────────────────────────────────────────────────────────────────────────────
export interface SexualLexicon {
  maleParts: string[];
  femaleParts: string[];
  actions: string[];
  dominantActions: string[];
  states: string[];
  otherStates: string[];
  moanSounds: string[];
  sexSounds: string[];
  sexExpressions: string[];
  sexFluids: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. SỰ KIỆN CỐT TRUYỆN TOÀN CỤC (StoryEvent)
// ──────────────────────────────────────────────────────────────────────────────
export interface StoryEvent {
  id: string;
  chapterId?: string;
  order: number;
  chapterLabel: string;
  title: string;
  content: string;
  relatedCharacterIds?: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. NHÂN VẬT (Character)
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
  currentData?: string; // Dữ liệu hiện hữu — cập nhật theo diễn biến, KHÔNG ghi đè hồ sơ gốc
  relationships: Relationship[];
  images: CharacterImage[];
  timeline?: CharacterTimelineEntry[];
  firstAppearanceOrder?: number;
  originalQuotes?: string[];
  source?: 'ai' | 'manual' | 'original' | 'merged';
  fashionStyles?: FashionStyle[];
  abilities?: Ability[];
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. THỰC THỂ THẾ GIỚI (WorldEntity)
// ──────────────────────────────────────────────────────────────────────────────
export interface WorldEntity {
  id: string;
  name: string;
  type: string;
  description: string;
  firstAppearanceOrder?: number;
  additionalInfo?: string;
  currentData?: string; // Dữ liệu hiện hữu — cập nhật theo diễn biến, KHÔNG ghi đè mô tả gốc
  timeline?: CharacterTimelineEntry[];
  speciesTraits?: SpeciesTraits;
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
  writeMode?: 'continue' | 'rewrite' | 'scene' | 'reborn' | 'fresh';
  sourceSceneText?: string;
  rebornCharacterId?: string;
  selectedEventId?: string;
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
  noAddScene: boolean;
  noSkipNoAvoid: boolean;
  requireDetailedSexScene: boolean;
  // 👇 3 RULE MỚI
  noThematicClosingLine: boolean;  // Cấm câu tổng kết/tuyên ngôn giữa chừng
  noSparseDialogue: boolean;       // Bắt buộc đối thoại tối thiểu 30%
  requireBodyDetail: boolean;      // Bắt buộc miêu tả cơ thể khi nhân vật xuất hiện
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
  sexualLexicon?: SexualLexicon;
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
// 14. DEFAULT STATE - CẬP NHẬT VỚI 3 RULE MỚI
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
    writeMode: 'continue',
    sourceSceneText: '',
    rebornCharacterId: '',
    selectedEventId: '',
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
      noAddScene: false,
      noSkipNoAvoid: false,
      requireDetailedSexScene: false,
      // 👇 3 RULE MỚI - MẶC ĐỊNH FALSE
      noThematicClosingLine: false,
      noSparseDialogue: false,
      requireBodyDetail: false,
    },
    loreEntries: [],
    sexualLexicon: undefined,
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
// 18. HELPER: Lấy danh sách rule đang bật - CẬP NHẬT
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
    noAddScene: 'Cấm tự thêm cảnh mới',
    noSkipNoAvoid: 'Cấm lảng tránh, né tránh cảnh H',
    requireDetailedSexScene: 'Bắt buộc viết chi tiết cảnh H',
    // 👇 3 RULE MỚI
    noThematicClosingLine: 'Cấm câu tổng kết/tuyên ngôn giữa chừng',
    noSparseDialogue: 'Bắt buộc đối thoại tối thiểu 30%',
    requireBodyDetail: 'Bắt buộc miêu tả cơ thể khi nhân vật xuất hiện',
  };
  
  Object.entries(hardRules).forEach(([key, value]) => {
    if (value && ruleLabels[key as keyof HardRules]) {
      active.push(ruleLabels[key as keyof HardRules]);
    }
  });
  
  return active;
}