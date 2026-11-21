import type { NumeralLocale } from './types';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;
const EN_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function toEnglishDigits(input: string): string {
  return input.replace(/[০-৯]/g, (ch) => {
    const idx = BN_DIGITS.indexOf(ch as (typeof BN_DIGITS)[number]);
    return idx >= 0 ? EN_DIGITS[idx] : ch;
  });
}

export function formatNumeral(
  value: number | string | null | undefined,
  locale: NumeralLocale = 'bn',
  decimals?: number
): string {
  if (value === null || value === undefined || value === '') {
    return locale === 'bn' ? '—' : '-';
  }
  let formatted: string;
  if (typeof value === 'number' && Number.isFinite(value)) {
    formatted = typeof decimals === 'number' ? value.toFixed(decimals) : String(value);
  } else {
    formatted = String(value);
  }
  return locale === 'bn' ? toBanglaDigits(formatted) : toEnglishDigits(formatted);
}

export function formatGpa(gpa: number, locale: NumeralLocale = 'bn'): string {
  return formatNumeral(gpa, locale, 2);
}
