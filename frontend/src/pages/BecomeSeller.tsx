import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNav } from '../hooks/useNavigate';
import { Store, CheckCircle, Clock, XCircle, Star, TrendingUp, Users, ShieldCheck } from 'lucide-react';
import { becomeSellerSchema } from '../schemas/user.schemas';
import { validateForm } from '../utils/validation';
import type { ApiError } from '../services/apiClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function BecomeSeller() {
    const { user } = useAuth();
    const nav = useNav();
    
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [existingRequest, setExistingRequest] = useState(null);
    const [statusInfo, setStatusInfo] = useState(null);
    const [checkingRequest, setCheckingRequest] = useState(true);

    // Check if user already has a request
    useEffect(() => {
        const checkExistingRequest = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    setCheckingRequest(false);
                    return;
                }

                const response = await fetch(`${API_URL}/seller/my-request`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setExistingRequest(data.request);
                    setStatusInfo(data.statusInfo);
                }
            } catch (err) {
                console.error('Error checking request:', err);
            } finally {
                setCheckingRequest(false);
            }
        };

        checkExistingRequest();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        // Zod Validation
        const validation = validateForm(becomeSellerSchema, { reason });
        if (!validation.success) {
            setError(validation.message);
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                nav.go('/login', { state: { from: '/become-seller' } });
                return;
            }

            const response = await fetch(`${API_URL}/seller/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ reason }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit request');
            }

            setSuccessMessage('Your request has been submitted successfully! We will review it shortly.');
            setExistingRequest(data.request);
        } catch (err) {
            setError((err as ApiError).message || 'Failed to submit request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusDisplay = (status, statusInfo) => {
        switch (status) {
            case 'pending':
                return {
                    icon: <Clock className="w-12 h-12 text-(--warning)" />,
                    title: 'Request Pending',
                    description: 'Your seller upgrade request is being reviewed by our admin team.',
                    color: 'var(--warning)',
                    bgColor: 'var(--warning-soft)',
                };
            case 'approved':
                // Check if seller status is still active
                if (statusInfo?.isActive) {
                    return {
                        icon: <CheckCircle className="w-12 h-12 text-(--success)" />,
                        title: 'You are a Seller! 🎉',
                        description: `Your seller status is active for ${statusInfo.daysRemaining} more day${statusInfo.daysRemaining > 1 ? 's' : ''}.`,
                        color: 'var(--success)',
                        bgColor: 'var(--success-soft)',
                        expiryDate: statusInfo.expiryDate,
                        daysRemaining: statusInfo.daysRemaining,
                        isActive: true,
                    };
                }
                // Seller status expired - can reapply
                if (statusInfo?.expired) {
                    return {
                        icon: <Clock className="w-12 h-12 text-(--warning)" />,
                        title: 'Seller Status Expired',
                        description: 'Your seller period has ended. You can submit a new request to become a seller again.',
                        color: 'var(--warning)',
                        bgColor: 'var(--warning-soft)',
                        canReapply: true,
                    };
                }
                return {
                    icon: <CheckCircle className="w-12 h-12 text-(--success)" />,
                    title: 'Congratulations! 🎉',
                    description: 'Your request has been approved! You are now a seller.',
                    color: 'var(--success)',
                    bgColor: 'var(--success-soft)',
                };
            case 'rejected':
                if (statusInfo && !statusInfo.canReapply) {
                    return {
                        icon: <XCircle className="w-12 h-12 text-(--danger)" />,
                        title: 'Request Rejected',
                        description: 'Unfortunately, your request was not approved at this time.',
                        color: 'var(--danger)',
                        bgColor: 'var(--danger-soft)',
                        canReapplyDate: statusInfo.canReapplyDate,
                        daysRemaining: statusInfo.daysRemaining,
                    };
                }
                return {
                    icon: <XCircle className="w-12 h-12 text-(--danger)" />,
                    title: 'Request Rejected',
                    description: 'Unfortunately, your request was not approved. You can now submit a new request.',
                    color: 'var(--danger)',
                    bgColor: 'var(--danger-soft)',
                    canReapply: true,
                };
            default:
                return null;
        }
    };

    // If user is already a seller
    if (user?.role === 'seller') {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16">
                <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-(--success-soft) flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-(--success)" />
                    </div>
                    <h1 className="text-3xl font-bold text-(--text) mb-4">You're Already a Seller!</h1>
                    <p className="text-(--text-muted) mb-8">
                        You already have seller privileges. Start creating auctions and selling your items!
                    </p>
                    <Link
                        to="/create-auction"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-(--ink) text-(--on-ink) font-semibold hover:opacity-90 transition-all"
                    >
                        <Store size={20} />
                        Create Your First Auction
                    </Link>
                </div>
            </div>
        );
    }

    // Loading state
    if (checkingRequest) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-(--accent) border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-(--text-muted)">Checking your request status...</p>
                </div>
            </div>
        );
    }

    // If user has an existing request
    if (existingRequest) {
        const displayInfo = getStatusDisplay(existingRequest.status, statusInfo);
        
        // If rejected and can reapply OR approved but expired, show the form instead
        if ((existingRequest.status === 'rejected' && displayInfo?.canReapply) ||
            (existingRequest.status === 'approved' && displayInfo?.canReapply)) {
            // Don't return early - show the form below
        } else {
            return (
                <div className="max-w-2xl mx-auto px-4 py-16">
                    <div className="bg-(--bg-soft) rounded-2xl p-8 border border-(--border)">
                        <div className="text-center">
                            <div 
                                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                                style={{ backgroundColor: displayInfo.bgColor }}
                            >
                                {displayInfo.icon}
                            </div>
                            <h1 className="text-3xl font-bold text-(--text) mb-4">{displayInfo.title}</h1>
                            <p className="text-(--text-muted) mb-6">{displayInfo.description}</p>
                            
                            {/* Show expiry countdown for active sellers */}
                            {existingRequest.status === 'approved' && displayInfo.isActive && displayInfo.expiryDate && (
                                <div className="bg-(--success-soft) rounded-lg p-4 mb-6 border border-(--success)">
                                    <p className="text-sm font-medium text-(--success)">
                                        ⏳ Seller status expires on: {new Date(displayInfo.expiryDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                    <p className="text-xs text-(--text-muted) mt-1">
                                        {displayInfo.daysRemaining} day{displayInfo.daysRemaining > 1 ? 's' : ''} remaining
                                    </p>
                                </div>
                            )}

                            {/* Show reapply date for rejected requests */}
                            {existingRequest.status === 'rejected' && displayInfo.canReapplyDate && (
                                <div className="bg-(--warning-soft) rounded-lg p-4 mb-6 border border-(--warning)">
                                    <p className="text-sm font-medium text-(--warning)">
                                        ⏳ You can submit a new request in {displayInfo.daysRemaining} day{displayInfo.daysRemaining > 1 ? 's' : ''}
                                    </p>
                                    <p className="text-xs text-(--text-muted) mt-1">
                                        Available on: {new Date(displayInfo.canReapplyDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                            )}
                            
                            {existingRequest.adminNote && (
                                <div className="bg-(--bg) rounded-lg p-4 mb-6 text-left border border-(--border)">
                                    <p className="text-sm font-medium text-(--text-muted) mb-1">Admin Note:</p>
                                    <p className="text-(--text)">{existingRequest.adminNote}</p>
                                </div>
                            )}

                            <div className="text-sm text-(--text-muted)">
                                Submitted on: {new Date(existingRequest.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </div>

                            {existingRequest.status === 'approved' && !displayInfo.effectiveDate && (
                                <Link
                                    to="/create-auction"
                                    className="inline-flex items-center gap-2 px-6 py-3 mt-6 rounded-full bg-(--ink) text-(--on-ink) font-semibold hover:opacity-90 transition-all"
                                >
                                    <Store size={20} />
                                    Start Selling Now
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
                <div className="w-20 h-20 rounded-full bg-(--accent-soft) flex items-center justify-center mx-auto mb-6">
                    <Store className="w-10 h-10 text-(--accent)" />
                </div>
                <h1 className="text-4xl font-bold text-(--text) mb-4">Become a Seller</h1>
                <p className="text-lg text-(--text-muted) max-w-2xl mx-auto">
                    Ready to start selling? Apply to become a seller and unlock the ability to create auctions.
                </p>
            </div>

            {/* Benefits Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-(--bg-soft) rounded-xl p-6 border border-(--border) text-center">
                    <div className="w-12 h-12 rounded-full bg-(--success-soft) flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-6 h-6 text-(--success)" />
                    </div>
                    <h3 className="font-bold text-(--text) mb-2">Reach Buyers</h3>
                    <p className="text-sm text-(--text-muted)">
                        Access thousands of active buyers looking for items like yours.
                    </p>
                </div>

                <div className="bg-(--bg-soft) rounded-xl p-6 border border-(--border) text-center">
                    <div className="w-12 h-12 rounded-full bg-(--accent-soft) flex items-center justify-center mx-auto mb-4">
                        <Users className="w-6 h-6 text-(--accent)" />
                    </div>
                    <h3 className="font-bold text-(--text) mb-2">Build Reputation</h3>
                    <p className="text-sm text-(--text-muted)">
                        Grow your seller profile and earn positive reviews from buyers.
                    </p>
                </div>

                <div className="bg-(--bg-soft) rounded-xl p-6 border border-(--border) text-center">
                    <div className="w-12 h-12 rounded-full bg-(--warning-soft) flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-6 h-6 text-(--warning)" />
                    </div>
                    <h3 className="font-bold text-(--text) mb-2">Secure Platform</h3>
                    <p className="text-sm text-(--text-muted)">
                        Our platform ensures safe transactions for both buyers and sellers.
                    </p>
                </div>
            </div>

            {/* Requirements Section */}
            <div className="bg-(--bg-soft) rounded-2xl p-8 border border-(--border) mb-8">
                <h2 className="text-xl font-bold text-(--text) mb-4">Requirements</h2>
                <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-(--success) mt-0.5 shrink-0" />
                        <span className="text-(--text-muted)">Verified email address</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-(--success) mt-0.5 shrink-0" />
                        <span className="text-(--text-muted)">Active account with good standing</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-(--success) mt-0.5 shrink-0" />
                        <span className="text-(--text-muted)">Agree to seller terms and conditions</span>
                    </li>
                </ul>
            </div>

            {/* Application Form */}
            <div className="bg-(--bg-soft) rounded-2xl p-8 border border-(--border)">
                <h2 className="text-xl font-bold text-(--text) mb-6">Submit Your Application</h2>

                {successMessage && (
                    <div className="mb-6 p-4 rounded-lg bg-(--success-soft) border border-(--success) text-(--success)">
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-(--danger-soft) border border-(--danger) text-(--danger)">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="seller-reason" className="block text-sm font-medium text-(--text-muted) mb-2">
                            Why do you want to become a seller? (Optional)
                        </label>
                        <textarea
                            id="seller-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            placeholder="Tell us about yourself and what you plan to sell..."
                            className="w-full px-4 py-3 rounded-lg border border-(--input-border) bg-(--input-bg) text-(--text) placeholder:text-(--text-subtle) focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="terms"
                            required
                            className="mt-1 w-4 h-4 rounded border-(--input-border) text-(--accent) focus:ring-(--accent)"
                        />
                        <label htmlFor="terms" className="text-sm text-(--text-muted)">
                            I understand that my application will be reviewed by the admin team.
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-full bg-(--ink) text-(--on-ink) font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Store size={20} />
                                Submit Application
                            </>
                        )}
                    </button>
                </form>

                {!user && (
                    <p className="text-center text-sm text-(--text-muted) mt-6">
                        Already have an account?{' '}
                        <Link to="/login" state={{ from: { pathname: '/become-seller' } }} className="text-(--accent) hover:underline font-medium">
                            Sign in
                        </Link>
                        {' '}to submit your application.
                    </p>
                )}
            </div>
        </div>
    );
}
