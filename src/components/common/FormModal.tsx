import React from 'react';
import Modal from '@/components/ui/Modal';
import { Loader2 } from 'lucide-react';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  /** 추가 footer 버튼 */
  extraActions?: React.ReactNode;
}

export default function FormModal({
  isOpen,
  onClose,
  title,
  onSubmit,
  isSubmitting = false,
  submitLabel = '저장',
  cancelLabel = '취소',
  size = 'md',
  children,
  extraActions,
}: FormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form onSubmit={onSubmit}>
        <div className="p-lg space-y-md">
          {children}
        </div>
        <div className="flex items-center justify-end gap-sm p-lg border-t border-line">
          {extraActions}
          <button
            type="button"
            onClick={onClose}
            className="px-lg py-sm text-[13px] text-content-secondary hover:bg-surface-secondary rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="px-lg py-sm text-[13px] text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-50 flex items-center gap-xs"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="animate-spin" size={14} />}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
