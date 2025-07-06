from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA512
import base64

def generate_key_pair():
    key = RSA.generate(2048)
    private_key = key.export_key()
    public_key = key.publickey().export_key()
    return private_key, public_key

def rsa_encrypt(data, public_key):
    key = RSA.import_key(public_key)
    cipher = PKCS1_v1_5.new(key)
    ciphertext = cipher.encrypt(data)
    return base64.b64encode(ciphertext).decode()

def rsa_decrypt(ciphertext, private_key):
    key = RSA.import_key(private_key)
    cipher = PKCS1_v1_5.new(key)
    data = cipher.decrypt(base64.b64decode(ciphertext), None)
    return data

def rsa_sign(data, private_key):
    key = RSA.import_key(private_key)
    h = SHA512.new(data)
    signature = pkcs1_15.new(key).sign(h)
    return base64.b64encode(signature).decode()

def rsa_verify(data, signature, public_key):
    key = RSA.import_key(public_key)
    h = SHA512.new(data)
    try:
        pkcs1_15.new(key).verify(h, base64.b64decode(signature))
        return True
    except (ValueError, TypeError):
        return False