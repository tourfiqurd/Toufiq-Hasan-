import type { GradingScaleRule } from './types';

export const DEFAULT_GRADING_SCALE: GradingScaleRule[] = [
  { letter: 'A+', minMark: 80, maxMark: 100, point: 5.0 },
  { letter: 'A', minMark: 70, maxMark: 79, point: 4.0 },
  { letter: 'A-', minMark: 60, maxMark: 69, point: 3.5 },
  { letter: 'B', minMark: 50, maxMark: 59, point: 3.0 },
  { letter: 'C', minMark: 40, maxMark: 49, point: 2.0 },
  { letter: 'D', minMark: 33, maxMark: 39, point: 1.0 },
  { letter: 'F', minMark: 0, maxMark: 32, point: 0.0 },
];

export const DEFAULT_FOURTH_CONFIG = {
  basePassPoint: 2.0,
  maxBonus: 3.0,
  failZerosBonusOnly: true,
};

/**
 * Standard 33% pass mark auto-fill helper (rounded up to nearest integer when fractional >= 0.5,
 * matching standard Bangladesh school rounding: 70->23, 30->10, 50->17, 25->8, 100->33).
 */
export function calculateThirtyThreePercent(fullMarks: number): number {
  if (fullMarks <= 0) return 0;
  return Math.round(fullMarks * 0.33);
}

/**
 * Resolves letter grade and GPA point for a score normalized to 0..100.
 */
export function resolveGrade(
  markOutOf100: number,
  scale: GradingScaleRule[] = DEFAULT_GRADING_SCALE
): { letter: string; point: number } {
  const clamped = Math.max(0, Math.min(100, Math.round(markOutOf100)));
  const sorted = [...scale].sort((a, b) => b.minMark - a.minMark);
  for (const rule of sorted) {
    if (clamped >= rule.minMark && clamped <= rule.maxMark) {
      return { letter: rule.letter, point: rule.point };
    }
  }
  const fallback = sorted[sorted.length - 1];
  return fallback ? { letter: fallback.letter, point: fallback.point } : { letter: 'F', point: 0 };
}

/**
 * Maps an overall GPA (0.00 - 5.00) back to an overall letter grade.
 */
export function resolveOverallGradeFromGpa(gpa: number, passed: boolean): string {
  if (!passed || gpa <= 0) return 'F';
  if (gpa >= 5.0) return 'A+';
  if (gpa >= 4.0) return 'A';
  if (gpa >= 3.5) return 'A-';
  if (gpa >= 3.0) return 'B';
  if (gpa >= 2.0) return 'C';
  if (gpa >= 1.0) return 'D';
  return 'F';
}
