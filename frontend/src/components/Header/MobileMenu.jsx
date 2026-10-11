import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, LogOut } from 'lucide-react';
import { useNav } from '../../hooks/useNavigate.js';
import { searchUrl } from '../../utils/searchUrl.js';
import { Dialog } from '../ui';

/** Mobile navigation drawer: a real modal dialog (focus trap, Escape, focus restore) from the shared primitive. */
export default function MobileMenu({ open, onClose, focusSearch, categories, user, logout }) {
  const nav = useNav();
  const searchRef = useRef(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [query, setQuery] = useState('');

  const go = (fn) => () => { onClose(); fn(); };
  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    onClose();
    nav.search(q);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Menu" variant="drawer" initialFocusRef={focusSearch ? searchRef : undefined}>
      <form role="search" onSubmit={onSearch} className="mb-5">
        <label htmlFor="mobile-search" className="sr-only">Search lots</label>
        <div className="flex min-h-12 items-center rounded-(--radius-control) border border-(--input-border) bg-(--input-bg) pl-3">
          <Search size={18} aria-hidden="true" className="text-(--muted)" />
          <input ref={searchRef} id="mobile-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lots" className="w-full bg-transparent px-2 text-(--ink) outline-none placeholder:text-(--muted)" />
          <button type="submit" className="min-h-11 px-3 text-sm font-semibold text-(--ink)">Go</button>
        </div>
      </form>

      <nav aria-label="Categories">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-(--muted)">Browse categories</h3>
        <ul>
          {categories.map((cat) => {
            const expanded = openCategory === cat.id;
            return (
              <li key={cat.id} className="border-b border-(--line) last:border-0">
                <div className="flex items-center">
                  <Link to={searchUrl({ category: cat.name })} onClick={onClose} className="flex min-h-12 flex-1 items-center font-medium text-(--ink)">{cat.name}</Link>
                  {cat.subcategories?.length > 0 && (
                    <button type="button" aria-expanded={expanded} aria-label={`${cat.name} subcategories`} onClick={() => setOpenCategory(expanded ? null : cat.id)} className="inline-flex h-11 w-11 items-center justify-center text-(--muted)">
                      <ChevronDown size={18} aria-hidden="true" className={expanded ? 'rotate-180' : ''} />
                    </button>
                  )}
                </div>
                {expanded && (
                  <ul className="mb-3 ml-3 border-l border-(--line) pl-3">
                    {cat.subcategories.map((sub) => (
                      <li key={sub.id}>
                        <Link to={searchUrl({ category: sub.name })} onClick={onClose} className="flex min-h-11 items-center text-sm text-(--muted) hover:text-(--ink)">{sub.name}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 border-t border-(--line) pt-5">
        {user ? (
          <button type="button" onClick={go(logout)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-(--radius-control) border border-(--line) font-semibold text-(--danger)">
            <LogOut size={18} aria-hidden="true" /> Log out
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={go(nav.login)} className="min-h-12 rounded-(--radius-control) border border-(--input-border) font-semibold text-(--ink)">Log in</button>
            <button type="button" onClick={go(nav.register)} className="min-h-12 rounded-(--radius-control) bg-(--ink) font-semibold text-(--on-ink)">Register</button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
