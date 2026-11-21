import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import { useApp } from '../../store/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:bottom-5 sm:right-5 z-[60] flex flex-col gap-2.5 sm:max-w-sm sm:w-full pointer-events-none no-print"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 rounded-[14px] bg-[#0B1437] text-white px-4 py-3 floating-shadow border border-white/15 transition-all duration-300"
        >
          {toast.variant === 'danger' ? (
            <XCircle className="w-5 h-5 text-[#F87171] shrink-0" />
          ) : toast.variant === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-[#FCD34D] shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[#14B8A6] shrink-0" />
          )}
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="নোটিফিকেশন বন্ধ করুন"
            className="text-white/70 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
