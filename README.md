# Ứng Dụng Quản Lý Ghi Chú Cá Nhân Thông Minh (AI Notes App)

Ứng dụng web quản lý ghi chú hiện đại, hỗ trợ lưu trữ cục bộ (localStorage), ghim ghi chú, phân loại theo thẻ màu và tích hợp Google Gemini AI (tóm tắt nội dung, gợi ý thẻ phân loại, trợ lý chatbot hỏi đáp, quét chữ từ ảnh OCR).

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
