import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

import ViewAllButton from "../../components/ViewAllButton";
import AuctionCard from "../../components/AuctionCard";

// Mock User Data
import { mockUserData } from "../../data/users.js";

// Profile Components
import ProfileHeader from "./HeaderProfile/ProfileHeader";
import ProfileTabs from "./ProfileTab/ProfileTabs";
import ReviewsSection from "./RoleSection/BuyerSections/ReviewSection/ReviewsSection";
import EditProfileModal from "./HeaderProfile/Modal/EditProfileModal";
import ChangePasswordModal from "./HeaderProfile/Modal/ChangePasswordModal";
import ReviewModal from "./RoleSection/BuyerSections/ReviewSection/ReviewModal";
import UserSections from "./RoleSection";
import CardSection from "./RoleSection/CardSections";

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('buyer');
  const [userData, setUserData] = useState(mockUserData);
  
  // Modal states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [reviewModal, setReviewModal] = useState({ isOpen: false, item: null, type: 'buyer' });
  const [showCreateAuctionModal, setShowCreateAuctionModal] = useState(false);
  
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
        />

        {/* Buyer Tab Content */}
        {activeTab === 'buyer' && (
          <UserSections 
            userData={userData} 
            type="buyer" 
            formatTime={formatTime} 
            setReviewModal={setReviewModal} 
          />
        )}

        {/* Seller Tab Content */}
        {activeTab === 'seller' && user?.role === 'seller' && (
          <UserSections 
            userData={userData} 
            type="seller" 
            formatTime={formatTime} 
            setReviewModal={setReviewModal} 
            handleCancelTransaction={handleCancelTransaction} 
          />
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
    </>
  );
}
