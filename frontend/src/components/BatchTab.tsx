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
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CloudUpload,
  Lock,
  Visibility,
  VisibilityOff,
  BatchPrediction,
  Download,
  ExpandMore,
  CheckCircle,
  Error,
  Info
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { steganographyAPI, BatchEncodeResponse, BatchDecodeResponse } from '../services/api';

interface BatchResult {
  filename: string;
  success: boolean;
  encoded_image?: string;
  message?: string;
  error?: string;
  metrics?: any;
}

const BatchTab: React.FC = () => {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bitDepth, setBitDepth] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [results, setResults] = useState<BatchResult[]>([]);
  const [progress, setProgress] = useState(0);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.bmp', '.jpg', '.jpeg']
    },
    maxFiles: 20,
    maxSize: 50 * 1024 * 1024, // 50MB per file
    onDrop: (acceptedFiles) => {
      console.log('BatchTab: Files dropped:', acceptedFiles);
      console.log('BatchTab: File count:', acceptedFiles.length);
      
      setFiles(acceptedFiles);
      setResults([]);
      setError('');
      setSuccess('');
      
      console.log('BatchTab: Files state updated:', acceptedFiles);
    }
  });

  const handleBatchEncode = async () => {
    if (files.length === 0) {
      setError('Please select at least one image');
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
    setProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response: BatchEncodeResponse = await steganographyAPI.batchEncode(
        files,
        message,
        password,
        bitDepth
      );

      clearInterval(progressInterval);
      setProgress(100);

      console.log('Frontend: Batch encode response:', response);

      if (response.success && response.results) {
        setResults(response.results);
        const successful = response.results.filter(r => r.success).length;
        setSuccess(`Successfully processed ${successful} of ${response.total_processed} images`);
      } else {
        console.log('Frontend: Batch encode failed:', response);
        setError(response.error || 'Batch encoding failed');
      }
    } catch (err: any) {
      setError(err.message || 'Batch encoding failed');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleBatchDecode = async () => {
    if (files.length === 0) {
      setError('Please select at least one image');
      return;
    }
    
    if (!password) {
      setError('Please enter a password');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response: BatchDecodeResponse = await steganographyAPI.batchDecode(
        files,
        password,
        bitDepth
      );

      clearInterval(progressInterval);
      setProgress(100);

      if (response.success) {
        setResults(response.results);
        const successful = response.results.filter(r => r.success).length;
        setSuccess(`Found messages in ${successful} of ${response.total_processed} images`);
      } else {
        setError(response.error || 'Batch decoding failed');
      }
    } catch (err: any) {
      setError(err.message || 'Batch decoding failed');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleProcess = () => {
    if (mode === 'encode') {
      handleBatchEncode();
    } else {
      handleBatchDecode();
    }
  };

  const handleDownloadAll = () => {
    results.forEach((result, index) => {
      if (result.success && result.encoded_image) {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${result.encoded_image}`;
        link.download = `encoded_${result.filename}`;
        link.click();
      }
    });
  };

  const handleDownloadResults = () => {
    const csvContent = [
      ['Filename', 'Status', mode === 'encode' ? 'PSNR' : 'Message Length', 'Error'],
      ...results.map(result => [
        result.filename,
        result.success ? 'Success' : 'Failed',
        mode === 'encode' && result.metrics?.psnr ? result.metrics.psnr.toFixed(2) : 
        mode === 'decode' && result.message ? result.message.length.toString() : '',
        result.error || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_results_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setFiles([]);
    setMessage('');
    setPassword('');
    setResults([]);
    setError('');
    setSuccess('');
    setProgress(0);
  };

  const getTotalFileSize = () => {
    return files.reduce((total, file) => total + file.size, 0);
  };

  const getSuccessfulCount = () => {
    return results.filter(r => r.success).length;
  };

  const getFailedCount = () => {
    return results.filter(r => !r.success).length;
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Mode Selection */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Operation Mode</InputLabel>
              <Select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'encode' | 'decode')}
              >
                <MenuItem value="encode">Batch Encode</MenuItem>
                <MenuItem value="decode">Batch Decode</MenuItem>
              </Select>
            </FormControl>
          </Paper>
        </Grid>

        {/* File Upload Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Upload Images ({files.length}/20)
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
                {isDragActive ? 'Drop images here' : 'Drag & drop images or click to select'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                PNG, BMP, JPEG (Max 20 files, 50MB each)
              </Typography>
            </Box>

            {files.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Selected Files:
                </Typography>
                <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                  {files.map((file, index) => (
                    <Chip
                      key={index}
                      label={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
                      size="small"
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  Total: {files.length} files ({(getTotalFileSize() / 1024 / 1024).toFixed(2)} MB)
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Settings Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Batch Settings
            </Typography>

            {mode === 'encode' && (
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Secret Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                margin="normal"
                helperText="This message will be hidden in all images"
              />
            )}

            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
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
                <MenuItem value={1}>1-bit (Most Secure)</MenuItem>
                <MenuItem value={2}>2-bit (Balanced)</MenuItem>
                <MenuItem value={4}>4-bit (Maximum Capacity)</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleProcess}
                disabled={loading || files.length === 0 || !password || (mode === 'encode' && !message)}
                startIcon={loading ? <CircularProgress size={20} /> : <BatchPrediction />}
                fullWidth
              >
                {loading ? 'Processing...' : `Batch ${mode === 'encode' ? 'Encode' : 'Decode'}`}
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

        {/* Progress */}
        {loading && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LinearProgress variant="determinate" value={progress} sx={{ flex: 1 }} />
              <Typography variant="body2" color="textSecondary">
                {progress}%
              </Typography>
            </Box>
          </Grid>
        )}

        {/* Status Messages */}
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

        {/* Results */}
        {results.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Batch Results ({getSuccessfulCount()} successful, {getFailedCount()} failed)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {mode === 'encode' && (
                    <Tooltip title="Download all encoded images">
                      <IconButton onClick={handleDownloadAll} color="primary">
                        <Download />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Download results as CSV">
                    <IconButton onClick={handleDownloadResults} color="primary">
                      <Info />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {results.map((result, index) => (
                  <Accordion key={index}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        {result.success ? (
                          <CheckCircle color="success" fontSize="small" />
                        ) : (
                          <Error color="error" fontSize="small" />
                        )}
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {result.filename}
                        </Typography>
                        <Chip
                          label={result.success ? 'Success' : 'Failed'}
                          color={result.success ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {result.success ? (
                        <Box>
                          {mode === 'encode' ? (
                            <>
                              <Typography variant="body2" gutterBottom>
                                Message successfully encoded
                              </Typography>
                              {result.metrics && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="caption" color="textSecondary">
                                    PSNR: {result.metrics.psnr.toFixed(2)} dB | 
                                    Quality: {result.metrics.quality_rating}
                                  </Typography>
                                </Box>
                              )}
                            </>
                          ) : (
                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                              <strong>Decoded Message:</strong><br />
                              {result.message}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="error">
                          {result.error}
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default BatchTab;
