'use client';

import { useMemo } from 'react';

export type ParityStatus = 'green' | 'blue' | 'amber';

export function useParityStatus(mode: 'legacy' | 'native', isFallback: boolean): ParityStatus {
  return useMemo(() => {
    if (mode === 'native') {
      return 'green';
    }

    return isFallback ? 'amber' : 'blue';
  }, [isFallback, mode]);
}
