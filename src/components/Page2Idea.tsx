import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { NovelState } from '../types';

interface Page2IdeaProps {
  state: NovelState;
  updateState: (updater: (prev: NovelState) => void) => void;
  onNavigate: (tabId: string) => void;
}

const PRESET_GENRES = [
  // Cổ đại / Tu tiên
  'Cổ trang', 'Xuyên không', 'Tu tiên', 'Huyền huyễn', 'Tiên hiệp', 'Võ hiệp',
  // Đô thị / Hiện đại
  'Đô thị', 'Hiện đại', 'Bá đạo', 'Đô thị 2000', 'Học đường', 'Văn phòng',
  // Việt Nam
  'Miền Tây', 'Việt Nam hiện đại',
  // Tình cảm
  'Ngôn tình', 'Sắc hiệp', 'Harem', 'NTR', 'Dark Romance',
  // Thể loại khác
  'Trọng sinh', 'Trùng sinh', 'Tận thế', 'Mạt thế', 'Linh dị', 'Yêu ma',
  'Quân sự', 'Trinh thám', 'Chat group', 'Đồng nhân', 'Phản diện', 'Hệ thống', 'Game-like',
];

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
  const { config } = state;

  const handleToggleGenre = (genre: string) => {
    updateState((prev) => {
      if (prev.config.genres.includes(genre)) {
        prev.config.genres = prev.config.genres.filter((g) => g !== genre);
      } else {
        prev.config.genres.push(genre);
      }
    });
  };

  const handleAddCustomGenre = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customGenreInput.trim();
    if (!clean) return;
    updateState((prev) => {
      if (!prev.config.genres.includes(clean)) prev.config.genres.push(clean);
    });
    setCustomGenreInput('');
  };

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

        {/* Thể loại */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
          <label className="block text-sm font-bold text-gray-200 mb-3">Thể loại (Chọn nhiều)</label>
          {/* Nhóm thể loại */}
          {[
            { label: '⚔️ Cổ đại / Tu tiên', genres: ['Cổ trang','Xuyên không','Tu tiên','Huyền huyễn','Tiên hiệp','Võ hiệp'] },
            { label: '🏙️ Đô thị / Hiện đại', genres: ['Đô thị','Hiện đại','Bá đạo','Đô thị 2000','Học đường','Văn phòng'] },
            { label: '🇻🇳 Việt Nam', genres: ['Miền Tây','Việt Nam hiện đại'] },
            { label: '💕 Tình cảm / 18+', genres: ['Ngôn tình','Sắc hiệp','Harem','NTR','Dark Romance'] },
            { label: '🌀 Thể loại khác', genres: ['Trọng sinh','Trùng sinh','Tận thế','Mạt thế','Linh dị','Yêu ma','Quân sự','Trinh thám','Chat group','Đồng nhân','Phản diện','Hệ thống','Game-like'] },
          ].map(group => (
            <div key={group.label} className="mb-3">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 font-mono">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.genres.map((genre) => {
                  const selected = config.genres.includes(genre);
                  return (
                    <button key={genre} type="button" onClick={() => handleToggleGenre(genre)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        selected
                          ? 'bg-red-900/30 border-red-500/50 text-red-300'
                          : 'bg-neutral-950 border-neutral-800 text-gray-400 hover:border-neutral-600 hover:text-gray-200'
                      }`}>
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <form onSubmit={handleAddCustomGenre} className="flex gap-2">
            <input
              type="text"
              placeholder="Thêm thể loại khác..."
              value={customGenreInput}
              onChange={(e) => setCustomGenreInput(e.target.value)}
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-red-500"
              spellCheck={false}
            />
            <button type="submit" className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs font-semibold rounded-lg border border-neutral-700">
              + Thêm
            </button>
          </form>
        </div>

        {/* Bối cảnh */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
          <label className="block text-sm font-bold text-gray-200 mb-1">Bối cảnh & Cốt truyện</label>
          <p className="text-xs text-gray-500 mb-3">Mô tả thế giới, thời đại, hoặc tóm tắt cốt truyện thô.</p>
          <textarea
            rows={6}
            placeholder="Ví dụ: Đại lục Thương Long, thế giới tu tiên nơi kẻ mạnh làm chủ. Trần Phong là phế vật vô tình nhặt được tàn thư mật điển..."
            value={config.context}
            onChange={(e) => updateState((prev) => { prev.config.context = e.target.value; })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-gray-200 focus:outline-none focus:border-red-500 leading-relaxed"
            spellCheck={false}
          />
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
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-red-500"
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
