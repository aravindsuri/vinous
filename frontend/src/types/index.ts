export interface Wine {
  id?: string;
  name: string;
  winery: string;
  vintage: string;
  region: string;
  country: string;
  grape_variety: string;
  alcohol_content: string;
  wine_type: 'red' | 'white' | 'rosé' | 'sparkling';
  description: string;
  confidence: number;
  image_url?: string;
  created_at?: string;
}

export interface ScanResult {
  success: boolean;
  data: Wine;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export type RootStackParamList = {
  Startup: undefined;
  Main: undefined;
  Camera: undefined;
  WineDetail: { wine: Wine };
};
