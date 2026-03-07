/**
 * Badge Component - Foundational Five
 * Pixel-perfect recreation from legacy CSS
 * 
 * Legacy CSS Reference:
 * - .badge: display, alignment, padding, border-radius
 * - .b-neon, .b-danger, .b-amber, .b-blue, .b-purple, .b-gold, .b-grey
 * - Border radius: 100px (pill shape)
 * - Font: var(--fm) 8.5px
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  // Base styles - matching legacy CSS exactly
  'inline-flex items-center gap-[3px] px-[7px] py-[1.5px] rounded-full font-mono text-[8.5px] font-semibold tracking-wide',
  {
    variants: {
      variant: {
        // Neon/Green
        neon: 
          'bg-neon-100 text-neon border border-neon-200',
        
        // Danger/Red
        danger: 
          'bg-danger-dim text-danger border border-danger/30',
        
        // Amber/Warning
        amber: 
          'bg-amber-dim text-amber border border-amber/30',
        
        // Blue/Info
        blue: 
          'bg-blue-dim text-blue border border-blue/30',
        
        // Purple
        purple: 
          'bg-purple-dim text-purple border border-purple/30',
        
        // Gold
        gold: 
          'bg-gold-dim text-gold border border-gold/30',
        
        // Grey/Default
        grey: 
          'bg-bg-5 text-t4 border border-border',
        
        // Primary (neon with glow)
        primary: 
          'bg-neon-100 text-neon border border-neon-200 shadow-neon',
        
        // Secondary
        secondary: 
          'bg-bg-4 text-t3 border border-border-2',
        
        // Outline
        outline: 
          'bg-transparent border border-border text-t3',
      },
      size: {
        default: 'px-[7px] py-[1.5px]',
        sm: 'px-2 py-0.5 text-[7.5px]',
        lg: 'px-3 py-1 text-[9.5px]',
      },
      dot: {
        true: 'pl-1.5',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'neon',
      size: 'default',
      dot: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: 'neon' | 'danger' | 'amber' | 'blue' | 'purple' | 'grey';
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, dotColor = 'neon', icon, children, ...props }, ref) => {
    const dotColorClass = {
      neon: 'bg-neon',
      danger: 'bg-danger',
      amber: 'bg-amber',
      blue: 'bg-blue',
      purple: 'bg-purple',
      grey: 'bg-t4',
    }[dotColor];

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, dot, className }))}
        {...props}
      >
        {dot && (
          <span className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            dotColorClass
          )} />
        )}
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Status Badge - Pre-configured for common statuses
interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'active' | 'pending' | 'completed' | 'cancelled' | 'error' | 'warning' | 'info' | 'neutral';
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, ...props }, ref) => {
    const statusConfig = {
      active: { variant: 'neon' as const, dot: true, dotColor: 'neon' as const },
      pending: { variant: 'amber' as const, dot: true, dotColor: 'amber' as const },
      completed: { variant: 'blue' as const, dot: true, dotColor: 'blue' as const },
      cancelled: { variant: 'grey' as const, dot: true, dotColor: 'grey' as const },
      error: { variant: 'danger' as const, dot: true, dotColor: 'danger' as const },
      warning: { variant: 'amber' as const, dot: true, dotColor: 'amber' as const },
      info: { variant: 'blue' as const, dot: true, dotColor: 'blue' as const },
      neutral: { variant: 'grey' as const, dot: false },
    }[status];

    return (
      <Badge 
        ref={ref} 
        variant={statusConfig.variant}
        dot={statusConfig.dot}
        dotColor={statusConfig.dotColor}
        {...props}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';

export { Badge, badgeVariants, StatusBadge };
