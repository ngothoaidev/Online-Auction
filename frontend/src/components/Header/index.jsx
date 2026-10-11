import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useNav } from '../../hooks/useNavigate.js';
import { Search, Menu, ArrowRight, Plus, LayoutDashboard } from 'lucide-react';

import CategoryDropper from './CategoryDropper.jsx';
import ProfileDropper from './ProfileDropper.jsx';
import MobileMenu from './MobileMenu.jsx';
import ThemeToggle from '../ThemeToggle.jsx';
import { IconButton } from '../ui';
import { useAuth } from '../../contexts/AuthContext.jsx';
import './Header.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const primaryAction = (role) => {
  if (role === 'admin') return { to: '/admin', label: 'Dashboard', Icon: LayoutDashboard };
  if (role === 'seller') return { to: '/create-auction', label: 'Create listing', Icon: Plus };
  if (role === 'buyer') return { to: '/become-seller', label: 'Start selling', Icon: ArrowRight };
  return { to: '/verify-account', label: 'Verify account', Icon: ArrowRight };
};

export default function Header() {
  const nav = useNav();
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [menu, setMenu] = useState({ open: false, focusSearch: false });

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/categories`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (!cancelled) setCategories(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { setSearchQuery(searchParams.get('q') || ''); }, [searchParams]);

  const onSearch = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) nav.search(trimmed);
  };

  const action = user ? primaryAction(user.role) : null;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b backdrop-blur" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--header-border)', height: 'var(--header-h)' }}>
        <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-10">
          <Link to="/" className="font-display shrink-0 text-2xl font-semibold tracking-tight text-(--ink)" aria-label="Aurum Auctions home">
            <span className="text-(--brand)">AURUM</span> Auctions
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <CategoryDropper categories={categories} />
          </nav>

          <form role="search" onSubmit={onSearch} className="mx-auto hidden max-w-xl flex-1 md:block">
            <label htmlFor="header-search" className="sr-only">Search lots</label>
            <div className="flex min-h-11 items-center rounded-(--radius-control) border bg-(--header-input-bg) pl-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--focus)" style={{ borderColor: 'var(--header-input-border)' }}>
              <input
                id="header-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lots, artists, brands"
                className="w-full bg-transparent text-sm text-(--ink) outline-none placeholder:text-(--muted)"
              />
              <button type="submit" aria-label="Search" className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-(--muted) hover:text-(--ink)">
                <Search size={18} aria-hidden="true" />
              </button>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0">
            <IconButton label="Search" className="md:hidden" onClick={() => setMenu({ open: true, focusSearch: true })}>
              <Search size={22} />
            </IconButton>

            <ThemeToggle />

            {user ? (
              <>
                <Link
                  to={action.to}
                  className="hidden min-h-11 items-center gap-2 rounded-(--radius-control) bg-(--ink) px-4 text-sm font-semibold text-(--on-ink) hover:opacity-90 sm:inline-flex"
                >
                  <action.Icon size={18} aria-hidden="true" />
                  {action.label}
                </Link>
                <ProfileDropper user={user} logout={logout} />
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <button type="button" onClick={() => nav.login()} className="min-h-11 rounded-(--radius-control) px-4 text-sm font-semibold text-(--ink) hover:bg-(--surface-hover)">Log in</button>
                <button type="button" onClick={() => nav.register()} className="min-h-11 rounded-(--radius-control) bg-(--ink) px-5 text-sm font-semibold text-(--on-ink) hover:opacity-90">Register</button>
              </div>
            )}

            <IconButton label="Open menu" className="lg:hidden" onClick={() => setMenu({ open: true, focusSearch: false })}>
              <Menu size={24} />
            </IconButton>
          </div>
        </div>
      </header>

      <MobileMenu
        open={menu.open}
        focusSearch={menu.focusSearch}
        categories={categories}
        user={user}
        logout={logout}
        onClose={() => setMenu({ open: false, focusSearch: false })}
      />
    </>
  );
}
