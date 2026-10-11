import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Only real destinations and claims we can stand behind: no placeholder links, contact details, newsletter or security badges.
export default function Footer() {
  const { user } = useAuth();
  return (
    <footer className="border-t border-(--line) bg-(--surface) text-(--ink)">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
        <div>
          <p className="font-display text-xl font-semibold"><span className="text-(--brand)">AURUM</span> Auctions</p>
          <p className="mt-2 max-w-sm text-sm text-(--muted)">An online auction for collectibles. Bids are placed as a private maximum and the system bids for you, one step at a time.</p>
        </div>
        <nav aria-label="Browse">
          <h2 className="text-sm font-semibold">Browse</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li><Link className="inline-flex min-h-9 items-center text-(--muted) hover:text-(--ink)" to="/search">All lots</Link></li>
            <li><Link className="inline-flex min-h-9 items-center text-(--muted) hover:text-(--ink)" to="/search?sortBy=timeEndingSoon">Ending soon</Link></li>
            <li><Link className="inline-flex min-h-9 items-center text-(--muted) hover:text-(--ink)" to="/search?sortBy=timeNewlyListed">Newly listed</Link></li>
          </ul>
        </nav>
        <nav aria-label="Account">
          <h2 className="text-sm font-semibold">Account</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {user ? (
              <>
                <li><Link className="inline-flex min-h-9 items-center text-(--muted) hover:text-(--ink)" to={`/profile/${user.username}`}>My profile</Link></li>
                {user.role === 'buyer' && <li><Link className="inline-flex min-h-9 items-center text-(--muted) hover:text-(--ink)" to="/become-seller">Become a seller</Link></li>}
              </>
            ) : (
              <>
                <li><Link className="inline-flex min-h-9 items-center text-(--muted) hover:text-(--ink)" to="/login">Log in</Link></li>
                <li><Link className="inline-flex min-h-9 items-center text-(--muted) hover:text-(--ink)" to="/register">Create an account</Link></li>
              </>
            )}
          </ul>
        </nav>
      </div>
      <div className="border-t border-(--line) px-4 py-4 text-center text-xs text-(--muted)">
        &copy; {new Date().getFullYear()} Aurum Auctions. Portfolio project: payments here are manual or simulated; no real money is processed.
      </div>
    </footer>
  );
}
