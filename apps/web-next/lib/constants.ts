export const API_ENDPOINTS = {
  VENDOR: {
    STATS: '/api/vendor/stats',
    CREDENTIALS: '/api/vendor/credentials',
    UPLOAD: '/api/vendor/credentials/upload',
    DISPUTES: '/api/vendor/disputes',
    SETTLE: (id: string) => `/api/vendor/disputes/${id}/settle`,
    EVIDENCE: (id: string) => `/api/vendor/disputes/${id}/evidence`,
  },
};

export const POLLING_INTERVALS = {
  REALTIME: 5000,
  FREQUENT: 30000,
  STANDARD: 60000,
  BACKGROUND: 300000,
};

export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024,
  ALLOWED_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
};

export const SCORE_THRESHOLDS = {
  VAULT_MAX: 10,
  RELIABILITY_MAX: 100,
  DISPUTE_IMPACT: -0.3,
  DISPUTE_RECOVERY: 0.3,
};
