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
  Alert,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CloudUpload,
  Lock,
  Visibility,
  VisibilityOff,
  Security,
  ContentCopy,
  Download
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { steganographyAPI, DecodeResponse } from '../services/api';

interface DecodedMessage {
  message: string;
  timestamp: string;
  filename: string;
}

const DecodeTab: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bitDepth, setBitDepth] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [decodedMessage, setDecodedMessage] = useState<DecodedMessage | null>(null);
  const [decodedHistory, setDecodedHistory] = useState<DecodedMessage[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.bmp', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles) => {
      console.log('DecodeTab: Files dropped:', acceptedFiles);
      
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setImage(file);
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setDecodedMessage(null);
        setError('');
        
        console.log('DecodeTab: File set:', file.name);
      }
    }
  });

  const handleDecode = async () => {
    if (!image) {
      setError('Please select an image');
      return;
    }
    
    if (!password) {
      setError('Please enter the password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Starting decode with:', { image: image.name, password: '***', bitDepth });
      
      const response: DecodeResponse = await steganographyAPI.decode(
        image,
        password,
        bitDepth
      );

      console.log('Decode response:', response);

      if (response.success && response.message) {
        const newDecoded: DecodedMessage = {
          message: response.message,
          timestamp: new Date().toISOString(),
          filename: image.name
        };
        
        console.log('Setting decoded message:', newDecoded);
        setDecodedMessage(newDecoded);
        setDecodedHistory(prev => [newDecoded, ...prev.slice(0, 9)]); // Keep last 10
      } else {
        console.log('Decode failed:', response);
        setError(response.error || 'No hidden message found or incorrect password');
      }
    } catch (err: any) {
      console.log('Decode error:', err);
      setError(err.message || 'Decoding failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
  };

  const handleDownloadMessage = (message: string, filename: string) => {
    const blob = new Blob([message], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `decoded_message_${filename.replace(/\.[^/.]+$/, '')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setImage(null);
    setImageUrl('');
    setPassword('');
    setDecodedMessage(null);
    setError('');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Image Upload Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Encoded Image
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

            {imageUrl && (
              <Box sx={{ mt: 2 }}>
                <img
                  src={imageUrl}
                  alt="Encoded"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }}
                />
                <Typography variant="caption" display="block" mt={1}>
                  {image?.name} ({(image?.size || 0) / 1024} KB)
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Controls Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Decoding Settings
            </Typography>

            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              helperText="Enter the password used for encoding"
              InputProps={{
                endAdornment: (
                  <Button onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </Button>
                ),
              }}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Bit Depth</InputLabel>
              <Select
                value={bitDepth}
                onChange={(e) => setBitDepth(Number(e.target.value))}
              >
                <MenuItem value={1}>1-bit</MenuItem>
                <MenuItem value={2}>2-bit</MenuItem>
                <MenuItem value={4}>4-bit</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="caption" color="textSecondary" display="block" mt={1}>
              Use the same bit depth that was used for encoding
            </Typography>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleDecode}
                disabled={loading || !image || !password}
                startIcon={loading ? <CircularProgress size={20} /> : <Security />}
                fullWidth
              >
                {loading ? 'Decoding...' : 'Decode Message'}
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

        {/* Error Display */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        {/* Decoded Message Display */}
        {decodedMessage && (
          <Grid item xs={12}>
            <Card sx={{ backgroundColor: 'background.default' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Security sx={{ mr: 1, color: 'success.main' }} />
                  Successfully Decoded Message
                </Typography>
                
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: 'background.paper', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                    {decodedMessage.message}
                  </Typography>
                </Box>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Tooltip title="Copy to clipboard">
                    <IconButton 
                      onClick={() => handleCopyMessage(decodedMessage.message)}
                      color="primary"
                    >
                      <ContentCopy />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download as text file">
                    <IconButton 
                      onClick={() => handleDownloadMessage(decodedMessage.message, decodedMessage.filename)}
                      color="primary"
                    >
                      <Download />
                    </IconButton>
                  </Tooltip>
                  <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
                    {decodedMessage.filename} • {formatTimestamp(decodedMessage.timestamp)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Decoding History */}
        {decodedHistory.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Decodings
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {decodedHistory.map((decoded, index) => (
                  <Card key={index} sx={{ backgroundColor: 'background.default' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, mr: 2 }}>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                            {decoded.message.length > 100 
                              ? decoded.message.substring(0, 100) + '...' 
                              : decoded.message}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {decoded.filename} • {formatTimestamp(decoded.timestamp)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Copy to clipboard">
                            <IconButton 
                              size="small"
                              onClick={() => handleCopyMessage(decoded.message)}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download as text file">
                            <IconButton 
                              size="small"
                              onClick={() => handleDownloadMessage(decoded.message, decoded.filename)}
                            >
                              <Download fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default DecodeTab;
