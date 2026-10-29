import { Outlet, Link } from 'react-router-dom';
import { Suspense } from 'react';
import PageLoading from '../components/ui/PageLoading';

// Brand panel is CSS only (no third-party image host); the form side is a plain landmark region.
const AuthLayout = () => (
  <div className="flex min-h-screen w-full bg-(--canvas)">
    <a href="#auth-main" className="skip-link">Skip to form</a>
    <aside className="hidden w-1/2 flex-col justify-between bg-(--ink) p-12 text-(--on-ink) lg:flex" aria-label="About Aurum Auctions">
      <Link to="/" className="font-display text-2xl font-semibold"><span className="font-bold tracking-wide">AURUM</span> Auctions</Link>
      <div>
        <p className="tracking-tight text-4xl font-semibold leading-tight">Collectibles, bid by bid.</p>
        <p className="mt-4 max-w-md text-lg opacity-80">Place a private maximum and let the auction bid for you, one step at a time.</p>
      </div>
      <p className="text-sm opacity-70">Portfolio project: payments are manual or simulated.</p>
    </aside>
    <main id="auth-main" tabIndex={-1} className="flex w-full flex-col bg-(--surface) outline-none lg:w-1/2">
      <div className="px-6 pt-6 lg:hidden"><Link to="/" className="font-display text-xl font-semibold text-(--ink)"><span className="text-(--brand)">AURUM</span> Auctions</Link></div>
      <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10"><Suspense fallback={<PageLoading />}><Outlet /></Suspense></div>
    </main>
  </div>
);

export default AuthLayout;
