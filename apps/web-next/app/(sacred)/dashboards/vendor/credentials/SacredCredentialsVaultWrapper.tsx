'use client';

import { useState } from 'react';
import SacredCredentialsVault from '@/components/legacy-wrapper/SacredCredentialsVault';
import { useCredentials } from '@/lib/hooks/useCredentials';
import { useAuth } from '@/hooks/useAuth';
import { uploadCredentialDocument, triggerQuickRenew } from '@/lib/hooks/useCredentials';

export function SacredCredentialsVaultWrapper() {
  const { user } = useAuth();
  const vendorId = user?.id || 'demo-vendor-id';
  
  const { credentials, isLoading, isError, mutate } = useCredentials(vendorId);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  
  // Prepare hydration data
  const vaultData = credentials ? {
    vaultScore: 8.7,
    documentsVerified: credentials.filter(c => c.status === 'active').length,
    documentsTotal: credentials.length,
    nextExpiryDays: 28,
    escrowStatus: 'ready',
    leadTier: '£8k max',
    eliteProgress: 74,
    credentials: credentials,
  } : {};

  const handleUpload = async (file: File, credentialId: string) => {
    setUploadingId(credentialId);
    try {
      const result = await uploadCredentialDocument(vendorId, credentialId, file);
      if (result.success) {
        mutate(); // Refresh data
      }
    } finally {
      setUploadingId(null);
    }
  };

  const handleQuickRenew = async (credentialId: string) => {
    const result = await triggerQuickRenew(vendorId, credentialId);
    if (result.success) {
      window.open(result.data.redirectUrl, '_blank');
    }
  };

  return (
    <SacredCredentialsVault
      data={vaultData}
      isLoading={isLoading}
      error={isError}
      onUpload={handleUpload}
      onQuickRenew={handleQuickRenew}
      uploadingId={uploadingId}
    />
  );
}
