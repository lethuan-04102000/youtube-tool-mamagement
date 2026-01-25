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

// Export a combined API object
export const api = {
  watch: watchAPI,
  accounts: accountsAPI,
};

export default api;

