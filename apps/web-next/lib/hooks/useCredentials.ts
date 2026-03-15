'use client';

import { useMemo, useState } from 'react';

export interface CredentialItem {
  id: string;
  name: string;
  issuer: string;
  status: 'active' | 'expiring' | 'expired' | 'pending';
  expiryDate: string;
}

interface UseCredentialsResult {
  credentials: CredentialItem[];
  isLoading: boolean;
  isError: Error | null;
  mutate: () => void;
}

const DEMO_CREDENTIALS: CredentialItem[] = [
  {
    id: 'cred-niceic',
    name: 'NICEIC Approved Contractor',
    issuer: 'NICEIC',
    status: 'active',
    expiryDate: '2026-11-30',
  },
  {
    id: 'cred-gassafe',
    name: 'Gas Safe Registration',
    issuer: 'Gas Safe Register',
    status: 'active',
    expiryDate: '2026-08-10',
  },
  {
    id: 'cred-pli',
    name: 'Public Liability Insurance',
    issuer: 'AXA',
    status: 'expiring',
    expiryDate: '2026-04-05',
  },
];

export function useCredentials(_vendorId: string): UseCredentialsResult {
  const [credentials] = useState<CredentialItem[]>(DEMO_CREDENTIALS);
  const [isLoading] = useState<boolean>(false);
  const [isError] = useState<Error | null>(null);

  const mutate = () => {
    // Stub for parity with SWR-style API.
  };

  return useMemo(
    () => ({ credentials, isLoading, isError, mutate }),
    [credentials, isLoading, isError]
  );
}

export async function uploadCredentialDocument(
  _vendorId: string,
  _credentialId: string,
  _file: File
): Promise<{ success: boolean }> {
  return { success: true };
}

export async function triggerQuickRenew(
  _vendorId: string,
  credentialId: string
): Promise<{ success: boolean; data: { redirectUrl: string } }> {
  return {
    success: true,
    data: {
      redirectUrl: `/dashboards/vendor/credentials?renew=${encodeURIComponent(credentialId)}`,
    },
  };
}
