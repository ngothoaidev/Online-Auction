import { useNav } from '../hooks/useNavigate';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const nav = useNav();
  const { user } = useAuth();

  return (
    <div
      className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* --- BACKGROUND LAYER (The 404 & Icon) --- */}
      <div 
        className="absolute z-0 inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
      >
        {/* The Huge 404 Text */}
        <div
          className="text-[40vw] font-black text-(--text) opacity-[0.03] rotate-[-10deg] leading-none whitespace-nowrap"
        >
          404
        </div>
      </div>

      {/* --- FOREGROUND CONTENT (The Buttons & Text) --- */}
      <div className="text-center max-w-lg w-full relative z-10 backdrop-blur-sm p-8 rounded-2xl border border-transparent hover:border-(--border) transition-all">
        
        {/* Heading */}
        <div className="flex flex-row items-center justify-center gap-4 mb-6">
            <AlertCircle
                size={50}
                style={{ color: 'var(--danger)' }}
            />
            <h1 className="w-fit text-5xl font-extrabold text-(--text)">
                Page Not Found
            </h1>
        </div>

        {/* Description */}
        <p
          className="text-lg mb-8"
          style={{ color: 'var(--text-muted)' }}
        >
          Sorry, the page you're looking for doesn't exist. It might have been moved or deleted.
        </p>

        {/* Error Details */}
        <div className="p-3 rounded-lg mb-8 inline-block w-full bg-(--bg-soft) border border-(--border)">
          <p className="text-sm text-(--text-muted) font-mono break-all">
             URL: <span style={{ color: 'var(--accent)' }}>{window.location.pathname}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => nav.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition font-medium hover:-translate-y-1"
            style={{
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            <ArrowLeft size={20} />
            Go Back
          </button>

          <button
            onClick={() => nav.home()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition font-medium text-(--on-ink) bg-(--ink) hover:opacity-90"
          >
            <Home size={20} />
            Home Page
          </button>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
          <ul className="flex justify-center gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            <li>
              <button onClick={() => nav.search()} className="hover:text-(--ink) transition underline decoration-transparent hover:decoration-current">
                Search
              </button>
            </li>
            {user && (
              <li>
                <button onClick={() => nav.profile(user.username)} className="hover:text-(--ink) transition underline decoration-transparent hover:decoration-current">
                  Profile
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}