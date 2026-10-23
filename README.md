# Ứng Dụng Quản Lý Ghi Chú Cá Nhân Thông Minh (AI Notes App)

Ứng dụng web quản lý ghi chú hiện đại, lưu ghi chú trên đám mây (Supabase, đăng nhập bằng email), ghim ghi chú, phân loại theo thẻ màu và tích hợp Google Gemini AI (tóm tắt nội dung, gợi ý thẻ phân loại, trợ lý chatbot hỏi đáp, quét chữ từ ảnh OCR).

---

## 🛠 Hướng Dẫn Cài Đặt và Chạy Trên Visual Studio Code (VS Code)

### 1. Chuẩn Bị
Đảm bảo máy tính của bạn đã cài đặt:
- **Visual Studio Code:** [https://code.visualstudio.com/](https://code.visualstudio.com/)
- **Node.js (phiên bản 18 hoặc 20+):** [https://nodejs.org/](https://nodejs.org/) (Khuyên dùng bản LTS)

---

### 2. Mở Dự Án Bằng Visual Studio Code
1. Giải nén tệp `project-notes-app.zip` vào một thư mục trên máy tính của bạn.
2. Mở **VS Code** ➔ Chọn menu **File** ➔ **Open Folder...** ➔ Chọn thư mục vừa giải nén.

---

### 3. Cài Đặt Thư Viện (Dependencies)
1. Trong VS Code, mở cửa sổ dòng lệnh Terminal bằng cách:
   - Nhấn phím tắt: `Ctrl + ~` (trên Windows) hoặc `Cmd + ~` (trên Mac)
   - Hoặc chọn menu: **Terminal** ➔ **New Terminal**.
2. Nhập lệnh sau và nhấn **Enter**:
   ```bash
   npm install
   ```
   *(Đợi khoảng 1–2 phút để hệ thống tải và cài đặt các gói cần thiết)*.

---

### 4. Cấu Hình Khóa API Gemini (GEMINI_API_KEY)
1. Trong thư mục dự án, sao chép tệp `.env.example` thành `.env`:
   - Hoặc tạo một tệp mới tên là `.env` ở thư mục gốc.
2. Thêm khóa API Gemini của bạn vào tệp `.env`:
   ```env
   GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here
   ```
   *(Nếu chưa có API Key, bạn có thể lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey))*.

---

### 5. Khởi Động Ứng Dụng
1. Trong Terminal của VS Code, chạy lệnh:
   ```bash
   npm run dev
   ```
2. Terminal sẽ hiển thị:
   ```
   Server listening on port 3000 (mode: dev)
   ```
3. Mở trình duyệt web (Chrome, Edge, Safari...) và truy cập vào địa chỉ:
   👉 **http://localhost:3000**

---

### 6. Các Lệnh Hữu Ích Khác
- **`npm run build`**: Đóng gói mã nguồn sẵn sàng đưa lên hosting / máy chủ sản xuất.
- **`npm run lint`**: Kiểm tra lỗi cú pháp TypeScript trong toàn bộ dự án.


---

## ☁️ Dùng Supabase của riêng bạn (bắt buộc khi công khai app)

Mặc định code trỏ vào một project Supabase có sẵn. Muốn dữ liệu nằm trong tài khoản của bạn:

1. Vào https://supabase.com → **New project** (nhớ mật khẩu database, chọn vùng gần Việt Nam như Singapore).
2. **SQL Editor** → New query → dán `supabase/notes_schema.sql` → **Run**. Sau đó làm tương tự với `supabase/ai_schema.sql`.
3. **Project Settings → API**: copy **Project URL** và **Publishable key** (anon key).
4. Đặt vào file `.env` (và vào Environment Variables trên Vercel/hosting):
   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
   GEMINI_API_KEY=...
   ```
5. **Authentication → URL Configuration**: đặt **Site URL** là địa chỉ web của bạn, thêm vào **Redirect URLs** cả `http://localhost:3000` và domain thật (cần cho email xác nhận và quên mật khẩu).
6. Khởi động lại server (`npm run dev`) rồi đăng ký thử một tài khoản.

---

## 🧠 Kiến Trúc Trợ Lý AI

```
Giao diện (chat, đính kèm tệp, lịch sử)
        ↓  gửi kèm phiên đăng nhập Supabase
Backend — xác thực · giới hạn tốc độ · ngân sách token · xử lý lỗi        (server/ai/endpoints.ts, auth.ts, limits.ts)
        ↓
AI Orchestrator — hiểu yêu cầu, chọn công cụ                               (server/ai/orchestrator.ts, assistant.ts)
        ↓
Trò chuyện · Lập trình (chạy thử code) · Tra cứu (Google Search + nguồn) · Xử lý tệp   (server/ai/handlers.ts)
        ↓
Kiểm tra kết quả — rỗng/quá dài/thiếu nguồn, thử lại nếu không đạt         (server/ai/verify.ts)
        ↓
Cơ sở dữ liệu — lịch sử trò chuyện, nhật ký lỗi & token (Supabase)          (server/ai/store.ts, supabase/ai_schema.sql)
```

- `server.ts` (chạy local) và `api/ai/*.ts` (Vercel) đều chỉ gọi chung một "cổng" trong `server/ai/endpoints.ts`.
- Ghi chú của người dùng **không** được trình duyệt gửi lên; server tự đọc bằng quyền của chính người đó (Row Level Security).
- Giới hạn (số yêu cầu/phút, token/ngày, kích thước tệp) chỉnh trong `server/ai/config.ts`. Bộ đếm theo phút/ngày nằm trong bộ nhớ server; số liệu chính xác nằm ở bảng `ai_usage_logs`.

### Bật lịch sử trò chuyện và nhật ký (làm một lần)
1. Mở Supabase Dashboard → **SQL Editor** → **New query**.
2. Dán toàn bộ nội dung file `supabase/ai_schema.sql` rồi bấm **Run**.

Không chạy bước này thì AI vẫn trả lời bình thường, chỉ là không lưu lịch sử và không ghi nhật ký.

---

## ⚡ Tốc độ phản hồi của AI

Để trợ lý trả lời nhanh, backend áp dụng các nguyên tắc sau (đều nằm trong `server/ai/`):

- **Chọn công cụ bằng luật trước, hỏi AI sau** (`route-rules.ts`, `orchestrator.ts`): chào hỏi, hỏi về ghi chú, viết code, tra cứu tin tức… được nhận diện ngay (0 ms, hỗ trợ cả gõ không dấu). Chỉ khi yêu cầu mơ hồ mới gọi model nhỏ để phân loại, và bước này bị bỏ nếu quá `LIMITS.routerTimeoutMs` (mặc định 3 giây).
- **Đọc ghi chú song song** với bước điều phối, và **bỏ qua hẳn** khi chỉ là chào hỏi (`assistant.ts`).
- **Ít lượt gọi Supabase nối tiếp hơn** khi lưu lịch sử (`store.ts`) và **nhớ kết quả xác thực tối đa 60 giây** (`auth.ts`).
- Muốn chỉnh: `LIMITS` và `MODELS` trong `server/ai/config.ts`; thêm từ khóa nhận diện trong `server/ai/route-rules.ts`.
