import React, { useEffect, useState } from 'react';
import { formatNumeral } from '../../lib/grading/numerals';
import { useApp } from '../../store/AppContext';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'brand' | 'teal' | 'amber' | 'violet';
  helper?: string;
  highlightPending?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  tone = 'brand',
  helper,
  highlightPending = false,
}) => {
  const { numeralLocale } = useApp();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || value === 0) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 650;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const tileStyle = {
    brand: 'bg-brand-gradient text-white',
    teal: 'bg-[#14B8A6] text-white',
    amber: 'bg-warm-gradient text-[#0B1437]',
    violet: 'bg-[#7C3AED] text-white',
  }[tone];

  return (
    <Card interactive className="flex items-start justify-between gap-4">
      <div className="space-y-1 min-w-0">
        <p className="text-xs font-semibold text-[#5D6785] dark:text-[#98A2C7] truncate">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-[#111936] dark:text-[#E8ECFB] tabular-nums">
          {formatNumeral(display, numeralLocale)}
        </p>
        {helper && (
          <p
            className={`text-xs font-medium ${
              highlightPending && value > 0
                ? 'text-[#B45309] dark:text-[#FCD34D]'
                : 'text-[#5D6785] dark:text-[#98A2C7]'
            }`}
          >
            {helper}
          </p>
        )}
      </div>
      <div
        className={`w-[46px] h-[46px] rounded-[13px] flex items-center justify-center shrink-0 shadow-sm ${tileStyle}`}
        aria-hidden="true"
      >
        {icon}
      </div>
    </Card>
  );
};
