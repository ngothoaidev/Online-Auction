import type { ReactNode } from 'react';

const TONES = {
  neutral: 'bg-(--surface-sunken) text-(--ink)',
  brand: 'bg-(--brand-soft) text-(--brand-strong)',
  success: 'bg-(--success-soft) text-(--success)',
  danger: 'bg-(--danger-soft) text-(--danger)',
  warning: 'bg-(--warning-soft) text-(--warning)',
  info: 'bg-(--info-soft) text-(--info)',
};

/** Status is always conveyed by its text, never by colour alone. */
export type Tone = keyof typeof TONES;

export default function StatusBadge({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}>{children}</span>;
}
