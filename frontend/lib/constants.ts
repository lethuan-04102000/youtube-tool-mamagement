// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006';

// API Endpoints
export const API_ENDPOINTS = {
  // Accounts
  ACCOUNTS: {
    LIST: '/api/v1/accounts', // Supports ?page=1&limit=10&search=text&searchBy=email|channelName|all
  },
  
  // Watch/Video
  WATCH: {
    BATCH: '/api/v1/watch/video',
    BATCH_ACCOUNTS: '/api/v1/watch/batch-accounts',
  },
  // Campaigns
  CAMPAIGNS: {
    HISTORY: '/api/campaigns/history',
    GET: (id: string) => `/api/campaigns/${id}`,
  },
  
  // YouTube
  YOUTUBE: {
    CREATE_CHANNELS: '/api/youtube/create-channels-batch',
    VERIFY_2FA: '/api/verify/authenticator',
  },
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};
