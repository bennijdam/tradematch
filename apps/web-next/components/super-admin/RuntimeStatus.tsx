'use client';

import styles from './SuperAdmin.module.css';
import { useParityStatus } from './useParityStatus';

type RuntimeStatusProps = {
  mode: 'legacy' | 'native';
  isFallback: boolean;
};

export default function RuntimeStatus({ mode, isFallback }: RuntimeStatusProps) {
  const status = useParityStatus(mode, isFallback);

  const message =
    mode === 'native'
      ? 'ENGINE: NATIVE'
      : isFallback
        ? 'LEGACY FALLBACK ACTIVE'
        : 'ENGINE: LEGACY (CORE)';

  return <div className={`${styles.runtimeBadge} ${styles[status]}`}>{message}</div>;
}
