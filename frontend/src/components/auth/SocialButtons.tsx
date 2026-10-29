import { Button } from '../ui';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// OAuth providers are redirects handled by the API; they work only when the server has the provider configured.
export default function SocialButtons() {
  return (
    <div className="space-y-3">
      <Button variant="secondary" size="lg" className="w-full" onClick={() => { window.location.href = `${API_URL}/auth/google`; }}>Continue with Google</Button>
      <Button variant="secondary" size="lg" className="w-full" onClick={() => { window.location.href = `${API_URL}/auth/facebook`; }}>Continue with Facebook</Button>
      <div className="flex items-center gap-3 py-2 text-sm text-(--muted)" aria-hidden="true"><span className="h-px flex-1 bg-(--line)" />or<span className="h-px flex-1 bg-(--line)" /></div>
    </div>
  );
}
