import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNav } from '../hooks/useNavigate';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const nav = useNav();
    const location = useLocation();
    const { login } = useAuth();

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Attempt login and get the user object back
            const user = await login(email, password);
            
            // Context-aware Redirect
            if (user.role === 'admin') {
                nav.admin();
            } else {
                const from = location.state?.from || '/';
                nav.replace(from);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold text-white mb-8">Login</h2>
            
            {error && (
                <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/50 text-red-500 text-sm">
                    {error}
                </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Email</label>
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email" 
                        className="w-full px-4 py-3 rounded-lg bg-[#120A1F] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E0B84C] transition-colors"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Password</label>
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password" 
                        className="w-full px-4 py-3 rounded-lg bg-[#120A1F] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E0B84C] transition-colors"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3 rounded-lg bg-[#E0B84C] text-[#120A1F] font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
}