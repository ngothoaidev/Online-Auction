// One list of account destinations for the desktop account panel AND the mobile menu, so a task reachable on a
// laptop is reachable on a phone. Profile tabs are deep links (?tab=...), see pages/Profile/index.tsx.
export function accountLinks(user: { username: string; role: string } | null | undefined) {
  if (!user) return [];
  const me = `/profile/${encodeURIComponent(user.username)}`;
  const links = [
    { to: '/notifications', label: 'Notifications' },
    { to: `${me}?tab=active-bids`, label: 'My bids' },
    { to: `${me}?tab=won-auctions`, label: 'Wins and orders' },
    { to: `${me}?tab=favorites`, label: 'Saved lots' },
  ];
  if (user.role === 'seller') {
    links.push(
      { to: '/create-auction', label: 'Create listing' },
      { to: `${me}?tab=my-listings`, label: 'My listings' },
      { to: `${me}?tab=sold-items`, label: 'Sold' },
    );
  }
  if (user.role === 'buyer') links.push({ to: '/become-seller', label: 'Start selling' });
  if (user.role === 'admin') links.push({ to: '/admin', label: 'Admin dashboard' });
  links.push({ to: me, label: 'My profile' });
  return links;
}
