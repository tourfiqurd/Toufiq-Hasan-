import React from 'react';

export type PillVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface PillProps {
  variant?: PillVariant;
  children: React.ReactNode;
  className?: string;
}

const STYLES: Record<PillVariant, string> = {
  success:
    'bg-[#16A34A]/12 text-[#15803D] dark:bg-[#16A34A]/20 dark:text-[#4ADE80] border-[#16A34A]/25',
  warning:
    'bg-[#D97706]/12 text-[#B45309] dark:bg-[#F59E0B]/20 dark:text-[#FCD34D] border-[#D97706]/25',
  danger:
    'bg-[#DC2626]/12 text-[#B91C1C] dark:bg-[#DC2626]/20 dark:text-[#FCA5A5] border-[#DC2626]/25',
  info:
    'bg-[#0EA5E9]/12 text-[#0369A1] dark:bg-[#0EA5E9]/20 dark:text-[#38BDF8] border-[#0EA5E9]/25',
  neutral:
    'bg-[#4F46E5]/10 text-[#4338CA] dark:bg-[#4F46E5]/20 dark:text-[#A5B4FC] border-[#4F46E5]/20',
};

export const Pill: React.FC<PillProps> = ({ variant = 'neutral', children, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shrink-0 ${STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
