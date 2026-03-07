'use client';

import { useRef } from 'react';
import ParityWrapper from './ParityWrapper';
import RuntimeStatus from './RuntimeStatus';
import SentinelBot from './SentinelBot';
import { useParityMode } from './useParityMode';

type SuperAdminDashboardAppProps = {
  viewId: 'infra-health' | 'reports-suite';
};

export default function SuperAdminDashboardApp({ viewId }: SuperAdminDashboardAppProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { mode, isFallback, setMode, setIsFallback } = useParityMode();

  return (
    <>
      <SentinelBot mode={mode} iframeRef={iframeRef} />
      <RuntimeStatus mode={mode} isFallback={isFallback} />
      <ParityWrapper
        viewId={viewId}
        mode={mode}
        isFallback={isFallback}
        iframeRef={iframeRef}
        setMode={setMode}
        setIsFallback={setIsFallback}
      />
    </>
  );
}
