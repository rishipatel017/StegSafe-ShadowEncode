import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Button,
  Divider
} from '@mui/material';
import {
  CloudUpload,
  Analytics,
  SwapHoriz
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { steganographyAPI, AnalyzeResponse } from '../services/api';
import ImageComparison from './ImageComparison';
import MetricsPanel from './MetricsPanel';

interface ImageFile {
  file: File;
  url: string;
  type: 'original' | 'encoded';
}

const AnalyzeTab: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<ImageFile | null>(null);
  const [encodedImage, setEncodedImage] = useState<ImageFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState<any>(null);

  const { getRootProps: getOriginalRootProps, getInputProps: getOriginalInputProps, isDragActive: isOriginalDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.bmp', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const url = URL.createObjectURL(file);
        setOriginalImage({ file, url, type: 'original' });
        setError('');
        setMetrics(null);
      }
    },
    onError: (error) => {
      console.error('AnalyzeTab: Original dropzone error:', error);
      setError('File upload error: ' + error.message);
    }
  });

  const { getRootProps: getEncodedRootProps, getInputProps: getEncodedInputProps, isDragActive: isEncodedDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.bmp', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const url = URL.createObjectURL(file);
        setEncodedImage({ file, url, type: 'encoded' });
        setError('');
        setMetrics(null);
      }
    },
    onError: (error) => {
      console.error('AnalyzeTab: Encoded dropzone error:', error);
      setError('File upload error: ' + error.message);
    }
  });

  const handleAnalyze = async () => {
    if (!originalImage || !encodedImage) {
      setError('Please upload both original and encoded images');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response: AnalyzeResponse = await steganographyAPI.analyze(
        originalImage.file,
        encodedImage.file
      );

      if (response.success && response.metrics) {
        setMetrics(response.metrics);
      } else {
        setError(response.error || 'Analysis failed');
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    if (originalImage && encodedImage) {
      const temp = originalImage;
      setOriginalImage({ ...encodedImage, type: 'original' });
      setEncodedImage({ ...temp, type: 'encoded' });
      setMetrics(null);
    }
  };

  
  const handleClear = () => {
    setOriginalImage(null);
    setEncodedImage(null);
    setMetrics(null);
    setError('');
  };

  const ImageUploadArea = ({ 
    image, 
    title, 
    getRootProps, 
    getInputProps, 
    isDragActive 
  }: {
    image: ImageFile | null;
    title: string;
    getRootProps: any;
    getInputProps: any;
    isDragActive: boolean;
  }) => (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {title}
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
        <input 
          {...getInputProps()} 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer'
          }} 
        />
        <CloudUpload sx={{ fontSize: 48, color: 'grey.500', mb: 2 }} />
        <Typography variant="body1" color="textSecondary">
          {isDragActive ? 'Drop image here' : 'Drag & drop image or click to select'}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          PNG, BMP, JPEG (Max 50MB)
        </Typography>
      </Box>

      {image && (
        <Box sx={{ mt: 2 }}>
          <img
            src={image.url}
            alt={title}
            style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }}
          />
          <Typography variant="caption" display="block" mt={1}>
            {image.file.name} ({(image.file.size / 1024).toFixed(1)} KB)
          </Typography>
        </Box>
      )}
    </Paper>
  );

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Image Upload Areas */}
        <Grid item xs={12} md={6}>
          <ImageUploadArea
            image={originalImage}
            title="Original Image"
            getRootProps={getOriginalRootProps}
            getInputProps={getOriginalInputProps}
            isDragActive={isOriginalDragActive}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <ImageUploadArea
            image={encodedImage}
            title="Encoded Image"
            getRootProps={getEncodedRootProps}
            getInputProps={getEncodedInputProps}
            isDragActive={isEncodedDragActive}
          />
        </Grid>

        {/* Controls */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleAnalyze}
                disabled={loading || !originalImage || !encodedImage}
                startIcon={loading ? <CircularProgress size={20} /> : <Analytics />}
              >
                {loading ? 'Analyzing...' : 'Analyze Images'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleSwap}
                disabled={!originalImage || !encodedImage}
                startIcon={<SwapHoriz />}
              >
                Swap Images
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleClear}
              >
                Clear All
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

        {/* Analysis Results */}
        {metrics && (
          <>
            <Grid item xs={12} md={6}>
              <MetricsPanel metrics={metrics} />
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Analysis Summary
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Quality Assessment
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {metrics.quality_rating}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Image Similarity
                    </Typography>
                    <Typography variant="body1">
                      PSNR: {metrics.psnr === Infinity ? 'Perfect' : `${metrics.psnr.toFixed(2)} dB`}
                    </Typography>
                    {metrics.ssim !== undefined && (
                      <Typography variant="body1">
                        SSIM: {metrics.ssim.toFixed(4)}
                      </Typography>
                    )}
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      File Size Impact
                    </Typography>
                    <Typography variant="body1">
                      Original: {(metrics.file_size_impact.original_size / 1024).toFixed(1)} KB
                    </Typography>
                    <Typography variant="body1">
                      Encoded: {(metrics.file_size_impact.encoded_size / 1024).toFixed(1)} KB
                    </Typography>
                    <Typography variant="body1" color="primary">
                      Increase: +{metrics.file_size_impact.percentage_increase.toFixed(2)}%
                    </Typography>
                  </Box>

                  {metrics.histogram_correlation && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Histogram Correlation
                        </Typography>
                        {Object.entries(metrics.histogram_correlation).map(([channel, correlation]: [string, any]) => (
                          <Typography variant="body2" key={channel}>
                            {channel.charAt(0).toUpperCase() + channel.slice(1)}: {correlation.toFixed(4)}
                          </Typography>
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <ImageComparison
                originalImage={originalImage?.url || ''}
                encodedImage={encodedImage?.url || ''}
              />
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
};

export default AnalyzeTab;
