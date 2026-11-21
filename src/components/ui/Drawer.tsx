import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
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

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0B1437]/55 backdrop-blur-xs no-print"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md h-full bg-white dark:bg-[#141B34] border-l border-[#E2E6F3] dark:border-[#262F52] floating-shadow flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#E2E6F3] dark:border-[#262F52]">
          <div>
            <h2 className="text-lg font-bold text-[#111936] dark:text-[#E8ECFB]">{title}</h2>
            {subtitle && (
              <p className="text-xs text-[#5D6785] dark:text-[#98A2C7] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ড্রয়ার বন্ধ করুন"
            className="p-2 rounded-[10px] text-[#5D6785] hover:text-[#111936] dark:text-[#98A2C7] dark:hover:text-white hover:bg-[#4F46E5]/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[#E2E6F3] dark:border-[#262F52] bg-[#F4F6FC]/60 dark:bg-[#0B1020]/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
