import { useState } from 'react';
import { Field } from '../../components/ui';
import { useNav } from '../../hooks/useNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { validateForm } from '../../utils/validation';
import { verificationCodeSchema } from '../../schemas/auth.schemas';
import type { ApiError } from '../../services/apiClient';
import type { FormEvent } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function VerifyAccount() {
    const nav = useNav();
    const { user, logout } = useAuth();
    
    // Form State
    const [otp, setOtp] = useState(''); // one field, digits only
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [resending, setResending] = useState(false);
    
    const email = user?.email || localStorage.getItem('userEmail') || '';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        
        const code = otp;
        
        // Zod Validation
        const validation = validateForm(verificationCodeSchema, { code });
        if (!validation.success) {
            setError(validation.message);
            return;
        }
        
        setLoading(true);

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/auth/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email,
                    code
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Verification failed');
            }

            setSuccessMessage('Account verified successfully! Redirecting...');
            
            // Clear auth and redirect to login so user gets new token with updated role
            setTimeout(() => {
                logout();
                nav.go('/login', { state: { message: 'Account verified! Please login again to continue.' } });
            }, 1500);
        } catch (err) {
            console.error(err);
            setError((err as ApiError).message || 'Verification failed. Please check your code and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setResending(true);
        setError('');
        
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/auth/resend-verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to resend code');
            }

            setSuccessMessage('A new verification code has been sent to your email.');
            setOtp('');
        } catch (err) {
            setError((err as ApiError).message || 'Failed to resend verification code.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
                    <ShieldCheck size={32} className="text-[var(--accent)]" />
                </div>
            </div>

            <h1 className="text-3xl font-bold text-[var(--text)] text-center mb-2">Verify Your Account</h1>
            <p className="text-[var(--text-muted)] text-center mb-8">
                Enter the 6-digit code sent to your email
            </p>
            
            {/* Email Display */}
            <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-[var(--bg-soft)] border border-[var(--border)]">
                <Mail size={18} className="text-[var(--text-muted)]" />
                <span className="text-[var(--text)] font-medium">{email}</span>
            </div>

            {successMessage && (
                <div role="status" className="mb-4 p-3 rounded bg-[var(--success-soft)] border border-[var(--success)] text-[var(--success)] text-sm">
                    {successMessage}
                </div>
            )}

            {error && (
                <div role="alert" className="mb-4 p-3 rounded bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)] text-sm">
                    {error}
                </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
                <Field label="Verification code" hint="6 digits. You can paste the whole code.">
                    <input
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="h-14 text-center text-2xl font-lot tracking-[0.5em]"
                    />
                </Field>

                <button 
                    type="submit" 
                    disabled={loading || otp.length !== 6}
                    className="w-full py-3 rounded-full bg-(--ink) text-(--on-ink) font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        'Verifying...'
                    ) : (
                        <>
                            Verify Account
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>

            {/* Resend Code */}
            <div className="mt-6 text-center">
                <p className="text-[var(--text-muted)] text-sm">
                    Didn't receive the code?{' '}
                    <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resending}
                        className="text-[var(--accent)] font-medium hover:underline disabled:opacity-50"
                    >
                        {resending ? 'Sending...' : 'Resend Code'}
                    </button>
                </p>
            </div>
        </div>
        </div>
    );
}