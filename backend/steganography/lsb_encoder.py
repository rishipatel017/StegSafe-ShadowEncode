import numpy as np
from PIL import Image
import io
import struct
import random
import hashlib

class LSBEncoder:
    """
    Least Significant Bit encoder for steganography.
    Supports 1-bit, 2-bit, and 4-bit encoding modes.
    """
    
    def __init__(self):
        self.delimiter = b'<<END>>'
        # Add header to store metadata
        self.header_format = '!BB'  # version (1 byte), bit_depth (1 byte)
        self.header_size = struct.calcsize(self.header_format)
        self.version = 1
    
    def encode(self, image, data, bit_depth=1):
        """
        Encode data into image using LSB steganography.
        
        Args:
            image: PIL Image object
            data: Binary data to encode
            bit_depth: Number of bits to use (1, 2, or 4)
        
        Returns:
            PIL Image with encoded data
        """
        # Convert image to numpy array
        img_array = np.array(image)
        
        # Ensure image is in RGB format
        if len(img_array.shape) == 2:
            img_array = np.stack([img_array] * 3, axis=-1)
        elif img_array.shape[2] == 4:
            img_array = img_array[:, :, :3]  # Remove alpha channel
        
        # Create header with metadata
        header = struct.pack(self.header_format, self.version, bit_depth)
        
        # Add delimiter to data
        data_with_delimiter = data + self.delimiter
        
        # Combine header + data
        final_data = header + data_with_delimiter
        
        # Debug: Log data info
        print(f"LSB Encode - Header size: {len(header)} bytes")
        print(f"LSB Encode - Data length: {len(data)} bytes")
        print(f"LSB Encode - Final data length: {len(final_data)} bytes")
        
        # Convert data to binary
        binary_data = ''.join(format(byte, '08b') for byte in final_data)
        
        # Debug: Log binary data info
        print(f"LSB Encode - Binary data length: {len(binary_data)} bits ({len(binary_data)//8} bytes)")
        
        # Check capacity
        max_capacity = img_array.shape[0] * img_array.shape[1] * img_array.shape[2] * bit_depth
        print(f"LSB Encode - Image capacity: {max_capacity} bits ({max_capacity//8} bytes)")
        
        if len(binary_data) > max_capacity:
            raise ValueError(f"Data too large for image. Max capacity: {max_capacity // 8} bytes")
        
        # Flatten image array for easier processing
        flat_array = img_array.flatten()
        
        # Create a copy to avoid modifying original
        encoded_flat = flat_array.copy()
        
        # Encode data
        data_index = 0
        for i in range(len(encoded_flat)):
            if data_index >= len(binary_data):
                break
            
            # Clear the least significant bits
            pixel_value = encoded_flat[i] & (~((1 << bit_depth) - 1))
            
            # Add data bits
            bits_to_encode = binary_data[data_index:data_index + bit_depth]
            if len(bits_to_encode) < bit_depth:
                bits_to_encode = bits_to_encode.ljust(bit_depth, '0')
            
            pixel_value |= int(bits_to_encode, 2)
            encoded_flat[i] = pixel_value
            data_index += bit_depth
        
        # Verify all data was encoded
        if data_index < len(binary_data):
            print(f"Warning: Only encoded {data_index} of {len(binary_data)} bits")
        
        # Reshape back to original shape
        encoded_array = encoded_flat.reshape(img_array.shape)
        
        # Convert back to PIL Image
        return Image.fromarray(encoded_array.astype(np.uint8))
    
    def decode(self, image):
        """
        Decode data from image using LSB steganography.
        Auto-detects bit depth from header.
        
        Args:
            image: PIL Image object
        
        Returns:
            Decoded binary data or None if no data found
        """
        # Convert image to numpy array
        img_array = np.array(image)
        
        # Ensure image is in RGB format
        if len(img_array.shape) == 2:
            img_array = np.stack([img_array] * 3, axis=-1)
        elif img_array.shape[2] == 4:
            img_array = img_array[:, :, :3]  # Remove alpha channel
        
        # Flatten image array
        flat_array = img_array.flatten()
        
        # First, try to decode with bit depth 1 to read header
        # We need to extract enough bits to read the header
        header_bits_needed = self.header_size * 8
        
        # Try different bit depths to find the correct one
        for test_bit_depth in [1, 2, 4]:
            try:
                # Extract binary data with test bit depth
                binary_data = ''
                bits_needed = header_bits_needed * test_bit_depth
                pixels_needed = (bits_needed + test_bit_depth - 1) // test_bit_depth
                
                for i in range(min(len(flat_array), pixels_needed)):
                    pixel_value = flat_array[i]
                    lsb_bits = pixel_value & ((1 << test_bit_depth) - 1)
                    binary_data += format(lsb_bits, f'0{test_bit_depth}b')
                
                # Convert binary to bytes for header
                header_bytes = bytearray()
                for i in range(0, len(binary_data), 8):
                    if i + 8 > len(binary_data):
                        break
                    byte = binary_data[i:i+8]
                    header_bytes.append(int(byte, 2))
                
                # Try to parse header
                if len(header_bytes) >= self.header_size:
                    version, bit_depth = struct.unpack(self.header_format, bytes(header_bytes[:self.header_size]))
                    if version == self.version and bit_depth in [1, 2, 4]:
                        print(f"LSB Decode - Detected bit depth: {bit_depth}")
                        # Now decode with correct bit depth
                        return self._decode_with_bit_depth(flat_array, bit_depth)
            except:
                continue
        
        print("LSB Decode - Failed to detect valid header")
        return None
    
    def _decode_with_bit_depth(self, flat_array, bit_depth):
        """
        Decode data using specified bit depth.
        
        Args:
            flat_array: Flattened image array
            bit_depth: Bit depth to use
        
        Returns:
            Decoded binary data
        """
        # Calculate maximum pixels we need to check
        # We need enough pixels to get header + max reasonable data size
        max_data_size = 10000  # Limit to 10KB of data to prevent hanging
        max_bits_needed = (self.header_size + len(self.delimiter) + max_data_size) * 8
        max_pixels_needed = (max_bits_needed + bit_depth - 1) // bit_depth
        
        # Limit the array size to prevent hanging
        pixels_to_process = min(len(flat_array), max_pixels_needed)
        
        print(f"LSB Decode - Processing {pixels_to_process} pixels out of {len(flat_array)} total")
        
        # Extract binary data
        binary_data = ''
        for i in range(pixels_to_process):
            pixel_value = flat_array[i]
            # Extract the least significant bits
            lsb_bits = pixel_value & ((1 << bit_depth) - 1)
            binary_data += format(lsb_bits, f'0{bit_depth}b')
        
        # Convert binary to bytes
        decoded_bytes = bytearray()
        for i in range(0, len(binary_data), 8):
            if i + 8 > len(binary_data):
                break
            byte = binary_data[i:i+8]
            decoded_bytes.append(int(byte, 2))
        
        # Find header and delimiter
        decoded_data = bytes(decoded_bytes)
        
        # Skip header
        if len(decoded_data) <= self.header_size:
            return None
        
        # Verify header
        try:
            version, bit_depth_check = struct.unpack(self.header_format, decoded_data[:self.header_size])
            if version != self.version:
                return None
        except:
            return None
        
        # Look for delimiter in remaining data
        data_without_header = decoded_data[self.header_size:]
        delimiter_index = data_without_header.find(self.delimiter)
        
        if delimiter_index == -1:
            return None
        
        return data_without_header[:delimiter_index]
    
    def calculate_capacity(self, image, bit_depth=1):
        """
        Calculate the maximum data capacity for an image.
        
        Args:
            image: PIL Image object
            bit_depth: Number of bits to use
        
        Returns:
            Maximum capacity in bytes
        """
        img_array = np.array(image)
        
        # Ensure image is in RGB format
        if len(img_array.shape) == 2:
            img_array = np.stack([img_array] * 3, axis=-1)
        elif img_array.shape[2] == 4:
            img_array = img_array[:, :, :3]
        
        total_pixels = img_array.shape[0] * img_array.shape[1] * img_array.shape[2]
        total_bits = total_pixels * bit_depth
        total_bytes = total_bits // 8
        
        # Reserve space for header and delimiter
        return total_bytes - self.header_size - len(self.delimiter)
    
    def estimate_quality_loss(self, bit_depth=1):
        """
        Estimate quality loss based on bit depth.
        
        Args:
            bit_depth: Number of bits used for encoding
        
        Returns:
            Estimated quality loss percentage
        """
        quality_loss_map = {
            1: 0.1,   # Minimal quality loss
            2: 0.5,   # Low quality loss
            4: 2.0    # Moderate quality loss
        }
        return quality_loss_map.get(bit_depth, 0.1)