import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNav } from '../../hooks/useNavigate';
import { registerSchema } from '../../schemas/auth.schemas';
import { validateForm } from '../../utils/validation';
import { apiFetch } from '../../services/apiClient';
import { Button, Field } from '../../components/ui';
import SocialButtons from '../../components/auth/SocialButtons';
import type { ApiError } from '../../services/apiClient';
import type { ChangeEvent, FormEvent } from 'react';

export default function Register() {
  const nav = useNav();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateForm(registerSchema, form);
    if (!v.success) { setFieldErrors(v.fieldErrors); setError(''); return; }
    setFieldErrors({});
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/register', { method: 'POST', auth: 'none', body: { username: form.username, email: form.email, password: form.password } });
      nav.go('/login', { state: { message: 'Account created. Check your email for the verification code, then sign in.' } });
    } catch (err) {
      // the API answers 409 for a taken email/username: show it on the field it belongs to
      if ((err as ApiError).status === 409) setFieldErrors(/email/i.test((err as ApiError).message) ? { email: (err as ApiError).message } : { username: (err as ApiError).message });
      else setError((err as ApiError).message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="tracking-tight mb-6 text-3xl font-semibold text-(--ink)">Create your account</h1>
      {error && <p role="alert" className="mb-4 rounded-(--radius-control) bg-(--danger-soft) p-3 text-sm text-(--danger)">{error}</p>}
      <SocialButtons />
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Username" hint="3 to 20 letters, numbers or underscores" error={fieldErrors.username}><input type="text" autoComplete="username" value={form.username} onChange={set('username')} /></Field>
        <Field label="Email" error={fieldErrors.email}><input type="email" autoComplete="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Password" hint="At least 6 characters with an upper-case letter, a lower-case letter and a number" error={fieldErrors.password}><input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} /></Field>
        <Field label="Confirm password" error={fieldErrors.confirmPassword}><input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} /></Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>{loading ? 'Creating account…' : 'Create account'}</Button>
      </form>
      <p className="mt-6 text-sm text-(--muted)">Already registered? <Link to="/login" className="font-semibold text-(--brand) underline">Sign in</Link></p>
    </div>
  );
}
