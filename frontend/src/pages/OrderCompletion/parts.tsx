import type { ReactNode } from 'react';

// Small pieces shared by the order page's panels.
export const card = 'bg-(--surface) rounded-(--radius-card) border border-(--line) p-6';
export const input = 'w-full px-4 py-3 rounded-xl border border-(--border) bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--focus) focus:border-transparent';
export const primaryButton = 'w-full py-3 bg-(--ink) text-(--on-ink) rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50';
export const fieldLabel = 'block text-sm font-medium text-(--text) mb-2';

export const ItemPhoto = ({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) => (src
  ? <img src={src} alt={alt} className={`object-cover ${className}`} />
  : <div role="img" aria-label={`${alt}: no photo`} className={`flex items-center justify-center bg-(--surface-sunken) text-xs text-(--muted) ${className}`}>No photo</div>);

/** "Waiting for the other side" line with a pulsing clock. */
export const WaitingNote = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-3 text-(--warning)">
    <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
    <p>{children}</p>
  </div>
);

export const CheckIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);
