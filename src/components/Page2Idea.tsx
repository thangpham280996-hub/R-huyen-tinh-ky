import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Sparkles, BookOpen, AlertCircle, Wand2, Lock, Unlock, X, Check } from 'lucide-react';
import { NovelState, CustomGenreTag } from '../types';
import { callApiWithRetry } from '../utils/api';
import { SETTING_OPTIONS, TROPE_TAGS, MOOD_TAGS } from './genreTaxonomy';

interface Page2IdeaProps {
  state: NovelState;
  updateState: (updater: (prev: NovelState) => void) => void;
  onNavigate: (tabId: string) => void;
}

// ─── PRESET_STYLES ──────────────────────────────────────────────────────────
const PRESET_STYLES = [
  { value: 'Tiên hiệp cổ trang',  label: 'Tiên hiệp cổ trang' },
  { value: 'Cổ phong',            label: 'Cổ phong Hán Việt' },
  { value: 'Hiện đại đô thị',     label: 'Hiện đại đô thị' },
  { value: 'Ngôn tình ngọt',      label: 'Ngôn tình ngọt sủng' },
  { value: 'Ngôn tình ngược',     label: 'Ngôn tình ngược tâm' },
  { value: 'Sắc hiệp chi tiết',   label: 'Sắc hiệp chi tiết' },
  { value: 'Tu tiên lạnh lùng',   label: 'Tu tiên lạnh lùng' },
  { value: 'Harem bá đạo',        label: 'Harem bá đạo' },
  { value: 'NTR tâm lý',          label: 'NTR tâm lý' },
  { value: 'Dark Romance',        label: 'Dark Romance' },
];

export default function Page2Idea({ state, updateState, onNavigate }: Page2IdeaProps) {
  const [customGenreInput, setCustomGenreInput] = useState('');
  const [customTagKind, setCustomTagKind] = useState<'trope' | 'mood' | 'setting'>('trope');
  const [customTagSettingId, setCustomTagSettingId] = useState('');
  const [isAiExpanding, setIsAiExpanding] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const { config } = state;

  // ─── C1: BỐI CẢNH & THỜI ĐẠI ──────────────────────────────────────────────
  const handleSettingSelect = (id: string) => {
    updateState((prev) => {
      prev.config.settingId = id;
    });
  };

  // ─── C2: TROPE TAGS ──────────────────────────────────────────────────────
  const handleTropeToggle = (tag: string) => {
    updateState((prev) => {
      const idx = prev.config.tropeTags.indexOf(tag);
      if (idx >= 0) {
        prev.config.tropeTags.splice(idx, 1);
      } else {
        prev.config.tropeTags.push(tag);
      }
    });
  };

  // ─── C3: MOOD TAGS ───────────────────────────────────────────────────────
  const handleMoodToggle = (tag: string) => {
    updateState((prev) => {
      const idx = prev.config.moodTags.indexOf(tag);
      if (idx >= 0) {
        prev.config.moodTags.splice(idx, 1);
      } else {
        prev.config.moodTags.push(tag);
      }
    });
  };

  // ─── C4: THÊM CUSTOM TAG ────────────────────────────────────────────────
  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const label = customGenreInput.trim();
    if (!label) return;

    // ✅ SỬA LỖI 1.1: Chỉ lưu closestPresetId khi có giá trị
    const closestPresetId = customTagKind === 'setting' && customTagSettingId ? customTagSettingId : undefined;

    const newTag: CustomGenreTag = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label,
      kind: customTagKind,
      closestPresetId,
    };

    updateState((prev) => {
      prev.config.customTags.push(newTag);

      if (customTagKind === 'trope') {
        if (!prev.config.tropeTags.includes(label)) {
          prev.config.tropeTags.push(label);
        }
      } else if (customTagKind === 'mood') {
        if (!prev.config.moodTags.includes(label)) {
          prev.config.moodTags.push(label);
        }
      }
      // Nếu kind === 'setting', chỉ lưu vào customTags, không đổi settingId
    });

    setCustomGenreInput('');
    setCustomTagKind('trope');
    setCustomTagSettingId('');
  };

  // ─── C5: AI MỞ RỘNG Ý TƯỞNG ────────────────────────────────────────────
  const handleAiExpand = async () => {
    if (!config.context || isAiExpanding) return;

    const activeKey = state.apiKeys.find((k) => k.isActive && !k.quotaExceeded);
    if (!activeKey) {
      setAiError('❌ Không tìm thấy API key khả dụng. Vui lòng thiết lập key ở Trang 1.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsAiExpanding(true);
    setAiError(null);

    try {
      const settingLabel = SETTING_OPTIONS.find((o) => o.id === config.settingId)?.label || 'Chưa chọn bối cảnh';

      const systemPrompt = `Bạn là biên tập viên worldbuilding cho truyện dài kỳ tiếng Việt.`;
      const userPrompt = `Hãy mở rộng ý tưởng truyện sau đây:

Ý tưởng gốc:
${config.context}

Bối cảnh: ${settingLabel}

Yêu cầu:
Viết một bản mở rộng chi tiết (200-350 chữ) bao gồm:
1. Bối cảnh cụ thể của thế giới
2. Nguyên nhân khởi điểm của câu chuyện
3. Vị trí xuất phát của nhân vật chính
4. 2-3 xung đột tiềm năng
5. Không khí / tông truyện

Định dạng: Văn xuôi liền mạch, không markdown, không bullet.`;

      // ── GỌI API THEO ĐÚNG PATTERN CỦA Page5Compose ──
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

      const data = await callApiWithRetry('generate', body, { maxRetries: 1, baseDelay: 1000 });
      const response = (data.text || '').trim();

      if (!response) {
        throw new Error('AI không trả về nội dung.');
      }

      updateState((prev) => {
        prev.config.contextAiExpanded = response;
      });
    } catch (err: any) {
      setAiError(`❌ ${err.message || 'Lỗi khi mở rộng ý tưởng'}`);
      setTimeout(() => setAiError(null), 6000);
    } finally {
      setIsAiExpanding(false);
    }
  };

  const handleUseExpanded = () => {
    if (config.contextAiExpanded) {
      updateState((prev) => {
        prev.config.context = prev.config.contextAiExpanded || '';
        prev.config.contextAiExpanded = '';
      });
    }
  };

  const handleCancelExpanded = () => {
    updateState((prev) => {
      prev.config.contextAiExpanded = '';
    });
  };

  // ─── C6: NẠP & CHỐT Ý TƯỞNG NỀN ──────────────────────────────────────
  const handleLockFoundation = () => {
    if (!config.context) return;
    updateState((prev) => {
      prev.config.foundationIdea = prev.config.context;
      prev.config.foundationLockedAt = Date.now();
    });
  };

  const handleUnlockFoundation = () => {
    updateState((prev) => {
      prev.config.foundationIdea = '';
      prev.config.foundationLockedAt = undefined;
    });
  };

  const formatLockTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ─── HELPER ──────────────────────────────────────────────────────────────
  const selectedSetting = SETTING_OPTIONS.find((o) => o.id === config.settingId);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-xl">
          <BookOpen className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Thiết lập Ý tưởng Truyện</h2>
          <p className="text-xs text-gray-400">Định hình thể loại, bối cảnh và văn phong cho tác phẩm.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Tên truyện */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
          <label className="block text-sm font-bold text-gray-200 mb-2">Tên Tác Phẩm</label>
          <input
            type="text"
            placeholder="Ví dụ: Huyền Tình Ký: Nô Lệ Của Ái Tình"
            value={config.title}
            onChange={(e) => updateState((prev) => { prev.config.title = e.target.value; })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-red-500"
            spellCheck={false}
          />
        </div>

        {/* ─── C1: BỐI CẢNH & THỜI ĐẠI ────────────────────────────────────── */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold text-gray-200">🏛️ Bối cảnh & Thời đại</label>
            {!config.settingId && (
              <span className="text-xs text-amber-500 bg-amber-950/30 px-3 py-1 rounded-lg border border-amber-800/50 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Chưa chọn — Trang 4 dùng xưng hô mặc định
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SETTING_OPTIONS.map((opt) => {
              const selected = config.settingId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSettingSelect(opt.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selected
                      ? 'bg-red-950/30 border-red-500/70 ring-1 ring-red-500/50'
                      : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-600'
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-200">{opt.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{opt.description}</div>
                </button>
              );
            })}
          </div>
          {selectedSetting && (
            <div className="mt-3 text-xs text-gray-500 bg-neutral-950/50 rounded-lg px-3 py-2 border border-neutral-800">
              ✅ Đã chọn: <span className="text-gray-300">{selectedSetting.label}</span>
            </div>
          )}
        </div>

        {/* ─── C2: THỂ LOẠI / TROPE ────────────────────────────────────────── */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
          <label className="block text-sm font-bold text-gray-200 mb-3">🎭 Thể loại / Trope cốt truyện</label>
          <div className="flex flex-wrap gap-1.5">
            {TROPE_TAGS.map((tag) => {
              const selected = config.tropeTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => handleTropeToggle(tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    selected
                      ? 'bg-blue-900/30 border-blue-500/50 text-blue-300'
                      : 'bg-neutral-950 border-neutral-800 text-gray-400 hover:border-neutral-600 hover:text-gray-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          {config.tropeTags.length > 0 && (
            <div className="mt-2 text-[10px] text-gray-500">
              Đã chọn {config.tropeTags.length} trope: {config.tropeTags.join(', ')}
            </div>
          )}
        </div>

        {/* ─── C3: MÀU SẮC NỘI DUNG ────────────────────────────────────────── */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
          <label className="block text-sm font-bold text-gray-200 mb-3">🎨 Màu sắc nội dung / Cảm xúc</label>
          <div className="flex flex-wrap gap-1.5">
            {MOOD_TAGS.map((tag) => {
              const selected = config.moodTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => handleMoodToggle(tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    selected
                      ? 'bg-purple-900/30 border-purple-500/50 text-purple-300'
                      : 'bg-neutral-950 border-neutral-800 text-gray-400 hover:border-neutral-600 hover:text-gray-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          {config.moodTags.length > 0 && (
            <div className="mt-2 text-[10px] text-gray-500">
              Đã chọn {config.moodTags.length} màu sắc: {config.moodTags.join(', ')}
            </div>
          )}
        </div>

        {/* ─── C4: THÊM CUSTOM TAG ────────────────────────────────────────── */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
          <label className="block text-sm font-bold text-gray-200 mb-3">➕ Thêm tag tùy chỉnh</label>
          <form onSubmit={handleAddCustomTag} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Nhập tag mới..."
                value={customGenreInput}
                onChange={(e) => setCustomGenreInput(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-red-500"
                spellCheck={false}
              />
              <button type="submit" className="px-4 py-2 bg-red-900/50 hover:bg-red-800/60 text-white text-sm font-semibold rounded-lg border border-red-800/50 whitespace-nowrap">
                + Thêm tag
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCustomTagKind('trope')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  customTagKind === 'trope'
                    ? 'bg-blue-900/30 border-blue-500/50 text-blue-300'
                    : 'bg-neutral-950 border-neutral-800 text-gray-400'
                }`}
              >
                🏷️ Trope/cốt truyện
              </button>
              <button
                type="button"
                onClick={() => setCustomTagKind('mood')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  customTagKind === 'mood'
                    ? 'bg-purple-900/30 border-purple-500/50 text-purple-300'
                    : 'bg-neutral-950 border-neutral-800 text-gray-400'
                }`}
              >
                💕 Nội dung/cảm xúc
              </button>
              <button
                type="button"
                onClick={() => setCustomTagKind('setting')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  customTagKind === 'setting'
                    ? 'bg-amber-900/30 border-amber-500/50 text-amber-300'
                    : 'bg-neutral-950 border-neutral-800 text-gray-400'
                }`}
              >
                🏞️ Bối cảnh mới lạ
              </button>
            </div>

            {customTagKind === 'setting' && (
              <div className="bg-amber-950/20 border border-amber-800/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2 text-amber-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Bối cảnh hoàn toàn mới cần xưng hô/từ vựng riêng, hệ thống không tự suy luận an toàn. Chọn preset gần giống để dùng tạm.</span>
                </div>
                <select
                  value={customTagSettingId}
                  onChange={(e) => setCustomTagSettingId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-red-500"
                >
                  <option value="">Chọn preset gần giống nhất...</option>
                  {SETTING_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </form>

          {/* Hiển thị custom tags đã thêm */}
          {config.customTags.length > 0 && (
            <div className="mt-3 pt-3 border-t border-neutral-800">
              <p className="text-[10px] text-gray-500 mb-2">Tags đã thêm:</p>
              <div className="flex flex-wrap gap-1.5">
                {config.customTags.map((tag) => (
                  <span
                    key={tag.id}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border ${
                      tag.kind === 'trope'
                        ? 'border-blue-800/50 bg-blue-950/30 text-blue-300'
                        : tag.kind === 'mood'
                        ? 'border-purple-800/50 bg-purple-950/30 text-purple-300'
                        : 'border-amber-800/50 bg-amber-950/30 text-amber-300'
                    }`}
                  >
                    {tag.label}
                    {/* ✅ SỬA LỖI 1.1: Chỉ hiển thị mũi tên khi có closestPresetId */}
                    {tag.closestPresetId && (
                      <span className="ml-1 text-[8px] opacity-60">
                        → {SETTING_OPTIONS.find(o => o.id === tag.closestPresetId)?.label}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── C5: BỐI CẢNH & CỐT TRUYỆN + AI EXPAND ────────────────────── */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-bold text-gray-200">Bối cảnh & Cốt truyện</label>
            <button
              onClick={handleAiExpand}
              disabled={!config.context || isAiExpanding}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !config.context || isAiExpanding
                  ? 'bg-neutral-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-900/50 to-purple-800/30 border border-purple-700/50 text-purple-300 hover:from-purple-800/60 hover:to-purple-700/40'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              {isAiExpanding ? 'Đang mở rộng...' : '🪄 AI mở rộng ý tưởng'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">Mô tả thế giới, thời đại, hoặc tóm tắt cốt truyện thô.</p>

          {aiError && (
            <div className="mb-3 p-3 bg-red-950/30 border border-red-800/50 rounded-lg text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {aiError}
            </div>
          )}

          <textarea
            rows={6}
            placeholder="Ví dụ: Đại lục Thương Long, thế giới tu tiên nơi kẻ mạnh làm chủ. Trần Phong là phế vật vô tình nhặt được tàn thư mật điển..."
            value={config.context}
            onChange={(e) => updateState((prev) => { prev.config.context = e.target.value; })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-red-500 leading-relaxed"
            spellCheck={false}
          />

          {/* Preview AI expanded */}
          {config.contextAiExpanded && (
            <div className="mt-4 p-4 bg-gradient-to-br from-purple-950/20 to-neutral-950/80 border border-purple-800/30 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-2">
                  <Wand2 className="w-3.5 h-3.5" /> Bản mở rộng từ AI
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleUseExpanded}
                    className="flex items-center gap-1 px-3 py-1 bg-green-900/40 border border-green-700/50 hover:bg-green-800/50 text-green-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Check className="w-3 h-3" /> Dùng bản này
                  </button>
                  <button
                    onClick={handleCancelExpanded}
                    className="flex items-center gap-1 px-3 py-1 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-gray-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <X className="w-3 h-3" /> Huỷ
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {config.contextAiExpanded}
              </div>
            </div>
          )}
        </div>

        {/* ─── C6: NẠP & CHỐT Ý TƯỞNG NỀN ────────────────────────────────── */}
        <div className="bg-neutral-900/80 border border-amber-900/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold text-gray-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" /> Nạp & Chốt Ý tưởng Nền
            </label>
            {config.foundationIdea && (
              <span className="text-[10px] text-amber-400 bg-amber-950/30 px-3 py-1 rounded-lg border border-amber-800/50">
                🔒 Đã chốt lúc {formatLockTime(config.foundationLockedAt)}
              </span>
            )}
          </div>

          {!config.foundationIdea ? (
            <>
              <p className="text-xs text-gray-400 mb-4">
                Nạp nội dung từ ô "Bối cảnh & Cốt truyện" ở trên làm <strong>ý tưởng nền bất biến</strong>.
                Sau khi chốt, chỉnh sửa ô trên sẽ không ảnh hưởng đến bản gốc.
              </p>
              <button
                onClick={handleLockFoundation}
                disabled={!config.context}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  config.context
                    ? 'bg-amber-900/40 border border-amber-700/50 hover:bg-amber-800/50 text-amber-300'
                    : 'bg-neutral-800 border border-neutral-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Lock className="w-4 h-4" /> 🔒 Nạp & Chốt Ý Tưởng Nền
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-lg">
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {config.foundationIdea}
                </div>
              </div>
              <button
                onClick={handleUnlockFoundation}
                className="flex items-center gap-2 px-4 py-2 bg-red-950/30 border border-red-800/50 hover:bg-red-900/40 text-red-400 rounded-lg text-xs font-semibold transition-colors"
              >
                <Unlock className="w-3.5 h-3.5" /> Mở khoá để chỉnh lại
              </button>
            </div>
          )}
        </div>

        {/* NSFW */}
        <div className="bg-zinc-950/60 border border-red-950/80 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Sparkles className="w-36 h-36 text-red-500" />
          </div>
          <div className="flex items-center gap-2 text-red-400 mb-3 font-bold">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span>KHU VỰC SÁNG TÁC NSFW / 18+</span>
          </div>
          <p className="text-xs text-gray-400 mb-5 leading-relaxed">
            Khi kích hoạt, prompt gửi đến AI sẽ được tinh chỉnh để hủy bỏ rào cản hạn chế từ ngữ, sinh ra văn phong cực độ hấp dẫn.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-gray-200">Chế Độ NSFW Không Giới Hạn</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Mở khóa cảnh sắc ảo, bạo lực kịch tính, bi kịch tâm lý.</p>
              </div>
              <button type="button" onClick={() => updateState((prev) => { prev.config.nsfwEnabled = !prev.config.nsfwEnabled; })}>
                {config.nsfwEnabled
                  ? <ToggleRight className="w-10 h-10 text-red-500" />
                  : <ToggleLeft className="w-10 h-10 text-gray-600" />}
              </button>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-gray-200">Intense Smut Mode</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">AI viết cảnh 18+ trần trụi, ngôn ngữ khiêu khích đỉnh cao.</p>
              </div>
              <button
                type="button"
                disabled={!config.nsfwEnabled}
                onClick={() => updateState((prev) => { prev.config.intenseSmutEnabled = !prev.config.intenseSmutEnabled; })}
                className={!config.nsfwEnabled ? 'opacity-40 cursor-not-allowed' : ''}
              >
                {config.intenseSmutEnabled && config.nsfwEnabled
                  ? <ToggleRight className="w-10 h-10 text-amber-500" />
                  : <ToggleLeft className="w-10 h-10 text-gray-600" />}
              </button>
            </div>
          </div>
        </div>

        {/* Văn phong */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
          <label className="block text-sm font-bold text-gray-200 mb-3">Văn Phong Sáng Tác</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {PRESET_STYLES.map((style) => {
              const selected = config.writingStyle === style.value;
              return (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => updateState((prev) => { prev.config.writingStyle = style.value; })}
                  className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                    selected
                      ? 'bg-red-950/20 border-red-500 text-red-200'
                      : 'bg-neutral-950 border-neutral-800 text-gray-400 hover:border-neutral-600 hover:text-gray-200'
                  }`}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            placeholder="Hoặc tự nhập phong cách riêng: giọng u ám, nhiều thơ Nôm..."
            value={config.customStyle}
            onChange={(e) => updateState((prev) => { prev.config.customStyle = e.target.value; })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-sm text-gray-200 focus:outline-none focus:border-red-500"
            spellCheck={false}
          />
        </div>

        {/* Nav buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => onNavigate('start')} className="px-5 py-2.5 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm">
            Quay Lại
          </button>
          <button onClick={() => onNavigate('characters')} className="px-6 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold">
            Thiết Lập Nhân Vật →
          </button>
        </div>
      </div>
    </div>
  );
}