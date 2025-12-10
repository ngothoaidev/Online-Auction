import { Lock, X, Save } from "lucide-react";

export default function ChangePasswordModal({ 
  isOpen, 
  passwordForm, 
  setPasswordForm, 
  onSave, 
  onCancel 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="modal-bg w-full max-w-md rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="modal-title text-2xl font-bold">
            Change Password
          </h3>
          <button onClick={onCancel} className="modal-close">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="modal-label block text-sm font-medium mb-2">
              <Lock size={16} className="inline mr-2" />
              Current Password *
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Enter current password"
              className="modal-input w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="modal-label block text-sm font-medium mb-2">
              <Lock size={16} className="inline mr-2" />
              New Password *
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder="Enter new password (min 6 characters)"
              className="modal-input w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="modal-label block text-sm font-medium mb-2">
              <Lock size={16} className="inline mr-2" />
              Confirm Password *
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm new password"
              className="modal-input w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
            />
          </div>

          {/* Password strength hint */}
          <div className="modal-info-box p-3 rounded-lg">
            <p className="modal-info-text text-xs">
              💡 Password must be at least 6 characters long
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={onCancel}
            className="modal-btn-cancel flex-1 px-6 py-3 rounded-lg font-medium transition-all border"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="modal-btn-submit flex-1 px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
