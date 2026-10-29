import type { ReactNode } from 'react';

export default function EmptyState({ title, children, action, className = '' }: {
  title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-(--radius-card) border border-dashed border-(--line) p-8 text-center ${className}`}>
      <h3 className="text-base font-semibold text-(--ink)">{title}</h3>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-(--muted)">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
