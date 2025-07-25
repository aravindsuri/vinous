import axios from 'axios';
import { Wine, ScanResult, ApiResponse } from '../types';

const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.117:8000'  // Your computer's IP address
  : 'https://your-production-api.com';

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
        timeout: 120000,
      });

      console.log('API: Received response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Scan error details:', error);
      throw error;
    }
  },

  getWines: async (): Promise<ApiResponse<Wine[]>> => {
    console.log('API: Getting wines from:', API_BASE_URL + '/api/v1/wines');
    const response = await api.get<ApiResponse<Wine[]>>('/api/v1/wines');
    return response.data;
  },

  saveWine: async (wine: Partial<Wine>): Promise<ApiResponse<Wine>> => {
    console.log('API: Saving wine:', wine);
    const response = await api.post<ApiResponse<Wine>>('/api/v1/wines', wine);
    return response.data;
  },

  testConnection: async (): Promise<any> => {
    console.log('API: Testing connection to:', API_BASE_URL + '/health');
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;
