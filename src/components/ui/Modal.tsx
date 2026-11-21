import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { Input } from './FormControls';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1437]/60 backdrop-blur-xs no-print"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${widthClass} max-h-[90vh] flex flex-col rounded-[20px] bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52] floating-shadow overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#E2E6F3] dark:border-[#262F52]">
          <div>
            <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">{title}</h2>
            {subtitle && (
              <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="p-2 rounded-[10px] text-[#5D6785] hover:text-[#111936] dark:text-[#98A2C7] dark:hover:text-white hover:bg-[#4F46E5]/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[#E2E6F3] dark:border-[#262F52] bg-[#F4F6FC]/60 dark:bg-[#0B1020]/50 flex flex-wrap items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  requireTypedText?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'নিশ্চিত করুন',
  confirmVariant = 'danger',
  requireTypedText,
}) => {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const canConfirm = !requireTypedText || typed.trim() === requireTypedText.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            বাতিল
          </Button>
          <Button
            variant={confirmVariant}
            disabled={!canConfirm}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[#5D6785] dark:text-[#98A2C7] leading-relaxed">{description}</p>
        {requireTypedText && (
          <Input
            label={`নিশ্চিত করতে "${requireTypedText}" টাইপ করুন`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={requireTypedText}
          />
        )}
      </div>
    </Modal>
  );
};
