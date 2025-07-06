from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, emit
import os
import json
import base64
from crypto.rsa_utils import generate_key_pair, rsa_encrypt, rsa_decrypt, rsa_sign, rsa_verify
from crypto.des_utils import triple_des_encrypt, triple_des_decrypt
from crypto.hash_utils import sha512_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = 'd41d8cd98f00b204e9800998ecf8427e'
socketio = SocketIO(app)

users = {}
file_parts = {}
sent_files = {}

# Hàm padding PKCS7 thủ công
def pkcs7_padding(data, block_size=8):
    pad_len = block_size - (len(data) % block_size)
    padding = bytes([pad_len] * pad_len)
    return data + padding

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    if not username or not room:
        emit('error', {'msg': 'Tên người dùng hoặc phòng không hợp lệ.'})
        return
    join_room(room)
    private_key, public_key = generate_key_pair()
    session_key = os.urandom(24)
    encrypted_session_key = rsa_encrypt(session_key, public_key)
    users[username] = {
        'room': room,
        'private_key': private_key,
        'public_key': public_key,
        'session_key': session_key,
        'handshake_pending': False
    }
    print(f"Session key for {username}: {base64.b64encode(session_key).decode()}")
    emit('status', {'msg': f'{username} đã tham gia phòng.'}, room=room)
    emit('session_key', {'username': username, 'encrypted_session_key': encrypted_session_key}, room=room)

@socketio.on('chat')
def on_chat(data):
    username = data['username']
    room = data['room']
    message = data['message']
    if not username or not room or not message:
        emit('error', {'msg': 'Dữ liệu tin nhắn không hợp lệ.'})
        return
    session_key = users.get(username, {}).get('session_key')
    if session_key:
        iv = os.urandom(8)
        padded_message = pkcs7_padding(message.encode('utf-8'))
        encrypted_message = triple_des_encrypt(padded_message, session_key, iv)
        print(f"Encrypted message for {username}: {base64.b64encode(encrypted_message).decode()}")
        emit('chat', {
            'username': username,
            'message': base64.b64encode(encrypted_message).decode(),
            'iv': base64.b64encode(iv).decode()
        }, room=room)
    else:
        emit('error', {'msg': 'Chưa thiết lập khóa phiên.'})

@socketio.on('send_file')
def on_send_file(data):
    username = data.get('username')
    room = data.get('room')
    file_content = data.get('file_content')
    file_name = data.get('file_name')
    print(f"Received send_file: username={username}, room={room}, file_name={file_name}, content_length={len(file_content) if file_content else 0}")
    if not username or not room or not file_content or not file_name:
        print(f"Error: Invalid data - username={username}, room={room}, file_content={file_content}, file_name={file_name}")
        emit('error', {'msg': 'Dữ liệu file không hợp lệ.'}, room=username)
        return
    session_key = users.get(username, {}).get('session_key')
    if not session_key:
        print(f"Error: No session key for {username}")
        emit('error', {'msg': 'Chưa thiết lập khóa phiên.'}, room=username)
        return

    part_size = max(1, len(file_content) // 3)
    parts = [file_content[i:i + part_size] for i in range(0, len(file_content), part_size)]
    if len(parts) > 3:
        parts[2] += parts[3]
        parts.pop(3)

    if username not in sent_files:
        sent_files[username] = []
    file_entry = next((f for f in sent_files[username] if f['file_name'] == file_name), None)
    if not file_entry or (file_entry and not file_entry['sent']):
        if not file_entry:
            sent_files[username].append({'file_name': file_name, 'parts': parts, 'sent': False})
        users[username]['handshake_pending'] = True
        print(f"Sending handshake for file: {file_name} by {username}")
        emit('handshake', {'msg': 'Hello!', 'username': username, 'file_name': file_name}, room=room)
        print(f"Sending file_sent_ack for {file_name} to {username}")
        emit('file_sent_ack', {'status': 'success', 'file_name': file_name})
    else:
        print(f"Warning: File {file_name} already sent or in progress by {username}")
        emit('file_sent_ack', {'status': 'already_sent', 'file_name': file_name})

@socketio.on('handshake_response')
def on_handshake_response(data):
    if data['msg'] != 'Ready!':
        emit('error', {'msg': 'Handshake thất bại: Phản hồi không hợp lệ.'})
        return
    sender_username = data.get('sender_username', data['username'])
    username = data['username']
    room = data['room']
    file_name = data['file_name']
    timestamp = data['timestamp']
    if not users.get(sender_username, {}).get('handshake_pending'):
        return
    metadata = json.dumps({'filename': file_name, 'timestamp': timestamp, 'size': data['size']})
    private_key = users.get(sender_username, {}).get('private_key')
    if not private_key:
        emit('error', {'msg': 'Không tìm thấy khóa riêng.'})
        return
    signature = rsa_sign(metadata.encode(), private_key)
    print(f"Sending metadata for {username}")
    emit('metadata', {
        'metadata': metadata,
        'signature': signature,
        'sender_username': sender_username,
        'file_name': file_name
    }, room=room)
    if sender_username in sent_files and sent_files[sender_username]:
        file_entry = next((f for f in sent_files[sender_username] if f['file_name'] == file_name and not f['sent']), None)
        if file_entry:
            for i, part in enumerate(file_entry['parts']):
                socketio.emit('send_part', {
                    'username': sender_username,
                    'room': room,
                    'part': part,
                    'part_index': i
                })
            file_entry['sent'] = True
            users[sender_username]['handshake_pending'] = False
            sent_files[sender_username] = [f for f in sent_files[sender_username] if not f['sent']]

@socketio.on('send_part')
def on_send_part(data):
    username = data['username']
    room = data['room']
    part = data['part']
    part_index = data['part_index']
    session_key = users.get(username, {}).get('session_key')
    if not session_key:
        emit('error', {'msg': 'Chưa thiết lập khóa phiên.'})
        return
    iv = os.urandom(8)
    padded_part = pkcs7_padding(part.encode('utf-8'))
    encrypted_part = triple_des_encrypt(padded_part, session_key, iv)
    hash_value = sha512_hash(iv + encrypted_part)
    private_key = users.get(username, {}).get('private_key')
    signature = rsa_sign(hash_value.encode(), private_key)
    print(f"Sending part {part_index} for {username}: {base64.b64encode(encrypted_part).decode()}")
    emit('file_part', {
        'iv': base64.b64encode(iv).decode(),
        'cipher': base64.b64encode(encrypted_part).decode(),
        'hash': hash_value,
        'sig': signature,
        'part_index': part_index,
        'sender': username,
        'file_name': data.get('file_name', '')
    }, room=room)

@socketio.on('verify_part')
def on_verify_part(data):
    username = data['username']
    room = data['room']
    iv = base64.b64decode(data['iv'])
    cipher = base64.b64decode(data['cipher'])
    hash_value = data['hash']
    signature = data['sig']
    part_index = data['part_index']
    sender = data.get('sender')
    file_name = data.get('file_name', '')
    public_key = users.get(sender, {}).get('public_key')
    if not public_key:
        emit('error', {'msg': 'Không tìm thấy khóa công khai.'})
        return

    computed_hash = sha512_hash(iv + cipher)
    if computed_hash == hash_value and rsa_verify(computed_hash.encode(), signature, public_key):
        if username not in file_parts:
            file_parts[username] = {}
        file_parts[username][part_index] = {'iv': iv, 'cipher': cipher, 'sender': sender, 'file_name': file_name}
        emit('ack', {'part_index': part_index}, room=room)
        if len(file_parts[username]) == 3:
            session_key = users[sender]['session_key']
            try:
                decrypted_parts = [
                    triple_des_decrypt(file_parts[username][i]['cipher'], session_key, file_parts[username][i]['iv'])
                    for i in range(3)
                ]
                full_content = ''.join(decrypted_parts)
                with open('contract.txt', 'w', encoding='utf-8') as f:
                    f.write(full_content)
                print(f"File decrypted and saved for {username} from {sender}: {full_content}")
                emit('file_decrypted', {
                    'content': full_content,
                    'username': username,
                    'cipher': [base64.b64encode(file_parts[username][i]['cipher']).decode() for i in range(3)],
                    'iv': [base64.b64encode(file_parts[username][i]['iv']).decode() for i in range(3)],
                    'file_name': file_name,
                    'sender_username': sender
                }, room=username)
            except Exception as e:
                print(f"Error decrypting file for {username}: {e}")
                emit('error', {'msg': f'Lỗi giải mã file: {str(e)}'}, room=username)
    else:
        emit('nack', {'msg': 'Lỗi toàn vẹn dữ liệu.', 'part_index': part_index}, room=room)

if __name__ == '__main__':
    socketio.run(app, debug=True)