import { useNavigate } from "react-router-dom";
import type { NavigateOptions } from "react-router-dom";

export function useNav() {
  const n = useNavigate();

  return {
    // Basic Navigation
    go: (p: string, options?: NavigateOptions) => n(p, options), // options = react-router's { state, replace }
    back: () => n(-1),
    replace: (p: string) => n(p, { replace: true }),
    
    // Core Pages
    home: () => n("/"),
    
    // Smart Auth: Remember where the user came from
    login: () => n("/login", { 
        state: { from: window.location.pathname } 
    }),
    register: () => n("/register", { 
        state: { from: window.location.pathname } 
    }),
    validate: (options?: NavigateOptions) => n("/validate", options),
    verifyAccount: () => n("/verify-account"),
    
    // Logout: Use REPLACE to clear history so "Back" button doesn't work
    logout: () => n("/login", { replace: true }),

    // Functional
    search: (q?: string) => q ? n(`/search?q=${encodeURIComponent(q)}`) : n("/search"),
    
    // Admin
    admin: () => n('/admin', { replace: true }),
    
    editProfile: () => n("/edit-profile"),
    profile: (u: string) => n(`/profile/${u}`),
    notifications: () => n("/notifications"),
    reviews: (u: string) => n(`/profile/${u}/reviews`),

    // Actions
    create: () => n("/create-auction"),
    auction: (id: number | string) => n(`/auction/${id}`),
    order: (id: number | string) => n(`/order/${id}`),
    
    // System
    notFound: () => n('/404', { replace: true }),
  };
}