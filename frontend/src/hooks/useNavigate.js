import { useNavigate } from "react-router-dom";

export function useNav() {
  const n = useNavigate();

  return {
    // Basic Navigation
    go: (p) => n(p),
    back: () => n(-1),
    replace: (p) => n(p, { replace: true }),
    
    // Core Pages
    home: () => n("/"),
    
    // Smart Auth: Remember where the user came from
    login: () => n("/login", { 
        state: { from: window.location.pathname } 
    }),
    register: () => n("/register", { 
        state: { from: window.location.pathname } 
    }),
    
    // Logout: Use REPLACE to clear history so "Back" button doesn't work
    logout: () => n("/login", { replace: true }),

    // Functional
    search: (q) => q ? n(`/search?q=${encodeURIComponent(q)}`) : n("/search"),
    
    // Admin
    admin: () => n('/admin', { replace: true }),
    
    // User
    me: () => n("/me"),
    editProfile: () => n("/edit-profile"),
    profile: (id) => n(`/profile/${id}`),
    notifications: () => n("/notifications"),
    viewAll: (p) => n(`/me/${p}`),

    // Actions
    create: () => n("/create-auction"),
    auction: (id) => n(`/auction/${id}`),
    
    // System
    notFound: () => n('/404', { replace: true }),
  };
}