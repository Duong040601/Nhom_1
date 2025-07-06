Secure Chat & File Transfer Application
Mô tả
Ứng dụng này là một hệ thống chat và truyền file an toàn, sử dụng các kỹ thuật mã hóa để đảm bảo tính bảo mật, toàn vẹn và xác thực của dữ liệu. Các tính năng chính bao gồm:
 Mã hóa tin nhắn: Tin nhắn được mã hóa bằng Triple DES (CBC mode) với khóa phiên.
 Mã hóa file: File được chia thành ba phần, mã hóa bằng Triple DES và ký số bằng RSA.
Ký số: Sử dụng RSA 2048-bit (PKCS#1 v1.5 + SHA-512) để xác thực metadata và các phần file.
 Kiểm tra toàn vẹn: Sử dụng SHA-512 để kiểm tra tính toàn vẹn của dữ liệu.
Giao tiếp thời gian thực: Sử dụng Socket.IO để truyền tin nhắn và file trong các phòng chat.
Giao diện web bao gồm:
Người gửi (Sender): Gửi tin nhắn và file đã mã hóa.
Người nhận (Receiver): Nhận, kiểm tra và giải mã tin nhắn/file.
Yêu cầu kỹ thuật
Thành phần 	Công nghệ sử dụng
Mã hóa 	Triple DES (CBC mode, PKCS7 padding)
Ký số & Trao khóa	RSA 2048-bit, PKCS#1 v1.5, SHA-512
Kiểm tra toàn vẹn	SHA-512
Giao tiếp	Flask, Socket.IO
Giải mã phía client	CryptoJS (Triple DES)

Luồng xử lý
1. Handshake
Người gửi: Gửi tín hiệu "Hello!" để khởi tạo truyền file.
Người nhận: Phản hồi "Ready!" để xác nhận sẵn sàng nhận.
2. Trao khóa & Ký số
Người gửi:
Tạo metadata: Bao gồm tên file, timestamp và thông tin khác.
Ký metadata bằng private key (RSA/SHA-512).
Mã hóa session key Triple DES bằng public key RSA của người nhận.
3.  Mã hóa & Gửi file
File được chia thành 3 phần.
Mỗi phần được:
Mã hóa bằng Triple DES với IV ngẫu nhiên.
Tính hash SHA-512 (IV || ciphertext).
Ký số bằng RSA.
Gửi các phần file kèm metadata qua Socket.IO.
4.  Phía người nhận
Nhận và kiểm tra:
 Hash SHA-512: Xác minh tính toàn vẹn của từng phần file.
 Chữ ký RSA: Xác minh tính xác thực của metadata và file.
Nếu hợp lệ:
 Giải mã các phần file bằng Triple DES với session key.
 Hiển thị nội dung file hoặc cho phép tải xuống.
Gửi tín hiệu ACK về người gửi.
Nếu lỗi:
 Gửi tín hiệu NACK (do sai hash hoặc chữ ký).
Cấu trúc thư mục
BAITAPLON/
├── app.py                  # Server Flask với Socket.IO
├── client.js               # JavaScript xử lý giao tiếp và giải mã phía client
├── des_utils.py            # Hàm mã hóa & giải mã Triple DES
├── rsa_utils.py            # Hàm RSA (tạo khóa, mã hóa, ký số)
├── hash_utils.py           # Hàm băm SHA-512
├── index.html              # Giao diện web
├── contract.txt            # File mẫu để thử nghiệm
└── uploads/                # Thư mục lưu file (nếu cần)
Hướng dẫn chạy
1. Cài thư viện
pip install flask flask-socketio pycryptodome
npm install socket.io-client
2. Chạy server
python app.py
Server sẽ chạy tại http://localhost:5000.
3. Truy cập giao diện
Mở trình duyệt và truy cập http://localhost:5000.
Nhập tên người dùng và phòng để tham gia.
Copy session key (base64) từ console server để giải mã.
4. Gửi và nhận
Gửi tin nhắn: Nhập tin nhắn và nhấn "Gửi". Tin nhắn được mã hóa bằng Triple DES.
Gửi file: Chọn file và nhấn "Gửi File". File được chia thành 3 phần và mã hóa.
Giải mã: Nhập session key vào giao diện, nhấn "Giải mã" để xem tin nhắn/file.
Demo giao diện


 Ghi chú
Hỗ trợ gửi tin nhắn và file text (ví dụ: contract.txt).
Tin nhắn và file được mã hóa bằng Triple DES, ký số bằng RSA, kiểm tra bằng SHA-512.
Giao tiếp trong mạng nội bộ (LAN) qua Socket.IO.
 Tự động gửi/nhận file kèm phản hồi ACK/NACK.
Giải mã thủ công: Người dùng cần copy session key từ console server để giải mã.
