import axios from 'axios';
import { Wine, ScanResult, ApiResponse } from '../types';

const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.117:8000'  // Development - your local backend
  : 'https://vinous-api.onrender.com';  // Production - your live backend

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const vinousAPI = {
  scanWineLabel: async (imageUri: string): Promise<ScanResult> => {
    console.log('API: Starting wine label scan with URI:', imageUri);
    console.log('API: Using base URL:', API_BASE_URL);
    
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'wine-label.jpg',
      } as any);

      console.log('API: Sending request to /api/v1/scan-wine-label');
      
      const response = await api.post<ScanResult>('/api/v1/scan-wine-label', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout for OpenAI processing
      });

      console.log('API: Received response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Scan error details:', error);
      
      // Enhanced error handling for production
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout - wine scanning is taking too long. Please try again.');
        } else if (error.response?.status === 500) {
          throw new Error('Server error while processing wine label. Please try again.');
        } else if (error.response?.status === 400) {
          throw new Error('Invalid image format. Please use a clear photo of a wine label.');
        } else if (!error.response) {
          throw new Error('Network error - please check your internet connection.');
        }
      }
      
      throw error;
    }
  },

  getWines: async (): Promise<ApiResponse<Wine[]>> => {
    console.log('API: Getting wines from:', API_BASE_URL + '/api/v1/wines');
    try {
      const response = await api.get<ApiResponse<Wine[]>>('/api/v1/wines');
      return response.data;
    } catch (error) {
      console.error('API: Get wines error:', error);
      throw error;
    }
  },

  saveWine: async (wine: Partial<Wine>): Promise<ApiResponse<Wine>> => {
    console.log('API: Saving wine:', wine);
    try {
      const response = await api.post<ApiResponse<Wine>>('/api/v1/wines', wine);
      return response.data;
    } catch (error) {
      console.error('API: Save wine error:', error);
      throw error;
    }
  },

  testConnection: async (): Promise<any> => {
    console.log('API: Testing connection to:', API_BASE_URL + '/health');
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('API: Connection test error:', error);
      throw error;
    }
  },
};

export default api;