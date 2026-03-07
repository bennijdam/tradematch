/**
 * Button Component - Foundational Five
 * Pixel-perfect recreation from legacy CSS
 * 
 * Legacy CSS Reference:
 * - .tb-btn: Topbar button styles
 * - .pbtn: Panel button styles
 * - Border radius: 6px (tb-btn), 5px (pbtn)
 * - Transitions: all .15s
 * - Neon glow on hover for primary variant
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

const buttonVariants = cva(
  // Base styles - matching legacy CSS exactly
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Default/Secondary - matches .tb-btn default
        default: 
          'bg-bg-3 border border-border-2 text-t3 hover:bg-bg-4 hover:text-t2',
        
        // Primary - matches .tb-btn.primary
        primary: 
          'bg-neon text-black border border-neon font-semibold hover:opacity-85 shadow-neon',
        
        // Danger - matches .tb-btn.danger and .pbtn.danger
        danger: 
          'bg-danger-dim text-danger border border-danger/30 hover:bg-danger/10',
        
        // Amber/Warning - matches .pbtn.amber
        warning: 
          'bg-amber-dim text-amber border border-amber/30 hover:bg-amber/10',
        
        // Neon/Accent - matches .pbtn.neon
        neon: 
          'bg-transparent text-neon border border-neon/30 hover:bg-neon-dim',
        
        // Ghost - minimal
        ghost: 
          'hover:bg-bg-3 hover:text-t2',
        
        // Link style
        link: 
          'text-neon underline-offset-4 hover:underline',
        
        // Panel button (.pbtn)
        panel: 
          'bg-bg-4 border border-border-2 text-t3 text-[9.5px] font-semibold px-2 py-1 rounded-[5px] hover:bg-bg-5 hover:text-t1',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-10 w-10',
        // Panel button size
        panel: 'h-auto px-2 py-1 text-[9.5px]',
      },
      glow: {
        true: 'shadow-neon hover:shadow-neon-lg',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      glow: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, glow, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, glow, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
