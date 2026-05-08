import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  Divider
} from '@mui/material';
import {
  Analytics,
  Storage,
  HighQuality,
  TrendingUp
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MetricsPanelProps {
  metrics: any;
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Analysis Metrics
        </Typography>
        <Typography variant="body2" color="textSecondary">
          No metrics available. Encode an image to see analysis results.
        </Typography>
      </Paper>
    );
  }

  const getQualityColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'excellent':
      case 'perfect':
        return 'success';
      case 'good':
        return 'info';
      case 'fair':
        return 'warning';
      case 'poor':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPSNRColor = (psnr: number) => {
    if (psnr >= 40) return 'success';
    if (psnr >= 30) return 'info';
    if (psnr >= 20) return 'warning';
    return 'error';
  };

  const getSSIMColor = (ssim?: number) => {
    if (!ssim) return 'default';
    if (ssim >= 0.9) return 'success';
    if (ssim >= 0.7) return 'info';
    if (ssim >= 0.5) return 'warning';
    return 'error';
  };

  const prepareHistogramData = () => {
    if (!metrics.histograms) return null;

    const datasets: any[] = [];
    const colors = {
      red: 'rgb(255, 99, 132)',
      green: 'rgb(75, 192, 192)',
      blue: 'rgb(54, 162, 235)',
      gray: 'rgb(153, 102, 255)'
    };

    Object.keys(metrics.histograms).forEach((channel) => {
      const channelData = metrics.histograms[channel];
      
      datasets.push({
        label: `${channel.charAt(0).toUpperCase() + channel.slice(1)} (Original)`,
        data: channelData.original.slice(0, 256), // Limit to 256 bins
        borderColor: colors[channel as keyof typeof colors] || 'rgb(201, 203, 207)',
        backgroundColor: `${colors[channel as keyof typeof colors] || 'rgb(201, 203, 207)'}20`,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 2
      });

      datasets.push({
        label: `${channel.charAt(0).toUpperCase() + channel.slice(1)} (Encoded)`,
        data: channelData.encoded.slice(0, 256),
        borderColor: colors[channel as keyof typeof colors] || 'rgb(201, 203, 207)',
        backgroundColor: `${colors[channel as keyof typeof colors] || 'rgb(201, 203, 207)'}10`,
        borderDash: [5, 5],
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 1
      });
    });

    return {
      labels: Array.from({ length: 256 }, (_, i) => i),
      datasets
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10
          }
        }
      },
      title: {
        display: true,
        text: 'RGB Histogram Comparison',
        color: 'rgba(255, 255, 255, 0.9)',
        font: {
          size: 14
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Pixel Value',
          color: 'rgba(255, 255, 255, 0.7)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Frequency',
          color: 'rgba(255, 255, 255, 0.7)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  const histogramData = prepareHistogramData();

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <Analytics sx={{ mr: 1 }} />
        Analysis Metrics
      </Typography>

      <Grid container spacing={2}>
        {/* Quality Rating */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="textSecondary">
              Overall Quality
            </Typography>
            <Chip
              label={metrics.quality_rating}
              color={getQualityColor(metrics.quality_rating) as any}
              size="small"
              icon={<HighQuality />}
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>

        {/* PSNR */}
        <Grid item xs={6}>
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              PSNR (Peak Signal-to-Noise Ratio)
            </Typography>
            <Typography variant="h6" color={getPSNRColor(metrics.psnr) + '.main' as any}>
              {metrics.psnr === Infinity ? '∞' : metrics.psnr.toFixed(2)} dB
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min((metrics.psnr / 50) * 100, 100)}
              color={getPSNRColor(metrics.psnr) as any}
              sx={{ mt: 1 }}
            />
          </Box>
        </Grid>

        {/* MSE */}
        <Grid item xs={6}>
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              MSE (Mean Squared Error)
            </Typography>
            <Typography variant="h6" color="text.primary">
              {metrics.mse.toFixed(6)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.max(0, 100 - (metrics.mse * 1000))}
              color="primary"
              sx={{ mt: 1 }}
            />
          </Box>
        </Grid>

        {/* SSIM (if available) */}
        {metrics.ssim !== undefined && (
          <Grid item xs={6}>
            <Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                SSIM (Structural Similarity)
              </Typography>
              <Typography variant="h6" color={getSSIMColor(metrics.ssim) + '.main' as any}>
                {metrics.ssim.toFixed(4)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.ssim * 100}
                color={getSSIMColor(metrics.ssim) as any}
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>
        )}

        {/* File Size Impact */}
        <Grid item xs={12}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Storage sx={{ mr: 1, fontSize: 16 }} />
              File Size Impact
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="caption" color="textSecondary">
                  Original
                </Typography>
                <Typography variant="body2">
                  {(metrics.file_size_impact.original_size / 1024).toFixed(1)} KB
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="textSecondary">
                  Encoded
                </Typography>
                <Typography variant="body2">
                  {(metrics.file_size_impact.encoded_size / 1024).toFixed(1)} KB
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="textSecondary">
                  Increase
                </Typography>
                <Typography variant="body2" color="primary">
                  +{metrics.file_size_impact.percentage_increase.toFixed(2)}%
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* Histogram Correlation */}
        {metrics.histogram_correlation && (
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ mr: 1, fontSize: 16 }} />
                Histogram Correlation
              </Typography>
              <Grid container spacing={1}>
                {Object.entries(metrics.histogram_correlation).map(([channel, correlation]: [string, any]) => (
                  <Grid item xs={4} key={channel}>
                    <Typography variant="caption" color="textSecondary">
                      {channel.charAt(0).toUpperCase() + channel.slice(1)}
                    </Typography>
                    <Typography variant="body2">
                      {correlation.toFixed(4)}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        )}

        {/* Histogram Chart */}
        {histogramData && (
          <Grid item xs={12}>
            <Box sx={{ mt: 2, height: 200 }}>
              <Line data={histogramData} options={chartOptions} />
            </Box>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default MetricsPanel;
