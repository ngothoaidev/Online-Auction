import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Mail, 
  Lock, 
  Star, 
  Heart, 
  Gavel, 
  Trophy, 
  Package, 
  ThumbsUp, 
  ThumbsDown,
  MessageSquare,
  Edit2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  ShoppingBag,
  Ban,
  Calendar,
  FileText,
  ArrowRight
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SoldAuctionCard from "../components/SoldAuctionCard.jsx";
import WonAuctionCard from "../components/WonAuctionCard.jsx";
import { mockUserData } from "../data/mockData";
import AuctionCard from "../components/AuctionCard.jsx";
// Mock data for user profile


export default function Profile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('buyer'); // 'buyer' or 'seller'
  const [userData, setUserData] = useState(mockUserData);
  const [darkMode, setDarkMode] = useState(false);
  
  // Edit profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: userData.name,
    username: userData.username || '',
    email: userData.email,
    bio: userData.bio || '',
    birthDate: userData.birthDate || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Review modal states
  const [reviewModal, setReviewModal] = useState({ isOpen: false, item: null, type: 'buyer' });
  const [reviewForm, setReviewForm] = useState({ rating: 'positive', comment: '' });

  const toggleTheme = () => setDarkMode(!darkMode);

  const handleProfileUpdate = () => {
    // Validation
    if (!profileForm.name.trim()) {
      alert('Full name is required!');
      return;
    }
    
    if (!profileForm.username.trim()) {
      alert('Username is required!');
      return;
    }

    if (!profileForm.email.trim()) {
      alert('Email is required!');
      return;
    }

    // Update user data
    setUserData(prev => ({
      ...prev,
      name: profileForm.name,
      username: profileForm.username,
      email: profileForm.email,
      bio: profileForm.bio,
      birthDate: profileForm.birthDate
    }));
    
    setIsEditingProfile(false);
    alert('Profile updated successfully!');
  };

  const handleCancelProfileEdit = () => {
    setProfileForm({
      name: userData.name,
      username: userData.username || '',
      email: userData.email,
      bio: userData.bio || '',
      birthDate: userData.birthDate || ''
    });
    setIsEditingProfile(false);
  };

  const handlePasswordUpdate = () => {
    // Validation
    if (!passwordForm.currentPassword) {
      alert('Please enter your current password');
      return;
    }
    
    if (!passwordForm.newPassword) {
      alert('Please enter a new password');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }

    // Here you would typically verify the current password with backend
    // For now, we'll just simulate success
    
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    setIsEditingPassword(false);
    alert('Password changed successfully!');
  };

  const handleCancelPasswordEdit = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setIsEditingPassword(false);
  };

  const handleSubmitReview = () => {
    if (!reviewForm.comment.trim()) {
      alert('Please enter a comment');
      return;
    }

    // Update the reviewed status
    if (reviewModal.type === 'buyer') {
      setUserData(prev => ({
        ...prev,
        wonAuctions: prev.wonAuctions.map(item =>
          item.id === reviewModal.item.id ? { ...item, reviewed: true } : item
        )
      }));
    } else {
      setUserData(prev => ({
        ...prev,
        soldItems: prev.soldItems.map(item =>
          item.id === reviewModal.item.id ? { ...item, reviewed: true } : item
        )
      }));
    }

    setReviewModal({ isOpen: false, item: null, type: 'buyer' });
    setReviewForm({ rating: 'positive', comment: '' });
    alert('Review submitted successfully!');
  };

  const handleCancelTransaction = (itemId) => {
    if (confirm('Are you sure you want to cancel this transaction? This will give the buyer a negative review.')) {
      setUserData(prev => ({
        ...prev,
        soldItems: prev.soldItems.map(item =>
          item.id === itemId 
            ? { ...item, status: 'cancelled', reviewed: true } 
            : item
        )
      }));
      alert('Transaction cancelled. Negative review sent to buyer.');
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = date - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diff < 0) return 'Ended';
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <>
      <Header darkMode={darkMode} toggleTheme={toggleTheme} />
      
      <div className="min-h-screen py-8" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Profile Header */}
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
                  onClick={() => setIsEditingProfile(true)}
                  className="px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 hover:shadow-lg"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
                >
                  <Edit2 size={18} />
                  Edit Profile
                </button>
                <button
                  onClick={() => setIsEditingPassword(true)}
                  className="px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 hover:shadow-lg border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)', backgroundColor: 'var(--bg-soft)' }}
                >
                  <Lock size={18} />
                  Change Password
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div 
            className="flex gap-2 mb-8 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              onClick={() => setActiveTab('buyer')}
              className="px-6 py-3 font-medium transition-all relative"
              style={{ 
                color: activeTab === 'buyer' ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} />
                Buyer Profile
              </div>
              {activeTab === 'buyer' && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-t"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </button>

            <button
              onClick={() => userData.isSeller && setActiveTab('seller')}
              disabled={!userData.isSeller}
              className="px-6 py-3 font-medium transition-all relative"
              style={{ 
                color: activeTab === 'seller' ? 'var(--accent)' : 'var(--text-muted)',
                opacity: userData.isSeller ? 1 : 0.5,
                cursor: userData.isSeller ? 'pointer' : 'not-allowed'
              }}
            >
              <div className="flex items-center gap-2">
                <Package size={20} />
                Seller Profile
              </div>
              {activeTab === 'seller' && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-t"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </button>
          </div>

          {/* Buyer Tab Content */}
          {activeTab === 'buyer' && (
            <div className="space-y-8">
              
              {/* Reviews Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <Star size={24} style={{ color: 'var(--accent)' }} />
                    Reviews & Ratings
                  </h2>
                  <button
                    onClick={() => navigate('/reviews')}
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 hover:shadow-md"
                    style={{ 
                      backgroundColor: 'var(--bg-subtle)', 
                      color: 'var(--accent)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    View All
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  {userData.reviews.map(review => (
                    <div 
                      key={review.id}
                      className="p-6 rounded-xl border"
                      style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {review.type === 'positive' ? (
                            <ThumbsUp size={20} style={{ color: 'var(--success)' }} />
                          ) : (
                            <ThumbsDown size={20} style={{ color: 'var(--danger)' }} />
                          )}
                          <div>
                            <p className="font-bold" style={{ color: 'var(--text)' }}>
                              {review.from}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              {review.productTitle}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {review.date.toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text)' }}>
                        {review.comment}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Favorite Products */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <Heart size={24} style={{ color: 'var(--danger)' }} />
                    Favorite Products
                  </h2>
                  <button
                    onClick={() => navigate('/favourite-products')}
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 hover:shadow-md"
                    style={{ 
                      backgroundColor: 'var(--bg-subtle)', 
                      color: 'var(--accent)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    View All
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userData.favoriteProducts.map(product => (
                    <ProductCard key={product.id} product={product} type="favorite" formatTime={formatTime} />
                  ))}
                </div>
              </section>

              {/* Active Bids */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <Gavel size={24} style={{ color: 'var(--accent)' }} />
                    Active Bids
                  </h2>
                  <button
                    onClick={() => navigate('/active-bids')}
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 hover:shadow-md"
                    style={{ 
                      backgroundColor: 'var(--bg-subtle)', 
                      color: 'var(--accent)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    View All
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userData.activeBids.map(product => (
                    <ProductCard key={product.id} product={product} type="activeBid" formatTime={formatTime} />
                  ))}
                </div>
              </section>

              {/* Won Auctions */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <Trophy size={24} style={{ color: 'var(--accent)' }} />
                    Won Auctions
                  </h2>
                  <button
                    onClick={() => navigate('/won-auctions')}
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 hover:shadow-md"
                    style={{ 
                      backgroundColor: 'var(--bg-subtle)', 
                      color: 'var(--accent)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    View All
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userData.wonAuctions.map(product => (
                    <WonAuctionCard 
                      key={product.id} 
                      product={product} 
                      onReview={(item) => setReviewModal({ isOpen: true, item, type: 'buyer' })}
                    />
                  ))}
                </div>
              </section>

            </div>
          )}

          {/* Seller Tab Content */}
          {activeTab === 'seller' && userData.isSeller && (
            <div className="space-y-8">
              
              {/* Active Listings */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <Clock size={24} style={{ color: 'var(--accent)' }} />
                    Active Listings
                  </h2>
                  <button
                    onClick={() => navigate('/active-listings')}
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 hover:shadow-md"
                    style={{ 
                      backgroundColor: 'var(--bg-subtle)', 
                      color: 'var(--accent)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    View All
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userData.activeListings.map(product => (
                    <SellerListingCard key={product.id} product={product} formatTime={formatTime} />
                  ))}
                </div>
              </section>

              {/* Sold Items */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                    Sold Items
                  </h2>
                  <button
                    onClick={() => navigate('/sold-items')}
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 hover:shadow-md"
                    style={{ 
                      backgroundColor: 'var(--bg-subtle)', 
                      color: 'var(--accent)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    View All
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userData.soldItems.map(product => (
                    <SoldAuctionCard 
                      key={product.id} 
                      product={product}
                      onReview={(item) => setReviewModal({ isOpen: true, item, type: 'seller' })}
                      onCancel={handleCancelTransaction}
                    />
                  ))}
                </div>
              </section>

            </div>
          )}

        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="w-full max-w-lg rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-soft)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                Edit Personal Information
              </h3>
              <button 
                onClick={handleCancelProfileEdit}
                style={{ color: 'var(--text-muted)' }}
              >
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
                onClick={handleCancelProfileEdit}
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
                onClick={handleProfileUpdate}
                className="flex-1 px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
              >
                <Save size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isEditingPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-soft)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                Change Password
              </h3>
              <button 
                onClick={handleCancelPasswordEdit}
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  <Lock size={16} className="inline mr-2" />
                  Current Password *
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--input-border)',
                    color: 'var(--text)'
                  }}
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  <Lock size={16} className="inline mr-2" />
                  New Password *
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--input-border)',
                    color: 'var(--text)'
                  }}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  <Lock size={16} className="inline mr-2" />
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--input-border)',
                    color: 'var(--text)'
                  }}
                />
              </div>

              {/* Password strength hint */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--info-soft)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  💡 Password must be at least 6 characters long
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={handleCancelPasswordEdit}
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
                onClick={handlePasswordUpdate}
                className="flex-1 px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
              >
                <Save size={18} />
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-soft)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                Rate {reviewModal.type === 'buyer' ? 'Seller' : 'Buyer'}
              </h3>
              <button 
                onClick={() => setReviewModal({ isOpen: false, item: null, type: 'buyer' })}
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-subtle)' }}>
              <p className="font-medium" style={{ color: 'var(--text)' }}>
                {reviewModal.item?.title}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {reviewModal.type === 'buyer' 
                  ? `Seller: ${reviewModal.item?.sellerName}` 
                  : `Buyer: ${reviewModal.item?.buyerName}`}
              </p>
            </div>

            {/* Rating Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
                Your Rating
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setReviewForm(prev => ({ ...prev, rating: 'positive' }))}
                  className="flex-1 p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2"
                  style={{
                    borderColor: reviewForm.rating === 'positive' ? 'var(--success)' : 'var(--border)',
                    backgroundColor: reviewForm.rating === 'positive' ? 'var(--success-soft)' : 'transparent',
                    color: reviewForm.rating === 'positive' ? 'var(--success)' : 'var(--text)'
                  }}
                >
                  <ThumbsUp size={24} />
                  Positive
                </button>
                <button
                  onClick={() => setReviewForm(prev => ({ ...prev, rating: 'negative' }))}
                  className="flex-1 p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2"
                  style={{
                    borderColor: reviewForm.rating === 'negative' ? 'var(--danger)' : 'var(--border)',
                    backgroundColor: reviewForm.rating === 'negative' ? 'var(--danger-soft)' : 'transparent',
                    color: reviewForm.rating === 'negative' ? 'var(--danger)' : 'var(--text)'
                  }}
                >
                  <ThumbsDown size={24} />
                  Negative
                </button>
              </div>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                <MessageSquare size={16} className="inline mr-2" />
                Comment
              </label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Share your experience..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 resize-none"
                style={{ 
                  backgroundColor: 'var(--input-bg)', 
                  borderColor: 'var(--input-border)',
                  color: 'var(--text)'
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitReview}
              className="w-full px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
            >
              <Send size={18} />
              Submit Review
            </button>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

// Helper Components
function ProductCard({ product, type, formatTime }) {
  return (
    <div 
      className="rounded-xl overflow-hidden border hover:shadow-xl transition-all"
      style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}
    >
      <div className="relative">
        <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
        {type === 'activeBid' && (
          <div 
            className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold"
            style={{ 
              backgroundColor: product.isWinning ? 'var(--success)' : 'var(--danger)',
              color: 'white'
            }}
          >
            {product.isWinning ? 'Winning' : 'Outbid'}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold mb-2" style={{ color: 'var(--text)' }}>
          {product.title}
        </h3>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {type === 'activeBid' ? 'Your Bid' : 'Current Price'}
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
              ${type === 'activeBid' ? product.yourBid : product.currentPrice}
            </p>
          </div>
          {type === 'activeBid' && (
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Current Bid
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                ${product.currentPrice}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>
            <Clock size={14} className="inline mr-1" />
            {formatTime(product.endTime)}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {product.totalBids} bids
          </span>
        </div>
      </div>
    </div>
  );
}


function SellerListingCard({ product, formatTime }) {
  return (
    <div 
      className="rounded-xl overflow-hidden border"
      style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}
    >
      <div className="relative">
        <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
        <div 
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold"
          style={{ backgroundColor: 'var(--info)', color: 'white' }}
        >
          Active
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold mb-2" style={{ color: 'var(--text)' }}>
          {product.title}
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Starting Price
            </p>
            <p className="font-bold" style={{ color: 'var(--text)' }}>
              ${product.startingPrice}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Current Bid
            </p>
            <p className="font-bold" style={{ color: 'var(--accent)' }}>
              ${product.currentPrice}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>
            <Clock size={14} className="inline mr-1" />
            {formatTime(product.endTime)}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {product.totalBids} bids
          </span>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Leading: {product.highestBidder}
        </p>
      </div>
    </div>
  );
}

// Missing Send icon - add to imports at top
import { Send } from "lucide-react";