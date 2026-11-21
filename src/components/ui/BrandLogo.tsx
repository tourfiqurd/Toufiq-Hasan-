import React from 'react';
import { GraduationCap } from 'lucide-react';

interface BrandLogoProps {
  onDark?: boolean;
  collapsed?: boolean;
  size?: 'sm' | 'md';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  onDark = false,
  collapsed = false,
  size = 'md',
}) => {
  const tileSize = size === 'sm' ? 'h-9 w-9 rounded-[11px]' : 'h-10 w-10 rounded-[13px]';
  return (
    <span className="inline-flex items-center gap-2.5 shrink-0 select-none">
      <span
        className={`${tileSize} bg-brand-gradient flex items-center justify-center text-white shadow-md shrink-0`}
        aria-hidden="true"
      >
        <GraduationCap className="w-5 h-5" strokeWidth={1.9} />
      </span>
      {!collapsed && (
        <span
          className={`text-xl font-bold tracking-tight whitespace-nowrap ${
            onDark ? 'text-white' : 'text-[#0B1437] dark:text-[#E8ECFB]'
          }`}
        >
          একাডেমিয়া
        </span>
      )}
    </span>
  );
};
