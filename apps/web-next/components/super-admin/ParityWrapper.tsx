'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { useAdminStore } from './useAdminStore';
import { useIframeBridge } from './useIframeBridge';
import InfraHealthNative from './native/InfraHealthNative';
import ReportsSuiteNative from './native/ReportsSuiteNative';
import styles from './SuperAdmin.module.css';

type ParityWrapperProps = {
  viewId: 'infra-health' | 'reports-suite';
  mode: 'legacy' | 'native';
  isFallback: boolean;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  setMode: (mode: 'legacy' | 'native') => void;
  setIsFallback: (nextValue: boolean) => void;
};

const LEGACY_MAP: Record<ParityWrapperProps['viewId'], string> = {
  'infra-health': '/legacy/infra-health.html',
  'reports-suite': '/legacy/reports-suite.html',
};

export default function ParityWrapper({
  viewId,
  mode,
  isFallback,
  iframeRef,
  setMode,
  setIsFallback,
}: ParityWrapperProps) {
  const { setLastLegacyMessage } = useAdminStore();
  const [legacyAvailable, setLegacyAvailable] = useState(false);

  const legacySrc = LEGACY_MAP[viewId];

  useIframeBridge(
    useCallback(
      (event) => {
        if (mode !== 'legacy') return;
        setLastLegacyMessage(event.type);
      },
      [mode, setLastLegacyMessage]
    )
  );

  useEffect(() => {
    let cancelled = false;

    async function checkLegacyAsset() {
      if (mode !== 'legacy') {
        setLegacyAvailable(false);
        setIsFallback(false);
        return;
      }

      try {
        const response = await fetch(legacySrc, { method: 'HEAD', cache: 'no-store' });
        if (cancelled) return;

        if (response.ok) {
          setLegacyAvailable(true);
          setIsFallback(false);
        } else {
          setLegacyAvailable(false);
          setIsFallback(true);
        }
      } catch {
        if (!cancelled) {
          setLegacyAvailable(false);
          setIsFallback(true);
        }
      }
    }

    checkLegacyAsset();
    return () => {
      cancelled = true;
    };
  }, [legacySrc, mode, setIsFallback]);

  const nativeView = useMemo(() => {
    switch (viewId) {
      case 'reports-suite':
        return <ReportsSuiteNative />;
      case 'infra-health':
      default:
        return <InfraHealthNative />;
    }
  }, [viewId]);

  const renderLegacy = mode === 'legacy' && legacyAvailable && !isFallback;

  return (
    <div className={styles.shell}>
      <div className={styles.controls}>
        <button type="button" onClick={() => setMode('native')} className={styles.controlButton}>
          Native
        </button>
        <button type="button" onClick={() => setMode('legacy')} className={styles.controlButton}>
          Legacy
        </button>
      </div>

      {renderLegacy ? (
        <iframe
          ref={iframeRef}
          src={legacySrc}
          title={`Legacy ${viewId}`}
          className={styles.frame}
          onError={() => setIsFallback(true)}
        />
      ) : (
        <div className={styles.nativeContainer}>{nativeView}</div>
      )}
    </div>
  );
}
