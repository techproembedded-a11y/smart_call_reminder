import base64
from py_vapid import Vapid
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, PrivateFormat, NoEncryption

def generate():
    vapid = Vapid()
    vapid.generate_keys()
    
    pub_bytes = vapid.public_key.public_bytes(
        encoding=Encoding.X962,
        format=PublicFormat.UncompressedPoint
    )
    b64_pub = base64.urlsafe_b64encode(pub_bytes).decode('utf-8').rstrip('=')

    priv_pem = vapid.private_key.private_bytes(
        encoding=Encoding.PEM,
        format=PrivateFormat.PKCS8,
        encryption_algorithm=NoEncryption()
    ).decode('utf-8')

    pem_single_line = priv_pem.replace('\n', '\\n')
    print("=== NEW VAPID KEYPAIR ===")
    print(f"VAPID_PUBLIC_KEY={b64_pub}")
    print(f"VAPID_PRIVATE_KEY={pem_single_line}")
    print("=========================")

if __name__ == "__main__":
    generate()
