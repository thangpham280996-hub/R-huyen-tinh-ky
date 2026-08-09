import React, { useState } from 'react';
import { 
  ShieldCheck, Scale, AlertOctagon, RefreshCw, BookmarkCheck, 
  Lock, ChevronDown, ChevronUp, Info, Library, Plus, Trash2, 
  Edit2, Check, X, Sparkles, Eye,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { NovelState, HardRules, LoreEntry, SexualLexicon } from '../types';

interface Page4RulesProps {
  state: NovelState;
  updateState: (updater: (prev: NovelState) => void) => void;
  onNavigate: (tabId: string) => void;
}

// ─── MARKER CHO REMOVE GUIDE ──────────────────────────────────────────────
const GUIDE_START_MARKER = '<<<REFERENCE_GUIDE_START>>>';
const GUIDE_END_MARKER = '<<<REFERENCE_GUIDE_END>>>';

// ─── Default hard rules ─────────────────────────────────────────────────────
export const DEFAULT_HARD_RULES: HardRules = {
  noSelfEnding:           true,
  noNewCharacters:        true,
  noOffTopicContent:      true,
  noUnmentionedRefs:      true,
  noFakeIntensity:        true,
  noTimeskip:             true,
  noRepeatContent:        true,
  noMetaComments:         true,
  noOOCPersonality:       true,
  noModernSlangInAncient: true,
  noAncientToneInModern:  false,
  noAbruptResolution:     true,
  noSummaryMode:          true,
  noExcessiveEllipsis:    true,
  noFutureCharacters:     true,
  noSelfAddPlot:          true,
  noDangerousTone:        true,
  noAddScene:             true,
  noSkipNoAvoid:          true,
  requireDetailedSexScene: true,
  // 👈 3 RULE MỚI
  noThematicClosingLine:  true,  // Cấm câu tổng kết/tuyên ngôn giữa chừng
  noSparseDialogue:       true,  // Bắt buộc đối thoại tối thiểu 30%
  requireBodyDetail:      true,  // Bắt buộc miêu tả cơ thể khi nhân vật xuất hiện
};

// ─── DEFAULT LEXICON ────────────────────────────────────────────────────────
export const DEFAULT_LEXICON: Required<SexualLexicon> = {
  maleParts: [
    'dương vật', 'tinh hoàn', 'đầu khấc', 'côn thịt', 'lỗ tiểu', 'lông mao',
  ],
  femaleParts: [
    'núm vú', 'nhủ hoa', 'bầu vú', 'bầu ngực', 'âm đạo', 'âm vật',
    'lông mu', 'hậu môn', 'quầng núm vú', 'mông', 'háng', 'bẹn',
    'môi âm đạo', 'mép âm đạo',
  ],
  actions: [
    'thao', 'dập', 'nhấp', 'phang',
    'cưỡi (tùy tình huống: nữ ở trên, chủ động di chuyển; nếu nam ở trên thì dùng đè/ấn/úp sấp)',
  ],
  dominantActions: [
    'bế lên',
    'bế mặt đối mặt',
    'bế ngửa banh 2 chân nữ thành chữ V - chữ M',
    'bế ngửa lên dùng tay móc ra sau ót cửa nữ và dập - thao mạnh vào',
    'đè (nam trên, ép xuống)',
    'ấn (nam trên, đẩy mạnh)',
    'úp sấp (nam trên, từ phía sau)',
    'cưỡi (nữ trên, chủ động nhún/dập — dùng khi nữ nằm/ngồi trên nam)',
  ],
  states: [
    'to căng', 'căng vễnh', 'to bự', 'căng phồng', 'ướt đẫm', 'bê bết',
    'ước đẫm', 'ướt át', 'sưng húp', 'sưng tấy', 'sưng đỏ', 'căng mộng',
    'nhoe nhoét', 'căng tràng', 'tung tóe',
  ],
  otherStates: [
    'tung tóe', 'bê bết', 'bắn thành thia', 'bắn thành dòng', 'chảy thành dòng',
  ],
  moanSounds: [
    'a', 'ứ', 'ôi', 'ối', 'ahh', 'umm',
    'đừng... đừng mà... to quá... ahh...',
    'ôi... chết... chết mất... to.. to quá...',
    'ôi không không... to quá... tét... nó tét ra mất...',
    'ối... nó vào trong rồi... ahh không không nó sâu quá...',
    'xuất rồi... ra rồi......',
  ],
  sexSounds: [
    'loẹt loẹt loẹt', 'chụt chụt chụt', 'umm umm', 'ọt ọt ọt',
    'phạch phạch phạch', 'bạch bạch bạch bạch',
    'ọt ọt ọt', 'hức.. hức ... hức',
  ],
  sexExpressions: [
    'trợn mắt', 'lè lưỡi', 'há miệng lè lưỡi', 'há miệng thở không ra hơi',
    'chảy nước dãi', 'co giật', 'run rẩy', 'nằm co giật', 'run co giật',
    '2 tay banh 2 chân ra co giật âm đạo', 'âm đạo trào tinh trùng', 'khụy chân',
    '2 chân cọ vào nhau', 'khụy 2 chân cọ sát',
  ],
  sexFluids: [
    'tinh trùng', 'dâm thủy', 'nước tiểu',
  ],
};

// ─── buildLexiconPrompt ──────────────────────────────────────────────────────
export function buildLexiconPrompt(lexicon: SexualLexicon | undefined): string {
  const l = lexicon ?? DEFAULT_LEXICON;
  
  const moanBlock = `💬 TIẾNG RÊN & CÂU THOẠI KHI H (biến tấu theo ngữ cảnh):
- Tiếng rên đơn (bắt buộc dùng, xen kẽ vào câu): ${l.moanSounds.slice(0, 6).join(', ')}.
- Mẫu nhịp điệu tham khảo (KHÔNG COPY NGUYÊN, chỉ tham khảo để tự sáng tác):
  • ${l.moanSounds.slice(6).join('\n  • ')}
- AI kết hợp các yếu tố trên với hành động, lặp đi lặp lại nhiều lần trong cảnh H để tăng độ dài và chân thật.
- Dùng "......" để miêu tả tiếng rên bị ngắt quãng, kéo dài câu rên.
- ⚠️ CẤM lặp cùng 1 âm tiết rên (a, ứ, ôi) quá 3 lần liên tiếp không có nội dung xen kẽ.

🔊 ÂM THANH:
- Hôn / bú liếm: ${l.sexSounds.slice(0, 4).join(', ')}.
- Da thịt đập vào nhau / dương vật ra vào: ${l.sexSounds.slice(4, 6).join(', ')}.
- Bú liếm / ọc: ${l.sexSounds.slice(6).join(', ')}.

🎭 BIỂU CẢM CƠ THỂ KHI H:
${l.sexExpressions.join(', ')}.

💦 DỊCH:
${l.sexFluids.join(', ')}.`;

  return `🔞 BỘ TỪ VỰNG MIÊU TẢ TRỰC TIẾP (bắt buộc tuân thủ, không dùng ẩn dụ thay thế):

👉 Bộ phận nam: ${l.maleParts.join(', ')}.
👉 Bộ phận nữ: ${l.femaleParts.join(', ')}.
👉 Hành động quan hệ: ${l.actions.join(', ')}.
👉 Hành động thể hiện sự mạnh mẽ / đàn áp: ${l.dominantActions.join(', ')}.
👉 Trạng thái - hình thái bộ phận: ${l.states.join(', ')}.
👉 Trạng thái khác (xuất tinh, chảy...): ${l.otherStates.join(', ')}.

${moanBlock}

QUY TẮC: Dùng ĐÚNG các từ trên. Cấm thay bằng ẩn dụ như "khe suối", "đóa hoa", "vùng cấm địa".`;
}

// ─── Định nghĩa từng rule ───────────────────────────────────────────────────
interface RuleDef {
  key: keyof HardRules;
  label: string;
  desc: string;
  group: string;
  severity: 'high' | 'medium';
  aiPrompt: string;
}

const RULE_DEFS: RuleDef[] = [
  // ── Nhóm: Cấu trúc cảnh ──
  {
    key: 'noSelfEnding',
    group: 'Cấu trúc cảnh',
    severity: 'high',
    label: 'Cấm tự kết thúc cảnh',
    desc: 'AI hay tự tổng kết, chốt lại cảnh dù chưa được yêu cầu — gây đứt mạch truyện.',
    aiPrompt: 'TUYỆT ĐỐI KHÔNG tự kết thúc cảnh, không tóm gọn diễn biến, không viết câu mang tính "đóng màn" (như "Và thế là...", "Câu chuyện kết thúc...", "Đêm hôm đó mọi chuyện lắng xuống...") trừ khi tác giả yêu cầu rõ ràng. Dừng ở điểm cảnh đang tiếp diễn, tạo cảm giác muốn đọc tiếp.',
  },
  {
    key: 'noAbruptResolution',
    group: 'Cấu trúc cảnh',
    severity: 'high',
    label: 'Cấm tự giải quyết xung đột lớn',
    desc: 'AI tự ý hóa giải mâu thuẫn, kết thúc arc nhân vật khi chưa được cho phép.',
    aiPrompt: 'KHÔNG tự giải quyết xung đột lớn, không để nhân vật "làm hòa", không chốt kết quả trận chiến / tình huống căng thẳng trừ khi mệnh lệnh tác giả cho phép.',
  },
  {
    key: 'noTimeskip',
    group: 'Cấu trúc cảnh',
    severity: 'high',
    label: 'Cấm nhảy cóc thời gian',
    desc: 'AI hay viết "vài ngày sau...", "một tháng trôi qua..." để bỏ qua đoạn khó viết.',
    aiPrompt: 'KHÔNG nhảy cóc thời gian ("vài ngày sau", "một tháng trôi qua", "thời gian thấm thoát...") trừ khi mệnh lệnh yêu cầu rõ ràng. Viết liên tục từng cảnh theo thời gian thực của truyện.',
  },
  {
    key: 'noSummaryMode',
    group: 'Cấu trúc cảnh',
    severity: 'medium',
    label: 'Cấm tóm tắt thay vì viết đầy đủ',
    desc: 'AI rút gọn cảnh quan trọng thành 2-3 câu tóm tắt thay vì diễn giải chi tiết.',
    aiPrompt: 'KHÔNG tóm tắt cảnh quan trọng bằng vài câu gọn. Mọi cảnh phải được viết đầy đủ: đối thoại, hành động, nội tâm, không gian — chi tiết và sống động.',
  },
  {
    key: 'noSelfAddPlot',
    group: 'Cấu trúc cảnh',
    severity: 'high',
    label: 'Cấm tự thêm tình tiết mới',
    desc: 'AI tự sáng tạo thêm biến cố, twist, hoặc tình huống ngoài mệnh lệnh tác giả.',
    aiPrompt: '🚨 CHỈ viết đúng những gì mệnh lệnh tác giả yêu cầu. KHÔNG tự thêm biến cố mới, twist bất ngờ, tình tiết phụ, hay bất kỳ yếu tố nào không được đề cập trong mệnh lệnh. Sáng tạo trong phạm vi mệnh lệnh, không mở rộng cốt truyện tự ý.',
  },
  {
    key: 'noAddScene',
    group: 'Cấu trúc cảnh',
    severity: 'high',
    label: 'Cấm tự thêm cảnh mới',
    desc: 'AI hay tự mở cảnh mới (chuyển sang phòng khác, gặp người khác, rời khỏi vị trí hiện tại) khi chưa được yêu cầu.',
    aiPrompt: 'TUYỆT ĐỐI KHÔNG tự chuyển cảnh, không mở khung cảnh mới, không đưa nhân vật di chuyển sang địa điểm khác nếu mệnh lệnh không yêu cầu. Giữ nguyên không gian và bối cảnh hiện tại.',
  },
  // 👈 RULE MỚI: Cấm câu tổng kết/tuyên ngôn
  {
    key: 'noThematicClosingLine',
    group: 'Cấu trúc cảnh',
    severity: 'high',
    label: 'Cấm câu tổng kết/tuyên ngôn giữa chừng',
    desc: 'AI viết câu kết thúc mang tính "định hướng tương lai" hoặc tổng kết chủ đề khi chưa đến cuối cảnh.',
    aiPrompt: 'TUYỆT ĐỐI KHÔNG viết câu mang tính tổng kết chủ đề, định hướng tương lai, tuyên ngôn kiểu: "và thế là...", "từ nay...", "một trang mới...", "mọi thứ đã thay đổi...", "cuộc chiến bắt đầu từ đây...", "định mệnh đã an bài..." — trong khi cảnh vẫn đang diễn ra. Dừng ở hành động cụ thể, không kết luận hay mở màn cho tương lai.',
  },

  // ── Nhóm: Nhân vật ──
  {
    key: 'noNewCharacters',
    group: 'Nhân vật',
    severity: 'high',
    label: 'Cấm tự tạo nhân vật mới',
    desc: 'AI hay thêm "lão già qua đường", "tiểu nhị quán trọ" không có trong danh sách — làm loãng trọng tâm.',
    aiPrompt: 'TUYỆT ĐỐI KHÔNG tự tạo nhân vật mới. Chỉ được sử dụng đúng danh sách nhân vật đã được thiết lập. Nếu cần nhân vật phụ không tên (người qua đường, lính canh...), CHỈ được mô tả mờ nhạt, không đặt tên, không tạo cá tính riêng.',
  },
  {
    key: 'noOOCPersonality',
    group: 'Nhân vật',
    severity: 'high',
    label: 'Cấm nhân vật hành động trái tính cách (OOC)',
    desc: 'Nhân vật lạnh lùng đột nhiên nói chuyện ngọt ngào, phản diện bỗng dưng tốt bụng — phá vỡ logic.',
    aiPrompt: 'Giữ nguyên 100% tính cách, phản ứng, giọng điệu từng nhân vật đúng như đã thiết lập. Nhân vật lạnh lùng không tự nhiên mềm mỏng, kẻ kiêu ngạo không tự nhiên khiêm tốn. Mọi thay đổi tính cách phải có nguyên nhân rõ ràng từ mệnh lệnh tác giả. Đặc biệt trong cảnh H: giữ nguyên tính cách — nhân vật lạnh lùng vẫn lạnh/khắc nghiệt ngay cả khi rên, không biến thành tsundere điệu đà.',
  },
  {
    key: 'noUnmentionedRefs',
    group: 'Nhân vật',
    severity: 'medium',
    label: 'Cấm nhắc nhân vật / sự việc không đề cập',
    desc: 'AI kéo nhân vật chương trước vào cảnh hiện tại dù không liên quan, gây loãng tiêu điểm.',
    aiPrompt: 'KHÔNG tự ý nhắc đến nhân vật, sự việc, địa điểm không được đề cập trong mệnh lệnh hiện tại. Nếu mệnh lệnh chỉ nói về 2 nhân vật, không kéo thêm nhân vật khác vào dù họ đã xuất hiện ở chương trước.',
  },
  {
    key: 'noFutureCharacters',
    group: 'Nhân vật',
    severity: 'high',
    label: 'Cấm nhắc nhân vật chưa xuất hiện',
    desc: 'AI tự nhắc đến nhân vật chưa xuất hiện trong mạch truyện hiện tại, gây lộn xộn timeline.',
    aiPrompt: '🚨 TUYỆT ĐỐI KHÔNG nhắc đến, ám chỉ, hoặc đề cập đến bất kỳ nhân vật nào CHƯA XUẤT HIỆN trong câu chuyện tính đến thời điểm hiện tại. Nếu một nhân vật chưa được giới thiệu trong chương này hoặc các chương trước, KHÔNG được nhắc đến tên, vai trò, hay bất kỳ thông tin gì về họ. Viết như thể nhân vật đó chưa từng tồn tại. KHÔNG dùng các cụm từ như "như đã quen với X", "cũng như lần gặp Y", "nhớ lại hồi Z" — vì X, Y, Z chưa xuất hiện.',
  },

  // ── Nhóm: Nội dung & văn phong ──
  {
    key: 'noOffTopicContent',
    group: 'Nội dung & văn phong',
    severity: 'high',
    label: 'Cấm viết ngoài yêu cầu',
    desc: 'AI hay thêm twist, biến cố, tình tiết "sáng tạo" ngoài mệnh lệnh — mất kiểm soát cốt truyện.',
    aiPrompt: 'CHỈ viết đúng những gì mệnh lệnh yêu cầu. KHÔNG tự thêm biến cố mới, twist bất ngờ, tình tiết phụ không được yêu cầu. Sáng tạo trong phạm vi mệnh lệnh, không mở rộng cốt truyện tự ý.',
  },
  {
    key: 'noFakeIntensity',
    group: 'Nội dung & văn phong',
    severity: 'medium',
    label: 'Cấm câu từ kích tính giả / sáo rỗng',
    desc: 'Những câu như "Trái tim nàng thắt lại", "Cả không gian như ngừng thở", "Một tia sét đánh ngang tâm can" — dùng nhiều gây nhàm.',
    aiPrompt: 'TRÁNH các câu cảm xúc sáo rỗng, kịch tính giả tạo như: "Trái tim nàng thắt lại", "Cả vũ trụ như ngừng thở", "Như sét đánh ngang tai", "Máu trong người sôi sục", "Khắp thân run rẩy". Thay vào đó, diễn tả cảm xúc qua hành động cụ thể, chi tiết vật lý, đối thoại nội tâm thực sự.',
  },
  {
    key: 'noRepeatContent',
    group: 'Nội dung & văn phong',
    severity: 'medium',
    label: 'Cấm lặp lại nội dung đã viết',
    desc: 'AI hay tóm tắt lại đoạn trước hoặc nhắc lại sự kiện vừa xảy ra ngay trong cùng đoạn.',
    aiPrompt: 'KHÔNG lặp lại, không nhắc lại, không tóm tắt nội dung đã được viết ở phần trước. Tiếp nối trực tiếp — giả định người đọc đã biết tất cả những gì xảy ra trước đó.',
  },
  {
    key: 'noExcessiveEllipsis',
    group: 'Nội dung & văn phong',
    severity: 'medium',
    label: 'Cấm dùng "..." thay thế nội dung quan trọng',
    desc: 'AI dùng dấu "..." để né tránh viết cảnh nhạy cảm, đối thoại khó, hoặc hành động phức tạp.',
    aiPrompt: 'KHÔNG dùng "..." hoặc "[...]" để bỏ qua, ẩn đi, hay gợi ý nội dung quan trọng. Mọi cảnh, đối thoại, hành động cần phải được viết đầy đủ và rõ ràng. Tuy nhiên, "..." được PHÉP dùng trong thoại rên, ngắt quãng giọng nói để thể hiện nhịp thở gấp gáp — nhưng KHÔNG được dùng để thay thế miêu tả cảnh / bỏ qua hành động.',
  },
  {
    key: 'noMetaComments',
    group: 'Nội dung & văn phong',
    severity: 'high',
    label: 'Cấm chú thích meta / lời dẫn / markdown',
    desc: 'AI hay thêm "[Tiếp theo]", "Được rồi, tôi sẽ viết...", "Lưu ý:", hoặc dùng **bold**, # header.',
    aiPrompt: 'CHỈ TRẢ VĂN XUÔI THUẦN TÚY. TUYỆT ĐỐI KHÔNG: markdown (**, #, -, *), lời dẫn ("Được rồi...", "Đây là đoạn..."), chú thích meta ("[Hết đoạn]", "[Tiếp theo]", "Lưu ý:"), hay bất kỳ văn bản nào ngoài nội dung truyện. Bắt đầu ngay vào văn xuôi.',
  },
  {
    key: 'noDangerousTone',
    group: 'Nội dung & văn phong',
    severity: 'medium',
    label: 'Cấm câu từ đe dọa, xáo rỗng',
    desc: 'AI dùng câu từ mang cảm giác nguy hiểm, đe dọa bất thường, tạo không khí tiêu cực không cần thiết.',
    aiPrompt: '🚨 KHÔNG sử dụng câu từ mang cảm giác nguy hiểm, đe dọa, hoặc xáo rỗng không cần thiết. Giữ giọng văn ổn định, không gây hoang mang cho người đọc. KHÔNG viết theo hướng đe dọa, gây cấn bất thường, hoặc tạo bầu không khí tiêu cực ngoài dự kiến.',
  },
  // 👈 RULE MỚI: Bắt buộc đối thoại tối thiểu 30%
  {
    key: 'noSparseDialogue',
    group: 'Nội dung & văn phong',
    severity: 'high',
    label: 'Bắt buộc đối thoại tối thiểu 30%',
    desc: 'AI viết quá nhiều miêu tả, thiếu đối thoại làm câu chuyện khô cứng, thiếu sinh khí.',
    aiPrompt: 'BẮT BUỘC đối thoại chiếm tối thiểu 30% tổng dung lượng đoạn viết. Mỗi nhân vật chính trong cảnh phải có ít nhất 3-5 câu thoại thể hiện tính cách. Thoại phải tự nhiên, đúng giọng điệu nhân vật, không viết thoại nền tẻ nhạt. Lồng đối thoại xen kẽ hành động và miêu tả nội tâm.',
  },
  // 👈 RULE MỚI: Bắt buộc miêu tả cơ thể khi nhân vật xuất hiện
  {
    key: 'requireBodyDetail',
    group: 'Nội dung & văn phong',
    severity: 'medium',
    label: 'Bắt buộc miêu tả cơ thể khi nhân vật xuất hiện',
    desc: 'AI thiếu miêu tả ngoại hình cơ thể khi nhân vật xuất hiện hoặc có hành động, gây khô khan.',
    aiPrompt: 'Mỗi lần nhân vật xuất hiện hoặc có hành động quan trọng: PHẢI có 1-2 câu miêu tả cơ thể/thân hình (dáng vóc, tư thế, cử chỉ, chuyển động cơ thể) gắn với khoảnh khắc đó. Không cần dài dòng mỗi lần, nhưng phải có ít nhất 1 chi tiết cụ thể (VD: thân hình rắn rỏi, bàn tay to, bước đi nhẹ nhàng, vai rộng, vòng eo thon...). KHÔNG viết kiểu "hắn đứng đó" mà không kèm miêu tả cơ thể.',
  },

  // ── Nhóm: Cảnh H ──
  {
    key: 'noSkipNoAvoid',
    group: 'Cảnh H',
    severity: 'high',
    label: 'Cấm viết tránh, nhảy cóc, tóm tắt cảnh H',
    desc: 'AI hay né cảnh H bằng cách tóm tắt "đêm hôm đó", "một lúc lâu sau", hoặc nhảy sang sáng hôm sau.',
    aiPrompt: '🚨 TUYỆT ĐỐI KHÔNG viết giảm, viết tránh, tóm tắt, hoặc nhảy cóc qua cảnh quan hệ tình dục. Phải viết đầy đủ từng chi tiết: bộ phận sinh dục, hành động, cảm giác, tiếng rên, âm thanh, biểu cảm. Cấm dùng "sau đó", "đêm hôm đó", "một lúc lâu sau", "sáng hôm sau" để bỏ qua cảnh H. Viết liên tục, từng giây từng phút của cuộc giao hợp.',
  },
  {
    key: 'requireDetailedSexScene',
    group: 'Cảnh H',
    severity: 'high',
    label: 'Bắt buộc viết chi tiết cảnh H',
    desc: 'Yêu cầu AI phải viết cảnh H chi tiết, không được tóm tắt hoặc né tránh.',
    aiPrompt: '🚨 BẮT BUỘC viết cảnh quan hệ tình dục chi tiết, đầy đủ, sống động khi mệnh lệnh yêu cầu. Phải bao gồm: miêu tả bộ phận sinh dục (dùng đúng từ trong bộ từ vựng), hành động cụ thể (thao/dập/nhấp/ra vào), cảm xúc và khoái cảm, tiếng rên và âm thanh (loẹt loẹt, phạch phạch), biểu cảm cơ thể (co giật, run rẩy, trợn mắt, há miệng), dịch (tinh trùng, dâm thủy). Không được viết kiểu "rồi họ làm tình", "họ trao nhau khoái cảm" mà không có chi tiết cụ thể.',
  },

  // ── Nhóm: Xưng hô & nhất quán ──
  {
    key: 'noModernSlangInAncient',
    group: 'Xưng hô & nhất quán',
    severity: 'high',
    label: 'Cấm slang / từ hiện đại trong cổ trang',
    desc: '"Anh yêu em", "okay", "vibe", "chill", "flex" trong truyện tu tiên/cổ trang — phá vỡ không khí hoàn toàn.',
    aiPrompt: 'Trong bối cảnh cổ trang / tu tiên / võ hiệp: TUYỆT ĐỐI KHÔNG dùng xưng hô hiện đại (anh/em kiểu lứa đôi, bạn, mình, tôi thông thường), slang mạng (okay, vibe, toxic, chill, flex, slay), hay cấu trúc câu hiện đại. Thay bằng: ta/ngươi/nàng/hắn/phu quân/phu nhân/đạo hữu/tiền bối/huynh/muội — tùy quan hệ đã thiết lập.',
  },
  {
    key: 'noAncientToneInModern',
    group: 'Xưng hô & nhất quán',
    severity: 'medium',
    label: 'Cấm từ ngữ cổ lỗi trong truyện hiện đại',
    desc: '"Ngươi thật đáng chết!", "Ta sẽ diệt ngươi!" trong truyện đô thị hiện đại — nghe kỳ cục.',
    aiPrompt: 'Trong bối cảnh hiện đại / đô thị: KHÔNG dùng từ ngữ Hán Việt cổ lỗi (ta/ngươi, phu quân, đạo hữu, tên tiện nhân) trừ khi nhân vật đang đóng kịch hoặc có lý do đặc biệt. Giữ ngôn ngữ tự nhiên, đương đại.',
  },
];

// ─── Nhóm màu ─────────────────────────────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  'Cấu trúc cảnh':        'text-blue-400 border-blue-800/40 bg-blue-950/20',
  'Nhân vật':             'text-purple-400 border-purple-800/40 bg-purple-950/20',
  'Nội dung & văn phong': 'text-amber-400 border-amber-800/40 bg-amber-950/20',
  'Cảnh H':               'text-pink-400 border-pink-800/40 bg-pink-950/20',
  'Xưng hô & nhất quán':  'text-emerald-400 border-emerald-800/40 bg-emerald-950/20',
};

// ─── Xuất buildHardRulesPrompt ────────────────────────────────────────────────
export function buildHardRulesPrompt(hardRules: HardRules): string {
  const active = RULE_DEFS.filter(r => hardRules[r.key]);
  if (active.length === 0) return '';
  return active.map((r, i) => `${i + 1}. [${r.label.toUpperCase()}] ${r.aiPrompt}`).join('\n');
}

// ─── Toggle component ─────────────────────────────────────────────────────────
function RuleToggle({
  def,
  value,
  onChange,
}: {
  def: RuleDef;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      value
        ? 'bg-neutral-900 border-neutral-700'
        : 'bg-neutral-950/40 border-neutral-800/50 opacity-60'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            def.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'
          }`} />
          <span className="text-xs font-semibold text-gray-200 truncate">{def.label}</span>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-0.5 text-gray-600 hover:text-gray-400 shrink-0"
          >
            <Info className="w-3 h-3" />
          </button>
        </div>
        <button
          onClick={() => onChange(!value)}
          className={`relative w-9 h-5 rounded-full border transition-all shrink-0 ${
            value
              ? 'bg-red-700 border-red-600'
              : 'bg-neutral-800 border-neutral-700'
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
            value
              ? 'left-4 bg-white'
              : 'left-0.5 bg-neutral-500'
          }`} />
        </button>
      </div>
      {showInfo && (
        <p className="mt-2 text-[10px] text-gray-500 leading-relaxed border-t border-neutral-800 pt-2">
          {def.desc}
        </p>
      )}
    </div>
  );
}

// ─── Danh mục lore preset ────────────────────────────────────────────────────
const LORE_CATEGORIES = [
  '⚔️ Hệ thống tu luyện',
  '🗺️ Địa lý & Bản đồ',
  '📜 Lịch sử & Truyền thuyết',
  '✨ Ma pháp & Kỹ năng',
  '⚗️ Đạo cụ & Bảo vật',
  '🏛️ Chính trị & Phe phái',
  '📌 Plot Points quan trọng',
  '🔮 Foreshadowing & Ẩn ý',
  '💬 Thuật ngữ đặc biệt',
  '🎭 Phong tục & Văn hóa',
  '📝 Ghi chú tác giả',
  '🔧 Khác',
];

// ─── PRESET GUIDELINES ──────────────────────────────────────────────────────
// 👈 SỬA: giới hạn phạm vi "linh hoạt sáng tạo"
const REFERENCE_GUIDELINES = `📝 HƯỚNG DẪN THAM KHẢO - LINH HOẠT, KHÔNG RẬP KHUÔN:

⚠️ QUAN TRỌNG: Phần dưới đây là HƯỚNG DẪN VỀ VĂN PHONG và CÁCH DIỄN ĐẠT, không phải quy tắc cốt truyện.
- ✅ Linh hoạt trong: cách hành văn, miêu tả cảm xúc, góc nhìn, nhịp điệu câu chữ, biến tấu từ ngữ.
- ❌ KHÔNG linh hoạt trong: cốt truyện, nhân vật, bối cảnh, mốc thời gian — các hard rule vẫn có hiệu lực tuyệt đối.

🏞️ MÔI TRƯỜNG & KHÔNG GIAN:
- Miêu tả không gian, thời tiết, ánh sáng, âm thanh, mùi hương
- Tạo bầu không khí phù hợp với cảnh (lãng mạn, căng thẳng, u tối, ấm cúng...)
- Không cần miêu tả quá dài dòng, chỉ cần đủ để người đọc hình dung

🧍 CƠ THỂ & CẢM XÚC:
- Vóc dáng, làn da, khuôn mặt, đôi mắt, mái tóc
- Cảm xúc: vui, buồn, tức, sợ, bối rối, phấn khích, xấu hổ...
- Biểu cảm: nhíu mày, mỉm cười, đỏ mặt, ánh mắt lấp lánh, run rẩy...
- Linh hoạt, không miêu tả cứng nhắc mọi lúc

👘 Y PHỤC & PHỤ KIỆN:
- Trang phục, nội y, trang sức, phụ kiện
- Màu sắc, chất liệu, kiểu dáng khi có ý nghĩa đặc biệt
- Không cần liệt kê chi tiết từng bộ phận trang phục

💬 LỜI THOẠI:
- Phù hợp ngữ cảnh: căng thẳng, vui vẻ, bi thương, gấp gáp...
- Ngữ điệu: gấp gáp, nghẹn ngào, thì thầm, dứt khoát, mỉa mai...
- Dùng câu ngắn khi cao trào, câu dài khi trữ tình

🧠 NỘI TÂM:
- Suy nghĩ, trăn trở, ký ức, mâu thuẫn nội tâm
- Xen kẽ tự nhiên với hành động và đối thoại

🎭 BIỂU LỘ CẢM XÚC:
- Cam chịu: cắn môi, nắm tay, mắt nhìn xuống
- Sa ngã: mất phương hướng, tuyệt vọng, buông xuôi
- Chịu đựng: cố nén, lặng im, gồng mình
- Chấp nhận: thở dài, gật đầu, mỉm cười miễn cưỡng
- Hưng phấn: mắt sáng rực, nụ cười rạng rỡ
- Kìm nén: siết chặt tay, cổ họng nghẹn lại

🖐️ CỬ CHỈ & HÀNH ĐỘNG:
- Cử chỉ, tư thế, động tác cơ thể
- Phù hợp với tình huống và tính cách nhân vật
- Tự nhiên, không cường điệu hóa

💞 TƯƠNG TÁC & QUAN HỆ THÂN MẬT:
- Diễn tả cảm xúc, ham muốn, rung động khi gần gũi
- Khoảnh khắc chạm mắt, chạm tay, hơi thở gấp gáp
- Ngôn ngữ cơ thể: đôi tay vuốt ve, ánh mắt giao nhau, hơi thở hòa quyện
- Cảm giác ngại ngùng, bồi hồi, khao khát, say mê
- Khoái cảm dâng trào, mê đắm, cuồng nhiệt
- Sau đó: dịu dàng, ấm áp, thỏa mãn, hoặc tiếc nuối, cô đơn

📏 YÊU CẦU TỐI THIỂU (bắt buộc, không phải tùy chọn):
- Mỗi lần một nhân vật xuất hiện hoặc có hành động đáng chú ý: PHẢI có tối thiểu 1-2 câu
  miêu tả ngoại hình/biểu cảm/cử chỉ liên quan đến khoảnh khắc đó — không bỏ qua.
- Các đoạn hành động (chiến đấu, di chuyển, phản ứng nhanh...): PHẢI chia thành nhiều bước
  nhỏ, mô tả rõ trình tự cơ thể chuyển động, không gộp thành 1-2 câu tóm lược.
- Khi 2 nhân vật tương tác (đối thoại, xung đột, thân mật...): PHẢI thể hiện qua ít nhất
  3 yếu tố cụ thể trong số: ánh mắt, khoảng cách cơ thể, giọng nói/ngữ điệu, cử chỉ tay,
  nhịp thở, phản ứng nội tâm — không viết chung chung kiểu "họ nhìn nhau và mỉm cười".

🌸 MIÊU TẢ CẢNH H (TRỰC TIẾP, KHÔNG ẨN DỤ):
- Gọi đúng tên bộ phận theo bộ từ vựng đã cài đặt ở bên dưới.
- Miêu tả cụ thể: màu sắc, hình dáng, chuyển động, cảm giác da thịt.
- CẤM ẩn dụ sáo rỗng: "khe suối", "đóa hoa xuân", "vùng cấm địa", "nơi thầm kín".
- Viết nhiều, đẩy đủ, tả rõ bộ phận sinh dục, tả rõ cảnh quan hệ tình dục.

📌 LƯU Ý: Đây là HƯỚNG DẪN THAM KHẢO về VĂN PHONG và DIỄN ĐẠT, không phải quy tắc cốt truyện. 
Các hard rule về cốt truyện, nhân vật, bối cảnh vẫn có hiệu lực tuyệt đối.`;

const FORBIDDEN_GUIDELINES = `🚫 DANH SÁCH CẤM KỴ BỔ SUNG:

⚠️ KHÔNG KHÍ & GIỌNG VĂN:
- Tuyệt đối KHÔNG tự thêm các câu từ tạo cảm giác nguy hiểm, đe dọa, "điềm báo xấu sắp xảy ra"
  (VD: "một cảm giác bất an len lỏi...", "như có gì đó sắp ập tới...", "bóng tối đang chờ đợi...")
  nếu mệnh lệnh không yêu cầu.
- KHÔNG tự ý đẩy bầu không khí ở cuối đoạn/cuối lần viết trở nên nặng nề, u ám, trầm buồn,
  lắng đọng mang tính "khép lại cảm xúc" nếu không được yêu cầu. Giữ tông cảm xúc trung tính,
  đúng với diễn biến đang có, không tự thêm dư vị buồn/nặng ở câu cuối.

🛑 KẾT THÚC & CẤU TRÚC:
- Tuyệt đối KHÔNG tự viết đoạn kết, đoạn chốt, đoạn "khép cảnh" nếu mệnh lệnh không yêu cầu
  viết kết thúc. Dừng đúng tại điểm mệnh lệnh yêu cầu, không tự đẩy câu chuyện đến hồi kết.
- KHÔNG tự suy diễn hoặc viết thêm hậu quả/diễn biến tiếp theo ngoài phạm vi mệnh lệnh.

🔇 TIẾNG RÊN & ÂM THANH:
- CẤM lặp cùng 1 âm tiết rên (a, ứ, ôi) quá 3 lần liên tiếp không có nội dung xen kẽ.
- Phải xen kẽ: hành động -> rên -> hành động -> rên.
- KHÔNG copy nguyên mẫu câu rên từ bộ từ vựng — chỉ tham khảo nhịp điệu, tự sáng tác.

💡 LƯU Ý: Danh sách này bổ sung cho các Ràng Buộc Cứng AI ở trên, tập trung vào các lỗi
thực tế đã ghi nhận khi AI viết: tự thêm điềm báo nguy hiểm, tự kết thúc cảnh, tự làm
không khí nặng nề cuối đoạn, lặp rên nhàm chán.`;

// ─── LoreSection Component ────────────────────────────────────────────────────
function LoreSection({
  state,
  updateState,
}: {
  state: NovelState;
  updateState: (updater: (prev: NovelState) => void) => void;
}) {
  const loreEntries: LoreEntry[] = state.rules.loreEntries ?? [];
  const [expanded, setExpanded]     = useState(true);
  const [isAdding, setIsAdding]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm] = useState<Omit<LoreEntry, 'id'>>({
    category: LORE_CATEGORIES[0],
    title: '',
    content: '',
  });

  const resetForm = () => setForm({ category: LORE_CATEGORIES[0], title: '', content: '' });

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    
    // Check duplicate title
    const exists = loreEntries.some(e => 
      e.title.toLowerCase() === form.title.toLowerCase() && 
      e.id !== editingId
    );
    if (exists) {
      alert('⚠️ Tiêu đề đã tồn tại! Vui lòng đặt tên khác.');
      return;
    }

    updateState((prev) => {
      if (!prev.rules.loreEntries) prev.rules.loreEntries = [];
      if (editingId) {
        const idx = prev.rules.loreEntries.findIndex(e => e.id === editingId);
        if (idx !== -1) prev.rules.loreEntries[idx] = { id: editingId, ...form };
      } else {
        prev.rules.loreEntries.push({ id: Math.random().toString(36).substr(2, 9), ...form });
      }
    });
    resetForm();
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (entry: LoreEntry) => {
    setForm({ category: entry.category, title: entry.title, content: entry.content });
    setEditingId(entry.id);
    setIsAdding(true);
    setExpanded(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Xoá mục lore này?')) return;
    updateState((prev) => {
      prev.rules.loreEntries = (prev.rules.loreEntries ?? []).filter(e => e.id !== id);
    });
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
    setEditingId(null);
  };

  const grouped = loreEntries.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(e);
    return acc;
  }, {} as Record<string, LoreEntry[]>);

  const totalChars = loreEntries.reduce((acc, e) => acc + e.content.length, 0);

  return (
    <div className="bg-neutral-900 border border-indigo-900/30 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-950/60 border border-indigo-700/40 rounded-lg">
            <Library className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-left">
            <span className="text-sm font-bold text-indigo-300">Lore & Tài Nguyên Truyện</span>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Hệ thống ma pháp, địa lý, lịch sử, thuật ngữ, plot points — AI sẽ đọc khi viết
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {loreEntries.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-indigo-950/40 border-indigo-800/40 text-indigo-400">
                {loreEntries.length} mục
              </span>
              <span className="text-[10px] font-mono text-gray-600">
                ~{Math.round(totalChars / 4)} tokens
              </span>
            </div>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-neutral-800 pt-4 space-y-4">
          <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-[11px] text-indigo-200/70 leading-relaxed">
            💡 Trang 2 chỉ là ý tưởng thô ban đầu. Sau khi xây nhân vật ở Trang 3, hãy bổ sung thêm ở đây:
            hệ thống tu luyện chi tiết, bản đồ thế giới, các plot twist đã lên kế hoạch, thuật ngữ riêng của truyện...
            AI sẽ đọc toàn bộ khi viết để đảm bảo nhất quán.
          </div>

          {isAdding && (
            <div className="bg-neutral-950 border border-indigo-800/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <span className="text-xs font-bold text-indigo-400">
                  {editingId ? '✏️ Sửa mục lore' : '✨ Thêm mục lore mới'}
                </span>
                <button onClick={handleCancel} className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1">
                  <X className="w-3 h-3" /> Đóng
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Danh mục</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-600"
                  >
                    {LORE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Tiêu đề *</label>
                  <input
                    type="text"
                    placeholder="VD: Cảnh giới tu luyện, Bản đồ Đại Lục..."
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-600"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 mb-1">
                  Nội dung *
                  <span className="text-gray-600 ml-2">({form.content.length} ký tự · ~{Math.round(form.content.length / 4)} tokens)</span>
                </label>
                <textarea
                  rows={5}
                  placeholder={`Mô tả chi tiết về "${form.title || 'mục này'}"...`}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-indigo-600 resize-y leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={handleCancel} className="px-3 py-1.5 hover:bg-neutral-800 rounded-lg text-xs text-gray-400">
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.title.trim() || !form.content.trim()}
                  className="px-5 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Lưu mục
                </button>
              </div>
            </div>
          )}

          {!isAdding && (
            <button
              onClick={() => { resetForm(); setIsAdding(true); }}
              className="w-full py-2 border border-dashed border-indigo-800/40 hover:border-indigo-600/60 hover:bg-indigo-950/20 rounded-xl text-xs text-indigo-400/70 hover:text-indigo-300 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm mục lore / tài nguyên
            </button>
          )}

          {loreEntries.length === 0 && !isAdding && (
            <div className="py-8 text-center text-gray-600 text-xs border border-dashed border-neutral-800 rounded-xl">
              Chưa có mục nào. Thêm hệ thống tu luyện, bản đồ, thuật ngữ... để AI hiểu sâu hơn về thế giới truyện.
            </div>
          )}

          {loreEntries.length > 0 && (
            <div className="space-y-3">
              {Object.entries(grouped).map(([cat, entries]) => (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{cat}</p>
                  <div className="space-y-2">
                    {entries.map(entry => (
                      <div
                        key={entry.id}
                        className="bg-neutral-950/60 border border-neutral-800 hover:border-indigo-900/40 rounded-xl p-3 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-gray-200">{entry.title}</span>
                              <span className="text-[9px] text-gray-600 font-mono">
                                {entry.content.length} ký tự
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3">
                              {entry.content}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="p-1 text-neutral-500 hover:text-indigo-400 hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-1 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalChars > 8000 && (
            <div className="px-3 py-2 bg-amber-950/30 border border-amber-800/40 rounded-xl text-[10px] text-amber-400 flex items-center gap-2">
              ⚠️ Lore đang khá dài (~{Math.round(totalChars / 4)} tokens). Cân nhắc gộp các mục ngắn hoặc xoá thông tin không dùng.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component: LexiconEditor ──────────────────────────────────────────────
function LexiconEditor({
  state,
  updateState,
}: {
  state: NovelState;
  updateState: (updater: (prev: NovelState) => void) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const lexicon = state.rules.sexualLexicon ?? DEFAULT_LEXICON;

  const updateLexicon = (patch: Partial<SexualLexicon>) => {
    updateState((prev) => {
      prev.rules.sexualLexicon = { ...DEFAULT_LEXICON, ...prev.rules.sexualLexicon, ...patch };
    });
  };

  const parseLines = (val: string) => val.split('\n').map(s => s.trim()).filter(Boolean);

  const renderArea = (label: string, value: string[], onChange: (v: string[]) => void) => (
    <div>
      <label className="block text-[10px] text-gray-400 mb-1 font-semibold">{label}</label>
      <textarea
        rows={3}
        value={value.join('\n')}
        onChange={(e) => onChange(parseLines(e.target.value))}
        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[11px] text-gray-200 focus:outline-none focus:border-pink-600 resize-y"
        spellCheck={false}
      />
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-pink-950/20 via-neutral-900 to-neutral-900 border border-pink-700/30 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-pink-950/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pink-400" />
          <h3 className="text-sm font-bold text-pink-300">🔞 Bộ Từ Vựng Miêu Tả</h3>
          <span className="text-[10px] text-gray-500">(Có thể chỉnh sửa cho từng thể loại)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-600">10 danh mục</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-2 border-t border-pink-900/30 space-y-4">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Các từ ngữ dưới đây sẽ được đưa vào prompt khi bấm "Thêm hướng dẫn chi tiết". 
            Bạn có thể xóa, thêm, hoặc sửa từng từ để phù hợp với thể loại / bối cảnh truyện.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderArea('🍆 Bộ phận nam', lexicon.maleParts, (v) => updateLexicon({ maleParts: v }))}
            {renderArea('🌸 Bộ phận nữ', lexicon.femaleParts, (v) => updateLexicon({ femaleParts: v }))}
            {renderArea('⚡ Hành động quan hệ', lexicon.actions, (v) => updateLexicon({ actions: v }))}
            {renderArea('👊 Hành động mạnh mẽ / đàn áp', lexicon.dominantActions, (v) => updateLexicon({ dominantActions: v }))}
            {renderArea('💥 Trạng thái - hình thái', lexicon.states, (v) => updateLexicon({ states: v }))}
            {renderArea('💧 Trạng thái khác', lexicon.otherStates, (v) => updateLexicon({ otherStates: v }))}
            {renderArea('💬 Tiếng rên & thoại khi H', lexicon.moanSounds, (v) => updateLexicon({ moanSounds: v }))}
            {renderArea('🔊 Âm thanh (hôn / va đập / bú)', lexicon.sexSounds, (v) => updateLexicon({ sexSounds: v }))}
            {renderArea('🎭 Biểu cảm cơ thể khi H', lexicon.sexExpressions, (v) => updateLexicon({ sexExpressions: v }))}
            {renderArea('💦 Dịch', lexicon.sexFluids, (v) => updateLexicon({ sexFluids: v }))}
          </div>

          <button
            onClick={() => {
              updateState((prev) => { prev.rules.sexualLexicon = DEFAULT_LEXICON; });
            }}
            className="text-[10px] text-gray-500 hover:text-pink-400 underline"
          >
            ↺ Khôi phục mặc định
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Component: PromptPreview ──────────────────────────────────────────────
function PromptPreview({
  state,
  onClose,
}: {
  state: NovelState;
  onClose: () => void;
}) {
  const hardRulesPrompt = buildHardRulesPrompt(state.rules.hardRules ?? DEFAULT_HARD_RULES);
  const lexiconPrompt = buildLexiconPrompt(state.rules.sexualLexicon);
  const mandatory = state.rules.mandatory || '';
  const forbidden = state.rules.forbidden || '';

  const fullPrompt = [
    hardRulesPrompt && `🔒 RÀNG BUỘC CỨNG AI:\n${hardRulesPrompt}`,
    lexiconPrompt && `📖 BỘ TỪ VỰNG:\n${lexiconPrompt}`,
    mandatory && `📝 ĐIỀU BẮT BUỘC:\n${mandatory}`,
    forbidden && `🚫 ĐIỀU CẤM KỴ:\n${forbidden}`,
  ].filter(Boolean).join('\n\n---\n\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-gray-200">👁 Xem trước toàn bộ prompt</span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 hover:bg-neutral-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <pre className="text-[11px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
            {fullPrompt || '(Chưa có nội dung prompt nào)'}
          </pre>
        </div>
        <div className="px-6 py-3 border-t border-neutral-800 shrink-0 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-300 rounded-lg text-xs font-semibold transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page4Rules ───────────────────────────────────────────────────────────────
export default function Page4Rules({ state, updateState, onNavigate }: Page4RulesProps) {
  const { rules } = state;
  const [hardExpanded, setHardExpanded] = useState(true);
  const [guideAdded, setGuideAdded] = useState(
    rules.mandatory?.includes(GUIDE_START_MARKER) || false
  );
  const [forbiddenGuideAdded, setForbiddenGuideAdded] = useState(
    rules.forbidden?.includes('🚫 DANH SÁCH CẤM KỴ BỔ SUNG') || false
  );
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const hardRules: HardRules = rules.hardRules ?? DEFAULT_HARD_RULES;

  const setHardRule = (key: keyof HardRules, value: boolean) => {
    updateState((prev) => {
      if (!prev.rules.hardRules) prev.rules.hardRules = { ...DEFAULT_HARD_RULES };
      prev.rules.hardRules[key] = value;
    });
  };

  const activeCount = Object.values(hardRules).filter(Boolean).length;
  const totalCount = RULE_DEFS.length;

  const groups = Array.from(new Set(RULE_DEFS.map(r => r.group)));

  // ─── Thêm hướng dẫn tham khảo (có lexicon) ──────────────────────────────
  const addReferenceGuide = () => {
    const lexiconBlock = buildLexiconPrompt(state.rules.sexualLexicon);
    const content = REFERENCE_GUIDELINES + '\n\n' + lexiconBlock;
    const wrapped = GUIDE_START_MARKER + '\n' + content + '\n' + GUIDE_END_MARKER;
    updateState((prev) => {
      prev.rules.mandatory = prev.rules.mandatory
        ? prev.rules.mandatory + '\n\n' + wrapped
        : wrapped;
    });
    setGuideAdded(true);
  };

  const removeGuide = () => {
    if (confirm('Xóa hướng dẫn tham khảo?')) {
      const current = rules.mandatory || '';
      const regex = new RegExp(
        `${GUIDE_START_MARKER}[\\s\\S]*?${GUIDE_END_MARKER}`,
        'gm'
      );
      const cleaned = current.replace(regex, '').replace(/\n{3,}/g, '\n\n').trim();
      updateState((prev) => {
        prev.rules.mandatory = cleaned;
      });
      setGuideAdded(false);
    }
  };

  // ─── Thêm danh sách cấm kỵ bổ sung ─────────────────────────────────────
  const addForbiddenGuide = () => {
    updateState((prev) => {
      prev.rules.forbidden = prev.rules.forbidden
        ? prev.rules.forbidden + '\n\n' + FORBIDDEN_GUIDELINES
        : FORBIDDEN_GUIDELINES;
    });
    setForbiddenGuideAdded(true);
  };

  const removeForbiddenGuide = () => {
    if (confirm('Xóa danh sách cấm kỵ bổ sung?')) {
      const current = rules.forbidden || '';
      const idx = current.indexOf(FORBIDDEN_GUIDELINES);
      const cleaned = idx === -1
        ? current
        : (current.slice(0, idx) + current.slice(idx + FORBIDDEN_GUIDELINES.length))
            .replace(/\n{3,}/g, '\n\n')
            .trim();
      updateState((prev) => {
        prev.rules.forbidden = cleaned;
      });
      setForbiddenGuideAdded(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" id="view-page4">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-xl">
          <ShieldCheck className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-100 font-sans">Quy Tắc Viết & Chỉ Thị AI</h2>
          <p className="text-xs text-gray-400 font-mono">STORY GENERATION CONFIGURATION RULES</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ─── LexiconEditor ──────────────────────────────────────────────── */}
        <LexiconEditor state={state} updateState={updateState} />

        {/* ─── Hướng Dẫn Tham Khảo ────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-violet-950/20 via-neutral-900 to-neutral-900 border border-violet-700/30 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-violet-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-violet-300">📝 Hướng Dẫn Tham Khảo</h3>
                <span className="text-[10px] text-gray-500">(Linh hoạt, không rập khuôn)</span>
              </div>
              <div className="flex gap-2">
                {!guideAdded ? (
                  <button
                    onClick={addReferenceGuide}
                    className="px-3 py-1.5 bg-violet-700 hover:bg-violet-600 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm hướng dẫn
                  </button>
                ) : (
                  <button
                    onClick={removeGuide}
                    className="px-3 py-1.5 bg-red-950/40 border border-red-800/40 hover:bg-red-950/60 text-red-400 rounded-lg text-[10px] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Xóa
                  </button>
                )}
              </div>
            </div>
          </div>

          {guideAdded && (
            <div className="px-5 py-3 bg-green-950/20 border border-green-800/40 rounded-lg text-[10px] text-green-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>✅ Đã thêm hướng dẫn tham khảo + bộ từ vựng vào "Điều bắt buộc"</span>
            </div>
          )}

          {!guideAdded && (
            <div className="px-5 py-3 bg-amber-950/20 border border-amber-800/40 rounded-lg text-[10px] text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>⚠️ Chưa có hướng dẫn tham khảo. Bấm "Thêm hướng dẫn" để cài đặt.</span>
            </div>
          )}
        </div>

        {/* ─── Ràng Buộc Cứng AI ──────────────────────────────────────────── */}
        <div className="bg-neutral-900 border border-red-900/30 rounded-2xl overflow-hidden">
          <button
            onClick={() => setHardExpanded(!hardExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-red-950/60 border border-red-800/50 rounded-lg">
                <Lock className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold text-red-300">Ràng Buộc Cứng AI</span>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Các lệnh cấm tuyệt đối được chèn thẳng vào prompt — AI không thể bỏ qua
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                activeCount === totalCount
                  ? 'bg-green-950/40 border-green-800/40 text-green-400'
                  : 'bg-neutral-800 border-neutral-700 text-gray-400'
              }`}>
                {activeCount}/{totalCount} bật
              </span>
              {hardExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </div>
          </button>

          {hardExpanded && (
            <div className="px-5 pb-5 border-t border-neutral-800 pt-4 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-500 leading-relaxed max-w-lg">
                  <span className="text-red-400">●</span> Đỏ = quan trọng cao &nbsp;
                  <span className="text-amber-400">●</span> Vàng = quan trọng trung bình &nbsp;·&nbsp;
                  Bấm <span className="text-gray-300">ℹ</span> để xem giải thích
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => RULE_DEFS.forEach(r => setHardRule(r.key, true))}
                    className="px-2.5 py-1 bg-red-900/40 border border-red-800/40 hover:bg-red-800/50 text-red-300 rounded-lg text-[10px] font-semibold transition-colors"
                  >
                    Bật tất
                  </button>
                  <button
                    onClick={() => RULE_DEFS.forEach(r => setHardRule(r.key, false))}
                    className="px-2.5 py-1 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-gray-400 rounded-lg text-[10px] transition-colors"
                  >
                    Tắt tất
                  </button>
                </div>
              </div>

              {groups.map(group => {
                const groupRules = RULE_DEFS.filter(r => r.group === group);
                const colorClass = GROUP_COLORS[group] || 'text-gray-400';
                const groupActive = groupRules.filter(r => hardRules[r.key]).length;

                return (
                  <div key={group}>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider mb-2.5 ${colorClass}`}>
                      {group}
                      <span className="font-mono opacity-70">({groupActive}/{groupRules.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {groupRules.map(def => (
                        <RuleToggle
                          key={def.key}
                          def={def}
                          value={hardRules[def.key]}
                          onChange={(v) => setHardRule(def.key, v)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              <details className="group">
                <summary className="cursor-pointer text-[10px] text-gray-600 hover:text-gray-400 flex items-center gap-1 select-none">
                  <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                  Xem lệnh cấm sẽ được đẩy vào AI ({activeCount} rules đang bật)
                </summary>
                <pre className="mt-2 p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-[9px] text-gray-500 font-mono overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap">
                  {RULE_DEFS.filter(r => hardRules[r.key]).map((r, i) =>
                    `${i + 1}. [${r.label.toUpperCase()}]\n   ${r.aiPrompt}`
                  ).join('\n\n') || '(Chưa có rule nào bật)'}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* ── Điều bắt buộc và Cấm kỵ ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 font-sans">
              <BookmarkCheck className="w-4 h-4" /> ĐIỀU BẮT BUỘC PHẢI TUÂN THỦ
            </h3>
            <p className="text-[10px] text-gray-400">Các điều khoản AI bắt buộc tự giác chèn, lồng ghép hoặc hành động trong chương truyện.</p>
            <textarea
              rows={10}
              placeholder="Ví dụ:
- Luôn gọi đúng danh xưng theo mối quan hệ đã thiết lập (Sư tôn gọi đồ nhi, Phu thê xưng ái tử).
- Cảnh mây mưa phải viết cực kỳ bốc lửa, tả dung nhan mỹ nhân ghen ghét hay mê man chi tiết."
              value={rules.mandatory}
              onChange={(e) => updateState((prev) => { prev.rules.mandatory = e.target.value; })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5 font-sans">
                <AlertOctagon className="w-4 h-4" /> ĐIỀU CẤM KỴ TUYỆT ĐỐI (OOC/FORBIDDEN)
              </h3>
              {!forbiddenGuideAdded ? (
                <button
                  onClick={addForbiddenGuide}
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm gợi ý cấm
                </button>
              ) : (
                <button
                  onClick={removeForbiddenGuide}
                  className="px-3 py-1.5 bg-neutral-950/40 border border-neutral-800/40 hover:bg-neutral-950/60 text-gray-400 rounded-lg text-[10px] transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Xóa
                </button>
              )}
            </div>

            {forbiddenGuideAdded && (
              <div className="px-3 py-2 bg-red-950/20 border border-red-800/40 rounded-lg text-[10px] text-red-300 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>✅ Đã thêm danh sách cấm kỵ bổ sung vào "Điều cấm kỵ"</span>
              </div>
            )}

            {!forbiddenGuideAdded && (
              <div className="px-3 py-2 bg-amber-950/20 border border-amber-800/40 rounded-lg text-[10px] text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>⚠️ Chưa có danh sách cấm kỵ bổ sung. Bấm "Thêm gợi ý cấm" để cài đặt.</span>
              </div>
            )}

            <p className="text-[10px] text-gray-400">Những chi tiết mà AI tuyệt đối không được viết (tránh OOC, phá vỡ logic nguyên tác).</p>
            <textarea
              rows={10}
              placeholder="Ví dụ:
- Nghiêm cấm Trần Phong bị lùi bước hèn nhát trước kẻ địch.
- Cấm để các nữ chính ghen tuông sinh hận phản bội nam chính.
- Không được viết kết thúc OE (Open Ending) hay SE (Sad Ending)."
              value={rules.forbidden}
              onChange={(e) => updateState((prev) => { prev.rules.forbidden = e.target.value; })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* ── Dung lượng ── */}
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-4 flex items-start gap-3">
          <Scale className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gray-400">Độ dài đoạn viết</p>
            <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">
              Cài đặt độ dài (range chữ) đã được chuyển sang <strong className="text-gray-500">Trang Sáng Tác</strong> — ngay trên nút AI viết.
              Bạn có thể chọn linh hoạt 800–1200 / 1500–2000 / 2500–3500 / 4000–5000 chữ cho từng đoạn.
            </p>
          </div>
        </div>

        {/* ── Nhất quán văn phong ── */}
        <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-200 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-red-500" /> Nhận diện tính nhất quán & Văn phong đồng nhất (Consistency)
          </h3>
          <p className="text-xs text-gray-400">Cách thức AI xử lý vốn từ ngữ, tránh pha trộn slang hiện đại khi đang trong bối cảnh cổ trang, hay ngược lại.</p>
          <textarea
            rows={4}
            placeholder="Ví dụ:
- Nghiêm cấm dùng các từ sáo rỗng hiện đại như 'ok', 'sì-pa', 'hot girl' trong bối cảnh Tiên hiệp cổ trang.
- Hãy sử dụng từ ngữ Hán Việt truyền thống (đạo lữ, pháp lực, thần lôi, tuyệt sắc mỹ nhân).
- Nếu truyện đô thị hiện đại, cho phép đan xen khẩu ngữ, chửi thề khêu gợi để tăng tính kịch."
            value={rules.consistencyRules}
            onChange={(e) => updateState((prev) => { prev.rules.consistencyRules = e.target.value; })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* ─── Lore ────────────────────────────────────────────────────────── */}
        <LoreSection state={state} updateState={updateState} />

        {/* ─── Xem trước prompt ────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowPromptPreview(true)}
            className="px-4 py-2 bg-emerald-950/40 border border-emerald-800/40 hover:bg-emerald-950/60 hover:border-emerald-600/60 rounded-lg text-xs text-emerald-300 flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> 👁 Xem trước toàn bộ prompt
          </button>
        </div>

        {/* ─── Mẹo ── */}
        <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl text-xs text-red-300 leading-relaxed">
          💡 <strong>Mẹo nhỏ cho tác giả:</strong> Hệ thống tự động đẩy toàn bộ dàn nhân vật kết nối chồng/vợ/cừu hận cũng như các môn phái mà bạn thiết lập ở <strong>Trang 3</strong> vào khu vực trí nhớ của AI. AI sẽ phân tích mối quan hệ để viết chuẩn xác mạch truyện logic, không sợ OOC. <strong>Ràng buộc cứng ở trên sẽ được tự động chèn vào mọi lần gọi AI.</strong>
          {state.config.referenceFileContent && (
            <span className="block mt-1 text-green-400/80">
              ✅ Đã có dữ liệu gốc ({formatFileSize(new Blob([state.config.referenceFileContent]).size)}) — chức năng "Viết lại" và "Nhảy cảnh" đã sẵn sàng.
            </span>
          )}
        </div>

        {/* ─── Nav ── */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => onNavigate('characters')}
            className="px-5 py-2.5 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm"
          >
            Quay Lại
          </button>
          <button
            type="button"
            onClick={() => {
              updateState((prev) => {
                if (prev.chapters.length === 0) {
                  prev.chapters.push({
                    id: '1',
                    title: 'Chương 1: Khởi nguồn kỳ ngộ',
                    content: 'Gió thu hiu quạnh thổi qua tàn phế của võ đường, lá khô xào xạc bay loạn xạ...\n\n(Nhập yêu cầu của bạn ở bên dưới để viết tiếp hành trình kỳ ngộ của vị anh hùng)',
                    prompt: '',
                    outline: '',
                  });
                  prev.currentChapterId = '1';
                }
              });
              onNavigate('compose');
            }}
            className="px-8 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-red-900/10"
          >
            VÀO KHÔNG GIAN SÁNG TÁC CHÍNH ➔
          </button>
        </div>
      </div>

      {/* ─── Prompt Preview Modal ── */}
      {showPromptPreview && (
        <PromptPreview state={state} onClose={() => setShowPromptPreview(false)} />
      )}
    </div>
  );
}

// ─── Helper: formatFileSize ──────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}