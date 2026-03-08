'use client';

/**
 * Modal Hook
 * 
 * Replaces the legacy showModal() and closeModal() functions from HTML dashboards.
 * Provides a React-friendly way to manage modal state and animations.
 * 
 * @example
 * const { isOpen, openModal, closeModal, ModalWrapper } = useModal();
 * 
 * <button onClick={openModal}>Open Modal</button>
 * 
 * <ModalWrapper>
 *   <YourModalContent />
 * </ModalWrapper>
 */

import { useState, useCallback, useEffect, ReactNode } from 'react';

export interface UseModalOptions {
  onOpen?: () => void;
  onClose?: () => void;
  preventBodyScroll?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
}

export interface ModalState {
  isOpen: boolean;
  isAnimating: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
}

const DEFAULT_OPTIONS: Required<UseModalOptions> = {
  onOpen: () => {},
  onClose: () => {},
  preventBodyScroll: true,
  closeOnEscape: true,
  closeOnOverlayClick: true,
};

export function useModal(options: UseModalOptions = {}): ModalState {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const openModal = useCallback(() => {
    setIsAnimating(true);
    setIsOpen(true);
    config.onOpen();
  }, [config]);

  const closeModal = useCallback(() => {
    setIsAnimating(false);
    // Delay actual close to allow exit animation
    setTimeout(() => {
      setIsOpen(false);
      config.onClose();
    }, 200);
  }, [config]);

  const toggleModal = useCallback(() => {
    if (isOpen) {
      closeModal();
    } else {
      openModal();
    }
  }, [isOpen, openModal, closeModal]);

  // Handle escape key
  useEffect(() => {
    if (!config.closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeModal, config.closeOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!config.preventBodyScroll) return;

    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, config.preventBodyScroll]);

  return {
    isOpen,
    isAnimating,
    openModal,
    closeModal,
    toggleModal,
  };
}

/**
 * Hook for managing multiple modals
 */
export interface ModalsState {
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;
  isOpen: (id: string) => boolean;
}

export function useModals(): ModalsState {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const openModal = useCallback((id: string) => {
    setActiveModal(id);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const isOpen = useCallback((id: string) => {
    return activeModal === id;
  }, [activeModal]);

  return {
    activeModal,
    openModal,
    closeModal,
    isOpen,
  };
}

/**
 * Hook for modal with form state management
 */
export interface FormModalOptions<T> {
  initialData: T;
  onSubmit: (data: T) => void | Promise<void>;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface FormModalState<T> extends ModalState {
  formData: T;
  setFormData: (data: Partial<T>) => void;
  resetForm: () => void;
  handleSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

export function useFormModal<T>(options: FormModalOptions<T>): FormModalState<T> {
  const { initialData, onSubmit, onOpen, onClose } = options;
  
  const modal = useModal({ onOpen, onClose });
  const [formData, setFormDataState] = useState<T>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFormData = useCallback((data: Partial<T>) => {
    setFormDataState(prev => ({ ...prev, ...data }));
  }, []);

  const resetForm = useCallback(() => {
    setFormDataState(initialData);
  }, [initialData]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      modal.closeModal();
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, modal, resetForm]);

  return {
    ...modal,
    formData,
    setFormData,
    resetForm,
    handleSubmit,
    isSubmitting,
  };
}

/**
 * Hook for confirmation dialogs
 */
export interface UseConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export interface ConfirmState {
  isOpen: boolean;
  showConfirm: (options: UseConfirmOptions) => void;
  hideConfirm: () => void;
  confirmOptions: UseConfirmOptions | null;
}

export function useConfirm(): ConfirmState {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<UseConfirmOptions | null>(null);

  const showConfirm = useCallback((options: UseConfirmOptions) => {
    setConfirmOptions(options);
    setIsOpen(true);
  }, []);

  const hideConfirm = useCallback(() => {
    setIsOpen(false);
    // Delay clearing options to allow exit animation
    setTimeout(() => setConfirmOptions(null), 200);
  }, []);

  return {
    isOpen,
    showConfirm,
    hideConfirm,
    confirmOptions,
  };
}

/**
 * Legacy-compatible API
 * Matches the legacy closeModal() function signature
 */
export function closeModal(modalId: string): void {
  // Dispatch custom event that can be listened to by modal components
  const event = new CustomEvent('closeModal', { detail: { modalId } });
  document.dispatchEvent(event);
}

export function openModal(modalId: string): void {
  const event = new CustomEvent('openModal', { detail: { modalId } });
  document.dispatchEvent(event);
}
