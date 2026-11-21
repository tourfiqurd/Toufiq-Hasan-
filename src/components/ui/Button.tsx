import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'outline-white' | 'danger' | 'warm' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) => {
  const sizeClasses = {
    sm: 'px-3.5 py-2 text-xs min-h-[36px]',
    md: 'px-5 py-2.5 text-sm min-h-[42px]',
    lg: 'px-6 py-3 text-base min-h-[48px]',
  }[size];

  const variantClasses = {
    primary: 'bg-brand-btn text-white border border-transparent shadow-sm',
    outline:
      'bg-transparent border-[1.5px] border-[#4F46E5] text-[#4F46E5] dark:text-[#A5B4FC] dark:border-[#818CF8] hover:bg-[#4F46E5]/12',
    'outline-white':
      'bg-transparent border-[1.5px] border-white/80 text-white hover:bg-white/15',
    danger:
      'bg-transparent border-[1.5px] border-[#DC2626] text-[#DC2626] dark:text-[#F87171] dark:border-[#F87171] hover:bg-[#DC2626]/10',
    warm: 'bg-warm-gradient text-[#0B1437] font-semibold border border-transparent hover:brightness-105 shadow-sm',
    ghost:
      'bg-transparent border border-transparent text-[#5D6785] dark:text-[#98A2C7] hover:bg-[#4F46E5]/10 hover:text-[#111936] dark:hover:text-white',
  }[variant];

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-[12px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-all duration-150 disabled:opacity-55 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      {...rest}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : leftIcon}
      <span>{children}</span>
    </button>
  );
};
