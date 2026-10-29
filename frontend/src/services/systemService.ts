const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const systemService = {
    updateLiveStat: async () => {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_URL}/system/live-stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to update live stats');
        }
        
        return response.json();
    },
};

export default systemService;