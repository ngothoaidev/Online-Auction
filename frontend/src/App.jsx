import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import HomePage from './pages/HomePage';
import ProductDetail from './pages/ProductDetail';
import SearchPage from './pages/SearchPage';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import NotFound from './pages/NotFound';

// Loaded on demand (route-level code splitting). Home, search, lot detail and auth stay in the main bundle.
const VerifyAccount = lazy(() => import('./pages/Auth/VerifyAccount'));
const AuthCallback = lazy(() => import('./pages/Auth/AuthCallback'));
const Profile = lazy(() => import('./pages/Profile'));
const CreateAuction = lazy(() => import('./pages/CreateAuction'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CategoryList = lazy(() => import('./pages/AdminDashboard/CategoryList.jsx'));
const ProductList = lazy(() => import('./pages/AdminDashboard/ProductList.jsx'));
const UserList = lazy(() => import('./pages/AdminDashboard/UserList.jsx'));
const UpgradeRequests = lazy(() => import('./pages/AdminDashboard/UpgradeRequests.jsx'));
const Reports = lazy(() => import('./pages/AdminDashboard/Reports'));
const AuditLog = lazy(() => import('./pages/AdminDashboard/AuditLog'));
const ForgetPassword = lazy(() => import('./pages/Auth/ForgetPassword'));
const BecomeSeller = lazy(() => import('./pages/BecomeSeller'));
const OrderCompletion = lazy(() => import('./pages/OrderCompletion'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Reviews = lazy(() => import('./pages/Reviews'));
const UserReviews = lazy(() => import('./pages/UserReviews'));
const Privacy = lazy(() => import('./pages/Privacy'));

function App() {
  return (
    <div className='min-h-screen transition-colors duration-100'>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgetPassword />} />
        </Route>

        {/* OAuth Callback Route */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        <Route element={<MainLayout />}>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/auction/:id" element={<ProductDetail />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/profile/:username/reviews" element={<UserReviews />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* --- STANDARD USERS --- */}
          <Route element={<ProtectedRoute />}>
            <Route path="/verify-account" element={<VerifyAccount />} />
            <Route path="/order/:auctionId" element={<OrderCompletion />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>

          {/* --- BUYER ONLY --- */}
          <Route element={<ProtectedRoute requiredRole="buyer" />}>
            <Route path="/become-seller" element={<BecomeSeller />} />
          </Route>

          {/* --- SELLER ONLY --- */}
          <Route element={<ProtectedRoute requiredRole="seller" />}>
            <Route path="/create-auction" element={<CreateAuction />} />
          </Route>


          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* --- ADMIN ONLY --- */}
        <Route element={<AdminLayout />}>
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin" element={<AdminDashboard />}>
              <Route index element={<Navigate to="categories" replace />} />
              <Route path="categories" element={<CategoryList />} />
              <Route path="products" element={<ProductList />} />
              <Route path="users" element={<UserList />} />
              <Route path="upgrades" element={<UpgradeRequests />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit" element={<AuditLog />} />
            </Route>
          </Route>
        </Route>

      </Routes>
    </div>
  )
}

export default App