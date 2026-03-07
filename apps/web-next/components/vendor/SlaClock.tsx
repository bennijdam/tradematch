'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './SlaClock.module.css';

function formatTime(remainingMs: number) {
  const clamped = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function SlaClock({ hours = 48 }: { hours?: number }) {
  const deadline = useMemo(() => Date.now() + hours * 60 * 60 * 1000, [hours]);
  const [label, setLabel] = useState(formatTime(deadline - Date.now()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLabel(formatTime(deadline - Date.now()));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [deadline]);

  return (
    <span className={styles.clock}>
      <span>⏱ SLA</span>
      <span className={styles.time}>{label}</span>
    </span>
  );
}
