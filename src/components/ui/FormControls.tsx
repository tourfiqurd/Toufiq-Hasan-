import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

interface BaseFieldProps {
  label?: string;
  helperText?: string;
  error?: string;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, BaseFieldProps {
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  leftIcon,
  rightElement,
  className = '',
  id,
  ...rest
}) => {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-semibold text-[#111936] dark:text-[#E8ECFB]"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-[#5D6785] dark:text-[#98A2C7] pointer-events-none flex items-center">
            {leftIcon}
          </span>
        )}
        <input
          id={fieldId}
          className={`w-full rounded-[10px] border-[1.5px] bg-white dark:bg-[#0B1020] text-[#111936] dark:text-[#E8ECFB] placeholder:text-[#5D6785]/70 dark:placeholder:text-[#98A2C7]/60 text-sm py-2.5 transition-all duration-150 focus:border-[#4F46E5] focus:ring-[3px] focus:ring-[#4F46E5]/20 focus:outline-none ${
            error
              ? 'border-[#DC2626] dark:border-[#F87171]'
              : 'border-[#E2E6F3] dark:border-[#262F52]'
          } ${leftIcon ? 'pl-10' : 'pl-3.5'} ${rightElement ? 'pr-10' : 'pr-3.5'} ${className}`}
          {...rest}
        />
        {rightElement && (
          <span className="absolute right-2.5 flex items-center">{rightElement}</span>
        )}
      </div>
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[#DC2626] dark:text-[#FCA5A5]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">{helperText}</p>
      ) : null}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement>, BaseFieldProps {}

export const Select: React.FC<SelectProps> = ({
  label,
  helperText,
  error,
  className = '',
  id,
  children,
  ...rest
}) => {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-semibold text-[#111936] dark:text-[#E8ECFB]"
        >
          {label}
        </label>
      )}
      <select
        id={fieldId}
        className={`w-full rounded-[10px] border-[1.5px] bg-white dark:bg-[#0B1020] text-[#111936] dark:text-[#E8ECFB] text-sm px-3.5 py-2.5 transition-all duration-150 focus:border-[#4F46E5] focus:ring-[3px] focus:ring-[#4F46E5]/20 focus:outline-none ${
          error
            ? 'border-[#DC2626] dark:border-[#F87171]'
            : 'border-[#E2E6F3] dark:border-[#262F52]'
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[#DC2626] dark:text-[#FCA5A5]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">{helperText}</p>
      ) : null}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseFieldProps {}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  helperText,
  error,
  className = '',
  id,
  ...rest
}) => {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-semibold text-[#111936] dark:text-[#E8ECFB]"
        >
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        className={`w-full rounded-[10px] border-[1.5px] bg-white dark:bg-[#0B1020] text-[#111936] dark:text-[#E8ECFB] placeholder:text-[#5D6785]/70 dark:placeholder:text-[#98A2C7]/60 text-sm px-3.5 py-2.5 transition-all duration-150 focus:border-[#4F46E5] focus:ring-[3px] focus:ring-[#4F46E5]/20 focus:outline-none ${
          error
            ? 'border-[#DC2626] dark:border-[#F87171]'
            : 'border-[#E2E6F3] dark:border-[#262F52]'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[#DC2626] dark:text-[#FCA5A5]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-[#5D6785] dark:text-[#98A2C7]">{helperText}</p>
      ) : null}
    </div>
  );
};
