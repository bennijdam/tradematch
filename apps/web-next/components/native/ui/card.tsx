/**
 * Card Component - Foundational Five
 * Pixel-perfect recreation from legacy CSS
 * 
 * Legacy CSS Reference:
 * - .card: Background, border, border-radius, shadow
 * - .panel: Panel styles with header
 * - .mc: Metric card styles
 * - Border radius: 16px (large cards), 11px (panels), 10px (metric cards)
 * - Border: 1px solid var(--border)
 * - Hover states for accent variants
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ========================================
// CARD VARIANTS
// ========================================

const cardVariants = cva(
  // Base styles - matching legacy CSS
  'bg-bg-card border border-border rounded-[16px] p-[18px] shadow-card transition-all duration-200',
  {
    variants: {
      variant: {
        // Default card
        default: '',
        
        // Panel style (.panel)
        panel: 'bg-bg-2 rounded-[11px] p-0 overflow-hidden',
        
        // Metric card (.mc)
        metric: 'bg-bg-2 rounded-[10px] p-[13px] hover:border-border-2',
        
        // Accent variants
        danger: 'bg-danger-dim border-danger/30',
        amber: 'bg-amber-dim border-amber/30',
        neon: 'bg-neon-dim border-neon/30',
        blue: 'bg-blue-dim border-blue/30',
      },
      hover: {
        true: 'cursor-pointer hover:border-border-2',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      hover: false,
    },
  }
);

// ========================================
// CARD COMPONENTS
// ========================================

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, hover, className }))}
      {...props}
    />
  )
);
Card.displayName = 'Card';

// Card Header (.ph)
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center gap-2 px-4 py-3 border-b border-border',
      className
    )}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// Card Title (.ph-title)
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'font-syne text-[11.5px] font-bold text-t1',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

// Card Description (.ph-sub)
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-[9.5px] text-t4 mt-0.5',
      className
    )}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// Card Content (.pb)
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4', className)} {...props} />
));
CardContent.displayName = 'CardContent';

// Card Footer
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-between px-4 py-3 border-t border-border',
      className
    )}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

// ========================================
// METRIC CARD COMPONENT
// ========================================

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  variant?: 'default' | 'danger' | 'amber' | 'neon' | 'blue';
  className?: string;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ label, value, delta, variant = 'default', className }, ref) => {
    const valueColorClass = {
      default: 'text-t1',
      danger: 'text-danger',
      amber: 'text-amber',
      neon: 'text-neon',
      blue: 'text-blue',
    }[variant];

    const deltaColorClass = delta?.startsWith('+') 
      ? 'text-neon' 
      : delta?.startsWith('-') 
        ? 'text-danger' 
        : 'text-t4';

    return (
      <Card 
        ref={ref} 
        variant="metric" 
        className={cn(variant !== 'default' && cardVariants({ variant }), className)}
      >
        {/* Label */}
        <div className="font-mono text-[7.5px] text-t4 uppercase tracking-[0.13em] mb-[7px]">
          {label}
        </div>
        
        {/* Value */}
        <div className={cn(
          'font-syne text-[21px] font-extrabold tracking-tight leading-none',
          valueColorClass
        )}>
          {value}
        </div>
        
        {/* Delta */}
        {delta && (
          <div className={cn(
            'font-mono text-[8.5px] mt-[5px]',
            deltaColorClass
          )}>
            {delta}
          </div>
        )}
      </Card>
    );
  }
);
MetricCard.displayName = 'MetricCard';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  MetricCard,
  cardVariants,
};
