import { useState, useRef } from 'react';
import { useNav } from '../../hooks/useNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { validateForm } from '../../utils/validation';
import { verificationCodeSchema } from '../../schemas/auth.schemas';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function VerifyAccount() {
    const nav = useNav();
    const { user, logout } = useAuth();
    
    // OTP input refs
    const inputRefs = useRef([]);
    
    // Form State
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [resending, setResending] = useState(false);
    
    const email = user?.email || localStorage.getItem('userEmail') || '';

    const handleOtpChange = (index, value) => {
        // Only allow numbers
        if (value && !/^\d$/.test(value)) return;
        
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        
        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Handle backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d+$/.test(pastedData)) {
            const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
            setOtp(newOtp);
            // Focus last filled input or the next empty one
            const lastIndex = Math.min(pastedData.length - 1, 5);
            inputRefs.current[lastIndex]?.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        
        const code = otp.join('');
        
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
            setError(err.message || 'Verification failed. Please check your code and try again.');
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
            setOtp(['', '', '', '', '', '']);
        } catch (err) {
            setError(err.message || 'Failed to resend verification code.');
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

            <h2 className="text-3xl font-bold text-[var(--text)] text-center mb-2">Verify Your Account</h2>
            <p className="text-[var(--text-muted)] text-center mb-8">
                Enter the 6-digit code sent to your email
            </p>
            
            {/* Email Display */}
            <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-[var(--bg-soft)] border border-[var(--border)]">
                <Mail size={18} className="text-[var(--text-muted)]" />
                <span className="text-[var(--text)] font-medium">{email}</span>
            </div>

            {successMessage && (
                <div className="mb-4 p-3 rounded bg-[var(--success-soft)] border border-[var(--success)] text-[var(--success)] text-sm">
                    {successMessage}
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 rounded bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)] text-sm">
                    {error}
                </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
                {/* OTP Input */}
                <div className="flex justify-center gap-3">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => (inputRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                        />
                    ))}
                </div>

                <button 
                    type="submit" 
                    disabled={loading || otp.join('').length !== 6}
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