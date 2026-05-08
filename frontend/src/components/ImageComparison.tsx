import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Button
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  Compare,
  Visibility
} from '@mui/icons-material';

interface ImageComparisonProps {
  originalImage: string;
  encodedImage: string;
}

const ImageComparison: React.FC<ImageComparisonProps> = ({
  originalImage,
  encodedImage
}) => {
  const [sliderValue, setSliderValue] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'slider' | 'toggle'>('slider');
  const [showOriginal, setShowOriginal] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (viewMode === 'slider' && canvasRef.current && originalImage && encodedImage) {
      drawSliderComparison();
    }
  }, [sliderValue, zoom, viewMode, originalImage, encodedImage]);

  const drawSliderComparison = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img1 = new Image();
    const img2 = new Image();

    img1.onload = () => {
      img2.onload = () => {
        // Set canvas size
        canvas.width = 600;
        canvas.height = 400;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate dimensions with zoom
        const width = canvas.width * zoom;
        const height = canvas.height * zoom;
        const offsetX = (canvas.width - width) / 2;
        const offsetY = (canvas.height - height) / 2;

        // Draw original image on the left
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, (canvas.width * sliderValue) / 100, canvas.height);
        ctx.clip();
        ctx.drawImage(img1, offsetX, offsetY, width, height);
        ctx.restore();

        // Draw encoded image on the right
        ctx.save();
        ctx.beginPath();
        ctx.rect((canvas.width * sliderValue) / 100, 0, canvas.width, canvas.height);
        ctx.clip();
        ctx.drawImage(img2, offsetX, offsetY, width, height);
        ctx.restore();

        // Draw slider line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo((canvas.width * sliderValue) / 100, 0);
        ctx.lineTo((canvas.width * sliderValue) / 100, canvas.height);
        ctx.stroke();
      };
      img2.src = encodedImage;
    };
    img1.src = originalImage;
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'slider' | 'toggle' | null,
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Image Comparison
      </Typography>

      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
        >
          <ToggleButton value="slider">
            <Compare />
          </ToggleButton>
          <ToggleButton value="toggle">
            <Visibility />
          </ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handleZoomOut} size="small">
            <ZoomOut />
          </IconButton>
          <Typography variant="caption">
            {Math.round(zoom * 100)}%
          </Typography>
          <IconButton onClick={handleZoomIn} size="small">
            <ZoomIn />
          </IconButton>
        </Box>
      </Box>

      {/* Image Display */}
      {viewMode === 'slider' ? (
        <Box>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              maxWidth: 600,
              height: 400,
              border: '1px solid #333',
              borderRadius: 4
            }}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" display="block" gutterBottom>
              Slider Position: {sliderValue}%
            </Typography>
            <Slider
              value={sliderValue}
              onChange={(_, value) => setSliderValue(value as number)}
              min={0}
              max={100}
              step={1}
              marks={[
                { value: 0, label: 'Original' },
                { value: 50, label: '50%' },
                { value: 100, label: 'Encoded' }
              ]}
            />
          </Box>
        </Box>
      ) : (
        <Box>
          <Box sx={{ position: 'relative', width: '100%', maxWidth: 600 }}>
            <img
              src={showOriginal ? originalImage : encodedImage}
              alt={showOriginal ? "Original" : "Encoded"}
              style={{
                width: '100%',
                height: 400,
                objectFit: 'contain',
                border: '1px solid #333',
                borderRadius: 4
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                px: 2,
                py: 1,
                borderRadius: 1
              }}
            >
              <Typography variant="caption">
                {showOriginal ? 'Original' : 'Encoded'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant={showOriginal ? "contained" : "outlined"}
              onClick={() => setShowOriginal(true)}
              fullWidth
            >
              Show Original
            </Button>
            <Button
              variant={!showOriginal ? "contained" : "outlined"}
              onClick={() => setShowOriginal(false)}
              fullWidth
            >
              Show Encoded
            </Button>
          </Box>
        </Box>
      )}

      {/* Legend */}
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
        <Typography variant="caption" color="textSecondary">
          <strong>Tip:</strong> Use the slider to compare images side-by-side, or toggle between views to spot differences.
          Higher zoom levels help detect subtle changes in the image.
        </Typography>
      </Box>
    </Paper>
  );
};

export default ImageComparison;
