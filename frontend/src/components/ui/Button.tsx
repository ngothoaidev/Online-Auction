import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary: 'bg-(--ink) text-(--on-ink) hover:opacity-90 disabled:opacity-50',
  secondary: 'bg-(--surface) text-(--ink) border border-(--input-border) hover:bg-(--surface-hover) disabled:opacity-50',
  ghost: 'bg-transparent text-(--ink) hover:bg-(--surface-hover) disabled:opacity-50',
  danger: 'bg-(--danger) text-(--on-ink) hover:opacity-90 disabled:opacity-50',
};
const SIZES = { md: 'min-h-11 px-4 text-sm', lg: 'min-h-12 px-6 text-base', sm: 'min-h-9 px-3 text-sm' };

/** Plain button. `loading` blocks activation (no double submit) and announces busy state. */
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS; size?: keyof typeof SIZES; loading?: boolean };

const Button = forwardRef<HTMLButtonElement, Props>(function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, type = 'button', disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-(--radius-control) font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
});
export default Button;
