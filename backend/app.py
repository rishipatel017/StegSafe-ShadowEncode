from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
import base64
import io
from PIL import Image
import numpy as np
import json

# Import our custom modules
from steganography.lsb_encoder import LSBEncoder
from crypto.aes_cipher import AESCipher
from analysis.image_analyzer import ImageAnalyzer

app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()

# Allowed extensions
ALLOWED_EXTENSIONS = {'png', 'bmp', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'StegSafe API'})

@app.route('/api/encode', methods=['POST'])
def encode_message():
    try:
        print("=== ENCODE REQUEST START ===")
        
        # Check if file is present
        if 'image' not in request.files:
            print("ERROR: No image file provided")
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        print(f"File received: {file.filename}")
        
        if file.filename == '':
            print("ERROR: No file selected")
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            print(f"ERROR: File type not supported: {file.filename}")
            return jsonify({'error': 'File type not supported'}), 400
        
        # Get parameters
        message = request.form.get('message', '')
        password = request.form.get('password', '')
        bit_depth = int(request.form.get('bit_depth', 1))
        
        print(f"Message: {message}")
        print(f"Password provided: {'YES' if password else 'NO'}")
        print(f"Bit depth: {bit_depth}")
        
        if not message:
            print("ERROR: Message cannot be empty")
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        if not password:
            print("ERROR: Password cannot be empty")
            return jsonify({'error': 'Password cannot be empty'}), 400
        
        if bit_depth not in [1, 2, 4]:
            print("ERROR: Bit depth must be 1, 2, or 4")
            return jsonify({'error': 'Bit depth must be 1, 2, or 4'}), 400
        
        # Reset file stream to beginning
        file.stream.seek(0)
        
        # Load image
        image = Image.open(file.stream)
        
        # Encrypt message
        cipher = AESCipher(password)
        encrypted_data = cipher.encrypt(message)
        
        # Debug: Log encrypted data info
        print(f"Original message: {message}")
        print(f"Encrypted data length: {len(encrypted_data)} characters")
        
        # Convert base64 string back to bytes for LSB encoding
        encrypted_bytes = base64.b64decode(encrypted_data)
        
        # Debug: Log bytes info
        print(f"Decoded bytes length: {len(encrypted_bytes)} bytes")
        print(f"Decoded bytes (first 50): {encrypted_bytes[:50]}")
        
        # Encode using LSB
        encoder = LSBEncoder()
        encoded_image = encoder.encode(image, encrypted_bytes, bit_depth)
        
        # Calculate metrics
        analyzer = ImageAnalyzer()
        metrics = analyzer.analyze(image, encoded_image)
        
        # Convert to base64 for response
        buffer = io.BytesIO()
        encoded_image.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'encoded_image': img_str,
            'metrics': metrics,
            'original_size': len(file.read()),
            'encoded_size': len(buffer.getvalue())
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/decode', methods=['POST'])
def decode_message():
    try:
        print("=== DECODE REQUEST START ===")
        
        # Check if file is present
        if 'image' not in request.files:
            print("ERROR: No image file provided")
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        print(f"File received: {file.filename}")
        
        if file.filename == '':
            print("ERROR: No file selected")
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            print(f"ERROR: File type not supported: {file.filename}")
            return jsonify({'error': 'File type not supported'}), 400
        
        # Get parameters
        password = request.form.get('password', '')
        bit_depth = int(request.form.get('bit_depth', 1))
        
        print(f"Password provided: {'YES' if password else 'NO'}")
        print(f"Bit depth: {bit_depth}")
        
        if not password:
            print("ERROR: Password cannot be empty")
            return jsonify({'error': 'Password cannot be empty'}), 400
        
        # Reset file stream to beginning
        file.stream.seek(0)
        
        # Load image
        image = Image.open(file.stream)
        
        # Extract using LSB
        encoder = LSBEncoder()
        encrypted_data = encoder.decode(image)
        
        if not encrypted_data:
            return jsonify({'error': 'No hidden message found or incorrect password'}), 400
        
        # Debug: Log the length of extracted data
        print(f"Extracted data length: {len(encrypted_data)} bytes")
        
        # Convert bytes to base64 for decryption
        encrypted_base64 = base64.b64encode(encrypted_data).decode('utf-8')
        
        # Decrypt message
        cipher = AESCipher(password)
        try:
            message = cipher.decrypt(encrypted_base64)
            print(f"SUCCESS: Decrypted message: '{message}'")
        except Exception as e:
            print(f"DECRYPT FAILED: {str(e)}")
            return jsonify({'error': f'Incorrect password or corrupted data: {str(e)}'}), 400
        
        response_data = {
            'success': True,
            'message': message
        }
        
        print(f"Backend: Returning response: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/diagnose', methods=['POST'])
def diagnose_image():
    """Diagnose an image for steganography content"""
    try:
        # Check if file is present
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not supported'}), 400
        
        # Load image
        image = Image.open(file.stream)
        
        # Get image info
        image_info = {
            'size': image.size,
            'mode': image.mode,
            'format': image.format
        }
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
            image_info['converted_to_rgb'] = True
        
        # Analyze with LSB encoder
        encoder = LSBEncoder()
        
        # Try to decode
        result = encoder.decode(image)
        
        diagnosis = {
            'success': True,
            'image_info': image_info,
            'has_encoded_data': result is not None,
            'decoded_data_size': len(result) if result else 0,
            'message': 'Image contains valid encoded data' if result else 'No valid encoded data found'
        }
        
        if result:
            diagnosis['data_preview'] = result[:50].hex() if isinstance(result, bytes) else str(result)[:50]
        
        return jsonify(diagnosis)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_images():
    try:
        # Get original and encoded images
        if 'original' not in request.files or 'encoded' not in request.files:
            return jsonify({'error': 'Both original and encoded images required'}), 400
        
        original_file = request.files['original']
        encoded_file = request.files['encoded']
        
        if not (allowed_file(original_file.filename) and allowed_file(encoded_file.filename)):
            return jsonify({'error': 'File type not supported'}), 400
        
        # Load images
        original_image = Image.open(original_file.stream)
        encoded_image = Image.open(encoded_file.stream)
        
        # Analyze
        analyzer = ImageAnalyzer()
        metrics = analyzer.analyze(original_image, encoded_image)
        
        return jsonify({
            'success': True,
            'metrics': metrics
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch/encode', methods=['POST'])
def batch_encode():
    try:
        print("=== BATCH ENCODE REQUEST START ===")
        
        # Get multiple files
        files = request.files.getlist('images')
        message = request.form.get('message', '')
        password = request.form.get('password', '')
        bit_depth = int(request.form.get('bit_depth', 1))
        
        print(f"Files received: {len(files)}")
        print(f"Message: {message}")
        print(f"Password provided: {'YES' if password else 'NO'}")
        print(f"Bit depth: {bit_depth}")
        
        if len(files) == 0:
            print("ERROR: No images provided")
            return jsonify({'error': 'No images provided'}), 400
        
        if len(files) > 20:
            print("ERROR: Too many images")
            return jsonify({'error': 'Maximum 20 images allowed'}), 400
        
        if not message or not password:
            print("ERROR: Missing message or password")
            return jsonify({'error': 'Message and password required'}), 400
        
        # Encrypt message once
        cipher = AESCipher(password)
        encrypted_data = cipher.encrypt(message)
        
        # Convert base64 string back to bytes for LSB encoding
        encrypted_bytes = base64.b64decode(encrypted_data)
        
        results = []
        encoder = LSBEncoder()
        analyzer = ImageAnalyzer()
        
        for i, file in enumerate(files):
            print(f"Processing file {i+1}/{len(files)}: {file.filename}")
            
            if not allowed_file(file.filename):
                print(f"Skipping invalid file: {file.filename}")
                continue
                
            try:
                # Reset file stream to beginning
                file.stream.seek(0)
                
                # Load and encode
                image = Image.open(file.stream)
                encoded_image = encoder.encode(image, encrypted_bytes, bit_depth)
                
                # Calculate metrics
                metrics = analyzer.analyze(image, encoded_image)
                
                # Remove histogram data from batch responses to prevent hanging
                if 'histograms' in metrics:
                    metrics['histograms'] = {'removed': 'Histogram data removed for batch performance'}
                
                # Convert to base64
                buffer = io.BytesIO()
                encoded_image.save(buffer, format='PNG')
                img_str = base64.b64encode(buffer.getvalue()).decode()
                
                # Check if response is getting too large (limit to ~10MB total)
                if len(img_str) > 5000000:  # 5MB per image limit
                    print(f"WARNING: {file.filename} encoded image too large, skipping image data")
                    result = {
                        'filename': file.filename,
                        'success': True,
                        'encoded_image': None,  # Don't include large image
                        'metrics': metrics,
                        'warning': 'Encoded image too large for batch response'
                    }
                else:
                    result = {
                        'filename': file.filename,
                        'success': True,
                        'encoded_image': img_str,
                        'metrics': metrics
                    }
                results.append(result)
                print(f"SUCCESS: {file.filename}")
                
                # Check total response size
                total_size = sum(len(str(r.get('encoded_image', ''))) for r in results)
                if total_size > 10000000:  # 10MB total limit
                    print(f"WARNING: Total response size too large, stopping batch processing")
                    break
                
            except Exception as e:
                error_msg = str(e)
                print(f"ERROR processing {file.filename}: {error_msg}")
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': error_msg
                })
        
        response_data = {
            'success': True,
            'results': results,
            'total_processed': len(results)
        }
        
        print(f"Batch encode completed. Success: {len([r for r in results if r['success']])}, Failed: {len([r for r in results if not r['success']])}")
        print(f"Response structure created with {len(results)} results")
        
        # Log response size
        import json
        response_json = json.dumps(response_data)
        print(f"Final response size: {len(response_json)} characters")
        
        print(f"Returning response...")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"BATCH ENCODE ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch/decode', methods=['POST'])
def batch_decode():
    try:
        # Get multiple files
        files = request.files.getlist('images')
        password = request.form.get('password', '')
        bit_depth = int(request.form.get('bit_depth', 1))
        
        if len(files) == 0:
            return jsonify({'error': 'No images provided'}), 400
        
        if len(files) > 20:
            return jsonify({'error': 'Maximum 20 images allowed'}), 400
        
        if not password:
            return jsonify({'error': 'Password required'}), 400
        
        results = []
        encoder = LSBEncoder()
        cipher = AESCipher(password)
        
        for file in files:
            if not allowed_file(file.filename):
                continue
                
            try:
                # Reset file stream to beginning
                file.stream.seek(0)
                
                # Load and decode
                image = Image.open(file.stream)
                encrypted_data = encoder.decode(image)
                
                if encrypted_data:
                    # Convert bytes to base64 for decryption
                    encrypted_base64 = base64.b64encode(encrypted_data).decode('utf-8')
                    message = cipher.decrypt(encrypted_base64)
                    results.append({
                        'filename': file.filename,
                        'success': True,
                        'message': message
                    })
                else:
                    results.append({
                        'filename': file.filename,
                        'success': False,
                        'error': 'No hidden message found'
                    })
                    
            except Exception as e:
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'results': results,
            'total_processed': len(results)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
