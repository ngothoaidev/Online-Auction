import { useState } from 'react';
import { useFeedback } from '../../components/ui/Feedback.jsx';
import { useAuth } from '../../contexts/AuthContext';
import { useNav } from '../../hooks/useNavigate';

import { 
  MapPin, Calendar, Link as LinkIcon, Share2, MoreHorizontal, ShieldCheck, 
  MessageCircle, UserPlus, Camera, ThumbsUp, ThumbsDown, LogOut, Save, X, Star, Key
} from "lucide-react";

import ImageUploadModal from '../../components/ImageUploadModal';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import { formatDate } from '../../utils/format';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ProfileSidebar({ userData, isOwnProfile }) {
  const { notify } = useFeedback();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const [formData, setFormData] = useState({
        name: userData.username || "",
        bio: userData.bio || "",
        birthday: formatDate(userData.birthDate),
        joinDay: formatDate(userData.createdAt),
    });

    const { logout } = useAuth();
    const nav = useNav();
    
    const handleAvatarUpload = async (file) => {
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const token = localStorage.getItem('authToken');

            const response = await fetch(`${API_URL}/users/avatar`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}` 
                },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            console.log("Uploaded Image URL:", data.url);

            setIsUploadModalOpen(false);
            window.location.reload();

        } catch (error) {
            console.error("Upload error:", error);
            notify("Failed to upload image", 'error');
        }
    };

    // Logout Handler
    const handleLogout = () => {
        logout();
        nav.home();
    };

    // Handle input changes
    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Handle Save
    const handleSave = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            const payload = {
                fullName: formData.name,
                bio: formData.bio,
                birthday: formData.birthday == "unknown" ? undefined : new Date(formData.birthday),
            };

            const response = await fetch(`${API_URL}/users/info`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update profile');
            }

            setIsEditing(false);
            window.location.reload(); 

        } catch (error) {
            console.error("Profile update error:", error);
            notify(error.message || "Failed to save profile changes.", 'error');
        }
    };

    return (
        <div className="relative overflow-hidden">

            {/* Content Section */}
            <div className="px-6 pb-6 relative text-center">
                
                {/* AVATAR AREA */}
                <div className="relative mt-8 mb-6 inline-block transition-all">
                    <div className="relative group">
                        {/* Avatar Image */}
                        <div className="w-40 h-40 rounded-full border-[6px] border-(--bg-hover) shadow-md overflow-hidden bg-white">
                            <img 
                                src={userData.avatar} 
                                alt={userData.name} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            />
                        </div>

                        {/* AVATAR BUTTON */}
                        {isOwnProfile && (
                            <button 
                                onClick={() => setIsUploadModalOpen(true)}
                                className="absolute bottom-2 right-2 p-2 rounded-full bg-(--card-bg) text-(--text) shadow-lg hover:scale-110 transition-transform border-4 border-(--bg-hover)"
                            >
                                <Camera size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {isEditing ? (
                    // --- EDIT MODE FORM ---
                    <div className="space-y-4 text-left animate-in fade-in duration-200">
                        <div>
                            <label className="block text-xs font-bold text-(--text-muted) uppercase mb-1">Display Name</label>
                            <input 
                                type="text" 
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-lg border bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--accent) outline-none"
                                style={{ borderColor: 'var(--border)' }}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-(--text-muted) uppercase mb-1">Bio</label>
                            <textarea 
                                name="bio"
                                rows="3"
                                value={formData.bio}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-lg border bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--accent) outline-none resize-none"
                                style={{ borderColor: 'var(--border)' }}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-(--text-muted) uppercase mb-1">Birthday</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                                <input 
                                    type="text" 
                                    name="birthday"
                                    value={formData.birthday}
                                    onChange={handleChange}
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--accent) outline-none"
                                    style={{ borderColor: 'var(--border)' }}
                                />
                            </div>
                        </div>

                        {/* Edit Actions */}
                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={handleSave}
                                className="flex-1 py-2 rounded-lg font-bold bg-(--accent) text-[#1a1205] shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Save
                            </button>
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="flex-1 py-2 rounded-lg font-bold border border-(--border) text-(--text-muted) hover:bg-(--bg-hover) transition-all flex items-center justify-center gap-2"
                            >
                                <X size={18} /> Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    // --- VIEW MODE ---
                    <>
                        {/* Identity Info */}
                        <div className="mb-5">
                            <h2 className="text-2xl font-bold text-(--text) leading-tight">{userData.name}</h2>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <span className="text-sm font-medium text-(--accent)">@{userData.username}</span>
                                <span className="h-1 w-1 rounded-full bg-(--text-muted) opacity-30"></span>
                                <span className="text-xs font-bold uppercase tracking-wider text-(--text-muted) border border-(--border) px-2 py-0.5 rounded-md bg-(--bg-soft)">
                                    {userData.role || "Member"}
                                </span>
                            </div>
                        </div>

                        {/* Bio */}
                        <p className="text-sm text-(--text-muted) leading-relaxed mb-6 line-clamp-3 max-w-xs mx-auto">
                            {userData.bio || "No bio provided."}
                        </p>

                        {/* Mini Stats Row */}
                        <div className="flex items-center justify-between py-4 border-y border-(--border) mb-6 bg-(--bg-soft)/30 -mx-6 px-6 backdrop-blur-sm">
                            <div className="text-center flex-1">
                                <div className="text-lg font-bold text-(--text)">{userData.counts?.totalWonAuctions || 0}</div>
                                <div className="text-[10px] text-(--text-muted) font-bold uppercase tracking-wider">Won</div>
                            </div>
                            <div className="w-px h-8 bg-(--border)" />
                            <div className="text-center flex-1">
                                <div className="text-lg font-bold text-(--text)">{userData.counts?.totalActiveBids || 0}</div>
                                <div className="text-[10px] text-(--text-muted) font-bold uppercase tracking-wider">Active</div>
                            </div>
                            <div className="w-px h-8 bg-(--border)"></div>
                            <div className="text-center flex-1">
                                <div className="text-lg font-bold text-(--text)">{userData.counts?.totalSoldItems || 0}</div>
                                <div className="text-[10px] text-(--text-muted) font-bold uppercase tracking-wider">SOLD</div>
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="mb-6 p-4 rounded-lg bg-(--bg-soft)/30 border border-(--border)">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-(--text) uppercase tracking-wider">Reviews</h3>
                                <button 
                                    onClick={() => nav.reviews(userData.username)}
                                    className="text-xs text-(--accent) hover:underline font-medium"
                                >
                                    View All
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                {/* Reviews Received */}
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-(--text-muted)">
                                        <ThumbsUp size={14} className="text-green-500" />
                                        <span>Received</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-(--text) font-bold">{userData.counts?.reviewsReceived?.positive || 0}</span>
                                        <span className="text-(--text-muted)">/</span>
                                        <span className="text-(--text-muted)">{userData.counts?.reviewsReceived?.total || 0}</span>
                                    </div>
                                </div>

                                {/* Reviews Given */}
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-(--text-muted)">
                                        <Star size={14} className="text-blue-500" />
                                        <span>Given</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-(--text) font-bold">{userData.counts?.reviewsGiven?.positive || 0}</span>
                                        <span className="text-(--text-muted)">/</span>
                                        <span className="text-(--text-muted)">{userData.counts?.reviewsGiven?.total || 0}</span>
                                    </div>
                                </div>

                                {/* Positive Rate */}
                                <div className="pt-2 border-t border-(--border)">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-(--text-muted)">Positive Rate</span>
                                        <span className="text-(--success) font-bold text-base">{userData.counts?.reviewsReceived?.positiveRate || 0}%</span>
                                    </div>
                                    <div className="mt-2 h-2 bg-(--border) rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                                            style={{ width: `${userData.counts?.reviewsReceived?.positiveRate || 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact & Meta Details */}
                        <div className="flex justify-around lg:flex-col gap-3 mb-8 text-left w-full mx-auto">
                            <div className="flex items-center gap-3 text-sm text-(--text-muted) group/item">
                                <div className="p-1.5 rounded-md bg-(--bg-soft) text-(--text-muted) group-hover/item:text-(--accent) transition-colors">
                                    <LinkIcon size={14} />
                                </div>
                                <span>{formData.birthday}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-(--text-muted) group/item">
                                <div className="p-1.5 rounded-md bg-(--bg-soft) text-(--text-muted) group-hover/item:text-(--accent) transition-colors">
                                        <Calendar size={14} />
                                </div>
                                <span>{formData.joinDay}</span>
                            </div>
                        </div>

                        {/* Main CTA Buttons */}
                        <div className="space-y-3">
                            {isOwnProfile && (
                                <>
                                    <button 
                                        onClick={() => setIsEditing(true)} 
                                        className="w-full py-3 rounded-xl font-bold bg-(--text) text-(--bg) hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        Edit Profile
                                    </button>
                                    
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setIsChangePasswordModalOpen(true)}
                                            className="flex-1 py-3 rounded-xl font-bold border-2 border-(--border) hover:border-(--accent) text-(--text) hover:bg-(--bg-hover) transition-all flex items-center justify-center gap-2"
                                        >
                                            <Key size={18} />
                                            <span>Change Password</span>
                                        </button>
                                        <button 
                                            onClick={handleLogout}
                                            title="Log Out"
                                            className="p-3 rounded-xl border border-(--border) hover:bg-red-50 dark:hover:bg-red-900/10 text-(--text) hover:text-red-600 hover:border-red-200 transition-colors"
                                        >
                                            <LogOut size={20} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* IMAGE UPLOAD MODAL */}
            <ImageUploadModal 
                isOpen={isUploadModalOpen} 
                onClose={() => setIsUploadModalOpen(false)} 
                onUpload={handleAvatarUpload}
                title="Update Profile Picture"
            />

            {/* CHANGE PASSWORD MODAL */}
            <ChangePasswordModal 
                isOpen={isChangePasswordModalOpen} 
                onClose={() => setIsChangePasswordModalOpen(false)} 
            />
        </div>
    );
}