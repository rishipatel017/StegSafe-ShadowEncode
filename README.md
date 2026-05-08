# StegSafe - Advanced Steganography Tool

A sophisticated web-based steganography tool that combines AES encryption with LSB encoding to provide secure data concealment within digital images.

## Features

- **Military-grade Encryption**: AES-256 with PBKDF2 key derivation
- **LSB Steganography**: 1-bit, 2-bit, and 4-bit encoding options
- **Visual Analysis**: PSNR calculation, histograms, side-by-side comparison
- **Batch Processing**: Handle multiple images simultaneously
- **Modern UI**: React-based responsive interface

## Architecture

```
├── backend/          # Flask API server
├── frontend/         # React application
├── docker/           # Docker configurations
└── docs/            # Documentation
```

## Quick Start

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
py app.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Docker Deployment
```bash
docker-compose up -d
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Material-UI, Chart.js
- **Backend**: Python Flask, Pillow, NumPy, PyCryptodome
- **Security**: AES-256-GCM, PBKDF2, ChaCha20-Poly1305
- **Deployment**: Docker, AWS/GCP/Azure

## Security Features

- Client-side and server-side encryption options
- Password strength validation
- Secure key derivation
- No data storage (stateless operation)

## Supported Formats

- PNG (recommended for lossless steganography)
- BMP (uncompressed)
- JPEG (with quality preservation)

## API Endpoints

- `POST /api/encode` - Hide message in image
- `POST /api/decode` - Extract message from image
- `POST /api/analyze` - Calculate image metrics
- `POST /api/batch/encode` - Batch encoding
- `POST /api/batch/decode` - Batch decoding

## License

MIT License - see LICENSE file for details
