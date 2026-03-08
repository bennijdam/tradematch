'use client';

/**
 * Toast Notification Hook
 * 
 * Replaces the legacy showToast() function from the HTML dashboards.
 * Provides a React-friendly way to display temporary notifications.
 * 
 * @example
 * const { toast, ToastContainer } = useToast();
 * toast.success('Payment successful!');
 * toast.error('Something went wrong');
 * toast.warning('Please verify your email');
 */

import { useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

export interface ToastOptions {
  duration?: number;
  type?: ToastType;
}

const DEFAULT_DURATION = 3000;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Generate unique ID for each toast
  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add a new toast
  const addToast = useCallback((
    message: string, 
    type: ToastType = 'info', 
    duration: number = DEFAULT_DURATION
  ) => {
    const id = generateId();
    const newToast: Toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
    
    return id;
  }, [generateId]);

  // Remove a specific toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message: string, duration?: number) => {
    return addToast(message, 'success', duration);
  }, [addToast]);

  const error = useCallback((message: string, duration?: number) => {
    return addToast(message, 'error', duration);
  }, [addToast]);

  const warning = useCallback((message: string, duration?: number) => {
    return addToast(message, 'warning', duration);
  }, [addToast]);

  const info = useCallback((message: string, duration?: number) => {
    return addToast(message, 'info', duration);
  }, [addToast]);

  // Legacy-compatible API
  const showToast = useCallback((
    message: string, 
    type: 'success' | 'warning' | 'error' = 'success'
  ) => {
    return addToast(message, type, DEFAULT_DURATION);
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
    showToast, // Legacy compatibility
  };
}

/**
 * Standalone toast function for non-component usage
 * (Similar to the global showToast from legacy code)
 */
let toastCallback: ((message: string, type: ToastType) => void) | null = null;

export function setToastCallback(callback: typeof toastCallback) {
  toastCallback = callback;
}

export function toast(message: string, type: ToastType = 'info') {
  if (toastCallback) {
    toastCallback(message, type);
  } else {
    console.warn('Toast callback not set. Make sure to use ToastProvider.');
  }
}
