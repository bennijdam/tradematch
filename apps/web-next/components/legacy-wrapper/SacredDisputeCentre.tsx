/**
 * SACRED DISPUTE CENTRE - 100% Visual Parity
 * 
 * Uses EXACT HTML/CSS from vendor-dispute-centre.html
 * Includes live SLA countdown timer
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './SacredDisputeCentre.module.css';

interface SacredDisputeCentreProps {
  data: Record<string, any>;
  isLoading?: boolean;
  error?: Error | null;
  settlementSplit?: number;
  onSettlementChange?: (split: number) => void;
  onAcceptAI?: () => Promise<void>;
  onProposeCustom?: (vendorShare: number, reason: string) => Promise<void>;
  onEvidenceUpload?: (file: File, description: string) => Promise<void>;
}

// EXACT CSS from vendor-dispute-centre.html (simplified for component)
const DISPUTE_CSS = `
/* ── VARIABLES ── */
:root {
  --bg-primary: #080C12;
  --bg-secondary: #0E1420;
  --bg-tertiary: #141B28;
  --bg-card: #111827;
  --neon: #00E5A0;
  --neon-dim: rgba(0,229,160,0.1);
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

.dispute-container {
  font-family: var(--fb);
  background: var(--bg-primary);
  color: var(--text-1);
  min-height: 100vh;
}

/* Hero */
.hero {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  padding: 32px 40px;
  position: relative;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse 700px 400px at 20% 10%, rgba(255,71,87,0.03) 0%, transparent 70%),
    radial-gradient(ellipse 500px 400px at 80% 80%, rgba(66,165,245,0.03) 0%, transparent 70%);
  pointer-events: none;
}

.hero-icon {
  width: 72px; height: 72px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255,71,87,0.1), rgba(255,167,38,0.06));
  border: 1px solid rgba(255,71,87,0.25);
  display: flex; align-items: center; justify-content: center;
}

.hero-icon svg { width: 36px; height: 36px; color: var(--accent-danger); stroke-width: 1.5; }

.hero-eyebrow {
  font-family: var(--fm);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent-danger);
  margin-bottom: 8px;
  display: flex; align-items: center;
  gap: 6px;
}

.hero-eyebrow-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent-danger);
  animation: blink 1.4s infinite;
}

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

.hero-title {
  font-family: var(--ff);
  font-size: 1.9rem;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: var(--text-1);
}

/* Status Bar */
.status-bar {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  padding: 0 40px;
  display: flex;
  gap: 0;
}

.status-bar::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent-danger), var(--accent-amber) 40%, var(--neon) 80%, rgba(0,229,160,0.1));
}

.status-tab {
  padding: 14px 20px;
  font-family: var(--ff);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-3);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.18s;
  background: transparent;
  border: none;
  display: flex; align-items: center; gap: 8px;
}

.status-tab.active {
  color: var(--accent-danger);
  border-bottom-color: var(--accent-danger);
}

/* Content */
.content { padding: 28px 40px; max-width: 1320px; }

.two-col { display: grid; grid-template-columns: 1fr 380px; gap: 24px; }

/* SLA Countdown */
.sla-bar {
  background: linear-gradient(135deg, rgba(255,71,87,0.07), rgba(255,167,38,0.04));
  border-bottom: 1px solid rgba(255,71,87,0.15);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.sla-label {
  font-family: var(--fm);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--accent-danger);
}

.sla-clock { display: flex; align-items: center; gap: 6px; }

.sla-seg {
  background: var(--bg-secondary);
  border: 1px solid rgba(255,71,87,0.3);
  border-radius: 8px;
  padding: 8px 12px;
  text-align: center;
  min-width: 52px;
}

.sla-seg-val {
  font-family: var(--fm);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--accent-danger);
  letter-spacing: 0.05em;
}

.sla-seg-label {
  font-family: var(--fm);
  font-size: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-top: 2px;
}

.sla-colon {
  font-family: var(--fm);
  font-size: 1.2rem;
  color: rgba(255,71,87,0.5);
  font-weight: 700;
  animation: blink 1s infinite;
}

.sla-track-wrap { flex: 1; min-width: 200px; }

.sla-track-top {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-2);
  margin-bottom: 5px;
}

.sla-track {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 100px;
  overflow: hidden;
}

.sla-fill {
  height: 100%;
  border-radius: 100px;
  background: linear-gradient(90deg, var(--accent-danger), var(--accent-amber));
  transition: width 0.5s;
}

/* AI Assessment */
.ai-assess {
  background: linear-gradient(135deg, rgba(66,165,245,0.07), rgba(0,229,160,0.04));
  border: 1px solid rgba(66,165,245,0.25);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
}

.ai-label {
  font-family: var(--fm);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--accent-blue);
  margin-bottom: 8px;
  display: flex; align-items: center; gap: 6px;
}

.ai-title {
  font-family: var(--ff);
  font-size: 14px;
  font-weight: 800;
  color: var(--text-1);
  margin-bottom: 6px;
}

.ai-text {
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.6;
  margin-bottom: 14px;
}

/* Settlement Slider */
.settlement-wrap {
  background: rgba(0,0,0,0.15);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
}

.settlement-label {
  font-family: var(--fm);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-2);
  margin-bottom: 8px;
}

.settlement-bars {
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  height: 32px;
  margin-bottom: 8px;
}

.sb-vendor {
  background: linear-gradient(90deg, #007a3d, var(--neon));
  display: flex; align-items: center; justify-content: center;
  font-family: var(--fm);
  font-size: 10px;
  font-weight: 700;
  color: #000;
  transition: width 0.5s;
  min-width: 0;
  overflow: hidden;
}

.sb-owner {
  background: linear-gradient(90deg, rgba(255,71,87,0.6), rgba(255,71,87,0.3));
  display: flex; align-items: center; justify-content: center;
  font-family: var(--fm);
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  transition: width 0.5s;
  min-width: 0;
  overflow: hidden;
}

.settlement-legend {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-2);
}

.settlement-btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.s-btn {
  font-family: var(--fm);
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--border-2);
  background: var(--bg-secondary);
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.15s;
}

.s-btn:hover {
  border-color: var(--border-neon);
  color: var(--neon);
}

.s-btn.active {
  background: var(--neon-dim);
  color: var(--neon);
  border-color: var(--border-neon);
}

.accept-btn {
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  background: linear-gradient(135deg, #007a3d, var(--neon));
  border: none;
  border-radius: 10px;
  color: #fff;
  font-family: var(--ff);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 0 14px rgba(0,229,160,0.22);
}

.accept-btn:hover {
  box-shadow: 0 0 28px rgba(0,229,160,0.35);
}

/* Card */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}
`;

// EXACT HTML structure
const DISPUTE_HTML = `
<div id="sacredDisputeCentre" class="dispute-container" data-theme="dark">
  <!-- Hero -->
  <div class="hero">
    <div class="hero-bg"></div>
    <div style="display: flex; gap: 24px; align-items: center;">
      <div class="hero-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
        </svg>
      </div>
      <div>
        <div class="hero-eyebrow">
          <div class="hero-eyebrow-dot"></div>
          Trust & Safety · Judicial Branch
        </div>
        <h1 class="hero-title">Dispute Centre</h1>
        <p style="font-size: 14px; color: var(--text-2); max-width: 540px; margin-top: 6px;">
          The contractual 48-hour resolution guarantee. While Bark (1.3★) and MyBuilder (1.5★) leave users to settle conflicts alone, TradeMatch operates a data-driven, time-bound resolution engine.
        </p>
      </div>
    </div>
  </div>

  <!-- Status Tabs -->
  <div class="status-bar" style="position: relative;">
    <button class="status-tab active">All Disputes <span style="background: var(--text-3); color: var(--text-1); padding: 2px 6px; border-radius: 20px; font-size: 9px; margin-left: 6px;">4</span></button>
    <button class="status-tab">Active <span style="background: rgba(255,71,87,0.1); color: var(--accent-danger); padding: 2px 6px; border-radius: 20px; font-size: 9px; margin-left: 6px;">1</span></button>
    <button class="status-tab">Under Review <span style="background: rgba(255,167,38,0.1); color: var(--accent-amber); padding: 2px 6px; border-radius: 20px; font-size: 9px; margin-left: 6px;">1</span></button>
    <button class="status-tab">Resolved <span style="background: rgba(0,229,160,0.1); color: var(--neon); padding: 2px 6px; border-radius: 20px; font-size: 9px; margin-left: 6px;">2</span></button>
  </div>

  <!-- Content -->
  <div class="content">
    <div class="two-col">
      <!-- Left Column -->
      <div>
        <!-- Active Dispute Detail -->
        <div class="card" style="border-color: rgba(255,71,87,0.25);">
          <!-- SLA Timer -->
          <div class="sla-bar" style="margin: -24px -24px 20px -24px; border-radius: 16px 16px 0 0;">
            <div>
              <div class="sla-label">48h SLA Countdown</div>
              <div class="sla-clock" id="slaCountdown">
                <div class="sla-seg"><div class="sla-seg-val" id="slaHours">16</div><div class="sla-seg-label">Hours</div></div>
                <div class="sla-colon">:</div>
                <div class="sla-seg"><div class="sla-seg-val" id="slaMinutes">44</div><div class="sla-seg-label">Mins</div></div>
                <div class="sla-colon">:</div>
                <div class="sla-seg"><div class="sla-seg-val" id="slaSeconds">18</div><div class="sla-seg-label">Secs</div></div>
              </div>
            </div>
            <div class="sla-track-wrap">
              <div class="sla-track-top"><span>Filed 14:32 · 28 Feb</span><span>SLA Deadline 14:32 · 2 Mar</span></div>
              <div class="sla-track"><div class="sla-fill" id="slaProgress" style="width: 65%"></div></div>
            </div>
          </div>

          <!-- AI Assessment -->
          <div class="ai-assess">
            <div class="ai-label">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 13px; height: 13px; stroke-width: 2;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
              </svg>
              AI Pre-Assessment · Analyzed 5 evidence items
            </div>
            <div class="ai-title" id="aiTitle">Fair Settlement Suggestion: 70% Vendor / 30% Homeowner Refund</div>
            <div class="ai-text" id="aiText">
              <strong>Vendor position:</strong> GPS logs confirm full-day attendance. Milestone 1 was completed and signed off.<br><br>
              <strong>Homeowner position:</strong> Fault occurred 3 days post-completion. Vendor has not responded to remediation request.<br><br>
              <strong>AI assessment:</strong> Partial liability suggested. Recommend releasing £1,295 (70%) to vendor and refunding £555 (30%) to homeowner.
            </div>

            <!-- Settlement Slider -->
            <div class="settlement-wrap">
              <div class="settlement-label">Proposed Settlement Split</div>
              <div class="settlement-bars" id="settlementBars">
                <div class="sb-vendor" id="vendorBar" style="width: 70%">Jake D. · £1,295</div>
                <div class="sb-owner" id="homeownerBar" style="width: 30%">Sarah R. · £555</div>
              </div>
              <div class="settlement-legend">
                <span>Vendor gets: <span id="vendorPct">70%</span></span>
                <span>Homeowner refund: <span id="homeownerPct">30%</span></span>
              </div>
              <div class="settlement-btns" id="splitButtons">
                <button class="s-btn" data-split="50">50/50</button>
                <button class="s-btn" data-split="60">60/40</button>
                <button class="s-btn active" data-split="70">70/30</button>
                <button class="s-btn" data-split="80">80/20</button>
                <button class="s-btn" data-split="90">90/10</button>
              </div>
            </div>

            <button class="accept-btn" id="acceptAI" data-action="accept">
              Accept AI Suggestion
            </button>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div>
        <!-- Escrow Panel -->
        <div class="card" style="background: linear-gradient(135deg, rgba(255,71,87,0.07), rgba(255,167,38,0.04)); border-color: rgba(255,71,87,0.25);">
          <div style="font-family: var(--fm); font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--accent-danger); margin-bottom: 8px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent-danger); margin-right: 6px; animation: blink 1.2s infinite;"></span>
            Escrow Secured · Dispute #D-2847
          </div>
          <div style="font-family: var(--ff); font-size: 2rem; font-weight: 900; letter-spacing: -0.05em; color: var(--text-1); margin-bottom: 4px;">
            £<span id="escrowAmount">1,850</span>
            <span style="color: var(--accent-danger);"> Secured</span>
          </div>
          <div style="font-size: 12px; color: var(--text-2); margin-bottom: 14px;">Funds held in escrow pending resolution</div>
          
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
              <span style="font-size: 12px; color: var(--text-2); flex: 1;">Initial Payment</span>
              <span style="font-family: var(--ff); font-size: 13px; font-weight: 800; color: var(--text-1);">£555</span>
              <span style="font-family: var(--fm); font-size: 9px; padding: 2px 7px; border-radius: 20px; background: rgba(0,229,160,0.1); color: var(--neon); border: 1px solid rgba(0,229,160,0.25);">Released</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
              <span style="font-size: 12px; color: var(--text-2); flex: 1;">Milestone 1</span>
              <span style="font-family: var(--ff); font-size: 13px; font-weight: 800; color: var(--text-1);">£740</span>
              <span style="font-family: var(--fm); font-size: 9px; padding: 2px 7px; border-radius: 20px; background: rgba(0,229,160,0.1); color: var(--neon); border: 1px solid rgba(0,229,160,0.25);">Released</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,71,87,0.2); background: rgba(255,71,87,0.04);">
              <span style="font-size: 12px; color: var(--text-2); flex: 1;">Milestone 2</span>
              <span style="font-family: var(--ff); font-size: 13px; font-weight: 800; color: var(--text-1);">£555</span>
              <span style="font-family: var(--fm); font-size: 9px; padding: 2px 7px; border-radius: 20px; background: rgba(255,71,87,0.1); color: var(--accent-danger); border: 1px solid rgba(255,71,87,0.2);">Frozen</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`;

export default function SacredDisputeCentre({
  data = {},
  isLoading = false,
  error = null,
  settlementSplit = 70,
  onSettlementChange,
  onAcceptAI,
  onProposeCustom,
  onEvidenceUpload,
}: SacredDisputeCentreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 16, minutes: 44, seconds: 18 });
  const [progress, setProgress] = useState(65);

  // SLA Countdown Timer
  useEffect(() => {
    if (!data?.slaDeadline) return;
    
    const targetDate = new Date(data.slaDeadline).getTime();
    const totalDuration = 48 * 60 * 60 * 1000; // 48 hours
    const startTime = targetDate - totalDuration;

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setProgress(0);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const currentProgress = (diff / totalDuration) * 100;

      setTimeLeft({ hours, minutes, seconds });
      setProgress(currentProgress);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [data?.slaDeadline]);

  // Update DOM elements
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Update countdown
    const hoursEl = container.querySelector('#slaHours');
    const minsEl = container.querySelector('#slaMinutes');
    const secsEl = container.querySelector('#slaSeconds');
    const progressEl = container.querySelector('#slaProgress') as HTMLElement;

    if (hoursEl) hoursEl.textContent = String(timeLeft.hours).padStart(2, '0');
    if (minsEl) minsEl.textContent = String(timeLeft.minutes).padStart(2, '0');
    if (secsEl) secsEl.textContent = String(timeLeft.seconds).padStart(2, '0');
    if (progressEl) progressEl.style.width = `${progress}%`;
  }, [timeLeft, progress]);

  // Hydrate data
  useEffect(() => {
    if (!containerRef.current || isLoading || !data) return;

    const container = containerRef.current;

    // Update AI assessment
    const aiTitle = container.querySelector('#aiTitle');
    if (aiTitle && data.aiAssessment) {
      const { vendorShare, homeownerShare } = data.aiAssessment;
      aiTitle.textContent = `Fair Settlement Suggestion: ${vendorShare}% Vendor / ${homeownerShare}% Homeowner Refund`;
    }

    const aiText = container.querySelector('#aiText');
    if (aiText && data.aiAssessment?.reasoning) {
      aiText.innerHTML = data.aiAssessment.reasoning;
    }

    // Update escrow amount
    const escrowEl = container.querySelector('#escrowAmount');
    if (escrowEl && data.amount) {
      escrowEl.textContent = data.amount.toLocaleString();
    }

  }, [data, isLoading]);

  // Update settlement split
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const vendorBar = container.querySelector('#vendorBar') as HTMLElement;
    const homeownerBar = container.querySelector('#homeownerBar') as HTMLElement;
    const vendorPct = container.querySelector('#vendorPct');
    const homeownerPct = container.querySelector('#homeownerPct');
    const amount = data.amount || 1850;

    if (vendorBar) {
      vendorBar.style.width = `${settlementSplit}%`;
      vendorBar.textContent = `Jake D. · £${Math.round(amount * settlementSplit / 100).toLocaleString()}`;
    }
    if (homeownerBar) {
      homeownerBar.style.width = `${100 - settlementSplit}%`;
      homeownerBar.textContent = `Sarah R. · £${Math.round(amount * (100 - settlementSplit) / 100).toLocaleString()}`;
    }
    if (vendorPct) vendorPct.textContent = `${settlementSplit}%`;
    if (homeownerPct) homeownerPct.textContent = `${100 - settlementSplit}%`;

    // Update active button
    const buttons = container.querySelectorAll('[data-split]');
    buttons.forEach(btn => {
      const split = parseInt(btn.getAttribute('data-split') || '70');
      if (split === settlementSplit) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }, [settlementSplit, data?.amount]);

  // Attach event listeners
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Split buttons
    const splitBtns = container.querySelectorAll('[data-split]');
    splitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const split = parseInt(btn.getAttribute('data-split') || '70');
        onSettlementChange?.(split);
      });
    });

    // Accept AI button
    const acceptBtn = container.querySelector('#acceptAI');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        onAcceptAI?.();
      });
    }

    return () => {
      // Cleanup
      splitBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode?.replaceChild(newBtn, btn);
      });
    };
  }, [onSettlementChange, onAcceptAI]);

  if (error) {
    return (
      <div className={styles.errorOverlay}>
        <div className={styles.errorIcon}>⚠️</div>
        <h3>Failed to load disputes</h3>
        <p>{error.message}</p>
        <button className={styles.retryBtn} onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <style>{DISPUTE_CSS}</style>
      
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <span className={styles.loadingText}>Loading Disputes...</span>
        </div>
      )}
      
      <div
        ref={containerRef}
        className={styles.content}
        dangerouslySetInnerHTML={{ __html: DISPUTE_HTML }}
      />
    </div>
  );
}
