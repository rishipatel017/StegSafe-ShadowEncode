import os
import hashlib
import base64
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad

class AESCipher:
    """
    AES encryption/decryption with PBKDF2 key derivation.
    Supports AES-256-GCM mode for authenticated encryption.
    """
    
    def __init__(self, password, salt=None):
        """
        Initialize cipher with password.
        
        Args:
            password: User password for key derivation
            salt: Optional salt (generated if not provided)
        """
        if not password:
            raise ValueError("Password cannot be empty")
        
        self.password = password.encode('utf-8')
        self.salt = salt.encode('utf-8') if isinstance(salt, str) else (salt if salt else get_random_bytes(16))
        self.key = self._derive_key()
        self.tag_length = 16
        self.nonce_length = 12
        self.salt_length = 16
    
    def _derive_key(self):
        """
        Derive encryption key from password using PBKDF2.
        
        Returns:
            32-byte key for AES-256
        """
        return PBKDF2(self.password, self.salt, dkLen=32, count=100000)
    
    def encrypt(self, data):
        """
        Encrypt data using AES-256-GCM.
        
        Args:
            data: Data to encrypt (string or bytes)
        
        Returns:
            Base64 encoded encrypted data with salt and nonce
        """
        if isinstance(data, str):
            data = data.encode('utf-8')
        
        # Generate random nonce
        nonce = get_random_bytes(self.nonce_length)
        
        # Create cipher
        cipher = AES.new(self.key, AES.MODE_GCM, nonce=nonce)
        
        # Encrypt data
        ciphertext, tag = cipher.encrypt_and_digest(data)
        
        # Verify tag length
        if len(tag) != self.tag_length:
            raise ValueError(f"Tag length mismatch: {len(tag)} vs {self.tag_length}")
        
        # Combine salt, nonce, tag, and ciphertext
        encrypted_data = self.salt + nonce + tag + ciphertext
        
        return base64.b64encode(encrypted_data).decode('utf-8')
    
    def decrypt(self, encrypted_data):
        """
        Decrypt data using AES-256-GCM.
        
        Args:
            encrypted_data: Base64 encoded encrypted data
        
        Returns:
            Decrypted data as string
        """
        try:
            # Decode base64
            data = base64.b64decode(encrypted_data)
            
            # Check minimum length
            min_length = self.salt_length + self.nonce_length + self.tag_length
            if len(data) < min_length:
                raise ValueError(f"Encrypted data too short: {len(data)} < {min_length}")
            
            # Extract components
            salt = data[:self.salt_length]
            nonce = data[self.salt_length:self.salt_length + self.nonce_length]
            tag = data[self.salt_length + self.nonce_length:self.salt_length + self.nonce_length + self.tag_length]
            ciphertext = data[self.salt_length + self.nonce_length + self.tag_length:]
            
            # Derive key with extracted salt
            temp_key = PBKDF2(self.password, salt, dkLen=32, count=100000)
            
            # Create cipher and decrypt
            cipher = AES.new(temp_key, AES.MODE_GCM, nonce=nonce)
            decrypted_data = cipher.decrypt_and_verify(ciphertext, tag)
            
            return decrypted_data.decode('utf-8')
            
        except Exception as e:
            raise ValueError(f"Decryption failed: {type(e).__name__}: {str(e)}")