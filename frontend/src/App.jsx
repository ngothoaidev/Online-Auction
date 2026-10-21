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
import VerifyAccount from './pages/Auth/VerifyAccount';
import AuthCallback from './pages/Auth/AuthCallback';
import Profile from './pages/Profile';
import CreateAuction from './pages/CreateAuction';
import AdminDashboard from './pages/AdminDashboard';
import CategoryList from './pages/AdminDashboard/CategoryList.jsx';
import ProductList from './pages/AdminDashboard/ProductList.jsx';
import UserList from './pages/AdminDashboard/UserList.jsx';
import UpgradeRequests from './pages/AdminDashboard/UpgradeRequests.jsx';
import Reports from './pages/AdminDashboard/Reports';
import AuditLog from './pages/AdminDashboard/AuditLog';
import NotFound from './pages/NotFound';
import ForgetPassword from './pages/Auth/ForgetPassword';
import BecomeSeller from './pages/BecomeSeller';
import OrderCompletion from './pages/OrderCompletion';
import Notifications from './pages/Notifications';
import Reviews from './pages/Reviews';
import UserReviews from './pages/UserReviews';

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