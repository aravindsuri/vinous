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

// Types for the new endpoints
interface WineRatingRequest {
  wine_name: string;
  winery?: string;
  vintage?: string;
  region?: string;
  country?: string;
}

interface WinePriceRequest {
  wine_name: string;
  winery?: string;
  vintage?: string;
  region?: string;
  country?: string;
}

interface TastingNotesRequest {
  wine_name: string;
  winery?: string;
  grape_variety?: string;
  wine_type?: string;
  region?: string;
  country?: string;
  vintage?: string;
  alcohol_content?: string;
}

interface WineRatingResponse {
  rating: number;
  max_rating: number;
  source: string;
  review_count?: number;
  url?: string;
}

interface WinePriceResponse {
  average_price?: number;
  lowest_price?: {
    price: number;
    currency: string;
    source: string;
    availability: string;
    url: string;
  };
  all_prices?: Array<{
    price: number;
    currency: string;
    source: string;
    availability: string;
    url: string;
  }>;
  price?: number; // For single price estimates
  currency?: string;
  source?: string;
  updated_at?: string;
}

interface TastingNotesResponse {
  tasting_notes: string;
  generated_by: string;
  wine_context: any;
  generated_at: string;
}

export const vinousAPI = {
  // Existing methods
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

  // NEW METHODS for enhanced functionality
  getWineRating: async (wineData: Wine | WineRatingRequest): Promise<ApiResponse<WineRatingResponse>> => {
    console.log('API: Getting wine rating for:', wineData);
    
    try {
      const requestData: WineRatingRequest = {
        wine_name: 'name' in wineData ? wineData.name : wineData.wine_name,
        winery: wineData.winery,
        vintage: wineData.vintage,
        region: wineData.region,
        country: wineData.country,
      };

      console.log('API: Sending rating request:', requestData);
      
      const response = await api.post<ApiResponse<WineRatingResponse>>('/api/v1/wine-rating', requestData);
      
      console.log('API: Rating response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Get wine rating error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout while fetching wine rating.');
        } else if (error.response?.status === 500) {
          throw new Error('Server error while fetching wine rating.');
        } else if (!error.response) {
          throw new Error('Network error while fetching wine rating.');
        }
      }
      
      throw error;
    }
  },

  getWinePrice: async (wineData: Wine | WinePriceRequest): Promise<ApiResponse<WinePriceResponse>> => {
    console.log('API: Getting wine price for:', wineData);
    
    try {
      const requestData: WinePriceRequest = {
        wine_name: 'name' in wineData ? wineData.name : wineData.wine_name,
        winery: wineData.winery,
        vintage: wineData.vintage,
        region: wineData.region,
        country: wineData.country,
      };

      console.log('API: Sending price request:', requestData);
      
      const response = await api.post<ApiResponse<WinePriceResponse>>('/api/v1/wine-price', requestData);
      
      console.log('API: Price response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Get wine price error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout while fetching wine price.');
        } else if (error.response?.status === 500) {
          throw new Error('Server error while fetching wine price.');
        } else if (!error.response) {
          throw new Error('Network error while fetching wine price.');
        }
      }
      
      throw error;
    }
  },

  generateTastingNotes: async (wineData: Wine | TastingNotesRequest): Promise<ApiResponse<TastingNotesResponse>> => {
    console.log('API: Generating tasting notes for:', wineData);
    
    try {
      const requestData: TastingNotesRequest = {
        wine_name: 'name' in wineData ? wineData.name : wineData.wine_name,
        winery: wineData.winery,
        grape_variety: wineData.grape_variety,
        wine_type: wineData.wine_type,
        region: wineData.region,
        country: wineData.country,
        vintage: wineData.vintage,
        alcohol_content: wineData.alcohol_content,
      };

      console.log('API: Sending tasting notes request:', requestData);
      
      const response = await api.post<ApiResponse<TastingNotesResponse>>('/api/v1/tasting-notes', requestData);
      
      console.log('API: Tasting notes response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Generate tasting notes error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout while generating tasting notes.');
        } else if (error.response?.status === 500) {
          throw new Error('Server error while generating tasting notes.');
        } else if (!error.response) {
          throw new Error('Network error while generating tasting notes.');
        }
      }
      
      throw error;
    }
  },

  // Utility method to get all wine data at once
  getCompleteWineData: async (wineData: Wine) => {
    console.log('API: Getting complete wine data for:', wineData.name);
    
    try {
      const [ratingResponse, priceResponse, tastingNotesResponse] = await Promise.allSettled([
        vinousAPI.getWineRating(wineData),
        vinousAPI.getWinePrice(wineData),
        vinousAPI.generateTastingNotes(wineData),
      ]);

      return {
        rating: ratingResponse.status === 'fulfilled' ? ratingResponse.value : null,
        price: priceResponse.status === 'fulfilled' ? priceResponse.value : null,
        tastingNotes: tastingNotesResponse.status === 'fulfilled' ? tastingNotesResponse.value : null,
        errors: {
          rating: ratingResponse.status === 'rejected' ? ratingResponse.reason : null,
          price: priceResponse.status === 'rejected' ? priceResponse.reason : null,
          tastingNotes: tastingNotesResponse.status === 'rejected' ? tastingNotesResponse.reason : null,
        }
      };
    } catch (error) {
      console.error('API: Error getting complete wine data:', error);
      throw error;
    }
  },
};

export default api;