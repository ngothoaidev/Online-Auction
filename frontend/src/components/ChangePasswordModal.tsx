import { useState } from 'react';
import { Mail, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Dialog } from './ui';
import type { FormEvent } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
      setError((err as Error).message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
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
      setError((err as Error).message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} title="Change password" pending={loading}>
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
                <div role="alert" className="p-3 rounded-lg bg-(--danger-soft) border border-(--danger) text-(--danger) text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div role="status" className="p-3 rounded-lg bg-(--success-soft) border border-(--success) text-(--success) text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  {success}
                </div>
              )}

              <button
                onClick={handleRequestOTP}
                disabled={loading}
                className="w-full py-3 rounded-lg font-bold bg-(--accent) text-(--on-ink) hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          ) : (
            // Step 2: Verify OTP & Change Password
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3 rounded-lg bg-(--info-soft) border border-(--info) text-sm text-(--text-muted)">
                Check your email for the 6-digit verification code
              </div>

              {/* OTP Input */}
              <div>
                <label htmlFor="cp-otp" className="block text-sm font-bold text-(--text) mb-2">
                  Verification Code
                </label>
                <input
                  id="cp-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
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
                <label htmlFor="cp-new" className="block text-sm font-bold text-(--text) mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="cp-new"
                    autoComplete="new-password"
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
                    aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-(--text-muted) hover:text-(--text)"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="cp-confirm" className="block text-sm font-bold text-(--text) mb-2">
                  Confirm Password
                </label>
                <input
                  id="cp-confirm"
                  autoComplete="new-password"
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
                <div role="alert" className="p-3 rounded-lg bg-(--danger-soft) border border-(--danger) text-(--danger) text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div role="status" className="p-3 rounded-lg bg-(--success-soft) border border-(--success) text-(--success) text-sm flex items-center gap-2">
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
                  className="flex-1 py-3 rounded-lg font-bold bg-(--accent) text-(--on-ink) hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
    </Dialog>
  );
}
