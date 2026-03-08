'use client';

import { useState, useEffect, useCallback } from 'react';

interface ClockState {
  time: string;
  date: string;
  isoString: string;
}

/**
 * useClock Hook
 * Replaces the legacy tick() function found in HTML dashboards
 * Provides live time updates with customizable refresh interval
 * 
 * Legacy reference:
 * - Live time display in topbar
 * - Format: 13:45:22 (24-hour)
 * - Updates every second
 * - Font: JetBrains Mono, neon color
 */
export function useClock(refreshInterval: number = 1000): ClockState {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize on client to avoid server/client timestamp mismatch during hydration.
    setNow(new Date());

    const interval = setInterval(() => {
      setNow(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (!now) {
    return {
      time: '--:--:--',
      date: '-- --- ----',
      isoString: '',
    };
  }

  // Format time as HH:MM:SS (matching legacy format)
  const time = now.toLocaleTimeString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Format date as DD MMM YYYY
  const date = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return {
    time,
    date,
    isoString: now.toISOString(),
  };
}

/**
 * useCountdown Hook
 * For countdown timers (e.g., SLA timers, expiry timers)
 * 
 * Legacy reference:
 * - Dispute row timers
 * - Lead expiry timers
 */
interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
}

export function useCountdown(targetDate: Date | string): CountdownState {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const diff = target.getTime() - now.getTime();
  const isExpired = diff <= 0;

  if (isExpired) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formatted: '00:00:00',
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const formatted = days > 0 
    ? `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    formatted,
  };
}

/**
 * useElapsedTime Hook
 * For displaying how long ago something happened
 * 
 * Legacy reference:
 * - Feed timestamps
 * - Activity timestamps
 */
export function useElapsedTime(startDate: Date | string): string {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const diff = now.getTime() - start.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return start.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

/**
 * useTimer Hook
 * For stopwatch-style timers
 */
interface TimerState {
  elapsed: number;
  formatted: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useTimer(autoStart: boolean = false): TimerState {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    let animationFrame: number;
    
    const tick = () => {
      if (isRunning && startTime) {
        setElapsed(Date.now() - startTime);
        animationFrame = requestAnimationFrame(tick);
      }
    };

    if (isRunning) {
      animationFrame = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isRunning, startTime]);

  const start = useCallback(() => {
    setStartTime(Date.now() - elapsed);
    setIsRunning(true);
  }, [elapsed]);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setElapsed(0);
    setIsRunning(false);
    setStartTime(null);
  }, []);

  // Format as MM:SS.ms
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const milliseconds = Math.floor((elapsed % 1000) / 10);

  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;

  return {
    elapsed,
    formatted,
    start,
    stop,
    reset,
  };
}
