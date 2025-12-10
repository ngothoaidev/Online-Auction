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
        className="w-full max-w-lg rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-soft)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Edit Personal Information
          </h3>
          <button onClick={onCancel} style={{ color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              <User size={16} className="inline mr-2" />
              Full Name *
            </label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: 'var(--input-bg)', 
                borderColor: 'var(--input-border)',
                color: 'var(--text)'
              }}
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              <User size={16} className="inline mr-2" />
              Username *
            </label>
            <input
              type="text"
              value={profileForm.username}
              onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Choose a username"
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: 'var(--input-bg)', 
                borderColor: 'var(--input-border)',
                color: 'var(--text)'
              }}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              <Mail size={16} className="inline mr-2" />
              Email *
            </label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: 'var(--input-bg)', 
                borderColor: 'var(--input-border)',
                color: 'var(--text)'
              }}
            />
          </div>

          {/* Birth Date */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              <Calendar size={16} className="inline mr-2" />
              Birth Date
            </label>
            <input
              type="date"
              value={profileForm.birthDate}
              onChange={(e) => setProfileForm(prev => ({ ...prev, birthDate: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: 'var(--input-bg)', 
                borderColor: 'var(--input-border)',
                color: 'var(--text)'
              }}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              <FileText size={16} className="inline mr-2" />
              Bio
            </label>
            <textarea
              value={profileForm.bio}
              onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 resize-none"
              style={{ 
                backgroundColor: 'var(--input-bg)', 
                borderColor: 'var(--input-border)',
                color: 'var(--text)'
              }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 rounded-lg font-medium transition-all border"
            style={{ 
              borderColor: 'var(--border)',
              color: 'var(--text)',
              backgroundColor: 'var(--bg-subtle)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
