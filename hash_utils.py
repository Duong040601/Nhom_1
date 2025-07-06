from Crypto.Hash import SHA512

def sha512_hash(data):
    h = SHA512.new()
    h.update(data)
    return h.hexdigest()