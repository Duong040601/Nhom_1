const socket = io();
let username, room;
let encryptedMessages = [];
let encryptedFiles = [];
let encryptedSessionKey = null;
let isSendingFile = false;

// Load CryptoJS for decryption
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
script.onload = () => console.log('CryptoJS loaded');
document.head.appendChild(script);

// RSA decryption (placeholder, requires manual key input for now)
function rsaDecrypt(encryptedSessionKey) {
    console.log('Decrypting session key (placeholder):', encryptedSessionKey);
    showToast('Vui lòng lấy session key từ console server (base64) và nhập vào trường khóa.', 'info');
    return encryptedSessionKey;
}

// Triple DES decryption with CryptoJS, improved error handling
function tripleDesDecrypt(ciphertext, key, iv) {
    if (typeof CryptoJS === 'undefined') {
        console.error('CryptoJS not loaded');
        showToast('CryptoJS chưa được tải, không thể giải mã.', 'error');
        return '[Error: CryptoJS not loaded]';
    }
    try {
        if (!isValidBase64(ciphertext) || !isValidBase64(key) || !isValidBase64(iv)) {
            console.error('Invalid base64 input:', { ciphertext, key, iv });
            showToast('Khóa, IV hoặc dữ liệu mã hóa không hợp lệ.', 'error');
            return '[Error: Invalid base64 input]';
        }
        const keyBytes = CryptoJS.enc.Base64.parse(key);
        const ivBytes = CryptoJS.enc.Base64.parse(iv);
        const decrypted = CryptoJS.TripleDES.decrypt({
            ciphertext: CryptoJS.enc.Base64.parse(ciphertext)
        }, keyBytes, {
            iv: ivBytes,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        let result = decrypted.toString(CryptoJS.enc.Utf8);
        if (!result || result.includes('�')) {
            result = decrypted.toString(CryptoJS.enc.Hex);
            console.warn('UTF-8 failed, using Hex:', result);
            showToast('Giải mã UTF-8 thất bại, hiển thị dạng Hex.', 'info');
        }
        return result || '[Error: Empty decryption result]';
    } catch (e) {
        console.error('Decryption error:', e.message);
        showToast(`Lỗi giải mã: ${e.message}`, 'error');
        return `[Error: ${e.message}]`;
    }
}

// Validate base64 string
function isValidBase64(str) {
    try {
        return btoa(atob(str)) === str;
    } catch (e) {
        return false;
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast px-4 py-2 rounded-lg shadow-lg text-white ${type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600'}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Join room
function joinRoom() {
    username = document.getElementById('username').value;
    room = document.getElementById('room').value;
    if (username && room) {
        console.log('Joining room:', username, room);
        socket.emit('join', { username, room });
    } else {
        showToast('Vui lòng nhập tên người dùng và phòng!', 'error');
    }
}

// Send chat message
function sendChat() {
    const message = document.getElementById('chatMessage').value;
    if (message) {
        console.log('Sending chat:', message);
        socket.emit('chat', { username, room, message });
        document.getElementById('chatMessage').value = '';
        showToast('Tin nhắn đã được gửi!', 'success');
    } else {
        showToast('Vui lòng nhập tin nhắn!', 'error');
    }
}

// Send file
function sendFile() {
    if (isSendingFile) {
        showToast('Đang gửi file, vui lòng chờ!', 'error');
        return;
    }
    const fileInput = document.getElementById('fileInput').files[0];
    if (fileInput) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const fileContent = e.target.result;
            console.log('Preparing to send file:', fileInput.name, 'size:', fileContent.length, 'username:', username, 'room:', room);
            isSendingFile = true;
            if (!username || !room) {
                console.error('Username or room not defined:', { username, room });
                isSendingFile = false;
                showToast('Tên người dùng hoặc phòng không hợp lệ!', 'error');
                return;
            }
            socket.emit('send_file', {
                username: username,
                room: room,
                file_content: fileContent,
                file_name: fileInput.name
            });
        };
        reader.readAsText(fileInput);
    } else {
        showToast('Vui lòng chọn file!', 'error');
    }
}

// Remove sent file
function removeSentFile(button) {
    const row = button.closest('tr');
    if (row) row.remove();
    showToast('File đã được xóa khỏi danh sách!', 'success');
}

// Decrypt chat messages
function decryptChat() {
    const key = document.getElementById('chatKey').value;
    if (!key) {
        showToast('Vui lòng nhập khóa phiên!', 'error');
        return;
    }
    if (!isValidBase64(key)) {
        showToast('Khóa phiên không phải định dạng base64 hợp lệ!', 'error');
        return;
    }
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    let success = false;
    encryptedMessages.forEach(msg => {
        const decrypted = tripleDesDecrypt(msg.message, key, msg.iv);
        if (!decrypted.startsWith('[Error')) {
            success = true;
        }
        chatMessages.innerHTML += `<p class="text-gray-800">${msg.username}: ${decrypted}</p>`;
    });
    if (success) {
        showToast('Tin nhắn đã được giải mã thành công!', 'success');
    }
}

// Decrypt file
function decryptFile() {
    const key = document.getElementById('fileKey').value;
    if (!key) {
        showToast('Vui lòng nhập khóa phiên!', 'error');
        return;
    }
    if (!isValidBase64(key)) {
        showToast('Khóa phiên không phải định dạng base64 hợp lệ!', 'error');
        return;
    }
    let success = false;
    encryptedFiles.forEach(file => {
        if (file.cipher.length === 3 && file.iv.length === 3) {
            try {
                const decryptedParts = file.cipher.map((c, i) => tripleDesDecrypt(c, key, file.iv[i]));
                const allValid = decryptedParts.every(part => !part.startsWith('[Error'));
                if (allValid) {
                    file.content = decryptedParts.join('');
                    success = true;
                } else {
                    file.content = '[Error: One or more parts failed to decrypt]';
                }
            } catch (e) {
                console.error('File decryption error:', e);
                file.content = `[Error: ${e.message}]`;
            }
        } else {
            file.content = '[Error: Incomplete file parts]';
        }
    });
    updateReceivedFilesTable();
    if (success) {
        showToast('File đã được giải mã thành công!', 'success');
    } else {
        showToast('Một số file không thể giải mã do dữ liệu không đầy đủ hoặc khóa sai.', 'error');
    }
}

// Download decrypted file
function downloadFile(content, filename) {
    if (content.startsWith('[Error')) {
        showToast('Không thể tải file do lỗi giải mã!', 'error');
        return;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã tải xuống file ${filename}!`, 'success');
}

// Socket.io event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    showToast('Kết nối đến server thành công!', 'success');
});
socket.on('status', data => {
    console.log('Status:', data.msg);
    document.getElementById('statusMessages').innerHTML += `<p class="text-gray-800">${data.msg}</p>`;
    showToast(data.msg, 'info');
});
socket.on('error', data => {
    console.log('Error:', data.msg);
    showToast(`Lỗi: ${data.msg}`, 'error');
    isSendingFile = false;
});
socket.on('session_key', data => {
    encryptedSessionKey = data.encrypted_session_key;
    console.log('Received encrypted session key:', encryptedSessionKey);
    document.getElementById('statusMessages').innerHTML += `<p class="text-gray-800">Nhận khóa phiên mã hóa cho ${data.username}. Nhập khóa giải mã (base64) từ console server để tiếp tục.</p>`;
    document.getElementById('fileInput').disabled = false;
    showToast(`Nhận khóa phiên cho ${data.username}. Kiểm tra console server để lấy khóa.`, 'info');
});
socket.on('chat', data => {
    console.log('Received chat:', data);
    encryptedMessages.push(data);
    document.getElementById('chatMessages').innerHTML += `<p class="text-gray-800">${data.username}: [Encrypted] ${data.message}</p>`;
    showToast(`Nhận tin nhắn từ ${data.username}`, 'info');
});
socket.on('handshake', data => {
    console.log('Received handshake:', data);
    if (data.msg === 'Hello!' && data.username !== username) {
        socket.emit('handshake_response', {
            msg: 'Ready!',
            username: username,
            room: room,
            file_name: data.file_name,
            timestamp: new Date().toISOString(),
            size: 0,
            sender_username: data.username
        });
        showToast(`Nhận yêu cầu gửi file ${data.file_name} từ ${data.username}`, 'info');
    }
});
socket.on('metadata', data => {
    console.log('Received metadata:', data);
    try {
        const metadata = JSON.parse(data.metadata);
        const existingFile = encryptedFiles.find(f => f.file_name === metadata.filename && f.sender === data.sender_username);
        if (!existingFile) {
            encryptedFiles.push({
                file_name: metadata.filename,
                content: '[Encrypted]',
                cipher: [],
                iv: [],
                timestamp: new Date(metadata.timestamp).toLocaleString(),
                sender: data.sender_username
            });
        }
        updateReceivedFilesTable();
        showToast(`Nhận file ${metadata.filename} từ ${data.sender_username}`, 'success');
    } catch (e) {
        console.error('Error parsing metadata:', e);
        showToast('Lỗi khi xử lý metadata file', 'error');
    }
});
socket.on('file_sent_ack', data => {
console.log('Received file_sent_ack:', data);
    console.log('Received file_sent_ack:', data);
    isSendingFile = false;
    if (data.status === 'success') {
        const tbody = document.getElementById('sentFilesTable').querySelector('tbody');
        const row = document.createElement('tr');
        row.className = 'table-row';
        row.innerHTML = `<td class="p-3">${data.file_name}</td><td class="p-3">${new Date().toLocaleString()}</td><td class="p-3">Đã gửi</td><td class="p-3"><button class="btn bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 flex items-center" onclick="removeSentFile(this)"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>Xóa</button></td>`;
        tbody.appendChild(row);
        showToast(`File ${data.file_name} đã được gửi thành công!`, 'success');
    } else if (data.status === 'already_sent') {
        showToast(`File ${data.file_name} đã được gửi trước đó!`, 'error');
    }
});
socket.on('file_part', data => {
    console.log('Received file part:', data);
    socket.emit('verify_part', {
        username: username,
        room: room,
        iv: data.iv,
        cipher: data.cipher,
        hash: data.hash,
        sig: data.sig,
        part_index: data.part_index,
        sender: data.sender,
        file_name: data.file_name
    });
    const fileEntry = encryptedFiles.find(f => f.file_name === data.file_name && f.sender === data.sender);
    if (fileEntry) {
        fileEntry.cipher[data.part_index] = data.cipher;
        fileEntry.iv[data.part_index] = data.iv;
        if (fileEntry.cipher.length === 3 && fileEntry.iv.length === 3) {
            fileEntry.content = '[Encrypted - Ready for Decryption]';
            updateReceivedFilesTable();
            showToast(`Đã nhận đủ các phần của file ${data.file_name}. Nhấn "Giải mã" để xem nội dung.`, 'success');
        }
    }
});
socket.on('ack', data => {
    console.log('Received ACK:', data);
    document.getElementById('statusMessages').innerHTML += `<p class="text-gray-800">ACK: Phần ${data.part_index} hợp lệ.</p>`;
    showToast(`Phần ${data.part_index} hợp lệ`, 'info');
});
socket.on('nack', data => {
    console.log('Received NACK:', data);
    document.getElementById('statusMessages').innerHTML += `<p class="text-red-600">NACK: ${data.msg} (Phần ${data.part_index})</p>`;
    showToast(`NACK: ${data.msg} (Phần ${data.part_index})`, 'error');
});
socket.on('file_decrypted', data => {
    console.log('Received decrypted file:', data);
    if (data.username === username) {
        const fileEntry = encryptedFiles.find(f => f.file_name === data.file_name && f.sender === data.sender_username);
        if (fileEntry) {
            fileEntry.content = data.content;
            fileEntry.cipher = data.cipher;
            fileEntry.iv = data.iv;
        } else {
            encryptedFiles.push({
                file_name: data.file_name,
                content: data.content,
                cipher: data.cipher,
                iv: data.iv,
                timestamp: new Date().toLocaleString(),
                sender: data.sender_username
            });
        }
        updateReceivedFilesTable();
        showToast(`File ${data.file_name} đã được giải mã!`, 'success');
    }
});

// Update received files table
function updateReceivedFilesTable() {
    const tbody = document.getElementById('fileTable').querySelector('tbody');
    tbody.innerHTML = '';
    encryptedFiles.forEach(file => {
        const row = document.createElement('tr');
        row.className = 'table-row';
        const contentDisplay = file.content.length > 100 ? file.content.substring(0, 100) + '...' : file.content;
        row.innerHTML = `<td class="p-3">${file.file_name}</td><td class="p-3">${contentDisplay}</td><td class="p-3">${file.timestamp}</td><td class="p-3"><button class="btn bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 flex items-center" onclick="downloadFile('${encodeURIComponent(file.content)}', '${file.file_name}')"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg>Tải xuống</button></td>`;
        tbody.appendChild(row);
    });
}

// Disable file input until session key is received
document.getElementById('fileInput').disabled = true;