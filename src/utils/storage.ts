import { Note } from '../types';

const STORAGE_KEY = 'vn_notes_data_v1';
const THEME_KEY = 'vn_notes_theme_v1';

export const INITIAL_SAMPLE_NOTES: Note[] = [
  {
    id: 'sample-1',
    title: 'Kế hoạch công việc tuần này & mục tiêu quý 4',
    content: `## Mục tiêu tuần:
- [x] Hoàn thiện tài liệu báo cáo tiến độ dự án Alpha
- [ ] Gửi bản đề xuất kế hoạch triển khai cho khách hàng
- [ ] Tham gia buổi họp chiến lược sáng thứ Năm lúc 9:00
- [ ] Đánh giá hiệu suất đội ngũ và phân bổ lại nguồn lực

*Lưu ý quan trọng:* Cần ưu tiên các đầu việc liên quan đến hạ tầng bảo mật trước thứ Sáu.`,
    tags: ['Công việc', 'Kế hoạch', 'Quan trọng'],
    isPinned: true,
    color: 'blue',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    summary: '• Tập trung hoàn thiện báo cáo dự án Alpha và gửi đề xuất khách hàng.\n• Tham gia họp chiến lược thứ Năm 9:00.\n• Ưu tiên kiểm tra bảo mật trước hạn chót thứ Sáu.',
  },
  {
    id: 'sample-2',
    title: 'Ý tưởng phát triển trợ lý ghi chú thông minh cá nhân',
    content: `Ý tưởng: Một không gian làm việc tối giản, kết hợp giữa tốc độ ghi chép nhanh và sức mạnh của trí tuệ nhân tạo Gemini AI.

Các tính năng đột phá:
1. Tự động nhận diện ý chính và tóm tắt nhanh không cần mở chi tiết.
2. Quét hình ảnh từ sách vở, hóa đơn viết tay trích xuất tức thì (OCR).
3. Chatbot nắm rõ ngữ cảnh toàn bộ kho ghi chú để tra cứu và xâu chuỗi thông tin.
4. Gợi ý thẻ phân loại thông minh theo nội dung.`,
    tags: ['Ý tưởng', 'Công nghệ', 'AI'],
    isPinned: true,
    color: 'purple',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'sample-3',
    title: 'Công thức nấu Bún Bò Huế chuẩn vị cố đô',
    content: `Nguyên liệu chính:
- Bắp bò, nạm bò, gân bò, giò heo
- Mắm ruốc Huế nguyên chất (hòa nước lạnh rồi lọc cặn)
- Sả cây đập dập (6-8 cây), ớt bột, hạt màu điều
- Hành tây, gừng nướng thơm
- Bún sợi to, rau thơm, bắp chuối bào

Bí quyết: Nấu nước dùng với sả và gừng nướng ở lửa liu riu, hớt bọt thường xuyên để nước trong vắt và dậy mùi thơm đặc trưng.`,
    tags: ['Đời sống', 'Ẩm thực', 'Gia đình'],
    isPinned: false,
    color: 'amber',
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    summary: '• Nguyên liệu: Bắp bò, nạm, giò heo, sả, mắm ruốc Huế và ớt màu điều.\n• Bí quyết cốt lõi: Hầm nước dùng cùng sả và gừng nướng lửa nhỏ, hớt bọt liên tục để nước dùng trong và thơm thanh.',
  },
  {
    id: 'sample-4',
    title: 'Danh sách sách hay cần đọc trong năm nay',
    content: `1. "Tư duy nhanh và chậm" - Daniel Kahneman (Tâm lý học hành vi)
2. "Nguyên lý" (Principles) - Ray Dalio (Quản trị & Ra quyết định)
3. "Deep Work" - Cal Newport (Kỹ năng tập trung cao độ)
4. "Tâm lý học về tiền" - Morgan Housel (Quản lý tài chính cá nhân)

Mục tiêu: Đọc tối thiểu 20 trang mỗi tối trước khi ngủ.`,
    tags: ['Học tập', 'Sách', 'Phát triển'],
    isPinned: false,
    color: 'emerald',
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
  },
];

export function getStoredNotes(userId?: string): Note[] {
  try {
    const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) {
      // If legacy un-scoped data exists and we just logged in, migrate or return initial
      if (userId) {
        const legacy = localStorage.getItem(STORAGE_KEY);
        if (legacy) {
          const parsedLegacy = JSON.parse(legacy);
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            return parsedLegacy.map((n: Note) => ({ ...n, userId }));
          }
        }
      }
      localStorage.setItem(key, JSON.stringify(INITIAL_SAMPLE_NOTES));
      return INITIAL_SAMPLE_NOTES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_SAMPLE_NOTES;
  } catch (e) {
    console.error('Failed to parse notes from localStorage:', e);
    return INITIAL_SAMPLE_NOTES;
  }
}

export function saveStoredNotes(notes: Note[], userId?: string): void {
  try {
    const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes to localStorage:', e);
  }
}

export function getStoredTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {
    console.error('Failed to get theme:', e);
  }
  return 'light';
}

export function saveStoredTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error('Failed to save theme:', e);
  }
}
