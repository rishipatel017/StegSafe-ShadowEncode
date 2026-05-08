import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  CloudUpload,
  Lock,
  Visibility,
  VisibilityOff,
  Download,
  Analytics
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { steganographyAPI, EncodeResponse } from '../services/api';
import ImageComparison from './ImageComparison';
import MetricsPanel from './MetricsPanel';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const EncodeTab: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [encodedImage, setEncodedImage] = useState<string>('');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bitDepth, setBitDepth] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [metrics, setMetrics] = useState<any>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: 'Weak',
    color: 'error'
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.bmp', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles) => {
      console.log('EncodeTab: Files dropped:', acceptedFiles);
      
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setOriginalImage(file);
        const url = URL.createObjectURL(file);
        setOriginalImageUrl(url);
        setEncodedImage('');
        setMetrics(null);
        setError('');
        setSuccess('');
        
        console.log('EncodeTab: File set:', file.name);
      }
    }
  });

  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    
    // Length checks
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;
    
    // Character variety
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;
    
    const strengthMap = [
      { score: 0, label: 'Very Weak', color: 'error' },
      { score: 1, label: 'Weak', color: 'error' },
      { score: 2, label: 'Fair', color: 'warning' },
      { score: 3, label: 'Good', color: 'info' },
      { score: 4, label: 'Strong', color: 'success' },
      { score: 5, label: 'Strong', color: 'success' },
      { score: 6, label: 'Very Strong', color: 'success' },
      { score: 7, label: 'Excellent', color: 'success' }
    ];
    
    const strength = strengthMap[Math.min(score, 7)];
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    calculatePasswordStrength(pwd);
  };

  const handleEncode = async () => {
    if (!originalImage) {
      setError('Please select an image');
      return;
    }
    
    if (!message.trim()) {
      setError('Please enter a message to hide');
      return;
    }
    
    if (!password) {
      setError('Please enter a password');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response: EncodeResponse = await steganographyAPI.encode(
        originalImage,
        message,
        password,
        bitDepth
      );

      if (response.success && response.encoded_image) {
        setEncodedImage(`data:image/png;base64,${response.encoded_image}`);
        setMetrics(response.metrics);
        setSuccess('Message successfully encoded in image!');
      } else {
        setError(response.error || 'Encoding failed');
      }
    } catch (err: any) {
      setError(err.message || 'Encoding failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (encodedImage) {
      const link = document.createElement('a');
      link.href = encodedImage;
      link.download = 'encoded_image.png';
      link.click();
    }
  };

  const handleClear = () => {
    setOriginalImage(null);
    setOriginalImageUrl('');
    setEncodedImage('');
    setMessage('');
    setPassword('');
    setMetrics(null);
    setError('');
    setSuccess('');
  };

  const getMessageCharCount = () => {
    return message.length;
  };

  const getEstimatedCapacity = () => {
    if (!originalImage) return 'N/A';
    
    // Create a temporary image to get dimensions
    const img = new Image();
    img.onload = function() {
      // Rough estimation: width * height * 3 channels * bit_depth / 8 bytes
      const estimatedSize = Math.floor((img.width * img.height * 3 * bitDepth) / 8);
      return `${estimatedSize} bytes`;
    };
    img.onerror = function() {
      return 'N/A';
    };
    img.src = originalImageUrl;
    
    return 'Loading...';
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Image Upload Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Original Image
            </Typography>
            
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.500',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragActive ? 'action.hover' : 'transparent',
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'grey.500', mb: 2 }} />
              <Typography variant="body1" color="textSecondary">
                {isDragActive ? 'Drop image here' : 'Drag & drop image or click to select'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                PNG, BMP, JPEG (Max 50MB)
              </Typography>
            </Box>

            {originalImageUrl && (
              <Box sx={{ mt: 2 }}>
                <img
                  src={originalImageUrl}
                  alt="Original"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }}
                />
                <Typography variant="caption" display="block" mt={1}>
                  {originalImage?.name} ({(originalImage?.size || 0) / 1024} KB)
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Message and Controls Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Message & Settings
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Secret Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              margin="normal"
              helperText={`${getMessageCharCount()} characters`}
            />

            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Password"
              value={password}
              onChange={handlePasswordChange}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <Button onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </Button>
                ),
              }}
            />

            {/* Password Strength Indicator */}
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Password Strength: {passwordStrength.label}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(passwordStrength.score / 7) * 100}
                color={passwordStrength.color as any}
                sx={{ mt: 0.5 }}
              />
            </Box>

            <FormControl fullWidth margin="normal">
              <InputLabel>Bit Depth</InputLabel>
              <Select
                value={bitDepth}
                onChange={(e) => setBitDepth(Number(e.target.value))}
              >
                <MenuItem value={1}>1-bit (Most Secure)</MenuItem>
                <MenuItem value={2}>2-bit (Balanced)</MenuItem>
                <MenuItem value={4}>4-bit (Maximum Capacity)</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="caption" color="textSecondary" display="block" mt={1}>
              Estimated Capacity: {getEstimatedCapacity()}
            </Typography>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleEncode}
                disabled={loading || !originalImage || !message || !password}
                startIcon={loading ? <CircularProgress size={20} /> : <Lock />}
                fullWidth
              >
                {loading ? 'Encoding...' : 'Encode Message'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleClear}
                fullWidth
              >
                Clear
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Results Section */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        {success && (
          <Grid item xs={12}>
            <Alert severity="success">{success}</Alert>
          </Grid>
        )}

        {encodedImage && (
          <>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Encoded Image
                </Typography>
                <img
                  src={encodedImage}
                  alt="Encoded"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }}
                />
                <Button
                  variant="contained"
                  onClick={handleDownload}
                  startIcon={<Download />}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Download Encoded Image
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <MetricsPanel metrics={metrics} />
            </Grid>

            <Grid item xs={12}>
              <ImageComparison
                originalImage={originalImageUrl}
                encodedImage={encodedImage}
              />
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
};

export default EncodeTab;
