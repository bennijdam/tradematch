'use client';

import { useMemo, useState } from 'react';

export interface ActiveDispute {
  id: string;
  caseNumber: string;
  title: string;
  status: 'open' | 'review' | 'resolved';
  slaHoursRemaining: number;
  aiRecommendedVendorShare: number;
}

interface UseActiveDisputeResult {
  dispute: ActiveDispute | null;
  isLoading: boolean;
  isError: Error | null;
  mutate: () => void;
}

const DEMO_DISPUTE: ActiveDispute = {
  id: 'D-2847',
  caseNumber: 'D-2847',
  title: 'Milestone 2 quality disagreement',
  status: 'review',
  slaHoursRemaining: 18,
  aiRecommendedVendorShare: 70,
};

export function useActiveDispute(_disputeId: string): UseActiveDisputeResult {
  const [dispute] = useState<ActiveDispute | null>(DEMO_DISPUTE);
  const [isLoading] = useState<boolean>(false);
  const [isError] = useState<Error | null>(null);

  const mutate = () => {
    // Stub for parity with SWR-style API.
  };

  return useMemo(
    () => ({ dispute, isLoading, isError, mutate }),
    [dispute, isLoading, isError]
  );
}

export async function acceptAISettlement(
  _disputeId: string,
  _vendorId: string,
  _vendorShare: number
): Promise<{ success: boolean }> {
  return { success: true };
}

export async function proposeCustomSettlement(
  _disputeId: string,
  _vendorId: string,
  _vendorShare: number,
  _reason: string
): Promise<{ success: boolean }> {
  return { success: true };
}

export async function uploadEvidence(
  _disputeId: string,
  _file: File,
  _description: string
): Promise<{ success: boolean }> {
  return { success: true };
}
