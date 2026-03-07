/**
 * Modal Component - Foundational Five
 * Pixel-perfect recreation from legacy CSS
 * 
 * Legacy CSS Reference:
 * - Panel style background: var(--bg-2)
 * - Border: 1px solid var(--border)
 * - Border radius: 11px
 * - Dark overlay with fade animation
 * - Content fade animation: fadeIn 0.2s ease
 */

'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ========================================
// MODAL ROOT COMPONENTS
// ========================================

const Modal = DialogPrimitive.Root;

const ModalTrigger = DialogPrimitive.Trigger;

const ModalPortal = DialogPrimitive.Portal;

const ModalClose = DialogPrimitive.Close;

// ========================================
// MODAL OVERLAY
// ========================================

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
      className
    )}
    {...props}
  />
));
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

// ========================================
// MODAL CONTENT
// ========================================

const modalVariants = cva(
  // Base styles - matching legacy panel styles
  'fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
  'bg-bg-2 border border-border rounded-[11px] shadow-card-lg',
  'w-full max-w-lg overflow-hidden',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
  'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
  'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
  'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        default: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[calc(100vw-2rem)]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

interface ModalContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof modalVariants> {}

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalContentProps
>(({ className, size, children, ...props }, ref) => (
  <ModalPortal>
    <ModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(modalVariants({ size, className }))}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </ModalPortal>
));
ModalContent.displayName = DialogPrimitive.Content.displayName;

// ========================================
// MODAL HEADER
// ========================================

const ModalHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-between',
      'px-4 py-3 border-b border-border',
      className
    )}
    {...props}
  />
));
ModalHeader.displayName = 'ModalHeader';

// ========================================
// MODAL TITLE
// ========================================

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'font-syne text-[11.5px] font-bold text-t1',
      className
    )}
    {...props}
  />
));
ModalTitle.displayName = DialogPrimitive.Title.displayName;

// ========================================
// MODAL DESCRIPTION
// ========================================

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      'text-[9.5px] text-t4 mt-0.5',
      className
    )}
    {...props}
  />
));
ModalDescription.displayName = DialogPrimitive.Description.displayName;

// ========================================
// MODAL BODY
// ========================================

const ModalBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-4', className)}
    {...props}
  />
));
ModalBody.displayName = 'ModalBody';

// ========================================
// MODAL FOOTER
// ========================================

const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-end gap-2',
      'px-4 py-3 border-t border-border',
      className
    )}
    {...props}
  />
));
ModalFooter.displayName = 'ModalFooter';

// ========================================
// CLOSE BUTTON
// ========================================

const ModalCloseButton = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Close
    ref={ref}
    className={cn(
      'absolute right-3 top-3',
      'p-1 rounded-md text-t3 hover:text-t1 hover:bg-bg-3',
      'transition-colors duration-150',
      'focus:outline-none focus:ring-2 focus:ring-neon focus:ring-offset-2',
      className
    )}
    {...props}
  >
    <X className="h-4 w-4" />
    <span className="sr-only">Close</span>
  </DialogPrimitive.Close>
));
ModalCloseButton.displayName = 'ModalCloseButton';

// ========================================
// CONVENIENCE EXPORTS
// ========================================

export {
  Modal,
  ModalPortal,
  ModalOverlay,
  ModalTrigger,
  ModalClose,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
};

// ========================================
// PRE-BUILT MODAL PATTERNS
// ========================================

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning';
  isLoading?: boolean;
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader>
          <div>
            <ModalTitle>{title}</ModalTitle>
            {description && <ModalDescription>{description}</ModalDescription>}
          </div>
          <ModalCloseButton />
        </ModalHeader>
        <ModalFooter>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[11px] font-medium text-t3 hover:text-t1 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all',
              confirmVariant === 'primary' && 'bg-neon text-black hover:opacity-85',
              confirmVariant === 'danger' && 'bg-danger text-white hover:bg-danger/90',
              confirmVariant === 'warning' && 'bg-amber text-black hover:bg-amber/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? 'Loading...' : confirmText}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export { ConfirmModal };
