// ──────────────────────────────────────────────────────────────────────────────
// addressTerms.tsx - Hệ thống xưng hô & bối cảnh thời đại động
// ──────────────────────────────────────────────────────────────────────────────

export interface AddressTermSet {
  id: string;
  name: string;
  description: string;
  eraContextNote: string;
  familyTerms: string[];
  socialTerms: string[];
  romanticTerms: string[];
  honorifics: string[];
  insultTerms: string[];
  genericTitles: string[];      // Cách gọi nhân vật phụ KHÔNG TÊN
  forbiddenExamples: string[];
  sexualTermsOverride?: {
    femaleInsult: string[];
    maleInsult: string[];
    maleParts?: string[];      // Ghi đè bộ phận nam theo thời đại
    femaleParts?: string[];    // Ghi đè bộ phận nữ theo thời đại
    actionTerms?: string[];    // Ghi đè hành động quan hệ theo thời đại
    fluidTerms?: string[];     // Ghi đè dịch thể theo thời đại
    urinationTerm?: string;    // Cách gọi đi vệ sinh đúng sắc thái thời đại
    note: string;
  };
}

export const ADDRESS_TERM_PRESETS: AddressTermSet[] = [
  // ─── 1. HIỆN ĐẠI VIỆT NAM ──────────────────────────────────────────────
  {
    id: 'modern-vn',
    name: '🇻🇳 Hiện đại Việt Nam',
    description: 'Đô thị/công sở Việt Nam thời nay, phù hợp truyện đương đại',
    eraContextNote: 'Thời đại công nghệ số, mạng xã hội, giao tiếp qua điện thoại thông minh. Không dùng từ cổ.',
    familyTerms: ['anh', 'em', 'chị', 'cô', 'chú', 'bác', 'dì', 'cậu', 'mợ', 'ông', 'bà', 'con', 'cháu', 'ba', 'mẹ', 'bố'],
    socialTerms: ['bạn', 'ông/bà (xã giao)', 'sếp', 'đồng nghiệp', 'quý khách'],
    romanticTerms: ['anh yêu', 'em yêu', 'vợ', 'chồng', 'người yêu', 'bạn trai', 'bạn gái'],
    honorifics: [],
    insultTerms: ['đồ khốn', 'thằng chó', 'con điếm', 'đồ ngu', 'đồ rác rưởi', 'câm mồm', 'cút', 'đồ vô dụng'],
    genericTitles: ['nhân viên', 'bảo vệ', 'người phục vụ', 'tài xế', 'một người qua đường'],
    sexualTermsOverride: {
      femaleInsult: ['đĩ', 'điếm', 'con giáp thứ 13'],
      maleInsult: ['thằng sở khanh', 'đồ dê già'],
      maleParts: ['cu', 'cặc', 'buồi', 'chim', 'dương vật (trang trọng)'],
      femaleParts: ['lồn', 'bướm', 'vú', 'ngực', 'âm đạo (trang trọng)'],
      actionTerms: ['đụ', 'chịch', 'bú lồn', 'bú cặc', 'thao', 'dập', 'phang'],
      fluidTerms: ['nước lồn', 'nước sướng', 'dâm thủy', 'tinh trùng'],
      urinationTerm: 'đi đái',
      note: 'Dùng tự do, ngôn ngữ đường phố hiện đại — ưu tiên "đụ/chịch/bú lồn/bú cặc" và "cu/cặc/lồn/bướm" trong lời thoại và miêu tả trực tiếp. Chỉ dùng "dương vật/âm đạo" khi ngữ cảnh trang trọng/y học.',
    },
    forbiddenExamples: ['ta/ngươi', 'phu quân/phu nhân', 'đạo hữu', 'tiền bối', 'bổn tọa', 'tại hạ'],
  },

  // ─── 2. HIỆN ĐẠI - MIỀN BẮC ──────────────────────────────────────────────
  {
    id: 'modern-bac',
    name: '🇻🇳 Hiện đại — Miền Bắc',
    description: 'Xưng hô đặc trưng người Bắc Bộ, truyện lấy bối cảnh Hà Nội/vùng đồng bằng Bắc Bộ',
    eraContextNote: 'Văn hóa Bắc Bộ, đặc trưng từ "u", "thầy" gọi bố mẹ, xưng hô theo thứ bậc trong họ tộc.',
    familyTerms: ['u', 'thầy (bố mẹ)', 'bá', 'thím', 'mợ', 'cậu', 'ông', 'bà', 'con', 'cháu', 'anh cả', 'em út'],
    socialTerms: ['bác (xã giao với người lớn tuổi)', 'anh/chị (đồng trang lứa)', 'cụ (người rất già)'],
    romanticTerms: ['anh yêu', 'em yêu', 'vợ', 'chồng', 'người yêu'],
    honorifics: ['thưa cụ', 'thưa bác'],
    insultTerms: ['đồ khốn nạn', 'cái đồ', 'câm mồm', 'đồ đểu', 'thằng đểu'],
    genericTitles: ['ông/bà chủ quán', 'người giúp việc', 'anh xe ôm', 'chị bán hàng'],
    // Không có sexualTermsOverride — dùng DEFAULT_LEXICON chung (cùng nhóm tiếng Việt hiện đại như modern-vn)
    forbiddenExamples: ['má', 'tía', 'dượng (đặc trưng Nam Bộ — không dùng)', 'mầy (thô tục quá, trừ khi đang chửi nhau)'],
  },

  // ─── 3. HIỆN ĐẠI - MIỀN TÂY/NAM BỘ ─────────────────────────────────────
  {
    id: 'modern-tay',
    name: '🇻🇳 Hiện đại — Miền Tây/Nam Bộ',
    description: 'Xưng hô đặc trưng người Nam Bộ, truyện lấy bối cảnh Sài Gòn, miền Tây sông nước',
    eraContextNote: 'Văn hóa Nam Bộ phóng khoáng, thân mật, xưng "má", "tía", "mầy", "tao" trong gia đình và bạn bè thân.',
    familyTerms: ['má', 'tía', 'dượng', 'mầy', 'tao (thân mật)', 'cô Hai/chú Ba (thứ bậc theo số)', 'anh Hai', 'chị Ba'],
    socialTerms: ['anh Hai', 'chị Ba', 'cưng', 'bây (tụi bây)', 'bác (người lớn)', 'chú (người nhỏ hơn ba mẹ)'],
    romanticTerms: ['anh yêu', 'em yêu', 'vợ', 'chồng', 'bạn trai', 'bạn gái'],
    honorifics: ['dạ', 'thưa (trang trọng)'],
    insultTerms: ['đồ quỷ', 'cha chả', 'đồ trời đánh', 'đồ khốn nạn', 'đồ chó chết'],
    genericTitles: ['anh Hai xe ôm', 'chị bán hàng', 'thằng nhỏ giúp việc'],
    // Không có sexualTermsOverride — dùng DEFAULT_LEXICON chung
    forbiddenExamples: ['u', 'thầy (đặc trưng Bắc Bộ — không dùng)', 'bá (kiểu Bắc)'],
  },

  // ─── 4. ĐÔ THỊ TRUNG QUỐC HIỆN ĐẠI (2015+) ─────────────────────────────
  {
    id: 'urban-cn-modern',
    name: '🏙️ Đô thị Trung Quốc hiện đại (2015+)',
    description: 'CEO, công sở, thành thị Trung Quốc kiểu mới, ngôn tình đương đại',
    eraContextNote: 'Thời đại smartphone, mạng xã hội, văn hóa công sở hiện đại. Xưng hô theo chức vụ, kính ngữ kiểu mới.',
    familyTerms: ['nhị thúc', 'đại bá', 'a di', 'di mẫu', 'di phu', 'cô cô', 'cữu cữu', 'biểu ca', 'biểu muội'],
    socialTerms: ['tổng', 'tổng giám đốc', 'trợ lý', 'thư ký', 'tiên sinh', 'tiểu thư', 'lão bản'],
    romanticTerms: ['lão công', 'lão bà', 'tiểu bảo bối', 'bảo bối', 'vợ yêu', 'chồng yêu'],
    honorifics: ['tiền bối (với người có địa vị)', 'đại nhân (trang trọng, hơi khoa trương)'],
    insultTerms: ['đồ chó má', 'thứ rác rưởi', 'câm miệng', 'cút xéo', 'đồ vô liêm sỉ', 'đồ khốn khiếp'],
    genericTitles: ['trợ lý', 'bảo vệ', 'lễ tân', 'tài xế riêng', 'nhân viên phục vụ'],
    sexualTermsOverride: {
      femaleInsult: ['điếm', 'kỹ nữ', 'dâm phụ', 'đồ lẳng lơ', 'con đĩ'],
      maleInsult: ['đồ háo sắc', 'tên dâm tặc', 'đồ sở khanh'],
      maleParts: ['dương vật', 'cu', 'cặc'],
      femaleParts: ['âm đạo', 'lồn', 'bướm', 'vú', 'ngực'],
      actionTerms: ['thao', 'dập', 'nhấp', 'giao hợp'],
      fluidTerms: ['dâm thủy', 'tinh trùng'],
      urinationTerm: 'đi tiểu tiện',
      note: 'Có thể dùng từ suồng sã, phổ biến trong ngôn tình đô thị hiện đại. Dùng "điếm" thay vì "đĩ" vì mang sắc thái hiện đại hơn. Bộ phận cơ thể tả trực diện, không nói tránh. Hành động ưu tiên "thao/dập/nhấp" — KHÔNG dùng "đụ/chịch" vì quá thô kiểu Việt hiện đại, sai giọng văn dịch Trung.',
    },
    forbiddenExamples: ['ta/ngươi/hắn/nàng (quá cổ trang)', 'okay/vibe/chill (Tây hóa quá)', 'phu quân/phu nhân'],
  },

  // ─── 5. ĐÔ THỊ TRUNG QUỐC 2000-2010 ─────────────────────────────────────
  {
    id: 'urban-cn-2000s',
    name: '📟 Đô thị Trung Quốc 2000-2010',
    description: 'Giai đoạn giao thời, còn tàn dư bao cấp, chưa có smartphone',
    eraContextNote: 'Điện thoại bàn, máy nhắn tin, internet cà phê, xe đạp/ xe máy phổ biến hơn ô tô. Chưa có mạng xã hội bùng nổ.',
    familyTerms: ['nhị thúc', 'đại bá', 'a di', 'di mẫu', 'di phu', 'cô cô', 'cữu cữu', 'gia gia', 'nãi nãi'],
    socialTerms: ['giám đốc', 'chủ nhiệm', 'tiên sinh', 'tiểu thư', 'đồng chí (còn sót lại)', 'sư phụ (thợ/tài xế lớn tuổi)'],
    romanticTerms: ['lão công', 'lão bà', 'đối tượng (bạn trai/gái)', 'người yêu'],
    honorifics: ['tiền bối (ít dùng hơn cổ trang)', 'đồng chí (trang trọng kiểu cũ)'],
    insultTerms: ['đồ chó má', 'thứ rác rưởi', 'câm miệng', 'cút xéo', 'đồ đểu'],
    genericTitles: ['bảo vệ', 'người phục vụ', 'sư phụ lái xe', 'nhân viên'],
    sexualTermsOverride: {
      femaleInsult: ['điếm', 'dâm phụ', 'gái hư'],
      maleInsult: ['đồ háo sắc', 'tên háo sắc'],
      maleParts: ['dương vật', 'cu', 'cặc'],
      femaleParts: ['âm đạo', 'lồn', 'bướm', 'vú'],
      actionTerms: ['thao', 'dập', 'nhấp'],
      fluidTerms: ['dâm thủy', 'tinh trùng'],
      urinationTerm: 'đi tiểu tiện',
      note: '🚨 KHÔNG dùng "đĩ" — từ này quá hiện đại (2015+, kiểu mạng xã hội), sai bối cảnh 2000s. Dùng "điếm" hoặc "dâm phụ" thay thế. Bộ phận cơ thể tả trực diện, không nói tránh, nhưng giọng thoại tổng thể vẫn hơi trang trọng hơn 2015+. Hành động chỉ dùng "thao/dập/nhấp", KHÔNG dùng "đụ/chịch".',
    },
    forbiddenExamples: ['CEO, sếp (từ mượn quá mới)', 'okay/oke', 'flex/slay/gATO (thuật ngữ sau 2015)', 'smartphone'],
  },

  // ─── 6. CỔ TRANG TRUNG HOA ──────────────────────────────────────────────
  {
    id: 'costume-cn',
    name: '🏯 Cổ trang Trung Hoa',
    description: 'Cổ trang, hoàng cung, giang hồ, kiếm hiệp, thời phong kiến',
    eraContextNote: 'Thời phong kiến Trung Hoa, phân biệt giai cấp rõ ràng, xưng hô theo quan hệ huyết thống và địa vị xã hội.',
    familyTerms: ['phụ thân', 'mẫu thân', 'huynh trưởng', 'muội muội', 'tổ mẫu', 'thúc phụ', 'bá phụ', 'huynh đệ', 'tỷ muội'],
    socialTerms: ['đại nhân', 'tiểu nhân', 'hạ quan', 'thần', 'ái khanh', 'chư vị', 'bệ hạ', 'hoàng thượng', 'công chúa', 'hoàng tử'],
    romanticTerms: ['phu quân', 'phu nhân', 'nương tử', 'tướng công', 'thiếp thân', 'chính thất', 'thê tử'],
    honorifics: ['ta/ngươi/hắn/nàng', 'tại hạ', 'tiền bối', 'vãn bối', 'bổn tọa', 'bần đạo', 'lão nạp'],
    insultTerms: ['đồ nghiệt súc', 'tiện nhân', 'hạ lưu', 'súc sinh', 'câm miệng', 'đồ vô sỉ', 'kẻ ti tiện'],
    genericTitles: ['tiểu nhị', 'gia đinh', 'a hoàn', 'thị vệ', 'thái giám', 'cung nữ', 'sai dịch'],
    sexualTermsOverride: {
      femaleInsult: ['xướng kỹ', 'kỹ nữ', 'dâm phụ', 'tiện tỳ', 'hồ ly tinh', 'yêu nữ'],
      maleInsult: ['háo sắc chi đồ', 'hạ lưu chi bối', 'đăng đồ tử'],
      maleParts: ['ngọc hành', 'dương vật', 'nam căn'],
      femaleParts: ['âm hộ', 'hoa huyệt', 'nhũ phong'],
      actionTerms: ['thao', 'cưỡi', 'chơi', 'vân vũ', 'giao hoan', 'ái ân'],
      fluidTerms: ['dâm thủy', 'tinh trùng', 'dương khí'],
      urinationTerm: 'đi tiểu tiện',
      note: '🚨 TUYỆT ĐỐI KHÔNG dùng "đĩ", "điếm" (quá hiện đại). Dùng "xướng kỹ"/"kỹ nữ" cho nghề nghiệp, "dâm phụ"/"tiện tỳ" cho miệt thị. Bộ phận cơ thể tả trực diện bằng Hán Việt cổ trang ("ngọc hành", "hoa huyệt"...), TUYỆT ĐỐI KHÔNG dùng lóng thuần Việt hiện đại ("cu/cặc/lồn/bướm/đụ/chịch") và KHÔNG nói tránh vòng vo ("chỗ ấy", "của quý"). Hành động chỉ dùng "thao/cưỡi/chơi/vân vũ/ái ân".',
    },
    forbiddenExamples: ['anh/em (hiện đại)', 'okay', 'tổng giám đốc', 'bạn', 'đồng chí'],
  },

  // ─── 7. TU TIÊN / HUYỀN HUYỄN ─────────────────────────────────────────────
  {
    id: 'cultivation',
    name: '⚡ Tu tiên / Huyền huyễn',
    description: 'Tu chân, huyền huyễn, tông môn, đại lục tu tiên',
    eraContextNote: 'Thế giới tu tiên, phân chia cảnh giới, tông môn, sư đồ, đạo hữu. Xưng hô theo tu vi và quan hệ sư môn.',
    familyTerms: ['phụ thân', 'mẫu thân', 'huynh trưởng', 'muội muội', 'huynh đệ', 'tỷ muội'],
    socialTerms: ['đạo hữu', 'tiền bối', 'hậu bối', 'đồng môn', 'chưởng môn', 'tông chủ', 'viện chủ', 'đại trưởng lão'],
    romanticTerms: ['đạo lữ', 'nương tử', 'song tu chi hữu'],
    honorifics: ['bổn tọa', 'tại hạ', 'vãn bối', 'tiền bối', 'sư phụ', 'sư tôn', 'sư huynh/tỷ/đệ/muội', 'sư tổ', 'lão tổ'],
    insultTerms: ['nghiệt chướng', 'súc sinh', 'đồ vô sỉ', 'tiện nhân', 'kẻ bối sư', 'phản đồ'],
    genericTitles: ['đệ tử', 'tùy tùng', 'hộ vệ', 'thị vệ', 'tạp dịch đệ tử'],
    sexualTermsOverride: {
      femaleInsult: ['dâm phụ', 'yêu nữ', 'hồ ly tinh', 'ma nữ', 'yêu tinh'],
      maleInsult: ['háo sắc đồ', 'tà tu', 'ma đầu háo sắc'],
      maleParts: ['ngọc hành', 'dương vật', 'nam căn'],
      femaleParts: ['âm hộ', 'hoa huyệt', 'nhũ phong'],
      actionTerms: ['thao', 'cưỡi', 'song tu', 'giao hoan', 'vân vũ'],
      fluidTerms: ['dâm thủy', 'tinh trùng', 'dương khí', 'tinh nguyên'],
      urinationTerm: 'đi tiểu tiện',
      note: 'Tương tự cổ trang nhưng thêm sắc thái huyền huyễn (yêu nữ, ma nữ) khi phù hợp thân phận nhân vật tu tiên. Bộ phận cơ thể tả trực diện bằng Hán Việt, KHÔNG dùng lóng hiện đại, KHÔNG nói tránh. "dương khí"/"tinh nguyên" chỉ dùng khi cảnh gắn với tu luyện song tu (hấp thụ dương khí, tổn hại nguyên khí) — không lạm dụng ở cảnh H thông thường.',
    },
    forbiddenExamples: ['phu quân/phu nhân (ưu tiên "đạo lữ")', 'thúc/bá (kiểu đô thị TQ)', 'ông/bà (hiện đại quá)'],
  },

  // ─── 8. THỜI DÂN QUỐC ─────────────────────────────────────────────────────
  {
    id: 'republic-era',
    name: '🎩 Thời Dân Quốc',
    description: 'Trung Hoa Dân Quốc, đầu-giữa thế kỷ 20, giao thời Đông-Tây',
    eraContextNote: 'Giai đoạn 1912-1949, pha trộn phong kiến cũ (lão gia, thái thái) với Tây hóa mới (tiên sinh, nữ sĩ, ngài). Phân biệt giai cấp: nhà giàu/quan lại dùng "lão gia/thái thái/tiểu thư", nhà nghèo dùng "a ca/a muội".',
    familyTerms: ['phụ thân/lão gia', 'mẫu thân/thái thái (tùy giai cấp)', 'đại ca', 'nhị ca', 'tam muội', 'thúc thúc', 'bá phụ', 'biểu ca', 'biểu muội'],
    socialTerms: ['tiên sinh', 'thái thái (bà chủ)', 'tiểu thư', 'quản gia', 'a Vú (người hầu)', 'lão gia', 'quản sự', 'tiểu nhị (người phục vụ)'],
    romanticTerms: ['tiên sinh (vợ gọi chồng, Tây hóa)', 'thái thái (chồng gọi vợ)', 'nương tử (tầng lớp cũ)', 'lão gia (vợ gọi chồng trong nhà giàu)'],
    honorifics: ['các hạ (dần ít dùng)', 'ngài (ảnh hưởng Tây phương)', 'tiên sinh/nữ sĩ (trí thức Tây học)'],
    insultTerms: ['đồ khốn kiếp', 'quân vô lại', 'câm miệng', 'cút đi', 'đồ đểu', 'kẻ vô sỉ'],
    genericTitles: ['gia nhân', 'bồi', 'phu xe', 'a Vú', 'người hầu', 'lính gác'],
    sexualTermsOverride: {
      femaleInsult: ['kỹ nữ', 'gái giang hồ', 'dâm phụ (tùy giai cấp)', 'gái hư hỏng'],
      maleInsult: ['tên trăng hoa', 'đồ Sở Khanh', 'quân háo sắc'],
      maleParts: ['dương vật', 'nam căn'],
      femaleParts: ['âm hộ', 'nhũ hoa', 'vú'],
      actionTerms: ['thao', 'cưỡi', 'chơi'],
      fluidTerms: ['dâm thủy', 'tinh trùng'],
      urinationTerm: 'đi tiểu tiện',
      note: 'Trí thức Tây học dùng từ nhẹ hơn ("gái giang hồ"), tầng lớp cũ/lao động dùng thô hơn ("kỹ nữ", "dâm phụ"). KHÔNG dùng "đĩ/điếm" theo nghĩa lóng hiện đại. Bộ phận cơ thể tả trực diện bằng thuật ngữ ("dương vật", "âm hộ") — giọng giao thời, không hoa mỹ như cổ trang nhưng cũng không thô tục kiểu lóng hiện đại ("cu/cặc/lồn/bướm/đụ/chịch").',
    },
    forbiddenExamples: ['ta/ngươi (quá cổ trang)', 'CEO/tổng giám đốc (quá hiện đại)', 'sư phụ (chỉ dùng cho võ thuật)'],
  },
];

// ─── BUILD ADDRESS TERM PROMPT ──────────────────────────────────────────────
export function buildAddressTermPrompt(termSet: AddressTermSet | undefined): string {
  if (!termSet) return '';

  const familyBlock = `Gia tộc/huyết thống: ${termSet.familyTerms.join(', ')}`;
  const socialBlock = `Xã hội/quan hệ ngoài: ${termSet.socialTerms.join(', ')}`;
  const romanticBlock = `Tình nhân/phu thê: ${termSet.romanticTerms.join(', ')}`;

  const honorificBlock = termSet.honorifics.length
    ? `\nKính ngữ/tôn xưng: ${termSet.honorifics.join(', ')}`
    : '';

  const insultBlock = termSet.insultTerms.length
    ? `\n😤 Chửi bới/mắng nhiếc: ${termSet.insultTerms.join(', ')}`
    : '';

  const sexualOverrideBlock = termSet.sexualTermsOverride
    ? `\n🔞 TỪ NGỮ CẢNH H (ghi đè theo bối cảnh — ƯU TIÊN CAO HƠN bộ từ vựng chung khi có xung đột):
${termSet.sexualTermsOverride.maleParts?.length ? `  - Bộ phận nam: ${termSet.sexualTermsOverride.maleParts.join(', ')}\n` : ''}${termSet.sexualTermsOverride.femaleParts?.length ? `  - Bộ phận nữ: ${termSet.sexualTermsOverride.femaleParts.join(', ')}\n` : ''}${termSet.sexualTermsOverride.actionTerms?.length ? `  - Hành động quan hệ: ${termSet.sexualTermsOverride.actionTerms.join(', ')}\n` : ''}${termSet.sexualTermsOverride.fluidTerms?.length ? `  - Dịch thể: ${termSet.sexualTermsOverride.fluidTerms.join(', ')}\n` : ''}${termSet.sexualTermsOverride.urinationTerm ? `  - Đi vệ sinh: ${termSet.sexualTermsOverride.urinationTerm}\n` : ''}  - Miệt thị nữ: ${termSet.sexualTermsOverride.femaleInsult.join(', ')}
  - Miệt thị nam: ${termSet.sexualTermsOverride.maleInsult.join(', ')}
  ⚠️ ${termSet.sexualTermsOverride.note}`
    : '';

  const eraBlock = `\n📌 BỐI CẢNH THỜI ĐẠI: ${termSet.eraContextNote}`;
  const forbiddenBlock = `\n🚫 TUYỆT ĐỐI CẤM dùng sai bối cảnh: ${termSet.forbiddenExamples.join(', ')}.`;

  const genericTitleBlock = termSet.genericTitles?.length
    ? `\n\n🚨 NHÂN VẬT PHỤ KHÔNG TÊN — QUY TẮC BẮT BUỘC:
TUYỆT ĐỐI KHÔNG tự đặt tên riêng cho bất kỳ nhân vật nào ngoài danh sách đã thiết lập, kể cả vai phụ hợp lý theo bối cảnh (quản gia, vệ sĩ, tiểu nhị, đệ tử...).
Nếu cần một người xuất hiện thoáng qua, CHỈ gọi bằng chức danh sau (đúng bối cảnh "${termSet.name}"): ${termSet.genericTitles.join(', ')}.
KHÔNG đặt tên riêng, KHÔNG cho họ nắm giữ thông tin cốt truyện quan trọng, KHÔNG cho thoại mang nội dung dẫn dắt tình tiết.`
    : '';

  return `👤 XƯNG HÔ BẮT BUỘC — ${termSet.name}:
${familyBlock}
${socialBlock}
${romanticBlock}${honorificBlock}${insultBlock}${sexualOverrideBlock}${eraBlock}${forbiddenBlock}${genericTitleBlock}

→ QUY TẮC: Mọi xưng hô trong truyện PHẢI nhất quán theo đúng bối cảnh "${termSet.name}". KHÔNG trộn lẫn xưng hô giữa các hệ khác nhau.`;
}