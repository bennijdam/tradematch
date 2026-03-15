'use client';

import { useEffect, useState } from 'react';
import { LegacyWrapper } from '@/components/legacy-wrapper/LegacyWrapper';
import { useVendorStats } from '@/lib/hooks/useVendorData';
import { acceptAISettlement, uploadEvidence } from '@/lib/hooks/useDisputes';
import { uploadCredentialDocument, triggerQuickRenew } from '@/lib/hooks/useCredentials';

// HTML Content - In production, this would be fetched from the server or imported
// For now, we'll reference the public file
const VENDOR_DASHBOARD_HTML = `
<div id="vendorDashboard" data-theme="dark">
  <!-- Original HTML structure with IDs added for hydration -->
  <div class="sb-logo">
    <div class="logo-m">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"/>
      </svg>
    </div>
    <div class="logo-t">Trade<span>Match</span></div>
  </div>
  
  <!-- Stats Section -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(0,229,160,0.1); border-color: rgba(0,229,160,0.25);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: #00E5A0;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.703 1.635-1.54 1.635H5.25a1.54 1.54 0 01-1.54-1.635v-4.25m16.5 0c0-1.094-.703-1.635-1.54-1.635H5.25a1.54 1.54 0 01-1.54 1.635v-4.25m16.5 0V5.25A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25v8.75m18 0V13.5"/>
        </svg>
      </div>
      <div class="stat-value" id="activeJobs">5</div>
      <div class="stat-label">Active Jobs</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(255,167,38,0.1); border-color: rgba(255,167,38,0.25);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: #FFA726;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>
        </svg>
      </div>
      <div class="stat-value" id="newLeads">12</div>
      <div class="stat-label">New Leads</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(66,165,245,0.1); border-color: rgba(66,165,245,0.25);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: #42A5F5;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v15"/>
        </svg>
      </div>
      <div class="stat-value" id="escrowBalance">£8,450</div>
      <div class="stat-label">Escrow Balance</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(156,95,233,0.1); border-color: rgba(156,95,233,0.25);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: #9C5FE9;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
        </svg>
      </div>
      <div class="stat-value" id="reliabilityScore">94.2%</div>
      <div class="stat-label">Reliability Score</div>
    </div>
  </div>
  
  <!-- Vault Score Section -->
  <div class="vault-card">
    <div class="vault-header">
      <div class="vault-title">Vault Score</div>
      <div class="vault-subtitle">TradeMatch Trust Architecture</div>
    </div>
    <div class="vault-content">
      <div class="vault-score-display">
        <div class="vault-score-value" id="vaultScore">8.7</div>
        <div class="vault-score-max">/ 10</div>
      </div>
      <div class="vault-progress">
        <div class="vault-progress-bar" id="eliteProgress" style="width: 74%;"></div>
      </div>
      <div class="vault-milestones">
        <div class="milestone" data-milestone="1">
          <div class="milestone-dot"></div>
          <div class="milestone-label">Basic</div>
        </div>
        <div class="milestone" data-milestone="2">
          <div class="milestone-dot"></div>
          <div class="milestone-label">Verified</div>
        </div>
        <div class="milestone" data-milestone="3">
          <div class="milestone-dot milestone-current"></div>
          <div class="milestone-label">Pro</div>
        </div>
        <div class="milestone" data-milestone="4">
          <div class="milestone-dot"></div>
          <div class="milestone-label">Elite</div>
        </div>
        <div class="milestone" data-milestone="5">
          <div class="milestone-dot"></div>
          <div class="milestone-label">Gold</div>
        </div>
      </div>
      <div class="vault-actions">
        <div class="vault-stat">
          <div class="vault-stat-label">Documents</div>
          <div class="vault-stat-value" id="documentsVerified">4 / 6</div>
        </div>
        <div class="vault-stat">
          <div class="vault-stat-label">Next Expiry</div>
          <div class="vault-stat-value" id="nextExpiry">28 days</div>
        </div>
        <button class="vault-btn" data-action="viewVault">
          View Credentials
        </button>
      </div>
    </div>
  </div>
</div>
`;

// CSS extracted from original HTML (simplified for demo)
const VENDOR_DASHBOARD_CSS = `
  :root {
    --neon: #00E5A0;
    --text-1: #F0F4FF;
    --text-2: #8B95AA;
    --bg-card: #111827;
    --border: rgba(255,255,255,0.07);
  }
  
  #vendorDashboard {
    font-family: 'Sora', sans-serif;
    background: #080C12;
    min-height: 100vh;
    padding: 24px;
  }
  
  .sb-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
  }
  
  .logo-m {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #007a3d, var(--neon));
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .logo-m svg {
    width: 20px;
    height: 20px;
    color: white;
  }
  
  .logo-t {
    font-family: 'Sora', sans-serif;
    font-weight: 800;
    font-size: 1.05rem;
    color: var(--text-1);
  }
  
  .logo-t span {
    color: var(--neon);
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 32px;
  }
  
  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 22px;
    transition: all 0.25s ease;
  }
  
  .stat-card:hover {
    transform: translateY(-3px);
    border-color: rgba(255,255,255,0.12);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }
  
  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    border: 1px solid;
  }
  
  .stat-icon svg {
    width: 20px;
    height: 20px;
  }
  
  .stat-value {
    font-family: 'Sora', sans-serif;
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  
  .stat-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-2);
  }
  
  .vault-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
  }
  
  .vault-header {
    margin-bottom: 20px;
  }
  
  .vault-title {
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: var(--text-1);
  }
  
  .vault-subtitle {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--neon);
    margin-top: 4px;
  }
  
  .vault-content {
    display: flex;
    align-items: center;
    gap: 24px;
  }
  
  .vault-score-display {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  
  .vault-score-value {
    font-family: 'Sora', sans-serif;
    font-size: 3rem;
    font-weight: 900;
    color: var(--neon);
  }
  
  .vault-score-max {
    font-family: 'Sora', sans-serif;
    font-size: 1rem;
    color: var(--text-2);
  }
  
  .vault-progress {
    flex: 1;
    height: 10px;
    background: #141B28;
    border-radius: 5px;
    overflow: hidden;
  }
  
  .vault-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #007a3d, var(--neon));
    border-radius: 5px;
    transition: width 0.5s ease;
  }
  
  .vault-milestones {
    display: flex;
    justify-content: space-between;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }
  
  .milestone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  
  .milestone-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4A5568;
    transition: all 0.3s ease;
  }
  
  .milestone-dot.milestone-current {
    background: var(--neon);
    box-shadow: 0 0 8px rgba(0, 229, 160, 0.5);
  }
  
  .milestone-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--text-2);
    text-transform: uppercase;
  }
  
  .vault-actions {
    display: flex;
    gap: 20px;
    align-items: center;
    margin-left: auto;
  }
  
  .vault-stat {
    text-align: center;
  }
  
  .vault-stat-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    text-transform: uppercase;
    color: var(--text-2);
    margin-bottom: 4px;
  }
  
  .vault-stat-value {
    font-family: 'Sora', sans-serif;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-1);
  }
  
  .vault-btn {
    padding: 10px 18px;
    background: linear-gradient(135deg, #007a3d, var(--neon));
    border: none;
    border-radius: 10px;
    color: white;
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 0 14px rgba(0, 229, 160, 0.22);
  }
  
  .vault-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 28px rgba(0, 229, 160, 0.35);
  }
`;

export function VendorDashboardShell() {
  const vendorId = 'current-vendor-id'; // TODO: Get from auth context
  const { stats, isLoading, isError, mutate } = useVendorStats(vendorId);

  // Prepare hydration data
  const hydrationData = stats ? {
    activeJobs: stats.activeJobs,
    newLeads: stats.newLeads,
    escrowBalance: stats.escrowBalance,
    reliabilityScore: `${stats.reliabilityScore}%`,
    vaultScore: stats.vaultScore,
    eliteProgress: stats.eliteProgress,
    documentsVerified: { verified: stats.documentsVerified, total: stats.documentsTotal },
    nextExpiry: { days: stats.nextExpiryDays },
  } : {};

  const handleAction = async (action: string, payload: any) => {
    console.log('Action:', action, payload);
    
    switch (action) {
      case 'viewVault':
        window.location.href = '/dashboards/vendor/credentials';
        break;
      case 'quickRenew':
        await triggerQuickRenew(vendorId, payload);
        mutate();
        break;
      case 'upload':
        // File upload handled by separate component
        break;
      case 'acceptAI':
        await acceptAISettlement(payload.disputeId, vendorId, payload.split);
        mutate();
        break;
      default:
        console.warn('Unknown action:', action);
    }
  };

  return (
    <LegacyWrapper
      htmlContent={VENDOR_DASHBOARD_HTML}
      cssContent={VENDOR_DASHBOARD_CSS}
      data={hydrationData}
      isLoading={isLoading}
      error={isError}
      onAction={handleAction}
    />
  );
}
