'use client';

import { useEffect } from 'react';

export type LegacyBridgeEvent = {
  type: string;
  payload?: unknown;
};

export function useIframeBridge(onMessage: (event: LegacyBridgeEvent) => void) {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.origin || !event.origin.startsWith(window.location.origin)) {
        return;
      }

      const data = event.data as LegacyBridgeEvent;
      if (!data || typeof data.type !== 'string') {
        return;
      }

      onMessage(data);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);
}
