/** Placeholder block; decorative, hidden from assistive tech (pair with a visible/aria-live loading message). */
export default function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-(--radius-control) bg-(--surface-sunken) ${className}`} />;
}
