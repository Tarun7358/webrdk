export const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const getApiBase = () => API_BASE;
export const getStreamUrl = (fileId: string) => `${API_BASE}/files/stream/${fileId}`;
export const getDownloadUrl = (shortCode?: string, password?: string) => {
  const code = shortCode || '';
  const query = password ? `?password=${encodeURIComponent(password)}` : '';
  if (API_BASE.startsWith('http')) {
    const rootApi = API_BASE.replace(/\/v1\/?$/, '');
    return `${rootApi}/v1/download/${code}${query}`;
  }
  return `/api/v1/download/${code}${query}`;
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('rage_token');
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new Error(
      `Unable to reach backend API at ${API_BASE}. Make sure your Railway backend is running with a generated public domain, and VITE_API_URL is configured in Netlify.`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(
      `Backend URL misconfigured: Received HTML instead of JSON from ${API_BASE}${endpoint}. Please add VITE_API_URL in Netlify Environment Variables pointing to your Railway backend.`
    );
  }

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // keep fallback
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  getStreamUrl,
  getDownloadUrl,
  // Auth
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (email: string) => request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (data: { email: string; otp_code: string; new_password: string }) =>
    request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),

  // Files
  // Upload a single part (used for small files <= 20MB)
  uploadSingleFile: (
    formData: FormData,
    onProgress?: (loadedBytes: number, totalBytes: number) => void,
    signal?: AbortSignal
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/files/upload`);

      const token = localStorage.getItem('rage_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (signal) {
        if (signal.aborted) {
          return reject(new DOMException('Upload cancelled by user', 'AbortError'));
        }
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new DOMException('Upload cancelled by user', 'AbortError'));
        });
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress(event.loaded, event.total);
          }
        };
      }

      xhr.onload = () => {
        const contentType = xhr.getResponseHeader('content-type') || '';
        if (xhr.status === 413) {
          return reject(
            new Error(
              'Upload rejected: File size exceeds the network gateway limit (HTTP 413 Request Entity Too Large).'
            )
          );
        }

        if (contentType.includes('text/html')) {
          return reject(
            new Error(
              `Backend URL misconfigured: Received HTML instead of JSON from ${API_BASE}/files/upload. HTTP Status: ${xhr.status}`
            )
          );
        }

        let resJson: any = null;
        try {
          resJson = JSON.parse(xhr.responseText);
        } catch {
          // ignore parse error
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(resJson);
        } else {
          const errorDetail = resJson?.detail || xhr.statusText || 'Storage transmission failed';
          reject(new Error(errorDetail));
        }
      };

      xhr.onerror = () => {
        reject(
          new Error(
            `Connection closed by network gateway during upload to ${API_BASE}.`
          )
        );
      };

      xhr.onabort = () => {
        reject(new DOMException('Upload cancelled by user', 'AbortError'));
      };

      xhr.send(formData);
    });
  },

  // Upload an individual 20MB chunk (safe under Cloudflare 100MB limit)
  uploadChunk: (
    formData: FormData,
    onProgress?: (loadedBytes: number, totalBytes: number) => void,
    signal?: AbortSignal
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/files/upload/chunk`);

      const token = localStorage.getItem('rage_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (signal) {
        if (signal.aborted) {
          return reject(new DOMException('Upload cancelled by user', 'AbortError'));
        }
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new DOMException('Upload cancelled by user', 'AbortError'));
        });
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress(event.loaded, event.total);
          }
        };
      }

      xhr.onload = () => {
        let resJson: any = null;
        try {
          resJson = JSON.parse(xhr.responseText);
        } catch {
          // ignore parse error
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(resJson);
        } else {
          const errorDetail = resJson?.detail || xhr.statusText || 'Chunk upload failed';
          reject(new Error(errorDetail));
        }
      };

      xhr.onerror = () => {
        reject(new Error(`Network error while transmitting chunk to ${API_BASE}.`));
      };

      xhr.onabort = () => {
        reject(new DOMException('Upload cancelled by user', 'AbortError'));
      };

      xhr.send(formData);
    });
  },

  // Smart upload: automatically chunks files larger than 20MB to stay 100% under Cloudflare limits
  uploadFile: async (
    fileOrFormData: any,
    optionsOrProgress?: any,
    signalOrProgress?: any,
    maybeSignal?: AbortSignal
  ): Promise<any> => {
    // If raw FormData was passed:
    if (fileOrFormData instanceof FormData) {
      return api.uploadSingleFile(fileOrFormData, optionsOrProgress, signalOrProgress);
    }

    const file: File = fileOrFormData;
    const options = typeof optionsOrProgress === 'object' && optionsOrProgress !== null ? optionsOrProgress : {};
    const onProgress = typeof signalOrProgress === 'function' ? signalOrProgress : (typeof optionsOrProgress === 'function' ? optionsOrProgress : undefined);
    const signal = maybeSignal || (signalOrProgress instanceof AbortSignal ? signalOrProgress : undefined);

    const CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB chunks (well below Cloudflare's 100MB limit)

    // Small files (<= 20MB): send in 1 request
    if (file.size <= CHUNK_SIZE) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('visibility', options.visibility || 'PUBLIC');
      formData.append('price', String(options.price || 0.0));
      if (options.team_id) formData.append('team_id', options.team_id);

      return api.uploadSingleFile(formData, onProgress, signal);
    }

    // Large files (> 20MB, up to 50GB): chunked streaming
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    let finalResponse: any = null;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (signal?.aborted) {
        throw new DOMException('Upload cancelled by user', 'AbortError');
      }

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkBlob = file.slice(start, end);

      const chunkFormData = new FormData();
      chunkFormData.append('chunk', chunkBlob, file.name);
      chunkFormData.append('upload_id', uploadId);
      chunkFormData.append('chunk_index', String(chunkIndex));
      chunkFormData.append('total_chunks', String(totalChunks));
      chunkFormData.append('filename', file.name);
      chunkFormData.append('total_size', String(file.size));
      chunkFormData.append('visibility', options.visibility || 'PUBLIC');
      chunkFormData.append('price', String(options.price || 0.0));
      if (options.team_id) chunkFormData.append('team_id', options.team_id);

      const res = await api.uploadChunk(
        chunkFormData,
        (chunkLoaded) => {
          const totalTransferred = start + Math.min(chunkLoaded, chunkBlob.size);
          if (onProgress) {
            onProgress(totalTransferred, file.size);
          }
        },
        signal
      );

      if (chunkIndex === totalChunks - 1) {
        finalResponse = res;
      }
    }

    return finalResponse;
  },
  getMyFiles: (search?: string, visibility?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (visibility) params.append('visibility', visibility);
    return request<any>(`/files/?${params.toString()}`);
  },
  getFile: (id: string) => request<any>(`/files/${id}`),
  getStorageUsage: () => request<any>('/files/usage/summary'),
  updateFile: (id: string, data: any) => request<any>(`/files/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteFile: (id: string) => request<any>(`/files/${id}`, { method: 'DELETE' }),

  // Shares
  createShareLink: (data: any) => request<any>('/shares/', { method: 'POST', body: JSON.stringify(data) }),
  getPublicShare: (shortCode: string) => request<any>(`/shares/d/${shortCode}`),
  verifySharePassword: (shortCode: string, password: string) =>
    request<any>(`/shares/d/${shortCode}/verify`, { method: 'POST', body: JSON.stringify({ password }) }),

  // Video
  trackVideo: (data: any) => request<any>('/videos/track', { method: 'POST', body: JSON.stringify(data) }),

  // Creator
  getCreatorDashboard: () => request<any>('/creator/dashboard'),

  // Wallet & Ledger
  getWallet: () => request<any>('/wallet/'),
  getTransactions: () => request<any>('/wallet/transactions'),
  requestWithdrawal: (data: any) => request<any>('/wallet/withdraw', { method: 'POST', body: JSON.stringify(data) }),
  getMyWithdrawals: () => request<any>('/wallet/withdrawals'),

  // Teams
  getTeams: () => request<any>('/teams/'),
  createTeam: (data: any) => request<any>('/teams/', { method: 'POST', body: JSON.stringify(data) }),
  addTeamMember: (teamId: string, data: any) => request<any>(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  updateTeamSplit: (teamId: string, data: any) => request<any>(`/teams/${teamId}/revenue-split`, { method: 'PUT', body: JSON.stringify(data) }),

  // Referrals
  getReferralStats: () => request<any>('/referrals/stats'),

  // Products
  purchaseContent: (fileId: string) => request<any>('/products/purchase', { method: 'POST', body: JSON.stringify({ file_id: fileId }) }),

  // Subscriptions
  getPlans: () => request<any>('/subscriptions/plans'),
  getSubscriptionPaymentInfo: () => request<any>('/subscriptions/payment-info'),
  submitSubscriptionRequest: (data: any) => request<any>('/subscriptions/request', { method: 'POST', body: JSON.stringify(data) }),
  getMySubscriptionRequests: () => request<any>('/subscriptions/my-requests'),
  subscribePlan: (tier: string) => request<any>(`/subscriptions/subscribe/${tier}`, { method: 'POST' }),

  // Owner Portal
  getOwnerStats: () => request<any>('/owner/stats'),
  getOwnerSubscriptions: (statusFilter?: string) => {
    const q = statusFilter ? `?status_filter=${statusFilter}` : '';
    return request<any>(`/owner/subscriptions${q}`);
  },
  reviewSubscriptionRequest: (id: string, action: string, reviewNote?: string) =>
    request<any>(`/owner/subscriptions/${id}/review`, { method: 'POST', body: JSON.stringify({ action, review_note: reviewNote }) }),
  purgeTestUsers: () => request<any>('/owner/purge-test-users', { method: 'POST' }),
  deleteUser: (userId: string) => request<any>(`/owner/users/${userId}`, { method: 'DELETE' }),

  // Admin
  getAdminStats: () => request<any>('/admin/stats'),
  getAdminUsers: () => request<any>('/admin/users'),
  updateUserStatus: (userId: string, data: any) => request<any>(`/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  getAdminWithdrawals: (statusFilter?: string) => {
    const q = statusFilter ? `?status_filter=${statusFilter}` : '';
    return request<any>(`/admin/withdrawals${q}`);
  },
  actionWithdrawal: (id: string, action: string, note?: string) =>
    request<any>(`/admin/withdrawals/${id}/action`, { method: 'POST', body: JSON.stringify({ action, admin_note: note }) }),
  getAdminSettings: () => request<any>('/admin/settings'),
  updateAdminSettings: (settings: Record<string, string>) =>
    request<any>('/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  getFraudAlerts: () => request<any>('/admin/fraud-alerts'),
  getAuditLogs: () => request<any>('/admin/audit-logs'),

  // Instagram Auto-DM
  getInstagramOAuthLoginUrl: (returnTo?: string) => {
    const q = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : '';
    return request<any>(`/integrations/instagram/oauth/login-url${q}`);
  },
  getInstagramAccount: () => request<any>('/integrations/instagram/account'),
  connectInstagramSession: (data: {
    session_id: string;
    username?: string;
    hourly_limit?: number;
    daily_limit?: number;
  }) => request<any>('/integrations/instagram/connect-session', { method: 'POST', body: JSON.stringify(data) }),
  loginInstagramCredentials: (data: {
    username: string;
    password: string;
    two_factor_code?: string;
    two_factor_identifier?: string;
    hourly_limit?: number;
    daily_limit?: number;
  }) => request<any>('/integrations/instagram/login-credentials', { method: 'POST', body: JSON.stringify(data) }),
  connectInstagramAccount: (data: {
    instagram_business_id?: string;
    facebook_page_id?: string;
    username: string;
    access_token?: string;
    hourly_limit?: number;
    daily_limit?: number;
  }) => request<any>('/integrations/instagram/connect', { method: 'POST', body: JSON.stringify(data) }),
  disconnectInstagramAccount: () => request<any>('/integrations/instagram/disconnect', { method: 'POST' }),
  updateInstagramLimits: (data: { hourly_limit: number; daily_limit: number }) =>
    request<any>('/integrations/instagram/limits', { method: 'PUT', body: JSON.stringify(data) }),
  getInstagramMedia: () => request<any>('/integrations/instagram/media'),
  getInstagramCampaigns: () => request<any>('/integrations/instagram/campaigns'),
  createInstagramCampaign: (data: {
    file_id: string;
    title: string;
    post_url?: string;
    target_mode?: 'SPECIFIC' | 'ANY' | 'NEXT';
    trigger_keywords: string;
    dm_templates: string[];
    reply_comments?: string[];
    send_comment_reply?: boolean;
  }) => request<any>('/integrations/instagram/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateInstagramCampaign: (campaignId: string, data: {
    title?: string;
    post_url?: string;
    target_mode?: 'SPECIFIC' | 'ANY' | 'NEXT';
    trigger_keywords?: string;
    dm_templates?: string[];
    reply_comments?: string[];
    send_comment_reply?: boolean;
    is_active?: boolean;
  }) => request<any>(`/integrations/instagram/campaigns/${campaignId}`, { method: 'PUT', body: JSON.stringify(data) }),
  scanInstagramCampaign: (campaignId: string) =>
    request<any>(`/integrations/instagram/campaigns/${campaignId}/scan`, { method: 'POST' }),
  deleteInstagramCampaign: (campaignId: string) => request<any>(`/integrations/instagram/campaigns/${campaignId}`, { method: 'DELETE' }),
  getInstagramLogs: (campaignId?: string, limit: number = 50) => {
    const q = campaignId ? `?campaign_id=${campaignId}&limit=${limit}` : `?limit=${limit}`;
    return request<any>(`/integrations/instagram/logs${q}`);
  },
};

