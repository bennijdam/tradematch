export type UserRole = 'customer' | 'vendor';

export type JobStatus =
  | 'Pending'
  | 'Quoted'
  | 'Accepted'
  | 'In Progress'
  | 'Completed';

export interface CustomerJobRequest {
  id: string;
  title: string;
  postcode: string;
  status: JobStatus;
  budget: number;
}

export interface VendorLeadNotification {
  leadId: string;
  jobRequestId: string;
  title: string;
  budget: number;
  unread: boolean;
}
