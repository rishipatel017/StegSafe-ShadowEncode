import numpy as np
from PIL import Image
import cv2
from skimage.metrics import peak_signal_noise_ratio as psnr
from skimage.metrics import mean_squared_error as mse
from skimage.metrics import structural_similarity as ssim
import matplotlib.pyplot as plt
import io
import base64

class ImageAnalyzer:
    """
    Comprehensive image analysis for steganography quality assessment.
    """
    
    def __init__(self):
        pass
    
    def analyze(self, original_image, encoded_image):
        """
        Perform comprehensive analysis of steganography quality.
        
        Args:
            original_image: PIL Image (original)
            encoded_image: PIL Image (with hidden data)
        
        Returns:
            Dictionary with all analysis metrics
        """
        # Convert to numpy arrays
        original_array = np.array(original_image)
        encoded_array = np.array(encoded_image)
        
        # Convert both images to RGB format to ensure consistent shape
        if len(original_array.shape) == 3 and original_array.shape[2] == 4:
            original_array = original_array[:, :, :3]  # Remove alpha channel
        elif len(original_array.shape) == 2:
            original_array = np.stack([original_array] * 3, axis=-1)  # Convert to RGB
            
        if len(encoded_array.shape) == 3 and encoded_array.shape[2] == 4:
            encoded_array = encoded_array[:, :, :3]  # Remove alpha channel
        elif len(encoded_array.shape) == 2:
            encoded_array = np.stack([encoded_array] * 3, axis=-1)  # Convert to RGB
        
        # Ensure both arrays have the same shape
        if original_array.shape != encoded_array.shape:
            # Resize encoded image to match original
            encoded_array = np.array(encoded_image.resize(original_image.size))
            # Convert again to RGB in case resize changed format
            if len(encoded_array.shape) == 3 and encoded_array.shape[2] == 4:
                encoded_array = encoded_array[:, :, :3]
            elif len(encoded_array.shape) == 2:
                encoded_array = np.stack([encoded_array] * 3, axis=-1)
        
        # Calculate metrics
        metrics = {}
        
        # PSNR calculation
        metrics['psnr'] = self._calculate_psnr(original_array, encoded_array)
        
        # MSE calculation
        metrics['mse'] = self._calculate_mse(original_array, encoded_array)
        
        # SSIM calculation
        metrics['ssim'] = self._calculate_ssim(original_array, encoded_array)
        
        # File size comparison
        metrics['file_size_impact'] = self._calculate_file_size_impact(original_image, encoded_image)
        
        # Histogram comparison
        metrics['histogram_correlation'] = self._calculate_histogram_correlation(original_array, encoded_array)
        
        # Quality rating
        metrics['quality_rating'] = self._get_quality_rating(metrics['psnr'])
        
        # Generate histogram data
        metrics['histograms'] = self._generate_histogram_data(original_array, encoded_array)
        
        return metrics
    
    def _calculate_psnr(self, original, encoded):
        """
        Calculate Peak Signal-to-Noise Ratio.
        
        Args:
            original: Original image array
            encoded: Encoded image array
        
        Returns:
            PSNR value in dB
        """
        try:
            return psnr(original, encoded, data_range=255)
        except:
            # Fallback calculation
            mse_val = self._calculate_mse(original, encoded)
            if mse_val == 0:
                return float('inf')
            return 20 * np.log10(255.0 / np.sqrt(mse_val))
    
    def _calculate_mse(self, original, encoded):
        """
        Calculate Mean Squared Error.
        
        Args:
            original: Original image array
            encoded: Encoded image array
        
        Returns:
            MSE value
        """
        try:
            return mse(original, encoded)
        except:
            # Manual calculation
            return np.mean((original.astype(float) - encoded.astype(float)) ** 2)
    
    def _calculate_ssim(self, original, encoded):
        """
        Calculate Structural Similarity Index.
        
        Args:
            original: Original image array
            encoded: Encoded image array
        
        Returns:
            SSIM value (0-1)
        """
        try:
            # For color images, calculate SSIM for each channel and average
            if len(original.shape) == 3:
                ssim_values = []
                for i in range(original.shape[2]):
                    ssim_val = ssim(original[:, :, i], encoded[:, :, i], data_range=255)
                    ssim_values.append(ssim_val)
                return np.mean(ssim_values)
            else:
                return ssim(original, encoded, data_range=255)
        except:
            # Return None if calculation fails
            return None
    
    def _calculate_file_size_impact(self, original_image, encoded_image):
        """
        Calculate file size impact of encoding.
        
        Args:
            original_image: Original PIL Image
            encoded_image: Encoded PIL Image
        
        Returns:
            Dictionary with size information
        """
        # Save to bytes to get actual file sizes
        original_bytes = io.BytesIO()
        encoded_bytes = io.BytesIO()
        
        original_image.save(original_bytes, format='PNG')
        encoded_image.save(encoded_bytes, format='PNG')
        
        original_size = original_bytes.tell()
        encoded_size = encoded_bytes.tell()
        
        size_increase = encoded_size - original_size
        percentage_increase = (size_increase / original_size) * 100 if original_size > 0 else 0
        
        return {
            'original_size': original_size,
            'encoded_size': encoded_size,
            'size_increase': size_increase,
            'percentage_increase': percentage_increase
        }
    
    def _calculate_histogram_correlation(self, original, encoded):
        """
        Calculate histogram correlation between images.
        
        Args:
            original: Original image array
            encoded: Encoded image array
        
        Returns:
            Correlation coefficients for each channel
        """
        correlations = {}
        
        if len(original.shape) == 3:
            channels = ['Red', 'Green', 'Blue']
            for i, channel in enumerate(channels):
                orig_hist = cv2.calcHist([original], [i], None, [256], [0, 256])
                enc_hist = cv2.calcHist([encoded], [i], None, [256], [0, 256])
                
                # Normalize histograms
                orig_hist = orig_hist.flatten() / orig_hist.sum()
                enc_hist = enc_hist.flatten() / enc_hist.sum()
                
                # Calculate correlation
                correlation = np.corrcoef(orig_hist, enc_hist)[0, 1]
                correlations[channel.lower()] = correlation
        else:
            # Grayscale image
            orig_hist = cv2.calcHist([original], [0], None, [256], [0, 256])
            enc_hist = cv2.calcHist([encoded], [0], None, [256], [0, 256])
            
            orig_hist = orig_hist.flatten() / orig_hist.sum()
            enc_hist = enc_hist.flatten() / enc_hist.sum()
            
            correlation = np.corrcoef(orig_hist, enc_hist)[0, 1]
            correlations['gray'] = correlation
        
        return correlations
    
    def _generate_histogram_data(self, original, encoded):
        """
        Generate histogram data for visualization.
        
        Args:
            original: Original image array
            encoded: Encoded image array
        
        Returns:
            Dictionary with histogram data
        """
        histograms = {}
        
        if len(original.shape) == 3:
            channels = ['Red', 'Green', 'Blue']
            for i, channel in enumerate(channels):
                orig_hist = cv2.calcHist([original], [i], None, [256], [0, 256])
                enc_hist = cv2.calcHist([encoded], [i], None, [256], [0, 256])
                
                histograms[channel.lower()] = {
                    'original': orig_hist.flatten().tolist(),
                    'encoded': enc_hist.flatten().tolist()
                }
        else:
            # Grayscale image
            orig_hist = cv2.calcHist([original], [0], None, [256], [0, 256])
            enc_hist = cv2.calcHist([encoded], [0], None, [256], [0, 256])
            
            histograms['gray'] = {
                'original': orig_hist.flatten().tolist(),
                'encoded': enc_hist.flatten().tolist()
            }
        
        return histograms
    
    def _get_quality_rating(self, psnr_value):
        """
        Get quality rating based on PSNR value.
        
        Args:
            psnr_value: PSNR value in dB
        
        Returns:
            Quality rating string
        """
        if psnr_value == float('inf'):
            return 'Perfect'
        elif psnr_value >= 40:
            return 'Excellent'
        elif psnr_value >= 30:
            return 'Good'
        elif psnr_value >= 20:
            return 'Fair'
        else:
            return 'Poor'
    
    def generate_difference_image(self, original_image, encoded_image):
        """
        Generate a difference visualization between images.
        
        Args:
            original_image: Original PIL Image
            encoded_image: Encoded PIL Image
        
        Returns:
            Base64 encoded difference image
        """
        # Convert to numpy arrays
        original_array = np.array(original_image)
        encoded_array = np.array(encoded_image)
        
        # Convert both images to RGB format to ensure consistent shape
        if len(original_array.shape) == 3 and original_array.shape[2] == 4:
            original_array = original_array[:, :, :3]  # Remove alpha channel
        elif len(original_array.shape) == 2:
            original_array = np.stack([original_array] * 3, axis=-1)  # Convert to RGB
            
        if len(encoded_array.shape) == 3 and encoded_array.shape[2] == 4:
            encoded_array = encoded_array[:, :, :3]  # Remove alpha channel
        elif len(encoded_array.shape) == 2:
            encoded_array = np.stack([encoded_array] * 3, axis=-1)  # Convert to RGB
        
        # Ensure same shape
        if original_array.shape != encoded_array.shape:
            encoded_array = np.array(encoded_image.resize(original_image.size))
            # Convert again to RGB in case resize changed format
            if len(encoded_array.shape) == 3 and encoded_array.shape[2] == 4:
                encoded_array = encoded_array[:, :, :3]
            elif len(encoded_array.shape) == 2:
                encoded_array = np.stack([encoded_array] * 3, axis=-1)
        
        # Calculate absolute difference
        difference = np.abs(original_array.astype(float) - encoded_array.astype(float))
        
        # Enhance difference for visibility
        difference = np.clip(difference * 10, 0, 255).astype(np.uint8)
        
        # Convert to PIL Image
        diff_image = Image.fromarray(difference)
        
        # Convert to base64
        buffer = io.BytesIO()
        diff_image.save(buffer, format='PNG')
        diff_str = base64.b64encode(buffer.getvalue()).decode()
        
        return diff_str
    
    def analyze_capacity(self, image, bit_depth=1):
        """
        Analyze data capacity of an image.
        
        Args:
            image: PIL Image
            bit_depth: Number of bits for LSB encoding
        
        Returns:
            Capacity information
        """
        from steganography.lsb_encoder import LSBEncoder
        
        encoder = LSBEncoder()
        max_capacity = encoder.calculate_capacity(image, bit_depth)
        
        return {
            'max_capacity_bytes': max_capacity,
            'max_capacity_chars': max_capacity,
            'bit_depth': bit_depth,
            'image_size': image.size,
            'total_pixels': image.size[0] * image.size[1]
        }
