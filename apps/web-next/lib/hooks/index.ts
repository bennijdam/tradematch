/**
 * TradeMatch Dashboard Hooks
 * 
 * React hooks that replace legacy JavaScript functions from HTML dashboards:
 * - useToast: Replaces showToast()
 * - useClock: Replaces tick()
 * - useModal: Replaces showModal() and closeModal()
 * - useCountdown: For SLA timers
 * - useConfirm: For confirmation dialogs
 * - useRelativeTime: For "2m ago" style timestamps
 */

export { useToast, toast, setToastCallback } from './useToast';
export type { Toast, ToastType, ToastOptions } from './useToast';

export { 
  useClock, 
  useCountdown, 
  useRelativeTime 
} from './useClock';
export type { 
  ClockFormat, 
  UseClockOptions, 
  ClockState,
  UseCountdownOptions,
  CountdownState
} from './useClock';

export { 
  useModal, 
  useModals, 
  useFormModal, 
  useConfirm,
  closeModal as closeModalLegacy,
  openModal as openModalLegacy
} from './useModal';
export type { 
  UseModalOptions, 
  ModalState,
  ModalsState,
  FormModalOptions,
  FormModalState,
  UseConfirmOptions,
  ConfirmState
} from './useModal';
