/**
 * LegacyWrapper - Hybrid Shell Component
 * 
 * This component preserves 100% of the original HTML/CSS design
 * while hydrating it with live data from Next.js APIs.
 * 
 * Strategy:
 * 1. Render original HTML via dangerouslySetInnerHTML
 * 2. Move styles to CSS Module to prevent bleeding
 * 3. Use useEffect to find elements by ID and hydrate with data
 * 4. Attach event listeners to buttons for Server Actions
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './LegacyWrapper.module.css';

interface LegacyWrapperProps {
  /** Original HTML content (without <html>, <head>, <body> tags) */
  htmlContent: string;
  /** CSS extracted from original HTML */
  cssContent: string;
  /** Data to hydrate into the DOM */
  data: Record<string, any>;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Callbacks for interactive elements */
  onAction?: (action: string, payload: any) => Promise<void>;
}

export function LegacyWrapper({
  htmlContent,
  cssContent,
  data,
  isLoading = false,
  error = null,
  onAction,
}: LegacyWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration Effect: Find elements by ID and update with live data
  useEffect(() => {
    if (!containerRef.current || isLoading || !data) return;

    const container = containerRef.current;

    // HYDRATION STRATEGY: Map data keys to DOM elements by ID
    const hydrationMap: Record<string, (el: HTMLElement, value: any) => void> = {
      // Vendor Dashboard
      'vaultScore': (el, val) => {
        el.textContent = val.toFixed(1);
        el.style.color = '#00E5A0';
      },
      'vaultScoreProgress': (el, val) => {
        el.style.width = `${val}%`;
      },
      'escrowBalance': (el, val) => {
        el.textContent = `£${val.toLocaleString()}`;
      },
      'activeJobs': (el, val) => {
        el.textContent = val.toString();
      },
      'newLeads': (el, val) => {
        el.textContent = val.toString();
        // Add pulse animation for new leads
        if (val > 0) {
          el.classList.add(styles.pulse);
        }
      },
      'reliabilityScore': (el, val) => {
        el.textContent = `${val}%`;
      },
      'documentsVerified': (el, val) => {
        el.textContent = `${val.verified} / ${val.total}`;
      },
      'nextExpiry': (el, val) => {
        el.textContent = `${val.days} days`;
        if (val.days <= 30) {
          el.style.color = '#FFA726';
        }
      },
      'eliteProgress': (el, val) => {
        el.style.width = `${val}%`;
        // Update milestone dots
        const dots = el.parentElement?.parentElement?.querySelectorAll('[data-milestone]');
        dots?.forEach((dot, idx) => {
          const threshold = (idx + 1) * 20;
          if (val >= threshold) {
            dot.classList.add(styles.milestoneReached);
          }
        });
      },
      
      // Dispute Centre
      'slaHours': (el, val) => {
        el.textContent = String(val).padStart(2, '0');
      },
      'slaMinutes': (el, val) => {
        el.textContent = String(val).padStart(2, '0');
      },
      'slaSeconds': (el, val) => {
        el.textContent = String(val).padStart(2, '0');
      },
      'slaProgress': (el, val) => {
        el.style.width = `${val}%`;
      },
      'aiConfidence': (el, val) => {
        el.textContent = `${val}%`;
      },
      'settlementVendor': (el, val) => {
        el.style.width = `${val}%`;
        el.textContent = `Vendor: ${val}%`;
      },
      'settlementHomeowner': (el, val) => {
        el.style.width = `${val}%`;
        el.textContent = `Homeowner: ${val}%`;
      },
      'escrowFrozen': (el, val) => {
        el.textContent = `£${val.toLocaleString()} Secured`;
      },
      'disputeImpact': (el, val) => {
        el.textContent = val > 0 ? `+${val}` : val;
        el.style.color = val < 0 ? '#FF4757' : '#00E5A0';
      },
      
      // Credentials Vault
      'credentialStatus': (el, val) => {
        el.textContent = val;
        el.className = `${el.className} ${styles[val]}`;
      },
      'quickRenewBtn': (el, val) => {
        if (val.show) {
          el.style.display = 'flex';
          el.addEventListener('click', () => handleAction('quickRenew', val.credentialId));
        }
      },
      'uploadBtn': (el, val) => {
        el.addEventListener('click', () => handleAction('upload', val.credentialId));
      },
    };

    // Apply hydration
    Object.entries(data).forEach(([key, value]) => {
      const element = container.querySelector(`#${key}`) as HTMLElement;
      if (element && hydrationMap[key]) {
        hydrationMap[key](element, value);
      }
    });

    // Attach event listeners to action buttons
    const actionButtons = container.querySelectorAll('[data-action]');
    actionButtons.forEach((btn) => {
      const action = btn.getAttribute('data-action');
      const payload = btn.getAttribute('data-payload');
      
      btn.addEventListener('click', () => {
        handleAction(action!, payload ? JSON.parse(payload) : {});
      });
    });

    // Mark as hydrated
    setIsHydrated(true);

    return () => {
      // Cleanup listeners on unmount
      actionButtons.forEach((btn) => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode?.replaceChild(newBtn, btn);
      });
    };
  }, [data, isLoading]);

  // Real-time SLA countdown
  useEffect(() => {
    if (!data?.slaDeadline || !containerRef.current) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const deadline = new Date(data.slaDeadline).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const totalDuration = 48 * 60 * 60 * 1000;
      const progress = (diff / totalDuration) * 100;

      // Update DOM directly
      const container = containerRef.current;
      const hoursEl = container.querySelector('#slaHours');
      const minsEl = container.querySelector('#slaMinutes');
      const secsEl = container.querySelector('#slaSeconds');
      const progressEl = container.querySelector('#slaProgress');

      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minsEl) minsEl.textContent = String(minutes).padStart(2, '0');
      if (secsEl) secsEl.textContent = String(seconds).padStart(2, '0');
      if (progressEl) progressEl.style.width = `${progress}%`;
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.slaDeadline]);

  const handleAction = async (action: string, payload: any) => {
    if (onAction) {
      await onAction(action, payload);
    }
  };

  // Clean HTML: Remove script tags to prevent conflicts
  const cleanHtml = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  return (
    <div className={styles.wrapper}>
      {/* Inject CSS Module styles */}
      <style>{cssContent}</style>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <span className={styles.loadingText}>Loading Dashboard...</span>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className={styles.errorOverlay}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>Failed to load data</h3>
          <p>{error.message}</p>
          <button className={styles.retryBtn} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}
      
      {/* Hydrated Content */}
      <div
        ref={containerRef}
        className={`${styles.content} ${isHydrated ? styles.hydrated : ''}`}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
      
      {/* Hydration indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && isHydrated && (
        <div className={styles.hydrationBadge}>
          ✓ Hydrated
        </div>
      )}
    </div>
  );
}
