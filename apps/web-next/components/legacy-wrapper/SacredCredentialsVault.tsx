/**
 * SACRED CREDENTIALS VAULT - 100% Visual Parity
 * 
 * This component uses EXACT HTML/CSS from vendor-credentials-vault.html
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './SacredCredentialsVault.module.css';

interface SacredCredentialsVaultProps {
  data: Record<string, any>;
  isLoading?: boolean;
  error?: Error | null;
  onUpload?: (file: File, credentialId: string) => Promise<void>;
  onQuickRenew?: (credentialId: string) => Promise<void>;
  uploadingId?: string | null;
}

// EXACT HTML from vendor-credentials-vault.html (extracted)
const VAULT_HTML = `
<div id="sacredCredentialsVault" class="vault-container" data-theme="dark">
  <!-- Hero Section -->
  <div class="page-hero">
    <div class="page-hero-bg"></div>
    <div class="hero-shield">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
      </svg>
    </div>
    <div class="hero-text">
      <div class="hero-eyebrow">
        <div class="hero-eyebrow-dot"></div>
        TradeMatch Trust Architecture · Real-Time Verification
      </div>
      <h1 class="hero-title">Credentials Vault</h1>
      <p class="hero-sub">Your "Verified for Life" digital passport. Live API integrations with NICEIC, Gas Safe, and Companies House mean no document can be forged.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" data-action="upload">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
          </svg>
          Upload New Document
        </button>
        <button class="btn btn-secondary" data-action="view">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Public Verification View
        </button>
        <button class="btn btn-ghost" data-action="export">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
          </svg>
          Export Vault PDF
        </button>
      </div>
    </div>
  </div>

  <!-- Vault Score Bar -->
  <div class="vault-score-bar">
    <div class="vss-item">
      <div class="vss-label">Vault Score</div>
      <div class="vss-value green" id="vaultScoreValue">8.7</div>
      <div class="vss-sub">/ 10 composite</div>
    </div>
    <div class="vss-divider"></div>
    <div class="vss-item">
      <div class="vss-label">Docs Verified</div>
      <div class="vss-value" id="docsVerified">4 / 6</div>
      <div class="vss-sub">2 pending upload</div>
    </div>
    <div class="vss-divider"></div>
    <div class="vss-item">
      <div class="vss-label">Next Expiry</div>
      <div class="vss-value amber" id="nextExpiry">28 days</div>
      <div class="vss-sub">PLI · Auto-renew available</div>
    </div>
    <div class="vss-divider"></div>
    <div class="vss-item">
      <div class="vss-label">Escrow Status</div>
      <div class="vss-value green">✓ Ready</div>
      <div class="vss-sub">Milestones unlocked</div>
    </div>
    <div class="vss-divider"></div>
    <div class="vss-item">
      <div class="vss-label">Lead Tier</div>
      <div class="vss-value blue">£8k max</div>
      <div class="vss-sub">Upload 2 docs → £10k+</div>
    </div>
    <div class="vss-divider"></div>
    <div class="vetting-progress-wrap">
      <div class="vetting-progress-top">
        <div class="vetting-progress-label">Elite Verified Progress</div>
        <div class="vetting-progress-pct" id="eliteProgressPct">74%</div>
      </div>
      <div class="vetting-track">
        <div class="vetting-fill" id="vettingFill" data-width="74%" style="width: 74%"></div>
      </div>
      <div class="vetting-milestones">
        <div class="vm"><div class="vm-dot reached"></div><span>Basic</span></div>
        <div class="vm"><div class="vm-dot reached"></div><span>Verified</span></div>
        <div class="vm"><div class="vm-dot current"></div><span>Pro</span></div>
        <div class="vm"><div class="vm-dot"></div><span>Elite</span></div>
        <div class="vm"><div class="vm-dot"></div><span>Gold</span></div>
      </div>
    </div>
  </div>

  <!-- Credentials List -->
  <div class="credentials-section">
    <div class="section-header">
      <div class="section-eyebrow">Mandatory · Live API Verified</div>
      <h2 class="section-title">Trade Certifications & Regulatory Status</h2>
      <p class="section-subtitle">Pulled live from NICEIC, Gas Safe Register, and Companies House</p>
    </div>
    <div class="credentials-list" id="credentialsList">
      <!-- Populated by hydration -->
    </div>
  </div>
</div>
`;

// EXACT CSS from vendor-credentials-vault.html
const VAULT_CSS = `
/* ── VARIABLES ── */
:root {
  --bg-primary: #080C12;
  --bg-secondary: #0E1420;
  --bg-tertiary: #141B28;
  --bg-card: #111827;
  --neon: #00E5A0;
  --neon-dim: rgba(0,229,160,0.1);
  --neon-glow: 0 0 28px rgba(0,229,160,0.35);
  --neon-glow-sm: 0 0 14px rgba(0,229,160,0.22);
  --accent-blue: #42A5F5;
  --accent-amber: #FFA726;
  --accent-danger: #FF4757;
  --text-1: #F0F4FF;
  --text-2: #8B95AA;
  --text-3: #4A5568;
  --border: rgba(255,255,255,0.07);
  --border-2: rgba(255,255,255,0.12);
  --border-neon: rgba(0,229,160,0.25);
  --ff: 'Sora', sans-serif;
  --fb: 'DM Sans', sans-serif;
  --fm: 'JetBrains Mono', monospace;
}

/* ── CONTAINER ── */
.vault-container {
  font-family: var(--fb);
  background: var(--bg-primary);
  color: var(--text-1);
  min-height: 100vh;
}

/* ── PAGE HERO ── */
.page-hero {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  padding: 36px 40px 32px;
  position: relative;
  overflow: hidden;
}

.page-hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 700px 400px at 20% 10%, rgba(0,229,160,0.04) 0%, transparent 70%),
              radial-gradient(ellipse 500px 400px at 80% 80%, rgba(66,165,245,0.03) 0%, transparent 70%);
  pointer-events: none;
}

.hero-shield {
  width: 80px;
  height: 80px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(0,229,160,0.12), rgba(66,165,245,0.08));
  border: 1.5px solid rgba(0,229,160,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.hero-shield svg {
  width: 38px;
  height: 38px;
  color: var(--neon);
  stroke-width: 1.5;
}

.hero-eyebrow {
  font-family: var(--fm);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--neon);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.hero-eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--neon);
  animation: blink 1.4s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.hero-title {
  font-family: var(--ff);
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: var(--text-1);
  margin-bottom: 8px;
}

.hero-sub {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
  max-width: 560px;
  margin-bottom: 20px;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* ── BUTTONS ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--ff);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  border-radius: 10px;
  padding: 9px 18px;
  cursor: pointer;
  border: none;
  transition: all 0.22s;
  white-space: nowrap;
}

.btn svg { width: 14px; height: 14px; stroke-width: 2; }

.btn-primary {
  background: linear-gradient(135deg, #007a3d, var(--neon));
  color: #fff;
  box-shadow: var(--neon-glow-sm);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--neon-glow);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-1);
  border: 1px solid var(--border-2);
}

.btn-secondary:hover {
  background: var(--neon-dim);
  border-color: var(--border-neon);
  color: var(--neon);
}

.btn-ghost {
  background: transparent;
  color: var(--text-2);
  border: 1px solid var(--border);
}

.btn-ghost:hover {
  background: var(--neon-dim);
  color: var(--neon);
  border-color: var(--border-neon);
}

/* ── VAULT SCORE BAR ── */
.vault-score-bar {
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 20px 40px;
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
  position: relative;
}

.vault-score-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #007a3d, var(--neon) 35%, var(--accent-blue) 65%, rgba(66,165,245,0.2));
}

.vss-item { flex-shrink: 0; }

.vss-divider {
  width: 1px;
  height: 44px;
  background: var(--border-2);
  flex-shrink: 0;
}

.vss-label {
  font-family: var(--fm);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 4px;
}

.vss-value {
  font-family: var(--ff);
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--text-1);
}

.vss-value.green { color: var(--neon); }
.vss-value.amber { color: var(--accent-amber); }
.vss-value.blue { color: var(--accent-blue); }

.vss-sub {
  font-size: 11px;
  color: var(--text-3);
}

/* ── VETTING PROGRESS ── */
.vetting-progress-wrap { flex: 1; min-width: 320px; }

.vetting-progress-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.vetting-progress-label {
  font-family: var(--fm);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-2);
}

.vetting-progress-pct {
  font-family: var(--ff);
  font-size: 13px;
  font-weight: 800;
  color: var(--neon);
}

.vetting-track {
  height: 10px;
  background: var(--bg-tertiary);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 6px;
}

.vetting-fill {
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #007a3d, var(--neon) 60%, rgba(0,229,160,0.6));
  transition: width 0.5s ease;
  position: relative;
}

.vetting-fill::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--neon);
  border: 2px solid var(--bg-secondary);
  box-shadow: 0 0 10px rgba(0,229,160,0.5);
}

.vetting-milestones {
  display: flex;
  justify-content: space-between;
}

.vm {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.vm-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-3);
  transition: all 0.3s;
}

.vm-dot.reached {
  background: var(--neon);
  box-shadow: 0 0 6px rgba(0,229,160,0.6);
}

.vm-dot.current {
  background: var(--neon);
  box-shadow: 0 0 10px rgba(0,229,160,0.8);
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(0,229,160,0.8); }
  50% { box-shadow: 0 0 18px rgba(0,229,160,1); }
}

.vm span {
  font-family: var(--fm);
  font-size: 9px;
  color: var(--text-3);
}

/* ── CREDENTIALS SECTION ── */
.credentials-section {
  padding: 32px 40px;
  max-width: 1320px;
}

.section-header { margin-bottom: 20px; }

.section-eyebrow {
  font-family: var(--fm);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--neon);
  margin-bottom: 4px;
}

.section-title {
  font-family: var(--ff);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-1);
}

.section-subtitle {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 2px;
}

.credentials-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.credential-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  transition: all 0.2s;
}

.credential-item:hover {
  border-color: var(--border-2);
  background: var(--bg-card-hover);
}

.credential-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.credential-icon svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.credential-info { flex: 1; min-width: 0; }

.credential-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
  margin-bottom: 3px;
}

.credential-meta {
  font-size: 11px;
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: 8px;
}

.credential-status {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 20px;
  font-family: var(--fm);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.status-active {
  background: rgba(0,229,160,0.1);
  color: var(--neon);
  border: 1px solid rgba(0,229,160,0.25);
}

.status-expiring {
  background: rgba(255,167,38,0.1);
  color: var(--accent-amber);
  border: 1px solid rgba(255,167,38,0.25);
}

.status-pending {
  background: rgba(66,165,245,0.1);
  color: var(--accent-blue);
  border: 1px solid rgba(66,165,245,0.25);
}

.upload-btn {
  padding: 7px 13px;
  border-radius: 8px;
  font-family: var(--ff);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-1);
}

.upload-btn:hover {
  background: var(--neon-dim);
  border-color: var(--border-neon);
  color: var(--neon);
}
`;

export default function SacredCredentialsVault({
  data = {},
  isLoading = false,
  error = null,
  onUpload,
  onQuickRenew,
  uploadingId,
}: SacredCredentialsVaultProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate data
  useEffect(() => {
    if (!containerRef.current || isLoading || !data) return;

    const container = containerRef.current;

    // Update score values
    const scoreEl = container.querySelector('#vaultScoreValue');
    if (scoreEl && data.vaultScore !== undefined) {
      scoreEl.textContent = data.vaultScore.toFixed(1);
    }

    const docsEl = container.querySelector('#docsVerified');
    if (docsEl && data.documentsVerified !== undefined) {
      docsEl.textContent = `${data.documentsVerified} / ${data.documentsTotal || 6}`;
    }

    const expiryEl = container.querySelector('#nextExpiry');
    if (expiryEl && data.nextExpiryDays !== undefined) {
      expiryEl.textContent = `${data.nextExpiryDays} days`;
    }

    // Update progress
    const progressBar = container.querySelector('#vettingFill') as HTMLElement;
    if (progressBar && data.eliteProgress !== undefined) {
      progressBar.style.width = `${data.eliteProgress}%`;
      progressBar.setAttribute('data-width', `${data.eliteProgress}%`);
    }

    const progressPct = container.querySelector('#eliteProgressPct');
    if (progressPct && data.eliteProgress !== undefined) {
      progressPct.textContent = `${data.eliteProgress}%`;
    }

    // Render credentials
    const listEl = container.querySelector('#credentialsList');
    if (listEl && data.credentials) {
      listEl.innerHTML = data.credentials.map((cred: any) => `
        <div class="credential-item" data-credential-id="${cred.id}">
          <div class="credential-icon" style="
            background: ${cred.status === 'active' ? 'rgba(0,229,160,0.1)' : cred.status === 'expiring' ? 'rgba(255,167,38,0.1)' : '#0E1420'};
            border: 1px solid ${cred.status === 'active' ? 'rgba(0,229,160,0.25)' : cred.status === 'expiring' ? 'rgba(255,167,38,0.25)' : 'rgba(255,255,255,0.07)'};
          ">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: ${cred.status === 'active' ? '#00E5A0' : cred.status === 'expiring' ? '#FFA726' : '#4A5568'}">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
            </svg>
          </div>
          <div class="credential-info">
            <div class="credential-name">${cred.name}</div>
            <div class="credential-meta">
              <span style="color: ${cred.status === 'expiring' ? '#FFA726' : '#00E5A0'}">${cred.regNumber || 'Pending verification'}</span>
              ${cred.expiryDate ? `· Expires ${cred.expiryDate}` : ''}
              ${cred.apiSource ? `· <span style="color: #4A5568">${cred.apiSource}</span>` : ''}
            </div>
          </div>
          <span class="credential-status status-${cred.status}">
            ${cred.status === 'active' ? '✓ Active' : cred.status === 'expiring' ? '⚠ Expiring' : '⏳ Upload Required'}
          </span>
          ${cred.status === 'expiring' || cred.status === 'pending' ? `
            <button class="upload-btn" data-credential-id="${cred.id}">
              ${cred.status === 'expiring' ? 'Quick-Renew' : 'Upload'}
            </button>
          ` : ''}
        </div>
      `).join('');
    }

    // Attach event listeners
    const uploadBtns = container.querySelectorAll('[data-action="upload"]');
    uploadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Trigger file upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.png';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file && onUpload) {
            onUpload(file, 'new-document');
          }
        };
        input.click();
      });
    });

    const credentialUploadBtns = container.querySelectorAll('.upload-btn');
    credentialUploadBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const credentialId = (e.currentTarget as HTMLElement).dataset.credentialId;
        const cred = data.credentials?.find((c: any) => c.id === credentialId);
        if (cred?.status === 'expiring' && onQuickRenew) {
          onQuickRenew(credentialId!);
        } else if (cred?.status === 'pending') {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pdf,.jpg,.png';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && onUpload) {
              onUpload(file, credentialId!);
            }
          };
          input.click();
        }
      });
    });

    setIsHydrated(true);
  }, [data, isLoading, onUpload, onQuickRenew]);

  if (error) {
    return (
      <div className={styles.errorOverlay}>
        <div className={styles.errorIcon}>⚠️</div>
        <h3>Failed to load vault</h3>
        <p>{error.message}</p>
        <button className={styles.retryBtn} onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <style>{VAULT_CSS}</style>
      
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <span className={styles.loadingText}>Loading Vault...</span>
        </div>
      )}
      
      <div
        ref={containerRef}
        className={`${styles.content} ${isHydrated ? styles.hydrated : ''}`}
        dangerouslySetInnerHTML={{ __html: VAULT_HTML }}
      />
      
      {uploadingId && (
        <div className={styles.uploadOverlay}>
          <div className={styles.spinner}></div>
          <span>Uploading...</span>
        </div>
      )}
    </div>
  );
}
