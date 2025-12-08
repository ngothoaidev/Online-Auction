import { useState } from "react";
import { Heart, Gavel, Trophy, Clock, CheckCircle } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { mockUserData } from "../data/mockData";

// Profile Components
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import ReviewsSection from "../components/profile/ReviewsSection";
import EditProfileModal from "../components/profile/EditProfileModal";
import ChangePasswordModal from "../components/profile/ChangePasswordModal";
import ReviewModal from "../components/profile/ReviewModal";
import ProductCard from "../components/profile/ProductCard";
import SellerListingCard from "../components/profile/SellerListingCard";
import WonAuctionCard from "../components/WonAuctionCard";
import SoldAuctionCard from "../components/SoldAuctionCard";

export default function Profile() {
  const [activeTab, setActiveTab] = useState('buyer');
  const [userData, setUserData] = useState(mockUserData);
  const [darkMode, setDarkMode] = useState(false);
  
  // Modal states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [reviewModal, setReviewModal] = useState({ isOpen: false, item: null, type: 'buyer' });
  
  // Form states
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
  
  const [reviewForm, setReviewForm] = useState({ rating: 'positive', comment: '' });

  const toggleTheme = () => setDarkMode(!darkMode);

  // Handlers
  const handleProfileUpdate = () => {
    if (!profileForm.name.trim() || !profileForm.username.trim() || !profileForm.email.trim()) {
      alert('Name, username, and email are required!');
      return;
    }

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
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      alert('Please fill in all password fields');
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
    
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsEditingPassword(false);
    alert('Password changed successfully!');
  };

  const handleCancelPasswordEdit = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsEditingPassword(false);
  };

  const handleSubmitReview = () => {
    if (!reviewForm.comment.trim()) {
      alert('Please enter a comment');
      return;
    }

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
          item.id === itemId ? { ...item, status: 'cancelled', reviewed: true } : item
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
          
          <ProfileHeader 
            userData={userData}
            onEditProfile={() => setIsEditingProfile(true)}
            onChangePassword={() => setIsEditingPassword(true)}
          />

          <ProfileTabs 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isSeller={userData.isSeller}
          />

          {/* Buyer Tab Content */}
          {activeTab === 'buyer' && (
            <div className="space-y-8">
              <ReviewsSection reviews={userData.reviews} />

              {/* Favorite Products */}
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Heart size={24} style={{ color: 'var(--danger)' }} />
                  Favorite Products
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userData.favoriteProducts.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      type="favorite" 
                      formatTime={formatTime} 
                    />
                  ))}
                </div>
              </section>

              {/* Active Bids */}
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Gavel size={24} style={{ color: 'var(--accent)' }} />
                  Active Bids
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userData.activeBids.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      type="activeBid" 
                      formatTime={formatTime} 
                    />
                  ))}
                </div>
              </section>

              {/* Won Auctions */}
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Trophy size={24} style={{ color: 'var(--accent)' }} />
                  Won Auctions
                </h2>
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
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Clock size={24} style={{ color: 'var(--accent)' }} />
                  Active Listings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userData.activeListings.map(product => (
                    <SellerListingCard 
                      key={product.id} 
                      product={product} 
                      formatTime={formatTime} 
                    />
                  ))}
                </div>
              </section>

              {/* Sold Items */}
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                  Sold Items
                </h2>
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

      {/* Modals */}
      <EditProfileModal
        isOpen={isEditingProfile}
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        onSave={handleProfileUpdate}
        onCancel={handleCancelProfileEdit}
      />

      <ChangePasswordModal
        isOpen={isEditingPassword}
        passwordForm={passwordForm}
        setPasswordForm={setPasswordForm}
        onSave={handlePasswordUpdate}
        onCancel={handleCancelPasswordEdit}
      />

      <ReviewModal
        isOpen={reviewModal.isOpen}
        reviewModal={reviewModal}
        reviewForm={reviewForm}
        setReviewForm={setReviewForm}
        onSubmit={handleSubmitReview}
        onClose={() => setReviewModal({ isOpen: false, item: null, type: 'buyer' })}
      />

      <Footer />
    </>
  );
}
