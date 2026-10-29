import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNav } from '../../hooks/useNavigate';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';


export default function Validation() {
    const nav = useNav();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Form State
    const [code, setCode] = useState('');
    const [email, setEmail] = useState(location.state?.email || '');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    console.log('Validation email:', email);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    code
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Validation failed');
            }

            setSuccessMessage('Account validated successfully! Redirecting to login...');
            
            // Redirect to login after a brief delay
            setTimeout(() => {
                nav.login();
            }, 1500);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Validation failed. Please check your code and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            {/* Back Button */}

            <h2 className="text-3xl font-bold text-[var(--text)] mb-8">Verify Account</h2>
            
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

            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-muted)]">Email</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled
                        className="w-full px-4 py-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-muted)] placeholder:text-[var(--text-subtle)] focus:outline-none transition-all opacity-60 cursor-not-allowed"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-muted)]">Verification Code</label>
                    <input 
                        type="text" 
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter the code sent to your email" 
                        className="w-full px-4 py-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3 rounded-full bg-[var(--accent)] text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Verifying...' : 'Verify Account'}
                </button>
            </form>
        </div>
    );
}