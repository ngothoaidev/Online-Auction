import { User, Mail, Calendar, FileText, X, Save } from "lucide-react";

export default function EditProfileModal({ 
  isOpen, 
  profileForm, 
  setProfileForm, 
  onSave, 
  onCancel 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="modal-bg w-full max-w-lg rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="modal-title text-2xl font-bold">
            Edit Personal Information
          </h3>
          <button onClick={onCancel} className="modal-close">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="modal-label block text-sm font-medium mb-2">
              <User size={16} className="inline mr-2" />
              Full Name *
            </label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your full name"
              className="modal-input w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
            />
          </div>

          {/* Username */}
          <div>
            <label className="modal-label block text-sm font-medium mb-2">
              <User size={16} className="inline mr-2" />
              Username *
            </label>
            <input
              type="text"
              value={profileForm.username}
              onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Choose a username"
              className="modal-input w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
            />
          </div>

          {/* Email */}
          <div>
            <label className="modal-label block text-sm font-medium mb-2">
              <Mail size={16} className="inline mr-2" />
              Email *
            </label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="your.email@example.com"
              className="modal-input w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
            />
          </div>

          {/* Birth Date */}
          <div>
            <label className="modal-label block text-sm font-medium mb-2">
              <Calendar size={16} className="inline mr-2" />
              Birth Date
            </label>
            <input
              type="date"
              value={profileForm.birthDate}
              onChange={(e) => setProfileForm(prev => ({ ...prev, birthDate: e.target.value }))}
              className="modal-input w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
            /> 
          </div>

          {/* Bio */}
          <div>
            <label className="modal-label block text-sm font-medium mb-2">
              <FileText size={16} className="inline mr-2" />
              Bio
            </label>
            <textarea
              value={profileForm.bio}
              onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              rows={4}
              className="modal-input w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 resize-none"
            />
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
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
