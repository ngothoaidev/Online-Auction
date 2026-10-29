import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Windowed page list (first, last, current ±1) so 200 pages do not render 200 buttons. */
function pageItems(current: number, total: number) {
  const set = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | `gap-${number}`)[] = [];
  pages.forEach((p, i) => { if (i > 0 && p - pages[i - 1] > 1) out.push(`gap-${p}`); out.push(p); });
  return out;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const btn = 'inline-flex h-11 min-w-11 items-center justify-center rounded-(--radius-control) border px-2 text-sm font-semibold';
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className={`${btn} border-(--input-border) bg-(--surface) disabled:opacity-40`}>
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      {pageItems(currentPage, totalPages).map((p) => (typeof p === 'string'
        ? <span key={p} aria-hidden="true" className="px-1 text-(--muted)">…</span>
        : (
          <button
            key={p}
            type="button"
            aria-label={`Page ${p}`}
            aria-current={p === currentPage ? 'page' : undefined}
            onClick={() => onPageChange(p)}
            className={`${btn} ${p === currentPage ? 'border-(--ink) bg-(--ink) text-(--on-ink)' : 'border-(--input-border) bg-(--surface) text-(--ink) hover:bg-(--surface-hover)'}`}
          >
            {p}
          </button>
        )))}
      <button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} className={`${btn} border-(--input-border) bg-(--surface) disabled:opacity-40`}>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
