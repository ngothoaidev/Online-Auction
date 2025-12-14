import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import ProductDetail from './pages/ProductDetail';
import ListProducts from './pages/ListProducts';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import CreateAuction from './components/Header/CreateAuction';

import ViewAll from './pages/ViewAll';


import AdminDashboard from './pages/Admin';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Router>
      <Routes className='min-h-screen transition-colors duration-100 bg-[var(--bg)] color-[var(--text)]'>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        
        <Route element={<MainLayout />}>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<ListProducts />} />
          <Route path="/auction/:id" element={<ProductDetail />} />

          {/* --- LEVEL 1: STANDARD USERS (Just need to be logged in) --- */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/:type" element={<ViewAll />} />
          </Route>

          {/* --- LEVEL 2: SELLER ONLY (Needs 'seller' role) --- */}
          <Route element={<ProtectedRoute requiredRole="seller" />}>
            <Route path="/create" element={<CreateAuction />} />
          </Route>

          {/* --- LEVEL 3: ADMIN ONLY (Needs 'admin' role) --- */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App