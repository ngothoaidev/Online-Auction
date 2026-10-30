import { useState, useEffect } from 'react';
import { useLocation, Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useNav } from '../../hooks/useNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { loginSchema } from '../../schemas/auth.schemas';
import { validateForm } from '../../utils/validation';
import { Button, Field } from '../../components/ui';
import SocialButtons from '../../components/auth/SocialButtons';
import type { ApiError } from '../../services/apiClient';
import type { FormEvent } from 'react';

const OAUTH_ERRORS: Record<string, string> = {
  account_banned: 'Your account has been banned. Please contact support for assistance.',
  google_failed: 'Google sign-in failed. Please try again.',
  facebook_failed: 'Facebook sign-in failed. Please try again.',
  auth_failed: 'Authentication failed. Please try again.',
};

export default function Login() {
  const nav = useNav();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(OAUTH_ERRORS[searchParams.get('error') ?? ''] || '');
  const [loading, setLoading] = useState(false);
  const notice = location.state?.message || '';

  useEffect(() => {
    const code = searchParams.get('error');
    if (code && OAUTH_ERRORS[code]) setError(OAUTH_ERRORS[code]);
  }, [searchParams]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateForm(loginSchema, { identifier, password });
    if (!v.success) { setFieldErrors(v.fieldErrors); setError(''); return; }
    setFieldErrors({});
    setError('');
    setLoading(true);
    try {
      const user = await login(identifier, password);
      if (user.role === 'admin') nav.admin();
      else nav.go(typeof location.state?.from === 'string' && location.state.from !== '/login' ? location.state.from : '/');
    } catch (err) {
      setError((err as ApiError).message || 'Could not sign in. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="tracking-tight mb-6 text-3xl font-semibold text-(--ink)">Sign in</h1>
      {notice && <p role="status" className="mb-4 rounded-(--radius-control) bg-(--success-soft) p-3 text-sm text-(--success)">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-(--radius-control) bg-(--danger-soft) p-3 text-sm text-(--danger)">{error}</p>}

      <SocialButtons />

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Username or email" error={fieldErrors.identifier}>
          <input type="text" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        </Field>
        <Field label="Password" error={fieldErrors.password}>
          <input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="flex items-center justify-between">
          <button type="button" aria-pressed={show} onClick={() => setShow((v) => !v)} className="inline-flex min-h-11 items-center gap-2 text-sm text-(--muted) hover:text-(--ink)">
            {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />} {show ? 'Hide' : 'Show'} password
          </button>
          <Link to="/forgot-password" className="text-sm font-semibold text-(--brand) underline">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
      </form>

      <p className="mt-6 text-sm text-(--muted)">New here? <Link to="/register" className="font-semibold text-(--brand) underline">Create an account</Link></p>
    </div>
  );
}
