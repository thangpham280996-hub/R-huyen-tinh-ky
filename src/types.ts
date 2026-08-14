// ──────────────────────────────────────────────────────────────────────────────
// types.ts - Định nghĩa kiểu dữ liệu toàn cục cho NovelAI
// ──────────────────────────────────────────────────────────────────────────────

import { AddressTermSet } from './components/addressTerms';

// ─── 1. HARD RULES ──────────────────────────────────────────────────────────
export interface HardRules {
  noSelfEnding?: boolean;
  noNewCharacters?: boolean;
  noOffTopicContent?: boolean;
  noUnmentionedRefs?: boolean;
  noFakeIntensity?: boolean;
  noTimeskip?: boolean;
  noRepeatContent?: boolean;
  noMetaComments?: boolean;
  noOOCPersonality?: boolean;
  noModernSlangInAncient?: boolean;
  noAncientToneInModern?: boolean;
  noAbruptResolution?: boolean;
  noSummaryMode?: boolean;
  noExcessiveEllipsis?: boolean;
  noFutureCharacters?: boolean;
  noSelfAddPlot?: boolean;
  noDangerousTone?: boolean;
  noAddScene?: boolean;
  noSkipNoAvoid?: boolean;
  requireDetailedSexScene?: boolean;
  noThematicClosingLine?: boolean;
  noSparseDialogue?: boolean;
  requireBodyDetail?: boolean;
  noDetailInconsistency?: boolean;
  [key: string]: boolean | undefined;
}

// ─── 2. SEXUAL LEXICON ─────────────────────────────────────────────────────
export interface SexualLexicon {
  femaleOrgans?: string[];
  maleOrgans?: string[];
  fluids?: string[];
  actions?: string[];
  descriptions?: string[];
  customTerms?: string;
  maleParts?: string[];
  femaleParts?: string[];
  dominantActions?: string[];
  states?: string[];
  otherStates?: string[];
  moanSounds?: string[];
  sexSounds?: string[];
  sexExpressions?: string[];
  sexFluids?: string[];
  [key: string]: any;
}

// ─── 3. LORE ENTRY ──────────────────────────────────────────────────────────
export interface LoreEntry {
  id: string;
  key?: string;
  title?: string;
  content: string;
  category?: string;
}

// ─── 4. API KEY CONFIG ──────────────────────────────────────────────────────
export interface ApiKeyConfig {
  id: string;
  provider: string;
  apiKey?: string;
  key?: string;
  baseUrl?: string;
  selectedModel?: string;
  customModel?: string;
  label?: string;
  isActive?: boolean;
  quotaExceeded?: boolean;
}

// ─── 5. RELATIONSHIP ────────────────────────────────────────────────────────
export interface Relationship {
  id: string;
  targetCharacterId: string;
  relationType: string;
  description?: string;
}

// ─── 6. FASHION STYLE ──────────────────────────────────────────────────────
export interface FashionStyle {
  id: string;
  name: string;
  context?: string;
  description?: string;
  colorPalette?: string;
  material?: string;
  significance?: string;
  source: 'manual' | 'ai';
}

// ─── 7. ABILITY ─────────────────────────────────────────────────────────────
export interface Ability {
  id: string;
  name: string;
  type: string;
  description?: string;
  level?: string;
  condition?: string;
  origin?: string;
  tier?: string;
}

// ─── 8. SPECIES TRAITS ─────────────────────────────────────────────────────
// Tất cả field đều bắt buộc (non-optional) vì SpeciesTraitsEditor luôn khởi tạo đầy đủ
// Chỉ object cha (WorldEntity.speciesTraits?) mới có thể undefined
export interface SpeciesTraits {
  appearance: string;
  size: string;
  distinguishing: string;
  behavior: string;
  temperament: string;
  intelligence: string;
  abilities: {
    name: string;
    description: string;
    trigger: string;
  }[];
  habitat: string;
  diet: string;
  weakness: string;
  drops: string;
  threatLevel: string;
  rarity: string;
}

// ─── 9. CHARACTER TIMELINE ENTRY ──────────────────────────────────────────
export interface CharacterTimelineEntry {
  id: string;
  order: number;
  chapterLabel?: string;
  category: string;
  content: string;
  relatedCharacterId?: string;
}

// ─── 10. CHARACTER IMAGE ──────────────────────────────────────────────────
// Tất cả field đều bắt buộc vì CharacterImageGallery luôn set đủ khi tạo mới
export interface CharacterImage {
  id: string;
  url?: string;
  dataUrl?: string;
  prompt?: string;
  createdAt?: number;
  label: string;
  description: string;
  source: 'manual' | 'ai';
}

// ─── 11. CHARACTER ─────────────────────────────────────────────────────────
export interface Character {
  id: string;
  name: string;
  role: string;
  gender: string;
  age?: string;
  species?: string;
  personality?: string;
  appearance?: string;
  background?: string;
  avatar?: string;
  currentData?: string;
  appearedAtPoint?: number;
  appearedAtOrder?: number;
  order?: number;
  firstAppearanceOrder?: number;
  relationships?: Relationship[];
  fashionStyles?: FashionStyle[];
  abilities?: Ability[];
  speciesTraits?: SpeciesTraits;
  timeline?: CharacterTimelineEntry[];
  images?: CharacterImage[];
  secretTags?: string[];
  customAttributes?: Record<string, string>;
  backStory?: string;
  currentStatus?: string;
  additionalInfo?: string;
  [key: string]: any;
}

// ─── 12. WORLD ENTITY ──────────────────────────────────────────────────────
export interface WorldEntity {
  id: string;
  name: string;
  type: string;
  description: string;
  appearedAtPoint?: number;
  appearedAtOrder?: number;
  order?: number;
  firstAppearanceOrder?: number;
  relatedCharacters?: string[];
  speciesTraits?: SpeciesTraits; // Optional ở tầng cha
  currentData?: string;
  [key: string]: any;
}

// ─── 13. STORY EVENT ───────────────────────────────────────────────────────
export interface StoryEvent {
  id: string;
  chapterId?: string;
  chapterLabel: string;
  order: number;
  title: string;
  content: string;
  keyCharacters?: string[];
  location?: string;
  relatedCharacterIds?: string[];
  [key: string]: any;
}

// ─── 14. CHAPTER ────────────────────────────────────────────────────────────
export interface Chapter {
  id: string;
  title: string;
  content: string;
  summary?: string;
  createdAt?: number;
  updatedAt?: number;
  wordCount?: number;
  [key: string]: any;
}

// ─── 15. STORY POINT ───────────────────────────────────────────────────────
export interface StoryPoint {
  order: number;
  label: string;
}

// ─── 16. CUSTOM GENRE TAG ──────────────────────────────────────────────────
export interface CustomGenreTag {
  id: string;
  label: string;
  kind: 'setting' | 'trope' | 'mood';
  closestPresetId?: string;
}

// ─── 17. NOVEL CONFIG ──────────────────────────────────────────────────────
export interface NovelConfig {
  title: string;
  genres: string[];
  customGenre?: string;
  context?: string;
  nsfwEnabled?: boolean;
  intenseSmutEnabled?: boolean;
  writingStyle?: string;
  customStyle?: string;
  referenceFileContent?: string;
  referenceFileName?: string;
  
  // ── Bối cảnh & Thể loại ──
  settingId: string;
  tropeTags: string[];
  moodTags: string[];
  customTags: CustomGenreTag[];
  
  // ── AI Expand ──
  contextAiExpanded?: string;
  
  // ── Foundation ──
  foundationIdea?: string;
  foundationLockedAt?: number;
  
  // ── Xưng hô & Address Terms ──
  addressTermSetId?: string;
  customAddressTerms?: Partial<AddressTermSet>;
  
  // ── Các field cũ ──
  currentStoryPoint?: StoryPoint;
  [key: string]: any;
}

// ─── 18. NOVEL RULES ──────────────────────────────────────────────────────
export interface NovelRules {
  forbidden?: string;
  mandatory?: string;
  minWords?: number;
  consistencyRules?: string;
  hardRules?: HardRules;
  loreEntries?: LoreEntry[];
  sexualLexicon?: SexualLexicon;
  [key: string]: any;
}

// ─── 19. NOVEL STATE ──────────────────────────────────────────────────────
export interface NovelState {
  config: NovelConfig;
  characters: Character[];
  worldEntities: WorldEntity[];
  rules: NovelRules;
  chapters: Chapter[];
  currentChapterId?: string;
  apiKeys: ApiKeyConfig[];
  storyEvents: StoryEvent[];
  [key: string]: any;
}

// ─── 20. HELPER: FILTER BY CURRENT POINT ─────────────────────────────────
export function filterByCurrentPoint<
  T extends { order?: number; appearedAtOrder?: number; appearedAtPoint?: number; firstAppearanceOrder?: number }
>(items: T[] | undefined | null, currentOrder?: number): T[] {
  if (!items) return [];
  if (currentOrder === undefined || currentOrder === null) return items;
  return items.filter(item => {
    const itemOrder = item.firstAppearanceOrder ?? item.appearedAtPoint ?? item.appearedAtOrder ?? item.order;
    if (itemOrder === undefined || itemOrder === null) return true;
    return itemOrder <= currentOrder;
  });
}

// ─── 21. MAKE INITIAL STATE ────────────────────────────────────────────────
export const makeInitialState = (title = ''): NovelState => ({
  config: {
    title,
    genres: [],
    customGenre: '',
    context: '',
    nsfwEnabled: true,
    intenseSmutEnabled: true,
    writingStyle: '',
    customStyle: '',
    referenceFileContent: '',
    referenceFileName: '',
    settingId: '',
    tropeTags: [],
    moodTags: [],
    customTags: [],
    contextAiExpanded: '',
    foundationIdea: '',
    foundationLockedAt: undefined,
    addressTermSetId: '',
    customAddressTerms: undefined,
  },
  characters: [],
  worldEntities: [],
  rules: {
    forbidden: '',
    mandatory: '',
    minWords: 1500,
    consistencyRules: '',
    hardRules: {
      noSelfEnding: true,
      noNewCharacters: true,
      noOffTopicContent: true,
      noUnmentionedRefs: true,
      noFakeIntensity: true,
      noTimeskip: true,
      noRepeatContent: true,
      noMetaComments: true,
      noOOCPersonality: true,
      noModernSlangInAncient: true,
      noAncientToneInModern: false,
      noAbruptResolution: true,
      noSummaryMode: true,
      noExcessiveEllipsis: true,
      noFutureCharacters: true,
      noSelfAddPlot: true,
      noDangerousTone: true,
      noAddScene: true,
      noSkipNoAvoid: true,
      requireDetailedSexScene: true,
      noThematicClosingLine: true,
      noSparseDialogue: true,
      requireBodyDetail: true,
      noDetailInconsistency: true,
    },
    loreEntries: [],
    sexualLexicon: undefined,
  },
  chapters: [],
  currentChapterId: '',
  apiKeys: [],
  storyEvents: [],
});

// ─── 22. DEFAULT STATE ─────────────────────────────────────────────────────
export const defaultNovelState = makeInitialState();

// ─── 23. MIGRATE NOVEL STATE ──────────────────────────────────────────────
export function migrateNovelState(raw: any): NovelState {
  if (!raw || typeof raw !== 'object') {
    return makeInitialState();
  }

  const initial = makeInitialState(raw.config?.title || '');

  // ── Xử lý settingId ưu tiên: từ raw.config.settingId hoặc raw.config.addressTermSetId ──
  const settingId = raw.config?.settingId || raw.config?.addressTermSetId || '';

  // ── Xử lý customTags ──
  let customTags: CustomGenreTag[] = [];
  if (Array.isArray(raw.config?.customTags)) {
    // Nếu customTags là string[] cũ, chuyển sang CustomGenreTag[]
    if (raw.config.customTags.length > 0 && typeof raw.config.customTags[0] === 'string') {
      customTags = raw.config.customTags.map((label: string) => ({
        id: `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        label,
        kind: 'trope' as const,
        closestPresetId: undefined,
      }));
    } else {
      customTags = raw.config.customTags;
    }
  }

  // ── Xử lý genres → tropeTags fallback ──
  const migratedGenres = Array.isArray(raw.config?.genres) ? raw.config.genres : [];
  const migratedTropeTags = Array.isArray(raw.config?.tropeTags) ? raw.config.tropeTags : [];
  const migratedMoodTags = Array.isArray(raw.config?.moodTags) ? raw.config.moodTags : [];

  // Nếu tropeTags và moodTags đều rỗng, nhưng genres có dữ liệu → copy genres vào tropeTags
  const finalTropeTags = migratedTropeTags.length === 0 && migratedMoodTags.length === 0 && migratedGenres.length > 0
    ? [...migratedGenres]
    : migratedTropeTags;

  return {
    ...initial,
    ...raw,
    config: {
      ...initial.config,
      ...(raw.config || {}),
      settingId,
      genres: migratedGenres,
      tropeTags: finalTropeTags,
      moodTags: migratedMoodTags,
      customTags,
      addressTermSetId: raw.config?.addressTermSetId || '',
      customAddressTerms: raw.config?.customAddressTerms || undefined,
    },
    characters: Array.isArray(raw.characters) ? raw.characters : [],
    worldEntities: Array.isArray(raw.worldEntities) ? raw.worldEntities : [],
    rules: {
      ...initial.rules,
      ...(raw.rules || {}),
      hardRules: {
        ...initial.rules.hardRules,
        ...(raw.rules?.hardRules || {}),
      },
      loreEntries: Array.isArray(raw.rules?.loreEntries) ? raw.rules.loreEntries : [],
    },
    chapters: Array.isArray(raw.chapters) ? raw.chapters : [],
    apiKeys: Array.isArray(raw.apiKeys) ? raw.apiKeys : [],
    storyEvents: Array.isArray(raw.storyEvents) ? raw.storyEvents : [],
  };
}