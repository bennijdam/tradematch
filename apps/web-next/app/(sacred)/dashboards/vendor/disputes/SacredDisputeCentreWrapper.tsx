'use client';

import { useState } from 'react';
import SacredDisputeCentre from '@/components/legacy-wrapper/SacredDisputeCentre';
import { useActiveDispute } from '@/lib/hooks/useDisputes';
import { useAuth } from '@/hooks/useAuth';
import { acceptAISettlement, proposeCustomSettlement, uploadEvidence } from '@/lib/hooks/useDisputes';

export function SacredDisputeCentreWrapper() {
  const { user } = useAuth();
  const vendorId = user?.id || 'demo-vendor-id';
  const disputeId = 'D-2847'; // Active dispute
  
  const { dispute, isLoading, isError, mutate } = useActiveDispute(disputeId);
  const [settlementSplit, setSettlementSplit] = useState(70);
  
  const handleAcceptAI = async () => {
    const result = await acceptAISettlement(disputeId, vendorId, settlementSplit);
    if (result.success) {
      mutate(); // Refresh
    }
  };

  const handleProposeCustom = async (vendorShare: number, reason: string) => {
    const result = await proposeCustomSettlement(disputeId, vendorId, vendorShare, reason);
    if (result.success) {
      mutate();
    }
  };

  const handleEvidenceUpload = async (file: File, description: string) => {
    const result = await uploadEvidence(disputeId, file, description);
    if (result.success) {
      mutate();
    }
  };

  return (
    <SacredDisputeCentre
      data={dispute || {}}
      isLoading={isLoading}
      error={isError}
      settlementSplit={settlementSplit}
      onSettlementChange={setSettlementSplit}
      onAcceptAI={handleAcceptAI}
      onProposeCustom={handleProposeCustom}
      onEvidenceUpload={handleEvidenceUpload}
    />
  );
}
