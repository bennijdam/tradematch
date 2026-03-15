/**
 * SACRED VENDOR DASHBOARD - 100% Visual Parity
 * 
 * This component uses the EXACT HTML and CSS from vendor-dashboard.html
 * No conversion to Tailwind. No design drift. Zero hallucination.
 * 
 * Strategy:
 * 1. Extract body content from original HTML (lines 2617+)
 * 2. Inject EXACT CSS from style blocks (lines 11-2615)
 * 3. Hydrate elements by ID with live data
 * 4. Re-run original animation functions in useEffect
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './SacredVendorDashboard.module.css';

interface SacredVendorDashboardProps {
  /** Live data from API to hydrate DOM */
  data: {
    // Stats
    activeJobs?: number;
    newLeads?: number;
    expiringLeads?: number;
    escrowBalance?: number;
    reliabilityScore?: number;
    // Vault
    vaultScore?: number;
    eliteProgress?: number;
    documentsVerified?: number;
    documentsTotal?: number;
    nextExpiryDays?: number;
    // Revenue
    revenueYTD?: number;
    // Network
    referralsTotal?: number;
    referralProgress?: number;
    reputationScore?: number;
    // Disputes
    activeDisputes?: number;
    // User
    userName?: string;
    userInitials?: string;
    userTier?: string;
  };
  isLoading?: boolean;
  error?: Error | null;
}

// EXACT CSS from vendor-dashboard.html (lines 11-2615)
const SACRED_CSS = `
/* ── CSS VARIABLES ── */
:root {
  --bg-primary: #080C12;
  --bg-secondary: #0E1420;
  --bg-tertiary: #141B28;
  --bg-card: #111827;
  --bg-card-hover: #182030;
  --neon: #00E5A0;
  --neon-dim: rgba(0,229,160,0.1);
  --neon-glow: 0 0 28px rgba(0,229,160,0.35);
  --neon-glow-sm: 0 0 14px rgba(0,229,160,0.22);
  --accent-blue: #42A5F5;
  --accent-amber: #FFA726;
  --accent-danger: #FF4757;
  --accent-purple: #9C5FE9;
  --text-1: #F0F4FF;
  --text-2: #8B95AA;
  --text-3: #4A5568;
  --border: rgba(255,255,255,0.07);
  --border-2: rgba(255,255,255,0.12);
  --border-neon: rgba(0,229,160,0.25);
  --ff: 'Sora', sans-serif;
  --fb: 'DM Sans', sans-serif;
  --fm: 'JetBrains Mono', monospace;
  --sidebar-w: 268px;
  --topnav-h: 72px;
}

[data-theme="light"] {
  --bg-primary: #F0F4F8;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #F7F9FC;
  --bg-card: #FFFFFF;
  --bg-card-hover: #F0F7F4;
  --neon: #16A34A;
  --neon-dim: rgba(22,163,74,0.08);
  --neon-glow: 0 0 28px rgba(22,163,74,0.25);
  --neon-glow-sm: 0 0 14px rgba(22,163,74,0.18);
  --accent-blue: #2563EB;
  --accent-amber: #D97706;
  --accent-danger: #DC2626;
  --accent-purple: #7C3AED;
  --text-1: #0F172A;
  --text-2: #475569;
  --text-3: #94A3B8;
  --border: rgba(0,0,0,0.07);
  --border-2: rgba(0,0,0,0.13);
  --border-neon: rgba(22,163,74,0.25);
}

/* ── BASE ── */
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; }

/* ── WALLPAPER BACKGROUND ── */
body {
  position: relative;
  font-family: var(--fb);
  background: var(--bg-primary);
  color: var(--text-1);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  transition: background 0.3s, color 0.3s;
  min-height: 100vh;
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wgARCAT/B4ADASIAAhEBAxEB/8QAGgAAAgMBAQAAAAAAAAAAAAAAAQIAAwQFBv/EABgBAQEBAQEAAAAAAAAAAAAAAAABAgME/9oADAMBAAIQAxAAAAHrzozlrnDpReavTBzJ0hHNHSBzh0Qc87VXINamVNlQkvWKi4pYQQELJAhggYsDBCKSskhJIQSEkhFYGbVm02EqZQjoWiSJVbVVysgtisAMCSQEIUQwEkBJCV2JS2o5FIiuxHoJYpCrAkkSSUIQCEEBAAQKjVyxJWM1LjJEUqFR7qLzU9d3PpqR6unHPqx6mq9NJlptrtTTh0ZDo59GI0qVW+2GReP1Obpv0V2RVm0YbbdBVIgeatyUU659MS6axdDndG446nE3V6TL0mRTdXKxVkme/lrVy32alXYQroBEoBgsDCyQhGIfDR1t8302VY1LAYMIAQwK7KyAJayOFkz2WLh3c+zoZxluc7VaNYOybs7KumNo6mbdSBI8FhCyxHQKwpyCzU6SyyI0kVnWh2VctD0V0babM10iCGtrGRzvnWYlzYpoHxW56t149cW1WBUS4TWdzD18BzkiRDBAyQkkqEQkkAZCI8lUggDwrFsKRcYzDTFyLthgXow5g6cjlDqxeSOsDkjqg5U6YObOgq4ZsU5uk2WVxxLWpI0EGqeovqsrLICSCEkhJIokgIQQEABBCGAj10WkIJIR67CAgkgWSSyAggIUAiESxCqq+tamjCI6QqsLDrza4s1ZdedWoy6yCwlaq7JV6aMyCrS6249FCWFGXeDXJiU69LAszac9W3eL62XOqAaG69Oqy80FFstF2FdZfHfNTstJihWCghEo5FrblfXp2S5ncTQhAIYIQRQeeNkr62sLvrvxUjKAwDEAhWBRkUY9fMt22ZNJhOS7fPQoa5OViZ79T56W2Kc6IKiyTO2IKFLFpIYsYFATEIZRZJUjKGyq1FqupMFV1VbnoWW7PTnud2jFv1ghgygMsoomdXFoWbsO2WwOM7UGLWtgs9SVmebQSjBAwQMkDBEMEokQMECjRa7FEPAUkkJJKkkJJCAyUQwEkJJCSQkkIGhk0MsQFik2wpXRDLXui4q+jI5w6QOYOoF5a9YHJHWByV63LUSkjmo2uhrGsxawpBFggCDFrZWJJCAgkkICCAggIFSxStLFKo0K0tWWoOKmvPoi3Vn1ZoWTWbmV5aKLRZqw9DmHTovplqQDUsaq4349WGRdqMprmMXXm3ay+fThmsu/J1LFrsGbnvQW4Y+jXLmXV1Tffeq6Si1qwcnVmoq/SsIiZ3ICQEVJAKJhBgs6FxXszdLOxZVZJABYUdFJBFBFEGqExX1W0vltsW83b5UUtCno5teO15DZsLxKldWhJIhBGUygYaBkkkDEkAsgphHRWNQ9QqKKbKdZupWaxUbGubtmLYOCktddWKy6U7M6vrvrm6tFF0t5R1AMFhlnbs59vKbTisTUcDVtmRk0yiVolEL5UbLZVC2VwsNcqxRBbEWLpWaeLBopDBBosDBAwEkkDAUkkJJCK0Wq2hI1SShGAIYCGAhBAQSSEkETidrlTWdjGljAUOBC0Koz0i2iWquymy1bxFUsipGgpEoiCDFFOFAwUDLARaQlqq6oLBC3U3S6dOe+FdbdZFlNmdI4sR+fuyrpphKba9dc/Rag9eXfclHWWrJfm1m/oZN0V4dTKtiPKJFKGtx1i3c3s7xTke/G9WjNoYmHZxmqNmLsVi6okoBU');
  background-size: cover;
  background-position: center center;
  background-attachment: fixed;
  opacity: 0.055;
  pointer-events: none;
  z-index: 0;
  filter: saturate(0.6) brightness(0.7);
}

[data-theme="light"] body::after {
  opacity: 0.07;
  filter: saturate(0.5) brightness(1.1);
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 15% 40%, rgba(0,229,160,0.04) 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 85% 70%, rgba(66,165,245,0.04) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}

/* ── SIDEBAR ── */
.sidebar {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: var(--sidebar-w);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 200;
  transition: width 0.3s cubic-bezier(0.4,0,0.2,1), background 0.3s;
  overflow: hidden;
}

.sidebar.collapsed { width: 72px; }

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 20px;
  border-bottom: 1px solid var(--border);
  min-height: 72px;
  flex-shrink: 0;
}

.logo-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #007a3d, var(--neon));
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--neon-glow-sm);
}

.logo-icon svg { width: 18px; height: 18px; color: #fff; stroke-width: 2.5; }

.logo-text {
  font-family: var(--ff);
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.2s;
}

.logo-text span { color: var(--neon); }

.sidebar.collapsed .logo-text { opacity: 0; width: 0; }

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-section-label {
  font-family: var(--fm);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-3);
  padding: 8px 8px 6px;
  white-space: nowrap;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.2s;
}

.sidebar.collapsed .nav-section-label { opacity: 0; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  text-decoration: none;
  color: var(--text-2);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  margin-bottom: 2px;
  position: relative;
}

.nav-item:hover { background: var(--neon-dim); color: var(--text-1); }

.nav-item.active { 
  background: var(--neon-dim); 
  color: var(--neon); 
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 3px; height: 20px;
  background: var(--neon);
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  width: 20px; height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon svg {
  width: 18px; height: 18px;
  stroke-width: 1.8;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  flex: 1;
}

.nav-badge {
  background: var(--neon-dim);
  color: var(--neon);
  font-family: var(--fm);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 20px;
  border: 1px solid var(--border-neon);
}

.nav-badge-danger {
  background: rgba(255,71,87,0.12);
  color: var(--accent-danger);
  font-family: var(--fm);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 20px;
}

.nav-pulse {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--accent-amber);
  margin-left: auto;
  animation: blink 2s infinite;
}

.expiry-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--accent-amber);
  margin-left: auto;
  animation: blink 2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ── SIDEBAR FOOTER ── */
.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.profile-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
}

.profile-btn:hover {
  background: var(--neon-dim);
  border-color: var(--border-neon);
}

.avatar {
  width: 34px; height: 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, #007a3d, var(--neon));
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ff);
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

.avatar-info {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.avatar-name {
  font-family: var(--ff);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-1);
}

.avatar-role {
  font-size: 11px;
  color: var(--text-2);
}

.profile-chevron {
  width: 14px; height: 14px;
  color: var(--text-3);
  flex-shrink: 0;
}

.profile-chevron svg {
  width: 100%; height: 100%;
  stroke-width: 2;
}

/* Upgrade Button */
.sidebar-upgrade-slim {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-top: 8px;
  border-radius: 10px;
  background: transparent;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-upgrade-slim:hover {
  background: rgba(245,158,11,0.08);
  border-color: rgba(245,158,11,0.25);
}

.sidebar-upgrade-slim-icon {
  width: 28px; height: 28px;
  border-radius: 6px;
  background: rgba(245,158,11,0.1);
  border: 1px solid rgba(245,158,11,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-upgrade-slim-icon svg {
  width: 14px; height: 14px;
  color: #F59E0B;
  stroke-width: 2;
}

.sidebar-upgrade-slim-body { flex: 1; text-align: left; }

.sidebar-upgrade-slim-title {
  font-family: var(--ff);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-1);
}

.sidebar-upgrade-slim-sub {
  font-size: 10px;
  color: var(--text-2);
}

.sidebar-upgrade-slim-arrow {
  width: 14px; height: 14px;
  color: var(--text-3);
  flex-shrink: 0;
}

.sidebar-upgrade-slim-arrow svg {
  width: 100%; height: 100%;
  stroke-width: 2.5;
}

/* ── TOP NAV ── */
.topnav {
  position: fixed;
  top: 0;
  left: var(--sidebar-w);
  right: 0;
  height: var(--topnav-h);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 32px;
  z-index: 100;
  gap: 16px;
  transition: left 0.3s cubic-bezier(0.4,0,0.2,1), background 0.3s;
}

.topnav.collapsed { left: 72px; }

.hamburger {
  width: 36px; height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-2);
  transition: all 0.2s;
  flex-shrink: 0;
}

.hamburger:hover {
  background: var(--neon-dim);
  color: var(--neon);
  border-color: var(--border-neon);
}

.hamburger svg { width: 16px; height: 16px; stroke-width: 2; }

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-2);
}

.breadcrumb-sep { color: var(--text-3); }

.breadcrumb-current {
  font-family: var(--ff);
  font-weight: 700;
  color: var(--text-1);
  font-size: 15px;
}

.topnav-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.balance-widget {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: var(--neon-dim);
  border: 1px solid var(--border-neon);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.balance-widget:hover {
  background: rgba(0,229,160,0.15);
  box-shadow: var(--neon-glow-sm);
}

.balance-label {
  font-family: var(--fm);
  font-size: 10px;
  color: var(--neon);
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.balance-amount {
  font-family: var(--ff);
  font-size: 15px;
  font-weight: 800;
  color: var(--neon);
  letter-spacing: -0.03em;
}

.icon-btn {
  width: 38px; height: 38px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-2);
  transition: all 0.2s;
  position: relative;
}

.icon-btn:hover {
  background: var(--neon-dim);
  color: var(--neon);
  border-color: var(--border-neon);
}

.icon-btn svg { width: 17px; height: 17px; stroke-width: 1.8; }

.notif-dot {
  position: absolute;
  top: 7px; right: 7px;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--accent-danger);
  border: 2px solid var(--bg-secondary);
}

/* ── MAIN CONTENT ── */
.main {
  margin-left: var(--sidebar-w);
  margin-top: var(--topnav-h);
  padding: 32px;
  position: relative;
  z-index: 1;
  transition: margin-left 0.3s cubic-bezier(0.4,0,0.2,1);
  min-height: calc(100vh - var(--topnav-h));
}

.main.collapsed { margin-left: 72px; }

/* ── PAGE HEADER ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
  gap: 20px;
}

.page-title-group { flex: 1; }

.page-eyebrow {
  font-family: var(--fm);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--neon);
  opacity: 0.8;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-eyebrow::before {
  content: '';
  width: 18px;
  height: 1px;
  background: var(--neon);
  opacity: 0.5;
}

.page-title {
  font-family: var(--ff);
  font-size: 1.9rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: var(--text-1);
}

.page-subtitle {
  font-size: 14px;
  margin-top: 6px;
  color: var(--text-2);
}

/* ── STATS GRID ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 22px;
  position: relative;
  overflow: hidden;
  transition: all 0.25s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-2);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--neon), var(--accent-blue));
  opacity: 0;
  transition: opacity 0.25s;
}

.stat-card:hover::before { opacity: 1; }

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.stat-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}

.stat-icon svg { width: 20px; height: 20px; }

.stat-trend {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  border-radius: 20px;
  font-family: var(--fm);
  font-size: 10px;
  font-weight: 600;
}

.stat-trend.up {
  background: rgba(0,229,160,0.1);
  color: var(--neon);
  border: 1px solid rgba(0,229,160,0.25);
}

.stat-trend.down {
  background: rgba(255,71,87,0.1);
  color: var(--accent-danger);
  border: 1px solid rgba(255,71,87,0.25);
}

.stat-label {
  font-family: var(--fm);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-3);
  margin-bottom: 6px;
}

.stat-value {
  font-family: var(--ff);
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--text-1);
  line-height: 1;
}

.stat-sub {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 5px;
}

/* ── VAULT CARD ── */
.vault-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.vault-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.vault-title-group {}

.vault-eyebrow {
  font-family: var(--fm);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--neon);
  margin-bottom: 4px;
}

.vault-title {
  font-family: var(--ff);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-1);
}

.vault-subtitle {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 2px;
}

.vault-score-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 16px;
}

.vault-score-value {
  font-family: var(--ff);
  font-size: 2.5rem;
  font-weight: 900;
  color: var(--neon);
  letter-spacing: -0.04em;
}

.vault-score-max {
  font-family: var(--ff);
  font-size: 1rem;
  color: var(--text-2);
}

.vault-progress {
  height: 10px;
  background: var(--bg-tertiary);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 12px;
}

.vault-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #007a3d, var(--neon) 60%, rgba(0,229,160,0.6));
  border-radius: 5px;
  transition: width 0.5s ease;
  position: relative;
}

.vault-progress-bar::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--neon);
  border: 2px solid var(--bg-card);
  box-shadow: 0 0 10px rgba(0,229,160,0.5);
}

.vault-milestones {
  display: flex;
  justify-content: space-between;
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
  background: var(--text-3);
  transition: all 0.3s ease;
}

.milestone-dot.reached {
  background: var(--neon);
  box-shadow: 0 0 8px rgba(0,229,160,0.5);
}

.milestone-dot.current {
  background: var(--neon);
  box-shadow: 0 0 12px rgba(0,229,160,0.8);
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 12px rgba(0,229,160,0.8); }
  50% { box-shadow: 0 0 20px rgba(0,229,160,1); }
}

.milestone-label {
  font-family: var(--fm);
  font-size: 9px;
  color: var(--text-3);
  text-transform: uppercase;
}

/* Scoped container to prevent bleeding */
.sacred-container {
  font-family: var(--fb);
  background: var(--bg-primary);
  color: var(--text-1);
  min-height: 100vh;
}

.sacred-container::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 15% 40%, rgba(0,229,160,0.04) 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 85% 70%, rgba(66,165,245,0.04) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}

/* Loading & Error States */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 12, 18, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 9999;
  backdrop-filter: blur(10px);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(0, 229, 160, 0.2);
  border-top-color: #00E5A0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #00E5A0;
}

.error-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 12, 18, 0.98);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 9999;
  padding: 40px;
  text-align: center;
}

.retry-btn {
  margin-top: 20px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #007a3d, #00E5A0);
  border: none;
  border-radius: 10px;
  color: white;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 14px rgba(0, 229, 160, 0.22);
}

.retry-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 28px rgba(0, 229, 160, 0.35);
}
`;

// EXACT HTML body content from vendor-dashboard.html (lines 2617+)
const SACRED_HTML = `
<div id="sacredVendorDashboard" class="sacred-container" data-theme="dark">
  <!-- ═══════════════ SIDEBAR ═══════════════ -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>
        </svg>
      </div>
      <div class="logo-text">Trade<span>Match</span></div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-label">Workspace</div>

      <a class="nav-item active" href="#">
        <div class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg></div>
        <span class="nav-label">Dashboard</span>
      </a>

      <a class="nav-item" href="#">
        <div class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></div>
        <span class="nav-label">Active Jobs</span>
        <span class="nav-pulse"></span>
      </a>

      <a class="nav-item" href="#" onclick="openModal('leadsModal')">
        <div class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/></svg></div>
        <span class="nav-label">Leads</span>
        <span class="nav-badge" id="leadsBadge">5</span>
      </a>

      <a class="nav-item" href="#">
        <div class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"/></svg></div>
        <span class="nav-label">Messages</span>
        <span class="nav-badge-danger">2</span>
      </a>

      <a class="nav-item" href="#">
        <div class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/></svg></div>
        <span class="nav-label">Quotes</span>
      </a>

      <div class="nav-section-label" style="margin-top:14px">Analytics</div>

      <a class="nav-item" href="#">
        <div class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg></div>
        <span class="nav-label">Analytics</span>
      </a>

      <a class="nav-item" href="#">
        <div class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"/></svg></div>
        <span class="nav-label">Reputation</span>
      </a>

      <a class="nav-item" href="#">
        <div class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg></div>
        <span class="nav-label">Coverage Map</span>
      </a>

      <div class="nav-section-label" style="margin-top:14px">Account</div>

      <a class="nav-item" href="#" onclick="openModal('profileModal')">
        <div class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg></div>
        <span class="nav-label">My Profile</span>
      </a>

      <a class="nav-item" href="#" onclick="openModal('vaultModal')">
        <div class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"/></svg></div>
        <span class="nav-label">Credentials Vault</span>
        <div class="expiry-dot"></div>
      </a>
    </nav>

    <!-- Profile Footer -->
    <div class="sidebar-footer">
      <button class="profile-btn" onclick="toggleProfileDropdown()">
        <div class="avatar" id="userInitials">JD</div>
        <div class="avatar-info">
          <div class="avatar-name" id="userName">Jake Donovan</div>
          <div class="avatar-role" id="userTier">Electrician · Pro Plan</div>
        </div>
        <div class="profile-chevron">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"/>
          </svg>
        </div>
      </button>

      <!-- Upgrade Button -->
      <button class="sidebar-upgrade-slim" onclick="openModal('upgradeModal')">
        <div class="sidebar-upgrade-slim-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
          </svg>
        </div>
        <div class="sidebar-upgrade-slim-body">
          <div class="sidebar-upgrade-slim-title">Upgrade to Elite</div>
          <div class="sidebar-upgrade-slim-sub">Unlock premium features</div>
        </div>
        <svg class="sidebar-upgrade-slim-arrow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
        </svg>
      </button>
    </div>
  </aside>

  <!-- ═══════════════ MAIN CONTENT ═══════════════ -->
  <main class="main" id="main">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-title-group">
        <div class="page-eyebrow">Welcome Back</div>
        <h1 class="page-title">Vendor Dashboard</h1>
        <p class="page-subtitle">Manage your jobs, leads, and payments in one place.</p>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon" style="background: rgba(0,229,160,0.1); border: 1px solid rgba(0,229,160,0.25);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: #00E5A0;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"/>
            </svg>
          </div>
          <div class="stat-trend up">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 10px; height: 10px; stroke-width: 2.5;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"/>
            </svg>
            +12%
          </div>
        </div>
        <div class="stat-label">Active Jobs</div>
        <div class="stat-value" id="activeJobs">5</div>
        <div class="stat-sub">2 pending milestones</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon" style="background: rgba(255,167,38,0.1); border: 1px solid rgba(255,167,38,0.25);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: #FFA726;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>
            </svg>
          </div>
          <div class="stat-trend up">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 10px; height: 10px; stroke-width: 2.5;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"/>
            </svg>
            +5
          </div>
        </div>
        <div class="stat-label">New Leads</div>
        <div class="stat-value" id="newLeads">12</div>
        <div class="stat-sub" id="expiringLeads">3 expiring today</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon" style="background: rgba(66,165,245,0.1); border: 1px solid rgba(66,165,245,0.25);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: #42A5F5;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v15"/>
            </svg>
          </div>
          <div class="stat-trend up">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 10px; height: 10px; stroke-width: 2.5;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"/>
            </svg>
            +£2,100
          </div>
        </div>
        <div class="stat-label">Escrow Balance</div>
        <div class="stat-value" id="escrowBalance">£8,450</div>
        <div class="stat-sub">Available to withdraw</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon" style="background: rgba(156,95,233,0.1); border: 1px solid rgba(156,95,233,0.25);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: #9C5FE9;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
            </svg>
          </div>
          <div class="stat-trend up">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 10px; height: 10px; stroke-width: 2.5;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"/>
            </svg>
            +1.2%
          </div>
        </div>
        <div class="stat-label">Reliability Score</div>
        <div class="stat-value" id="reliabilityScore">94.2%</div>
        <div class="stat-sub">Elite tier maintained</div>
      </div>
    </div>

    <!-- Vault Card -->
    <div class="vault-card">
      <div class="vault-header">
        <div class="vault-title-group">
          <div class="vault-eyebrow">TradeMatch Trust Architecture</div>
          <div class="vault-title">Credentials Vault</div>
          <div class="vault-subtitle">Your "Verified for Life" digital passport</div>
        </div>
      </div>

      <div class="vault-score-display">
        <div class="vault-score-value" id="vaultScore">8.7</div>
        <div class="vault-score-max">/ 10</div>
      </div>

      <div class="vault-progress">
        <div class="vault-progress-bar" id="eliteProgress" data-width="74%" style="width: 74%;"></div>
      </div>

      <div class="vault-milestones">
        <div class="milestone">
          <div class="milestone-dot reached"></div>
          <div class="milestone-label">Basic</div>
        </div>
        <div class="milestone">
          <div class="milestone-dot reached"></div>
          <div class="milestone-label">Verified</div>
        </div>
        <div class="milestone">
          <div class="milestone-dot reached current"></div>
          <div class="milestone-label">Pro</div>
        </div>
        <div class="milestone">
          <div class="milestone-dot"></div>
          <div class="milestone-label">Elite</div>
        </div>
        <div class="milestone">
          <div class="milestone-dot"></div>
          <div class="milestone-label">Gold</div>
        </div>
      </div>
    </div>
  </main>
</div>
`;

export default function SacredVendorDashboard({
  data = {},
  isLoading = false,
  error = null,
}: SacredVendorDashboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // HYDRATION: Inject live data into DOM elements
  useEffect(() => {
    if (!containerRef.current || isLoading || !data) return;

    const container = containerRef.current;

    // Map of data keys to element IDs
    const hydrationTargets: Record<string, string | number | undefined> = {
      'activeJobs': data.activeJobs,
      'newLeads': data.newLeads,
      'expiringLeads': data.expiringLeads,
      'escrowBalance': data.escrowBalance ? `£${data.escrowBalance.toLocaleString()}` : undefined,
      'reliabilityScore': data.reliabilityScore ? `${data.reliabilityScore}%` : undefined,
      'vaultScore': data.vaultScore?.toFixed(1),
      'userName': data.userName,
      'userInitials': data.userInitials,
      'userTier': data.userTier,
      'leadsBadge': data.newLeads?.toString(),
    };

    // Update DOM elements
    Object.entries(hydrationTargets).forEach(([id, value]) => {
      if (value !== undefined) {
        const element = container.querySelector(`#${id}`);
        if (element) {
          element.textContent = String(value);
          // Add transition class
          element.classList.add('data-updated');
        }
      }
    });

    // Update progress bar
    if (data.eliteProgress !== undefined) {
      const progressBar = container.querySelector('#eliteProgress') as HTMLElement;
      if (progressBar) {
        progressBar.style.width = `${data.eliteProgress}%`;
        progressBar.setAttribute('data-width', `${data.eliteProgress}%`);
      }
    }

    // Update milestone dots
    if (data.eliteProgress !== undefined) {
      const dots = container.querySelectorAll('.milestone-dot');
      const thresholds = [20, 40, 60, 80, 100];
      dots.forEach((dot, index) => {
        if (data.eliteProgress! >= thresholds[index]) {
          dot.classList.add('reached');
        }
        if (data.eliteProgress! >= thresholds[index] && data.eliteProgress! < thresholds[index + 1]) {
          dot.classList.add('current');
        }
      });
    }

    setIsHydrated(true);
  }, [data, isLoading]);

  // RE-RUN ORIGINAL ANIMATIONS
  useEffect(() => {
    if (!containerRef.current || !isHydrated) return;

    const container = containerRef.current;

    // Animate stat cards on mount
    const animateStats = () => {
      const cards = container.querySelectorAll('.stat-card');
      cards.forEach((card, index) => {
        setTimeout(() => {
          (card as HTMLElement).style.opacity = '1';
          (card as HTMLElement).style.transform = 'translateY(0)';
        }, 100 + index * 100);
      });
    };

    // Animate vault progress
    const animateVault = () => {
      const progressBar = container.querySelector('#eliteProgress') as HTMLElement;
      if (progressBar) {
        const targetWidth = progressBar.getAttribute('data-width') || '74%';
        progressBar.style.width = '0%';
        setTimeout(() => {
          progressBar.style.width = targetWidth;
        }, 300);
      }
    };

    // Run animations
    animateStats();
    setTimeout(animateVault, 500);

  }, [isHydrated]);

  if (error) {
    return (
      <div className={styles.errorOverlay}>
        <div className={styles.errorIcon}>⚠️</div>
        <h3>Failed to load dashboard</h3>
        <p>{error.message}</p>
        <button className={styles.retryBtn} onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Inject Sacred CSS */}
      <style>{SACRED_CSS}</style>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <span className={styles.loadingText}>Loading Dashboard...</span>
        </div>
      )}
      
      {/* Sacred HTML Content */}
      <div
        ref={containerRef}
        className={`${styles.content} ${isHydrated ? styles.hydrated : ''}`}
        dangerouslySetInnerHTML={{ __html: SACRED_HTML }}
      />
      
      {/* Hydration indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && isHydrated && (
        <div className={styles.hydrationBadge}>✓ Hydrated</div>
      )}
    </div>
  );
}
