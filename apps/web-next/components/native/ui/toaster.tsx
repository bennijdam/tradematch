'use client';

import { useToast } from '@/hooks/useToast';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: 'bg-neon-dim border-neon/30 text-neon',
  error: 'bg-danger-dim border-danger/30 text-danger',
  warning: 'bg-amber-dim border-amber/30 text-amber',
  info: 'bg-blue-dim border-blue/30 text-blue',
};

export function Toaster() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.type];
        
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg border min-w-[300px] max-w-[500px]',
              'shadow-lg animate-in slide-in-from-right-4 fade-in duration-300',
              toastStyles[toast.type]
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
