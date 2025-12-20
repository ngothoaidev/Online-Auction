import { 
  MapPin, 
  Calendar, 
  Link as LinkIcon, 
  Share2, 
  MoreHorizontal, 
  MessageCircle, 
  UserPlus, 
  Camera, 
  ThumbsUp, 
  ThumbsDown 
} from "lucide-react";

export default function ProfileSidebar({ userData, isOwnProfile }) {
  return (
    <div className="relative overflow-hidden">

        {/* 2. Content Section */}
        <div className="px-6 pb-6 relative text-center">
            
            {/* AVATAR AREA */}
            <div className="relative mt-8 mb-6 inline-block transition-all">
                <div className="relative group">
                    {/* Larger Size: w-40 h-40 */}
                    <div className="w-50 h-50 rounded-full border-[6px] border-[var(--card-bg)] shadow-md overflow-hidden bg-white">
                        <img 
                            src={userData.avatar} 
                            alt={userData.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                    </div>

                    {/* DYNAMIC AVATAR BUTTON */}
                    {isOwnProfile ? (
                        /* OWNER: Change Image Button */
                        <button className="absolute bottom-2 right-2 p-2 rounded-full bg-[var(--text)] text-[var(--bg)] shadow-lg hover:scale-110 transition-transform border-4 border-[var(--card-bg)]">
                            <Camera size={18} />
                        </button>
                    ) : (
                        /* VISITOR: Like / Dislike Pill */
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full bg-[var(--card-bg)] border border-[var(--border)] shadow-lg">
                            <button className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors">
                                <ThumbsUp size={18} />
                            </button>
                            <div className="w-px h-4 bg-[var(--border)]"></div>
                            <button className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                                <ThumbsDown size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Identity Info */}
            <div className="mb-5">
                <h2 className="text-2xl font-bold text-[var(--text)] leading-tight">{userData.name}</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-sm font-medium text-[var(--accent)]">@{userData.username}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--text-muted)] opacity-30"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-md bg-[var(--bg-soft)]">
                        {userData.role || "Member"}
                    </span>
                </div>
            </div>

            {/* Bio */}
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6 line-clamp-3 max-w-xs mx-auto">
                {userData.bio || "No bio provided."}
            </p>

            {/* Mini Stats Row */}
            <div className="flex items-center justify-between py-4 border-y border-[var(--border)] mb-6 bg-[var(--bg-soft)]/30 -mx-6 px-6 backdrop-blur-sm">
                <div className="text-center flex-1">
                    <div className="text-lg font-bold text-[var(--text)]">{userData.wonAuctions?.length || 0}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Won</div>
                </div>
                <div className="w-px h-8 bg-[var(--border)]"></div>
                <div className="text-center flex-1">
                    <div className="text-lg font-bold text-[var(--text)]">{userData.activeBids?.length || 0}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Active</div>
                </div>
                <div className="w-px h-8 bg-[var(--border)]"></div>
                <div className="text-center flex-1">
                    <div className="text-lg font-bold text-[var(--success)]">{userData.rating?.percentage || 100}%</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Trust</div>
                </div>
            </div>

            {/* Contact & Meta Details */}
            <div className="flex justify-around lg:flex-col gap-3 mb-8 text-left w-full mx-auto">
                <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] group/item">
                    <div className="p-1.5 rounded-md bg-[var(--bg-soft)] text-[var(--text-muted)] group-hover/item:text-[var(--accent)] transition-colors">
                            <MapPin size={14} />
                    </div>
                    <span>San Francisco, CA</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] group/item">
                    <div className="p-1.5 rounded-md bg-[var(--bg-soft)] text-[var(--text-muted)] group-hover/item:text-[var(--accent)] transition-colors">
                            <LinkIcon size={14} />
                    </div>
                    <a href="#" className="hover:text-[var(--accent)] transition-colors truncate hover:underline decoration-[var(--accent)] decoration-2 underline-offset-4">
                        aurum.com/u/{userData.username}
                    </a>
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] group/item">
                    <div className="p-1.5 rounded-md bg-[var(--bg-soft)] text-[var(--text-muted)] group-hover/item:text-[var(--accent)] transition-colors">
                            <Calendar size={14} />
                    </div>
                    <span>Joined March 2023</span>
                </div>
            </div>

            {/* Main CTA Buttons */}
            <div className="flex gap-3">
                {isOwnProfile ? (
                    <button className="flex-1 py-3 rounded-xl font-bold bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2">
                        Edit Profile
                    </button>
                ) : (
                    <>
                        <button className="flex-1 py-3 rounded-xl font-bold bg-[var(--accent)] text-[#1a1205] hover:brightness-110 transition-all shadow-lg shadow-[var(--accent)]/20 flex items-center justify-center gap-2">
                            <UserPlus size={18} />
                            Follow
                        </button>
                        <button className="p-3 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)]">
                            <MessageCircle size={20} />
                        </button>
                    </>
                )}
            </div>

        </div>
    </div>
  );
}