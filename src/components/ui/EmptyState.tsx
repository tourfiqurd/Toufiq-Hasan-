import React from 'react';
import { Card } from './Card';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
  return (
    <Card className="flex flex-col items-center justify-center text-center py-12 px-6">
      <svg
        width="120"
        height="96"
        viewBox="0 0 120 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-4"
        aria-hidden="true"
      >
        <rect
          x="18"
          y="16"
          width="84"
          height="64"
          rx="12"
          stroke="#4F46E5"
          strokeWidth="2"
          strokeDasharray="5 5"
          fill="#4F46E5"
          fillOpacity="0.06"
        />
        <path
          d="M36 38H84M36 50H72M36 62H58"
          stroke="#14B8A6"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="90" cy="24" r="10" fill="#4F46E5" fillOpacity="0.16" stroke="#4F46E5" strokeWidth="2" />
        <path d="M86 24H94M90 20V28" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <h3 className="text-base font-bold text-[#111936] dark:text-[#E8ECFB]">{title}</h3>
      <p className="text-sm text-[#5D6785] dark:text-[#98A2C7] mt-1 max-w-md">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
};
