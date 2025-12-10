import { 
  User, 
  Mail, 
  Lock, 
  Star, 
  ThumbsUp, 
  ThumbsDown,
  Edit2,
  CheckCircle,
  Calendar
} from "lucide-react";

export default function ProfileHeader({ userData, onEditProfile, onChangePassword }) {
  return (
    <div 
      className="rounded-2xl p-8 mb-8 shadow-lg border"
      style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}
    >
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 overflow-hidden" style={{ borderColor: 'var(--accent)' }}>
            <img src={userData.avatar} alt={userData.name} className="w-full h-full object-cover" />
          </div>
          <div 
            className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center border-4"
            style={{ backgroundColor: 'var(--success)', borderColor: 'var(--bg-soft)' }}
          >
            <CheckCircle size={20} className="text-white" />
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 text-center md:text-left">
          <div className="mb-4">
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>
              {userData.name}
            </h1>
            <p className="text-sm flex items-center gap-2 justify-center md:justify-start" style={{ color: 'var(--text-muted)' }}>
              <User size={14} />
              @{userData.username}
            </p>
          </div>

          <div className="mb-3 space-y-1">
            <p className="text-sm flex items-center gap-2 justify-center md:justify-start" style={{ color: 'var(--text-muted)' }}>
              <Mail size={14} />
              {userData.email}
            </p>
            {userData.birthDate && (
              <p className="text-sm flex items-center gap-2 justify-center md:justify-start" style={{ color: 'var(--text-muted)' }}>
                <Calendar size={14} />
                {new Date(userData.birthDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            )}
          </div>

          {userData.bio && (
            <p className="mb-4 text-sm max-w-2xl mx-auto md:mx-0 italic" style={{ color: 'var(--text)' }}>
              "{userData.bio}"
            </p>
          )}
          
          {/* Rating */}
          <div className="flex items-center gap-4 justify-center md:justify-start pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <ThumbsUp size={20} style={{ color: 'var(--success)' }} />
              <span className="font-bold" style={{ color: 'var(--text)' }}>
                {userData.rating.positive}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsDown size={20} style={{ color: 'var(--danger)' }} />
              <span className="font-bold" style={{ color: 'var(--text)' }}>
                {userData.rating.negative}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Star size={20} style={{ color: 'var(--accent)' }} />
              <span className="font-bold" style={{ color: 'var(--text)' }}>
                {userData.rating.percentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Edit Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onEditProfile}
            className="px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 hover:shadow-lg"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
          >
            <Edit2 size={18} />
            Edit Profile
          </button>
          <button
            onClick={onChangePassword}
            className="px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 hover:shadow-lg border"
            style={{ borderColor: 'var(--border)', color: 'var(--text)', backgroundColor: 'var(--bg-soft)' }}
          >
            <Lock size={18} />
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}
