import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  interactive = false,
  padding = 'md',
  className = '',
  children,
  ...rest
}) => {
  const padClass = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  return (
    <div
      className={`rounded-[16px] bg-white dark:bg-[#141B34] border border-[#E2E6F3] dark:border-[#262F52] card-shadow transition-all duration-300 ${
        interactive
          ? 'hover:-translate-y-[5px] hover:border-[#4F46E5] dark:hover:border-[#6366F1]'
          : ''
      } ${padClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
