import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import ProductDetail from './pages/ProductDetail';
import ListProducts from './pages/ListProducts';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import CreateAuction from './components/Header/CreateAuction';
import ViewAllActiveBid from './pages/ViewAllActiveBid';
import ViewAllActiveListings from './pages/ViewAllActiveListings';
import ViewAllFavouriteProducts from './pages/ViewAllFavouriteProducts';
import ViewAllReviews from './pages/ViewAllReviews';
import ViewAllSoldItems from './pages/ViewAllSoldItems';
import ViewAllWonAuctions from './pages/ViewAllWonAuctions';
import AdminDashboard from './pages/Admin';

function App() {
  return (
    <Router>
      <Routes className='min-h-screen transition-colors duration-100 bg-[var(--bg)] color-[var(--text)]'>
        <Route element={<MainLayout />}>
          
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<ListProducts />} />
          <Route path="/auction/:id" element={<ProductDetail />} />

          {/* --- LEVEL 1: STANDARD USERS (Just need to be logged in) --- */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/active-listings" element={<ViewAllActiveListings />} />
            <Route path="/favourite-products" element={<ViewAllFavouriteProducts />} />
            <Route path="/reviews" element={<ViewAllReviews />} />
            <Route path="/won-auctions" element={<ViewAllWonAuctions />} />
          </Route>

          {/* --- LEVEL 2: SELLER ONLY (Needs 'seller' role) --- */}
          <Route element={<ProtectedRoute requiredRole="seller" />}>
            <Route path="/create-auction" element={<CreateAuction />} />
            <Route path="/active-bids" element={<ViewAllActiveBid />} />
            <Route path="/sold-items" element={<ViewAllSoldItems />} />
          </Route>

          {/* --- LEVEL 3: ADMIN ONLY (Needs 'admin' role) --- */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

        </Route>

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  )
}

export default App