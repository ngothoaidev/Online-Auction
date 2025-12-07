import { useNavigate } from "react-router-dom";

export function useNav() {
  const n = useNavigate();

  return {
    go: (p) => n(p),
    back: () => n(-1),
    home: () => n("/"),
    login: () => n("/login"),
    register: () => n("/register"),
    search: (q) => q ? n(`/search?q=${encodeURIComponent(q)}`) : n("/search"),
    me: () => n("/me"),
    editProfile: () => n("/edit-profile"),
    profile: (id) => n(`/profile/${id}`),
    create: () => n("/create"),
    notifications: () => n("/notifications"),
    auction: (id) => n(`/auction/${id}`),
  };
}