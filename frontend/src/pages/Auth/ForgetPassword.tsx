import { useState, useRef, useEffect } from 'react';
import { Field } from '../../components/ui';
import { Link } from 'react-router-dom';
import { useNav } from '../../hooks/useNavigate';

import {validateForm} from '../../utils/validation';
import { forgotPasswordEmailSchema, forgotPasswordOtpSchema, resetPasswordSchema } from '../../schemas/auth.schemas';
import type { ApiError } from '../../services/apiClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ForgetPassword() {
    const nav = useNav();

    // Step: 'email', 'otp', or 'reset'
    const [step, setStep] = useState('email');
    
    // Form State
    const [email, setEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [otp, setOtp] = useState(''); // one field, digits only
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const otpRef = useRef(null);

    // Handle email submission
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        
        // Zod Validation
        const validation = validateForm(forgotPasswordEmailSchema, { email });
        if (!validation.success) {
            setError(validation.message);
            return;
        }
        
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send OTP');
            }

            setSuccessMessage('OTP has been sent to your email!');
            setStep('otp');
        } catch (err) {
            setError((err as ApiError).message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP verification
    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const otpCode = otp;
        
        // Zod Validation
        const validation = validateForm(forgotPasswordOtpSchema, { otp: otpCode });
        if (!validation.success) {
            setError(validation.message);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/verify-reset-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp: otpCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Invalid OTP');
            }

            setResetToken(data.resetToken);
            setSuccessMessage('OTP verified! Please enter your new password.');
            setStep('reset');
        } catch (err) {
            setError((err as ApiError).message || 'Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle password reset
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        // Zod Validation
        const validation = validateForm(resetPasswordSchema, { newPassword, confirmPassword });
        if (!validation.success) {
            setError(validation.message);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, newPassword, resetToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to reset password');
            }

            setSuccessMessage('Password reset successful! Redirecting to login...');
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                nav.go('/login', { state: { message: 'Password has been reset successfully. Please login with your new password.' } });
            }, 2000);
        } catch (err) {
            setError((err as ApiError).message || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle resend OTP
    const handleResendOtp = async () => {
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to resend OTP');
            }

            setSuccessMessage('A new OTP has been sent to your email!');
            setOtp('');
        } catch (err) {
            setError((err as ApiError).message || 'Failed to resend OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Focus first OTP input when step changes to 'otp'
    useEffect(() => {
        if (step === 'otp') {
            otpRef.current?.focus();
        }
    }, [step]);

    return (
        <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Forgot Password</h1>
            <p className="text-[var(--text-muted)] mb-8">
                {step === 'email' && 'Enter your email address to receive a verification code.'}
                {step === 'otp' && 'Enter the 6-digit code sent to your email.'}
                {step === 'reset' && 'Create a new password for your account.'}
            </p>
            
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

            {step === 'email' ? (
                /* Email Input Form */
                <form className="space-y-5" onSubmit={handleEmailSubmit}>
                    <div className="space-y-2">
                        <label htmlFor="fp-email" className="block text-sm font-medium text-[var(--text-muted)]">Email address</label>
                        <input id="fp-email" autoComplete="email"
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your registered email"
                            className="w-full px-4 py-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 rounded-full bg-(--ink) text-(--on-ink) font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Sending...' : 'Next'}
                    </button>
                </form>
            ) : step === 'otp' ? (
                /* OTP Input Form */
                <form className="space-y-5" onSubmit={handleOtpSubmit}>
                    <div className="space-y-2">
                        <Field label="Verification code" hint="6 digits. You can paste the whole code.">
                            <input
                                ref={otpRef}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                className="h-14 text-center text-2xl font-lot tracking-[0.5em]"
                            />
                        </Field>
                        <p className="text-sm text-[var(--text-muted)] mt-2">
                            Code sent to: <span className="font-medium text-[var(--text)]">{email}</span>
                        </p>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 rounded-full bg-(--ink) text-(--on-ink) font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Verifying...' : 'Verify Code'}
                    </button>

                    <div className="flex items-center justify-between text-sm">
                        <button
                            type="button"
                            onClick={() => {
                                setStep('email');
                                setOtp('');
                                setError('');
                                setSuccessMessage('');
                            }}
                            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                        >
                            ← Change email
                        </button>
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={loading}
                            className="text-[var(--accent)] hover:underline disabled:opacity-50"
                        >
                            Resend code
                        </button>
                    </div>
                </form>
            ) : (
                /* Password Reset Form */
                <form className="space-y-5" onSubmit={handlePasswordReset}>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label htmlFor="fp-new" className="block text-sm font-medium text-[var(--text-muted)]">New Password</label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1"
                            >
                                {showPassword ? (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                        Hide
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Show
                                    </>
                                )}
                            </button>
                        </div>
                        <input id="fp-new" autoComplete="new-password"
                            type={showPassword ? "text" : "password"}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full px-4 py-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label htmlFor="fp-confirm" className="block text-sm font-medium text-[var(--text-muted)]">Confirm Password</label>
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1"
                            >
                                {showConfirmPassword ? (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                        Hide
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Show
                                    </>
                                )}
                            </button>
                        </div>
                        <input id="fp-confirm" autoComplete="new-password"
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full px-4 py-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 rounded-full bg-(--ink) text-(--on-ink) font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            )}

            {/* Bottom Links */}
            <div className="mt-8 text-center space-y-2">
                <p className="text-sm text-[var(--text-muted)]">
                    Remember your password?{' '}
                    <Link to="/login" className="font-semibold text-[var(--accent)] hover:underline">
                        Sign in
                    </Link>
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-semibold text-[var(--accent)] hover:underline">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}