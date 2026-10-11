import { useState } from 'react';
import { X, Lock, Mail, Eye, EyeOff, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify & Change
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setStep(1);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleRequestOTP = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`${API_URL}/auth/change-password/request-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      setSuccess('Verification code sent to your email!');
      setTimeout(() => {
        setStep(2);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`${API_URL}/auth/change-password/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otp,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      // Changing the password revokes older tokens; the server returns a fresh one.
      if (data.token) localStorage.setItem('authToken', data.token);
      setSuccess('Password changed successfully!');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-(--card-bg) rounded-2xl shadow-2xl border border-(--border) animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-(--border)">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--accent)/10">
              <Lock size={24} className="text-(--accent)" />
            </div>
            <h2 className="text-xl font-bold text-(--text)">Change Password</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-(--bg-hover) transition-colors text-(--text-muted) hover:text-(--text)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            // Step 1: Request OTP
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-(--accent)/10 border border-(--accent)/20">
                <div className="flex items-start gap-3">
                  <Mail size={20} className="text-(--accent) mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-(--text) mb-1">
                      Email Verification Required
                    </p>
                    <p className="text-xs text-(--text-muted) leading-relaxed">
                      We'll send a 6-digit verification code to your registered email address.
                      This code will expire in 10 minutes.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  {success}
                </div>
              )}

              <button
                onClick={handleRequestOTP}
                disabled={loading}
                className="w-full py-3 rounded-lg font-bold bg-(--accent) text-[#1a1205] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          ) : (
            // Step 2: Verify OTP & Change Password
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-(--text-muted)">
                Check your email for the 6-digit verification code
              </div>

              {/* OTP Input */}
              <div>
                <label className="block text-sm font-bold text-(--text) mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg border bg-(--input-bg) text-(--text) text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-(--accent) outline-none"
                  style={{ borderColor: 'var(--border)' }}
                  required
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-bold text-(--text) mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 pr-12 rounded-lg border bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--accent) outline-none"
                    style={{ borderColor: 'var(--border)' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-(--text-muted) hover:text-(--text)"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-bold text-(--text) mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 rounded-lg border bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--accent) outline-none"
                  style={{ borderColor: 'var(--border)' }}
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  {success}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-lg font-bold border border-(--border) text-(--text-muted) hover:bg-(--bg-hover) transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-lg font-bold bg-(--accent) text-[#1a1205] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
