import { useState } from 'react';
import { Suspense } from 'react';
import PageLoading from '../../components/ui/PageLoading.jsx';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, FolderTree, ShoppingBag, UserPlus, LogOut, Home, Menu, Flag, ScrollText } from 'lucide-react';
import { useNav } from '../../hooks/useNavigate.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Dialog, IconButton } from '../../components/ui';

export const ADMIN_NAV = [
  { to: 'categories', label: 'Categories', icon: FolderTree },
  { to: 'products', label: 'Listings', icon: ShoppingBag },
  { to: 'users', label: 'Users', icon: Users },
  { to: 'upgrades', label: 'Seller requests', icon: UserPlus },
  { to: 'reports', label: 'Reports', icon: Flag },
  { to: 'audit', label: 'Audit log', icon: ScrollText },
];

const linkClass = ({ isActive }) =>
  `flex min-h-11 items-center gap-3 rounded-(--radius-control) px-3 text-sm font-medium ${isActive ? 'bg-(--ink) text-(--on-ink)' : 'text-(--ink) hover:bg-(--surface-hover)'}`;

function SidebarContents({ onNavigate, onHome, onLogout }) {
  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Admin" className="flex-1 space-y-1">
        {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={onNavigate}>
            <Icon size={18} aria-hidden="true" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 space-y-1 border-t border-(--line) pt-4">
        <button type="button" onClick={onHome} className="flex min-h-11 w-full items-center gap-3 rounded-(--radius-control) px-3 text-sm font-medium text-(--ink) hover:bg-(--surface-hover)"><Home size={18} aria-hidden="true" />Back to site</button>
        <button type="button" onClick={onLogout} className="flex min-h-11 w-full items-center gap-3 rounded-(--radius-control) px-3 text-sm font-medium text-(--danger) hover:bg-(--danger-soft)"><LogOut size={18} aria-hidden="true" />Log out</button>
      </div>
    </div>
  );
}

/** Admin shell: nested routes (/admin/categories|products|users|upgrades), desktop sidebar, mobile drawer. Page content scrolls; only tables scroll sideways. */
export default function AdminDashboard() {
  const nav = useNav();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const doLogout = () => { logout(); nav.logout(); };

  return (
    <div className="min-h-screen bg-(--canvas) text-(--ink)">
      <a href="#admin-main" className="skip-link">Skip to content</a>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-(--line) bg-(--surface) px-4 lg:hidden">
        <IconButton label="Open admin menu" onClick={() => setOpen(true)}><Menu size={22} /></IconButton>
        <span className="font-display text-lg font-semibold"><span className="text-(--brand)">AURUM</span> Admin</span>
      </header>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-(--line) bg-(--surface) p-4 lg:block" aria-label="Admin sidebar">
        <p className="font-display mb-6 px-3 text-xl font-semibold"><span className="text-(--brand)">AURUM</span> Admin</p>
        <SidebarContents onHome={() => nav.home()} onLogout={doLogout} />
      </aside>

      <Dialog open={open} onClose={() => setOpen(false)} title="Admin menu" variant="drawer">
        <SidebarContents onNavigate={() => setOpen(false)} onHome={() => { setOpen(false); nav.home(); }} onLogout={doLogout} />
      </Dialog>

      <main id="admin-main" tabIndex={-1} className="p-4 outline-none sm:p-6 lg:ml-60 lg:p-8">
        <Suspense fallback={<PageLoading />}><Outlet /></Suspense>
      </main>
    </div>
  );
}
