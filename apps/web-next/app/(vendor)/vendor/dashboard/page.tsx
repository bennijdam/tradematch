'use client';

import { useEffect, useRef } from 'react';
import { VendorIframeBridge } from '@/lib/vendor-iframe-bridge';

declare global {
  interface Window {
    tradematchAdminBridge?: {
      updateShowUpScore: (value: number) => void;
      forceRefresh: () => void;
      toast: (message: string) => void;
    };
  }
}

export default function VendorDashboardPage() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const bridgeRef = useRef<VendorIframeBridge | null>(null);

  useEffect(() => {
    if (!iframeRef.current) {
      return;
    }

    const bridge = new VendorIframeBridge({
      iframeElement: iframeRef.current,
      targetOrigin: window.location.origin,
      sourceName: 'tradematch-admin-parent',
    });

    bridge.on('READY', () => {
      bridge.stateSync({
        vendorId: 'vendor-demo-001',
        dashboardMode: 'iframe-hybrid',
      });
    });

    bridge.start();
    bridgeRef.current = bridge;

    window.tradematchAdminBridge = {
      updateShowUpScore: (value: number) => {
        bridge.patchMetrics({ showUpRate: value });
        iframeRef.current?.contentWindow?.postMessage({
          type: 'PATCH_METRICS',
          version: '1.0',
          requestId: `direct-${Date.now()}`,
          timestamp: Date.now(),
          payload: { showUpRate: value },
        }, window.location.origin);
      },
      forceRefresh: () => {
        bridge.forceRefresh();
        iframeRef.current?.contentWindow?.postMessage({
          type: 'FORCE_REFRESH',
          version: '1.0',
          requestId: `direct-${Date.now()}`,
          timestamp: Date.now(),
          payload: { reason: 'admin-request' },
        }, window.location.origin);
      },
      toast: (message: string) => {
        bridge.toast(message, 'success');
        iframeRef.current?.contentWindow?.postMessage({
          type: 'TOAST',
          version: '1.0',
          requestId: `direct-${Date.now()}`,
          timestamp: Date.now(),
          payload: { message, tone: 'success' },
        }, window.location.origin);
      },
    };

    return () => {
      bridge.destroy();
      bridgeRef.current = null;
      delete window.tradematchAdminBridge;
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src="/vendor-dashboard-new/vendor-dashboard.html"
      title="Vendor Dashboard"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        border: '0',
        zIndex: 2147483647,
        background: '#080C12',
      }}
    />
  );
}
