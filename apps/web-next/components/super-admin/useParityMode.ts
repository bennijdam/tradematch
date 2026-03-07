'use client';

import { useEffect, useMemo, useState } from 'react';

export type RenderMode = 'legacy' | 'native';

const MODE_KEY = 'tm-render-mode';

function normalizeMode(value: string | null | undefined): RenderMode {
  return value === 'legacy' ? 'legacy' : 'native';
}

export function useParityMode() {
  const [mode, setMode] = useState<RenderMode>('native');
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const storedMode = normalizeMode(window.localStorage.getItem(MODE_KEY));
    setMode(storedMode);
  }, []);

  const updateMode = (nextMode: RenderMode) => {
    window.localStorage.setItem(MODE_KEY, nextMode);
    setMode(nextMode);
    setIsFallback(false);
  };

  const runtimeEngine: 'green' | 'blue' | 'amber' = useMemo(() => {
    if (mode === 'native') return 'green';
    return isFallback ? 'amber' : 'blue';
  }, [mode, isFallback]);

  return {
    mode,
    setMode: updateMode,
    isFallback,
    setIsFallback,
    runtimeEngine,
  };
}
