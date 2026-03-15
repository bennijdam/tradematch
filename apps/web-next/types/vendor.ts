// Vendor Stats
export interface VendorStats {
  activeJobs: number;
  pendingMilestones: number;
  newLeads: number;
  expiringToday: number;
  escrowBalance: number;
  availableToWithdraw: number;
  reliabilityScore: number;
  scoreTrend: number;
  vaultScore: number;
  documentsVerified: number;
  documentsTotal: number;
  nextExpiryDays: number;
  nextExpiryLabel: string;
  escrowStatus: 'ready' | 'frozen' | 'pending';
  leadTier: string;
  eliteProgress: number;
  lastUpdated: string;
}

// Credentials
export interface Credential {
  id: string;
  name: string;
  type: 'mandatory' | 'optional';
  status: 'active' | 'expiring' | 'pending' | 'expired';
  regNumber: string;
  expiryDate: string;
  daysUntilExpiry?: number;
  apiSource?: string;
  category: string;
  icon: string;
  impact?: {
    scoreDelta: number;
    tier: string;
  };
}

export interface CredentialUpload {
  id: string;
  credentialId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  verificationNotes?: string;
}

// Disputes
export interface Dispute {
  id: string;
  jobId: string;
  title: string;
  category: string;
  status: 'active' | 'under_review' | 'resolved' | 'appealed';
  homeowner: {
    name: string;
    id: string;
  };
  vendor: {
    name: string;
    id: string;
    certification: string;
  };
  amount: number;
  escrowFrozen: boolean;
  filedAt: string;
  description: string;
  slaDeadline: string;
  timeRemaining: {
    hours: number;
    minutes: number;
    seconds: number;
    progress: number;
  };
  aiAssessment?: AIAssessment;
  evidence: Evidence[];
  auditTrail: AuditEvent[];
}

export interface AIAssessment {
  confidence: number;
  vendorShare: number;
  homeownerShare: number;
  vendorAmount: number;
  homeownerAmount: number;
  reasoning: string;
  suggestedAt: string;
}

export interface Evidence {
  id: string;
  name: string;
  type: 'auto' | 'upload';
  source: string;
  meta: string;
  uploadedAt?: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  actorType: 'ai' | 'system' | 'human';
  action: string;
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  timestamp: string;
}
