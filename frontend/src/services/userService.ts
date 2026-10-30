const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const userService = {
    toggleFavorite: async (auctionId: number | string) => {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_URL}/users/favorites/${auctionId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to update watchlist');
        }
        
        return response.json();
    },
};

export default userService;