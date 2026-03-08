'use client';

/**
 * Clock Hook
 * 
 * Replaces the legacy tick() function from the HTML dashboards.
 * Provides real-time clock functionality with various formatting options.
 * 
 * @example
 * const { time, formattedTime, formattedDate } = useClock({
 *   format: '24h',
 *   includeSeconds: true
 * });
 * 
 * // In JSX:
 * <span className="live-time">{formattedTime}</span>
 */

import { useState, useEffect, useCallback } from 'react';

export type ClockFormat = '12h' | '24h';

export interface UseClockOptions {
  format?: ClockFormat;
  includeSeconds?: boolean;
  updateInterval?: number;
  initialDate?: Date;
}

export interface ClockState {
  time: Date;
  formattedTime: string;
  formattedDate: string;
  formattedDateTime: string;
  hours: number;
  minutes: number;
  seconds: number;
  isRunning: boolean;
}

const DEFAULT_OPTIONS: Required<UseClockOptions> = {
  format: '24h',
  includeSeconds: true,
  updateInterval: 1000,
  initialDate: new Date(),
};

/**
 * Format time string from date
 */
function formatTimeString(
  date: Date, 
  format: ClockFormat, 
  includeSeconds: boolean
): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  if (format === '24h') {
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    const s = includeSeconds ? `:${seconds.toString().padStart(2, '0')}` : '';
    return `${h}:${m}${s}`;
  } else {
    const period = hours >= 12 ? 'PM' : 'AM';
    const h = (hours % 12 || 12).toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    const s = includeSeconds ? `:${seconds.toString().padStart(2, '0')}` : '';
    return `${h}:${m}${s} ${period}`;
  }
}

/**
 * Format date string from date
 */
function formatDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date).toUpperCase();
}

/**
 * Format full datetime string
 */
function formatDateTimeString(
  date: Date, 
  format: ClockFormat, 
  includeSeconds: boolean
): string {
  return `${formatDateString(date)} · ${formatTimeString(date, format, includeSeconds)}`;
}

export function useClock(options: UseClockOptions = {}): ClockState {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  const [time, setTime] = useState<Date>(config.initialDate);
  const [isRunning, setIsRunning] = useState(true);

  // Update time at specified interval
  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      setTime(new Date());
    };

    // Initial tick
    tick();

    // Set up interval
    const intervalId = setInterval(tick, config.updateInterval);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [isRunning, config.updateInterval]);

  // Control methods
  const start = useCallback(() => setIsRunning(true), []);
  const stop = useCallback(() => setIsRunning(false), []);

  // Computed values
  const formattedTime = formatTimeString(time, config.format, config.includeSeconds);
  const formattedDate = formatDateString(time);
  const formattedDateTime = formatDateTimeString(time, config.format, config.includeSeconds);

  return {
    time,
    formattedTime,
    formattedDate,
    formattedDateTime,
    hours: time.getHours(),
    minutes: time.getMinutes(),
    seconds: time.getSeconds(),
    isRunning,
  };
}

/**
 * Hook for countdown timer (e.g., SLA timers)
 */
export interface UseCountdownOptions {
  targetDate: Date;
  onComplete?: () => void;
}

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
  formatted: string;
}

export function useCountdown(options: UseCountdownOptions): CountdownState {
  const { targetDate, onComplete } = options;
  
  const calculateTimeLeft = useCallback(() => {
    const now = new Date().getTime();
    const target = targetDate.getTime();
    const difference = target - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
      isComplete: false,
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.isComplete && onComplete) {
        onComplete();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft, onComplete]);

  const formatted = `${timeLeft.hours.toString().padStart(2, '0')}:${timeLeft.minutes
    .toString()
    .padStart(2, '0')}:${timeLeft.seconds.toString().padStart(2, '0')}`;

  return {
    ...timeLeft,
    formatted,
  };
}

/**
 * Hook for relative time display (e.g., "2m ago", "1h ago")
 */
export function useRelativeTime(date: Date | string): string {
  const [relativeTime, setRelativeTime] = useState(() => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return calculateRelativeTime(d);
  });

  useEffect(() => {
    const update = () => {
      const d = typeof date === 'string' ? new Date(date) : date;
      setRelativeTime(calculateRelativeTime(d));
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [date]);

  return relativeTime;
}

function calculateRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return date.toLocaleDateString('en-GB');
}
