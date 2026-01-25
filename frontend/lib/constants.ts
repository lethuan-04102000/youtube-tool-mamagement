export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006';

export const API_ENDPOINTS = {
  ACCOUNTS: {
    LIST: '/api/v1/accounts',
  },
  WATCH: {
    BATCH: '/api/v1/watch/video',
    BATCH_ACCOUNTS: '/api/v1/watch/batch-accounts',
  },
  AUTHENTICATOR: '/api/v1/authenticator',
  AUTHENTICATOR_RETRY: (id: number) => `/api/v1/authenticator/retry/${id}`,
};

export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};
