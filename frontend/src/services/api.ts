import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 120 seconds timeout for batch operations
});

export interface EncodeResponse {
  success: boolean;
  encoded_image?: string;
  metrics?: {
    psnr: number;
    mse: number;
    ssim?: number;
    file_size_impact: {
      original_size: number;
      encoded_size: number;
      size_increase: number;
      percentage_increase: number;
    };
    histogram_correlation: Record<string, number>;
    quality_rating: string;
    histograms: Record<string, {
      original: number[];
      encoded: number[];
    }>;
  };
  original_size?: number;
  encoded_size?: number;
  error?: string;
}

export interface DecodeResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  metrics?: {
    psnr: number;
    mse: number;
    ssim?: number;
    file_size_impact: {
      original_size: number;
      encoded_size: number;
      size_increase: number;
      percentage_increase: number;
    };
    histogram_correlation: Record<string, number>;
    quality_rating: string;
    histograms: Record<string, {
      original: number[];
      encoded: number[];
    }>;
  };
  error?: string;
}

export interface BatchEncodeResponse {
  success: boolean;
  results: Array<{
    filename: string;
    success: boolean;
    encoded_image?: string;
    metrics?: any;
    error?: string;
  }>;
  total_processed: number;
  error?: string;
}

export interface BatchDecodeResponse {
  success: boolean;
  results: Array<{
    filename: string;
    success: boolean;
    message?: string;
    error?: string;
  }>;
  total_processed: number;
  error?: string;
}

export const steganographyAPI = {
  // Encode message into image
  encode: async (
    image: File,
    message: string,
    password: string,
    bitDepth: number = 1
  ): Promise<EncodeResponse> => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('message', message);
    formData.append('password', password);
    formData.append('bit_depth', bitDepth.toString());

    try {
      const response = await api.post('/api/encode', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Encoding failed',
      };
    }
  },

  // Decode message from image
  decode: async (
    image: File,
    password: string,
    bitDepth: number = 1
  ): Promise<DecodeResponse> => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('password', password);
    formData.append('bit_depth', bitDepth.toString());

    try {
      console.log('API: Sending decode request:', { image: image.name, bitDepth });
      
      const response = await api.post('/api/decode', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('API: Raw response:', response);
      console.log('API: Response data:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.log('API: Error caught:', error);
      console.log('API: Error response:', error.response?.data);
      
      return {
        success: false,
        error: error.response?.data?.error || 'Decoding failed',
      };
    }
  },

  // Analyze images
  analyze: async (
    originalImage: File,
    encodedImage: File
  ): Promise<AnalyzeResponse> => {
    const formData = new FormData();
    formData.append('original', originalImage);
    formData.append('encoded', encodedImage);

    try {
      const response = await api.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Analysis failed',
      };
    }
  },

  // Batch encode
  batchEncode: async (
    images: File[],
    message: string,
    password: string,
    bitDepth: number = 1
  ): Promise<BatchEncodeResponse> => {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image);
    });
    formData.append('message', message);
    formData.append('password', password);
    formData.append('bit_depth', bitDepth.toString());

    try {
      console.log('API: Sending batch encode request:', { 
        imageCount: images.length, 
        totalSize: images.reduce((sum, img) => sum + img.size, 0),
        bitDepth 
      });
      
      const response = await api.post('/api/batch/encode', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('API: Batch encode response received:', response.data);
      console.log('API: Response size:', JSON.stringify(response.data).length, 'characters');
      
      return response.data;
    } catch (error: any) {
      console.log('API: Batch encode error:', error);
      console.log('API: Error response:', error.response?.data);
      
      return {
        success: false,
        results: [],
        total_processed: 0,
        error: error.response?.data?.error || error.message || 'Batch encoding failed',
      };
    }
  },

  // Batch decode
  batchDecode: async (
    images: File[],
    password: string,
    bitDepth: number = 1
  ): Promise<BatchDecodeResponse> => {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image);
    });
    formData.append('password', password);
    formData.append('bit_depth', bitDepth.toString());

    try {
      const response = await api.post('/api/batch/decode', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        results: [],
        total_processed: 0,
        error: error.response?.data?.error || 'Batch decoding failed',
      };
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await api.get('/api/health');
      return response.data;
    } catch (error) {
      return { status: 'unhealthy' };
    }
  },
};

export default api;
