import { API_BASE_URL, API_ENDPOINTS, buildApiUrl } from './constants';

// Types
export interface WatchVideoRequest {
  videoUrl: string;
  watchTimeSeconds: number;
  useAccounts: boolean;
  anonymousCount?: number;
  accountsFilePath?: string;
  autoSubscribe?: boolean;
  autoComment?: boolean;
  autoLike?: boolean;
}

export interface WatchVideoResponse {
  success: boolean;
  message: string;
  results?: {
    successful: number;
    failed: number;
    accounts?: any[];
    anonymous?: any[];
  };
}

export interface Campaign {
  id: string;
  videoUrl: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed';
  accountsUsed: number;
  anonymousViews: number;
  totalViews: number;
  comments: number;
  likes: number;
  watchTimeSeconds: number;
  errors?: string[];
}

export interface Account {
  email: string;
  status: 'active' | 'inactive' | '2fa-required';
  lastUsed?: string;
  videosWatched: number;
  commentsPosted: number;
}

export interface Comment {
  text: string;
  category?: string;
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
  // Watch video with config
  watchVideo: (data: WatchVideoRequest): Promise<WatchVideoResponse> => {
    return request<WatchVideoResponse>(API_ENDPOINTS.WATCH.BATCH, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Watch video batch
  watchBatch: (data: {
    videoUrl: string
    tabs?: number
    duration?: number
    useAccounts?: boolean
    humanBehavior?: boolean
    randomDuration?: boolean
    autoSubscribe?: boolean
    autoComment?: boolean
    autoLike?: boolean
    batchSize?: number
    proxyFile?: string
    proxyList?: string[]
  }): Promise<WatchVideoResponse> => {
    return request<WatchVideoResponse>(API_ENDPOINTS.WATCH.BATCH, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Watch with accounts file
  watchBatchAccounts: async (formData: FormData): Promise<WatchVideoResponse> => {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.WATCH.BATCH_ACCOUNTS), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to start watch campaign');
    }

    return response.json();
  },
}

// Accounts API
export const accountsAPI = {
  // Upload accounts
  uploadAccounts: async (formData: FormData): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.ACCOUNTS.UPLOAD), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload accounts');
    }

    return response.json();
  },

  // Get all accounts
  getAccounts: (): Promise<{ accounts: Account[] }> => {
    return request<{ accounts: Account[] }>(API_ENDPOINTS.ACCOUNTS.LIST);
  },

  // Get account by email
  getAccount: (email: string): Promise<{ account: Account }> => {
    return request<{ account: Account }>(API_ENDPOINTS.ACCOUNTS.DELETE(email));
  },

  // Delete account
  deleteAccount: (email: string): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(API_ENDPOINTS.ACCOUNTS.DELETE(email), {
      method: 'DELETE',
    });
  },
}

// Comments API
export const commentsAPI = {
  // Get all comments
  getComments: (): Promise<{ comments: Comment[] }> => {
    return request<{ comments: Comment[] }>(API_ENDPOINTS.COMMENTS.LIST);
  },

  // Save comments
  saveComments: (comments: Comment[]): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(API_ENDPOINTS.COMMENTS.SAVE, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  },
}

// Campaign API
export const campaignAPI = {
  // Get campaign history
  getHistory: (): Promise<{ campaigns: Campaign[] }> => {
    return request<{ campaigns: Campaign[] }>(API_ENDPOINTS.CAMPAIGNS.HISTORY);
  },

  // Get single campaign
  getCampaign: (id: string): Promise<{ campaign: Campaign }> => {
    return request<{ campaign: Campaign }>(API_ENDPOINTS.CAMPAIGNS.GET(id));
  },
}

// Stats API
export const statsAPI = {
  // Get dashboard stats
  getStats: (): Promise<{
    totalCampaigns: number;
    totalViews: number;
    activeAccounts: number;
    totalWatchTime: number;
  }> => {
    return request(API_ENDPOINTS.STATS);
  },
}

// YouTube API
export const youtubeAPI = {
  // Create channels for accounts
  createChannels: (data: { accountsFile?: string }): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(API_ENDPOINTS.YOUTUBE.CREATE_CHANNELS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Verify 2FA
  verify2FA: (data: { email: string; code: string }): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(API_ENDPOINTS.YOUTUBE.VERIFY_2FA, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
}

// Export a combined API object
export const api = {
  watch: watchAPI,
  accounts: accountsAPI,
  comments: commentsAPI,
  campaigns: campaignAPI,
  stats: statsAPI,
  youtube: youtubeAPI,
}

export default api;
