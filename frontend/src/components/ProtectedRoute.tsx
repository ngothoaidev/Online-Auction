// src/components/ProtectedRoute.jsx
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNav } from '../hooks/useNavigate'; // Adjust path to your hook

const ProtectedRoute = ({ requiredRole }) => {
  const { user, loading } = useAuth();
  const nav = useNav();

  useEffect(() => {
    // 1. Wait for loading to finish first
    if (loading) return;

    // 2. Check Authentication: If not logged in, kick to Login
    if (!user) {
      nav.login();
      return;
    }

    // 3. Check Authorization: If user exists, but has wrong role
    // Example: User is 'regular', but page requires 'admin'
    if (requiredRole && user.role !== requiredRole) {
      console.warn(`Access Denied: Required ${requiredRole}, but found ${user.role}`);
      nav.home(); // Redirect to home (or create a nav.unauthorized() method)
    }

  }, [user, loading, requiredRole, nav]);

  // --- RENDER LOGIC ---

  // A. Still checking database? Show Spinner
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  // B. Not logged in? Render nothing while useEffect redirects
  if (!user) {
    return null; 
  }

  // C. Logged in, but wrong role? Render nothing while useEffect redirects
  if (requiredRole && user.role !== requiredRole) {
    return null;
  }

  // D. Everything perfect? Render the Page
  return <Outlet />;
};

export default ProtectedRoute;