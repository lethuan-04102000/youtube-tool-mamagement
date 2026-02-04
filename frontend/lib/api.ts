import { API_BASE_URL, API_ENDPOINTS, buildApiUrl } from './constants';

// Types
export interface WatchVideoRequest {
  videoUrl: string;
  tabs?: number;
  duration?: number;
  useAccounts?: boolean;
  humanBehavior?: boolean;
  randomDuration?: boolean;
  autoSubscribe?: boolean;
  autoComment?: boolean;
  autoLike?: boolean;
  batchSize?: number;
}

export interface WatchVideoResponse {
  success: boolean;
  message: string;
  data?: any[];
  summary?: {
    total: number;
    success: number;
    failed: number;
    videoUrl: string;
    duration: number;
  };
}

export interface Account {
  id: number;
  email: string;
  channelName?: string;
  channelLink?: string;
}

export interface AccountsResponse {
  success: boolean;
  data: Account[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ImportChannelsResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface RetryVerifyResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    email: string;
    channelName?: string;
    channelLink?: string;
    is_authenticator: boolean;
    is_create_channel: boolean;
  };
  error?: string;
}

export interface UploadVideoRequest {
  id?: number;
  email?: string;
  sourceUrl?: string; // Optional when uploading file
  videoFile?: File; // For direct file upload
  title?: string;
  description?: string;
  visibility?: 'public' | 'unlisted' | 'private';
  tags?: string[];
  scheduleDate?: string; // ISO format: '2025-01-27T20:00:00'
}

export interface UploadVideoResponse {
  success: boolean;
  message: string;
  data?: {
    email: string;
    videoUrl: string;
    title: string;
    visibility: string;
    download?: {
      filePath: string;
      title: string;
      description: string;
    };
    upload?: {
      email: string;
      videoUrl: string;
      title: string;
      visibility: string;
    };
  };
  error?: string;
}

export interface BatchUploadVideoItem {
  sourceUrl: string;
  title?: string;
  description?: string;
  visibility?: 'public' | 'unlisted' | 'private';
  tags?: string[];
  scheduleDate?: string;
}

export interface BatchUploadRequest {
  id?: number;
  email?: string;
  videos: BatchUploadVideoItem[];
}

export interface BatchUploadResult {
  index: number;
  sourceUrl: string;
  success: boolean;
  message: string;
  videoUrl?: string;
  error?: string;
}

export interface BatchUploadResponse {
  success: boolean;
  message: string;
  data?: {
    results: BatchUploadResult[];
    summary: {
      total: number;
      success: number;
      failed: number;
    };
  };
}

export interface UploadedVideo {
  id: number;
  account_youtube_id: number;
  email: string;
  video_url: string;
  title?: string;
  source_url?: string;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: number;
    email: string;
    channel_name?: string;
    channel_link?: string;
  };
}

export interface UploadedVideosResponse {
  success: boolean;
  data: UploadedVideo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper function for API requests
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = buildApiUrl(endpoint);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Watch API
export const watchAPI = {
  // Watch video batch
  watchBatch: (data: WatchVideoRequest): Promise<WatchVideoResponse> => {
    return request<WatchVideoResponse>(API_ENDPOINTS.WATCH.BATCH, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Accounts API
export const accountsAPI = {
  // Get accounts with pagination and search
  getAccounts: (params?: { 
    page?: number; 
    limit?: number; 
    search?: string 
  }): Promise<AccountsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const endpoint = `${API_ENDPOINTS.ACCOUNTS.LIST}?${searchParams.toString()}`;
    return request<AccountsResponse>(endpoint);
  },
  
  // Import channels from CSV (with optional avatars ZIP)
  importChannels: async (csvFile: File, avatarsZip?: File): Promise<ImportChannelsResponse> => {
    const formData = new FormData();
    formData.append('file', csvFile);
    if (avatarsZip) {
      formData.append('avatars', avatarsZip);
    }
    
    const url = buildApiUrl(API_ENDPOINTS.AUTHENTICATOR);
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Import failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
  
  // Retry verify authenticator and create channel for account by ID
  retryVerify: async (id: number): Promise<RetryVerifyResponse> => {
    const url = buildApiUrl(API_ENDPOINTS.AUTHENTICATOR_RETRY(id));
    const response = await fetch(url, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Retry verify failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
};

// Upload API
export const uploadAPI = {
  // Download video from URL and upload to YouTube
  downloadAndUpload: async (data: UploadVideoRequest): Promise<UploadVideoResponse> => {
    // If uploading a file, use FormData
    if (data.videoFile) {
      const formData = new FormData();
      if (data.id) formData.append('id', data.id.toString());
      if (data.email) formData.append('email', data.email);
      formData.append('videoFile', data.videoFile);
      if (data.title) formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      if (data.visibility) formData.append('visibility', data.visibility);
      if (data.scheduleDate) formData.append('scheduleDate', data.scheduleDate);
      if (data.tags) formData.append('tags', JSON.stringify(data.tags));

      const url = buildApiUrl(API_ENDPOINTS.UPLOAD.DOWNLOAD_AND_UPLOAD);
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return response.json();
    }

    // Otherwise, use JSON for URL-based download
    return request<UploadVideoResponse>(API_ENDPOINTS.UPLOAD.DOWNLOAD_AND_UPLOAD, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get uploaded videos list
  getUploadedVideos: (params?: { 
    page?: number; 
    limit?: number; 
    search?: string 
  }): Promise<UploadedVideosResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const endpoint = `${API_ENDPOINTS.UPLOAD.VIDEOS}?${searchParams.toString()}`;
    return request<UploadedVideosResponse>(endpoint);
  },

  // Batch upload videos (max 4 videos at once)
  batchUpload: (data: BatchUploadRequest): Promise<BatchUploadResponse> => {
    return request<BatchUploadResponse>(API_ENDPOINTS.UPLOAD.BATCH_UPLOAD, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Export a combined API object
export const api = {
  watch: watchAPI,
  accounts: accountsAPI,
  upload: uploadAPI,
};

export default api;

