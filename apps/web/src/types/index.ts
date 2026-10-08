export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'OWNER' | 'SUPER_ADMIN' | 'CREATOR' | 'TEAM_OWNER' | 'TEAM_MEMBER' | 'NORMAL_USER' | string;
  plan_tier?: string;
  storage_limit_bytes?: number;
  is_active: boolean;
  is_verified: boolean;
  referral_code: string;
  avatar_url?: string;
  created_at: string;
}

export interface FileItem {
  id: string;
  name: string;
  original_name: string;
  mime_type: string;
  extension: string;
  size: number;
  checksum: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED' | 'PAID';
  status: 'ACTIVE' | 'PROCESSING' | 'QUARANTINED' | 'DELETED';
  price: number;
  download_count: number;
  view_count: number;
  storage_backend: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  share_url?: string;
  short_code?: string;
}

export interface ShareLink {
  id: string;
  file_id: string;
  short_code: string;
  is_password_protected: boolean;
  expires_at?: string;
  download_limit?: number;
  download_count: number;
  is_active: boolean;
  share_url: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  currency: string;
  available_balance: number;
  pending_balance: number;
  locked_balance: number;
  total_balance: number;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  reference_type?: string;
  reference_id?: string;
  description: string;
  status: string;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payout_method: string;
  payout_details: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  admin_note?: string;
  created_at: string;
}

export interface CreatorDashboardData {
  total_files: number;
  total_downloads: number;
  qualified_downloads: number;
  total_views: number;
  qualified_views: number;
  total_revenue: number;
  pending_revenue: number;
  available_balance: number;
  referral_earnings: number;
  rpm: number;
  recent_activity: Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    created_at: string;
  }>;
  daily_stats: Array<{
    date: string;
    downloads: number;
    views: number;
    revenue: number;
  }>;
  top_files: Array<{
    id: string;
    name: string;
    downloads: number;
    views: number;
    size: number;
    visibility: string;
  }>;
}

export interface AdminStatsData {
  total_users: number;
  active_users: number;
  total_creators: number;
  total_teams: number;
  total_files: number;
  total_storage_bytes: number;
  total_downloads: number;
  qualified_downloads: number;
  platform_revenue: number;
  creator_payouts_distributed: number;
  pending_withdrawals_count: number;
  pending_withdrawals_amount: number;
  fraud_alerts_count: number;
  recent_audit_logs: Array<{
    id: string;
    action: string;
    target_type?: string;
    ip_address?: string;
    details?: string;
    created_at: string;
  }>;
  monetization_settings: Record<string, string>;
}

export interface PublicDownloadPageData {
  short_code: string;
  file_id: string;
  file_name: string;
  size: number;
  mime_type: string;
  extension: string;
  upload_date: string;
  creator_name: string;
  is_password_protected: boolean;
  is_paid: boolean;
  price: number;
  is_video: boolean;
  download_count: number;
  ad_placements: Array<{
    id: string;
    placement: string;
    provider: string;
    banner_title: string;
    banner_desc: string;
    cta_text: string;
    cta_url: string;
  }>;
}
