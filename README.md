# Tái đào tạo Sổ tay vận hành — Phòng Nhân sự (SCORM e-learning)

> **Dự án:** Bài giảng e-learning tương tác dành cho CBNV Phòng Nhân sự, Sun World Bà Nà Hills.
> **Chuẩn:** SCORM 1.2 — chạy được trên hầu hết mọi LMS hỗ trợ chuẩn này.
> **Công nghệ:** HTML/CSS/JavaScript thuần (vanilla) — không dùng framework, không cần bước build.

Nếu bạn là một AI được nhờ tiếp tục dự án này, hãy đọc hết file này trước khi chỉnh sửa bất kỳ file nào — nó giải thích kiến trúc, quy ước dữ liệu và những việc còn dang dở.

---

## 1. Tình trạng hiện tại

| Hạng mục | Trạng thái |
|---|---|
| Nội dung 12 slide (text, hình, ẩn dụ, tình huống, quiz...) | ✅ Hoàn thành, lấy từ file nguồn `PNS_Tai_dao_tao_STVH_2026_-_V2.pdf` |
| 8 loại tương tác (accordion, tabs, flipcard, hotspot, dragdrop, quiz, scenario, sorting) | ✅ Đã code đầy đủ, đã kiểm tra cú pháp |
| Giao tiếp LMS (SCORM 1.2: Init/SetValue/Commit/Finish, resume vị trí, lưu điểm) | ✅ Hoàn thành, có chế độ "preview" tự động khi mở ngoài LMS |
| Lưu tiến độ / đáp án bằng localStorage (chống mất dữ liệu khi F5) | ✅ Hoàn thành |
| Xuất báo cáo kết quả học tập (.json) | ✅ Hoàn thành (nút ở slide cuối) |
| **File voice-over (audio/slide-01.mp3 … slide-12.mp3)** | ❌ **CHƯA CÓ** — chỉ là placeholder, đang chờ chủ dự án thu âm và thả vào thư mục `audio/` |

**Việc cần làm tiếp theo:** nhận 12 file .mp3 từ chủ dự án → đặt đúng tên vào `audio/` → kiểm tra lại thời lượng từng slide có khớp không → đóng gói lại thành .zip để tải lên LMS. Không cần sửa code cho bước này — `audio-manager.js` đã tự động nhận diện file khi có mặt.

---

## 2. Cấu trúc thư mục

```
package/
├── index.html              → Toàn bộ 12 slide (mỗi slide là 1 <section class="slide" data-slide="N">)
├── imsmanifest.xml          → Khai báo SCORM 1.2 (masteryscore 80%)
├── README.md                → File này
├── css/
│   ├── main.css              → Layout, topbar, thanh điều hướng, theme màu (#0066CC xanh / #FF6600 cam)
│   ├── components.css        → Style riêng cho từng loại tương tác
│   └── animations.css        → Hiệu ứng chuyển động
├── js/
│   ├── app.js                 → "Bộ não": quản lý slide hiện tại, điều hướng, quét DOM để khởi tạo tương tác
│   ├── audio-manager.js       → Phát/dừng/lặp lại/tắt tiếng voice-over — xử lý an toàn khi thiếu file
│   ├── scorm-api.js           → Giao tiếp LMS, có fallback chế độ preview nếu không tìm thấy API
│   ├── storage.js             → Đọc/ghi localStorage, có version schema để tránh lỗi khi đổi cấu trúc dữ liệu
│   ├── report.js              → Gộp thời gian học, số lần tương tác, điểm quiz → xuất JSON / gửi LMS
│   └── interactions/
│       ├── accordion.js, tabs.js, flipcard.js  → tương tác đơn giản
│       ├── hotspot.js          → Điểm chạm trên nền, hiện tooltip
│       ├── dragdrop.js         → Kéo-thả ghép cặp (hỗ trợ chuột + cảm ứng)
│       ├── quiz.js             → Trắc nghiệm tuần tự, tính điểm, lưu localStorage
│       ├── scenario.js         → Tình huống rẽ nhánh (cây quyết định)
│       └── sorting.js          → Kéo-thả sắp xếp thứ tự
└── audio/
    └── (thả file slide-01.mp3 ... slide-12.mp3 vào đây)
```

**Nguyên tắc kiến trúc quan trọng:** mọi tương tác được gắn vào HTML bằng `data-interaction="..."` (hoặc `data-quiz-id` cho quiz). `app.js` quét DOM của slide đang mở và tự khởi tạo đúng class xử lý (factory pattern) — nghĩa là **muốn thêm/sửa nội dung, thường chỉ cần sửa `index.html`, không cần đụng vào JS.**

---

## 3. Cách chỉnh sửa nội dung (không cần biết lập trình sâu)

M��i loại tương tác nhận dữ liệu qua thuộc tính `data-*` dạng JSON ngay trong `index.html`. Ví dụ:

- **Quiz** (`data-questions`): mảng câu hỏi `{id, text, options[], correct (index đáp án đúng), explain}`.
- **Scenario** (`data-tree`): object các "node", mỗi node có `text` và `choices[]` gồm `label, next (id node kế tiếp hoặc null nếu kết thúc), score, tone (good/mid/bad), feedback`.
- **Drag & drop** (`data-pairs` + `data-match` trên từng phần tử): mỗi cặp `.dd-item` và `.dd-target` khớp nhau qua thuộc tính `data-match` (vd: `m1`).
- **Sorting** (`data-order-correct`): mảng id đúng thứ tự, mỗi `<li class="sorting-item" data-id="...">` là một bước.
- **Hotspot** (`data-points`): mảng điểm `{x, y (theo % chiều rộng/cao), label, title, content}`.

➡️ Khi sửa, luôn giữ đúng cú pháp JSON (dùng dấu nháy đơn `'...'` bọc ngoài thuộc tính HTML, dấu nháy kép `"..."` bên trong JSON). Nếu không chắc, chạy thử bằng `python3 -c "import json; json.loads(open('...').read())"` hoặc dán vào trình kiểm tra JSON online trước khi lưu.

Muốn thêm slide mới: copy nguyên một khối `<section class="slide" data-slide="N">...</section>`, đổi số `N` thành số tiếp theo, `app.js` sẽ tự nhận diện (không cần khai báo thêm ở đâu khác ngoài cập nhật `AUDIO_MAP` trong `app.js` nếu slide mới có voice-over).

---

## 4. Cách xem thử (preview)

**Cách 1 — chạy local server (khuyên dùng khi sửa code):**
```bash
cd package
python3 -m http.server 8000
```
M�� `http://localhost:8000`. (Không nên mở trực tiếp `index.html` bằng cách double-click — trình duyệt sẽ chặn tải file JS/audio qua đường dẫn `file://`.)

**Cách 2 — GitHub Pages:** Settings → Pages → Deploy from a branch → chọn branch + thư mục chứa `index.html` ở gốc. Chỉ hoạt động miễn phí với repo **public**.

**Cách 3 — Vercel:** import repo từ GitHub → chọn đúng Root Directory chứa `index.html` → Deploy. Dùng khi repo private hoặc cần link preview riêng cho mỗi lần commit.

---

## 5. Cách đóng gói để tải lên LMS

1. Đảm bảo `audio/` đã có đủ 12 file .mp3 (nếu chưa có, bài học vẫn chạy được nhưng không có tiếng).
2. Nén **toàn bộ nội dung bên trong** thư mục `package/` thành file `.zip` — lưu ý: `imsmanifest.xml` và `index.html` phải nằm ở **gốc file zip**, không được nằm trong một thư mục con `package/` bên trong zip, nếu không LMS sẽ báo lỗi không tìm thấy manifest.
   ```bash
   cd package && zip -r ../ten-goi-scorm.zip .
   ```
3. Tải file `.zip` này lên mục Import/Upload Content của LMS (Moodle, TalentLMS, SCORM Cloud, v.v. đều nhận chuẩn SCORM 1.2 giống nhau ở bước này).

---

## 6. Bối cảnh dự án (để AI sau đọc hiểu nhanh)

- Nội dung dựa trên bộ slide gốc: *"Tái đào tạo Sổ tay vận hành — Phòng Nhân sự"*, Sun World Bà Nà Hills, tháng 8/2026.
- Thông điệp cốt lõi xuyên suốt: khung "CHUẨN HR" (Đúng – Đủ – Tâm – Trách nhiệm), ẩn dụ "Sân khấu & Hậu đài", "6 hành vi tiêu chuẩn HR", "4 chuẩn vận hành HR" (Đúng – Đủ – Đúng hạn – Có phản hồi).
- Đối tượng học: toàn bộ CBNV Phòng Nhân sự, học bắt buộc.
- Ngôn ngữ nội dung: Tiếng Việt.
- Thời lượng dự kiến: ~19–20 phút nếu học tuần tự hết 12 slide.
