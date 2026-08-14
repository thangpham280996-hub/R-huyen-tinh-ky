// ──────────────────────────────────────────────────────────────────────────────
// genreTaxonomy.ts - Bảng phân loại thể loại/bối cảnh dùng chung cho Trang 2 & Trang 4
// ──────────────────────────────────────────────────────────────────────────────
//
// QUAN TRỌNG: SETTING_OPTIONS PHẢI lấy trực tiếp từ ADDRESS_TERM_PRESETS,
// KHÔNG được tự định nghĩa danh sách id riêng — nếu không Trang 2 (chọn bối cảnh)
// và Trang 4 (áp dụng xưng hô/từ vựng theo bối cảnh) sẽ dùng 2 bộ id khác nhau,
// khiến việc chọn ở Trang 2 không có tác dụng gì ở Trang 4.

import { ADDRESS_TERM_PRESETS } from './addressTerms';

// ─── SETTING_OPTIONS ──────────────────────────────────────────────────────────
// Nguồn sự thật duy nhất: ADDRESS_TERM_PRESETS (định nghĩa trong addressTerms.tsx)
// Mọi nơi cần hiển thị danh sách "Bối cảnh & Thời đại" (Trang 2, Trang 4, form
// thêm tag tùy chỉnh...) đều phải import SETTING_OPTIONS từ đây, không tự viết lại.
export const SETTING_OPTIONS = ADDRESS_TERM_PRESETS.map((preset) => ({
  id: preset.id,
  label: preset.name,
  description: preset.description,
}));

// ─── TROPE_TAGS ──────────────────────────────────────────────────────────────
// Thể loại / kết cấu cốt truyện — KHÔNG ảnh hưởng tới xưng hô/từ vựng ở Trang 4.
export const TROPE_TAGS: string[] = [
  'Xuyên không', 'Trọng sinh', 'Trùng sinh', 'Tận thế', 'Mạt thế', 'Đồng nhân',
  'Hệ thống', 'Game-like', 'Phản diện', 'Chat group', 'Học đường', 'Văn phòng',
  'Quân sự', 'Trinh thám', 'Linh dị', 'Yêu ma', 'Tiên hiệp', 'Võ hiệp',
];

// ─── MOOD_TAGS ────────────────────────────────────────────────────────────────
// Màu sắc nội dung / cảm xúc — chỉ ảnh hưởng văn phong, không ảnh hưởng xưng hô.
export const MOOD_TAGS: string[] = [
  'Ngôn tình', 'Sắc hiệp', 'Harem', 'NTR', 'Dark Romance', 'Bá đạo',
];