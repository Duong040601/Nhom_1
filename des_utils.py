from Crypto.Cipher import DES3
from Crypto.Util.Padding import pad, unpad
import base64

def triple_des_encrypt(data, key, iv):
    try:
        cipher = DES3.new(key, DES3.MODE_CBC, iv)
        ct_bytes = cipher.encrypt(pad(data, DES3.block_size))
        return ct_bytes
    except Exception as e:
        print(f"Encryption error: {e}")
        raise

def triple_des_decrypt(ciphertext, key, iv):
    try:
        cipher = DES3.new(key, DES3.MODE_CBC, iv)
        pt = unpad(cipher.decrypt(ciphertext), DES3.block_size)
        return pt.decode('utf-8')
    except Exception as e:
        print(f"Decryption error: {e}")
        raise