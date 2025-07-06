# 📨 Secure Chat & File Transfer Application

## 📝 Mô tả

Ứng dụng này là một hệ thống **chat và truyền file an toàn**, sử dụng các kỹ thuật mã hóa để đảm bảo **bảo mật**, **toàn vẹn** và **xác thực** của dữ liệu.

### ✅ Tính năng chính:

- ✅ **Mã hóa tin nhắn:** Sử dụng **Triple DES (CBC mode)** với khóa phiên.
- ✅ **Mã hóa file:** File được chia làm **3 phần**, mã hóa bằng Triple DES và **ký số bằng RSA**.
- ✍️ **Ký số:** Dùng **RSA 2048-bit (PKCS#1 v1.5 + SHA-512)** để xác thực metadata và các phần file.
- 🧾 **Kiểm tra toàn vẹn:** Sử dụng **SHA-512** để kiểm tra dữ liệu.
- 🌐 **Giao tiếp thời gian thực:** Sử dụng **Socket.IO** để truyền tin nhắn và file qua các phòng chat.

### 👥 Giao diện Web

- 👤 **Người gửi (Sender):** Gửi tin nhắn và file đã mã hóa.
- 📥 **Người nhận (Receiver):** Nhận, kiểm tra và giải mã tin nhắn/file.

---

## 🎯 Yêu cầu kỹ thuật

| Thành phần           | Công nghệ sử dụng                          |
|----------------------|--------------------------------------------|
| Mã hóa               | Triple DES (CBC mode, PKCS7 padding)       |
| Ký số & Trao khóa    | RSA 2048-bit, PKCS#1 v1.5, SHA-512         |
| Kiểm tra toàn vẹn    | SHA-512                                    |
| Giao tiếp            | Flask, Socket.IO                           |
| Giải mã phía client  | CryptoJS (Triple DES)                      |

---

## 🔁 Luồng xử lý

### 1. 🤝 Handshake
- **Người gửi:** Gửi tín hiệu `"Hello!"` để khởi tạo phiên.
- **Người nhận:** Phản hồi `"Ready!"` để xác nhận.

### 2. 🔐 Trao khóa & Ký số
- Tạo metadata: tên file, timestamp, v.v.
- **Ký metadata** bằng private key (RSA/SHA-512).
- **Mã hóa session key Triple DES** bằng RSA public key của người nhận.

### 3. 🧩 Mã hóa & Gửi file
- Chia file thành **3 phần**.
- Mỗi phần:
  - Mã hóa bằng **Triple DES + IV ngẫu nhiên**
  - Hash SHA-512 (`IV || ciphertext`)
  - Ký số bằng **RSA**
- Gửi qua **Socket.IO** cùng metadata.

### 4. 📬 Phía người nhận
- Xác minh:
  - ✅ **Hash SHA-512**
  - ✅ **Chữ ký RSA**
- Nếu hợp lệ:
  - 🔓 **Giải mã** bằng Triple DES với session key.
  - 🖼️ **Hiển thị hoặc cho tải xuống**
  - ↩️ Gửi tín hiệu **ACK**
- Nếu lỗi:
  - ❌ Gửi tín hiệu **NACK**

---

## 🗂️ Cấu trúc thư mục
BAITAPLON/.
├── app.py             # 🚀 Server Flask với Socket.IO để xử lý yêu cầu.
├── client.js          # 💬 Xử lý giao tiếp và giải mã phía client (CryptoJS).
├── des_utils.py       # 🔐 Các hàm mã hóa/giải mã bằng Triple DES.
├── rsa_utils.py       # ✍️ Hàm tạo khóa, ký số, và mã hóa RSA.
├── hash_utils.py      # 🧾 Tạo và kiểm tra băm SHA-512.
├── index.html         # 🌐 Giao diện người dùng (Web UI).
├── contract.txt       # 📄 File mẫu để thử nghiệm truyền tải.
└── uploads/           # 📂 Thư mục lưu trữ file nhận được từ client.


---

## 🚀 Hướng dẫn chạy

### 1. Cài đặt thư viện

```bash
# Python dependencies
pip install flask flask-socketio pycryptodome

# JavaScript client
npm install socket.io-client
```
### 2. Chạy server
bash
Sao chép
Chỉnh sửa
python app.py
Server mặc định chạy tại http://localhost:5000.

### 3. Truy cập giao diện
Mở trình duyệt đến http://localhost:5000

Nhập tên người dùng và phòng chat

Copy session key từ console server để dùng cho giải mã

### 4. Gửi và nhận
✉️ Gửi tin nhắn: Nhập nội dung và nhấn "Gửi"

📁 Gửi file: Chọn file và nhấn "Gửi File"

🔐 Giải mã: Nhập session key → nhấn "Giải mã"

## 📷 Demo giao diện
# ![image](https://github.com/user-attachments/assets/b114ce49-aff7-4d5e-87ba-883c51a4499d)
# ![image](https://github.com/user-attachments/assets/50193175-9ba0-44f0-9e6d-25bb8d6bb62d)


## 📌 Ghi chú
✅ Hỗ trợ gửi tin nhắn và file text (ví dụ contract.txt)

🔐 Dữ liệu được bảo vệ bằng:

Mã hóa Triple DES

Ký số RSA

Hash SHA-512

🌐 Giao tiếp trong LAN thông qua Socket.IO

🔄 Tự động xử lý ACK/NACK

⚠️ Người nhận cần nhập session key thủ công

© 2025 – Bài tập lớn An toàn & Bảo mật thông tin
