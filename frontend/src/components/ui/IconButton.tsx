import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { label: string };

/** Icon-only control: `label` is mandatory so it always has an accessible name (and a tooltip). */
const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton({ label, className = '', children, type = 'button', ...rest }, ref) {
  if (!label) throw new Error('IconButton requires a label');
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-(--ink) transition-colors duration-150 hover:bg-(--surface-hover) ${className}`}
      {...rest}
    >
      <span aria-hidden="true" className="inline-flex">{children}</span>
    </button>
  );
});
export default IconButton;
