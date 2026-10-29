import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Clock } from 'lucide-react';
import { accountLinks } from './accountLinks';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Account disclosure: a button that reveals a group of links/actions (not an ARIA menu). Escape / outside click close it. */
export default function ProfileDropper({ user, logout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sellerStatus, setSellerStatus] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const name = user.fullName || user.username;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointer = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [isOpen]);

  useEffect(() => {
    if (user?.role !== 'seller') return;
    const token = localStorage.getItem('authToken');
    if (!token) return;
    fetch(`${API_URL}/seller/my-request`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.request?.status === 'approved' && data.statusInfo?.isActive) setSellerStatus(data.statusInfo); })
      .catch(() => {});
  }, [user?.role]);

  const close = (restoreFocus) => { setIsOpen(false); if (restoreFocus) triggerRef.current?.focus(); };

  return (
    <div className="relative hidden lg:block" ref={rootRef} onKeyDown={(e) => { if (e.key === 'Escape' && isOpen) { e.stopPropagation(); close(true); } }}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="account-panel"
        aria-label={`Account: ${name}`}
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-(--line) bg-(--surface-sunken) text-sm font-semibold text-(--ink) hover:bg-(--surface-hover)"
      >
        {user.imgUrl
          ? <img src={user.imgUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          : <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
      </button>

      {isOpen && (
        <div id="account-panel" className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-(--radius-card) border border-(--line) bg-(--surface) p-2 shadow-lg">
          <div className="border-b border-(--line) px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-(--ink)">{name}</p>
            <p className="truncate text-xs text-(--muted)">{user.email}</p>
            {user.role === 'seller' && sellerStatus?.isActive && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-(--warning-soft) px-2 py-1 text-xs font-medium text-(--warning)">
                <Clock size={12} aria-hidden="true" /> Seller access expires in {sellerStatus.daysRemaining} day{sellerStatus.daysRemaining > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <nav aria-label="Account" className="mt-1">
            {accountLinks(user).map((l) => (
              <Link key={l.to} to={l.to} onClick={() => close(false)} className="flex min-h-11 items-center rounded-(--radius-control) px-3 text-sm font-medium text-(--ink) hover:bg-(--surface-hover)">{l.label}</Link>
            ))}
          </nav>
          <button type="button" onClick={() => { close(false); logout(); }} className="flex min-h-11 w-full items-center gap-3 rounded-(--radius-control) px-3 text-sm font-medium text-(--danger) hover:bg-(--danger-soft)">
            <LogOut size={16} aria-hidden="true" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
