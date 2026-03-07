'use client';

import { useCallback } from 'react';
import styles from './SuperAdmin.module.css';
import { useAdminStore } from './useAdminStore';

type SentinelBotProps = {
  mode: 'legacy' | 'native';
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
};

export default function SentinelBot({ mode, iframeRef }: SentinelBotProps) {
  const { killSwitchArmed, lastCommand, setKillSwitchArmed, setLastCommand } = useAdminStore();

  const triggerKillSwitch = useCallback(() => {
    const nextState = !killSwitchArmed;
    setKillSwitchArmed(nextState);
    setLastCommand(nextState ? 'kill-switch-armed' : 'kill-switch-reset');

    if (mode === 'legacy' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'tm:sentinel:kill-switch',
          payload: { armed: nextState },
        },
        window.location.origin
      );
    }
  }, [iframeRef, killSwitchArmed, mode, setKillSwitchArmed, setLastCommand]);

  return (
    <div className={styles.sentinelBot}>
      <div className={styles.sentinelTitle}>SentinelBot</div>
      <div className={styles.sentinelMeta}>last: {lastCommand}</div>
      <button type="button" className={styles.sentinelButton} onClick={triggerKillSwitch}>
        {killSwitchArmed ? 'Reset Kill Switch' : 'Arm Kill Switch'}
      </button>
    </div>
  );
}
