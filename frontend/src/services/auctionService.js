const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import { apiFetch } from './apiClient.js';

const auctionService = {
  // Lấy thông tin cơ bản
  getById: async (id) => {
    const res = await fetch(`${API_URL}/auction/${id}`);
    if (!res.ok) throw new Error('Failed to fetch auction details');
    return res.json();
  },

  getCategories: async () => {
    const res = await fetch(`${API_URL}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },
  
  // Reads below throw ApiError on failure. Never turn an error into [] / "": the UI would say "no bids" or
  // "no description" when it simply does not know (and an owner could save over a description that failed to load).
  getImages: (id) => apiFetch(`/auction/images/${id}`),

  getDescription: (id) => apiFetch(`/auction/description/${id}`),

  // 2b. Cập nhật mô tả (chỉ dành cho seller)
  updateDescription: async (id, description) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/auction/${id}/description`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ description })
    });
    if (!res.ok) throw new Error('Failed to update description');
    return res.json();
  },

  getComments: (id) => apiFetch(`/auction/comments/${id}`),

  getBidHistory: (id, filter = 'all') => apiFetch(`/auction/bids/${id}?f=${filter}`),

  getTopAuctions: async ({ id = null, status = 'active', sortBy = 'newest', page = 1, limit = 5 } = {}) => {
    const queryParams = new URLSearchParams({ status, sortBy, page, limit });
    if (id) queryParams.append("userId", id);
    const token = localStorage.getItem('authToken');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_URL}/auction/top?${queryParams.toString()}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch auctions');
    return res.json();
  },

  getTabAuctions: async ({ username = '', status = 'active-bid', category = null }) => {
      const queryParams = new URLSearchParams({ username, status });
      if (category) queryParams.append("category", category);
      const token = localStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${API_URL}/auction/profile?${queryParams.toString()}`, { headers });
      return response; // Return the Response object, let caller handle parsing
  },

  rejectBid: async (productId, bidId) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/auction/reject?auctionId=${productId}&bidId=${bidId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to reject bid');
    return res.json();
  },

  //Add comment
  addComment: async (auctionId, content, parentId = null) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/auction/${auctionId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content, parentId })
    });
    
    if (!res.ok) throw new Error('Failed to post comment');
    return res.json();
  },

  create: async (auctionData) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/auction`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: auctionData,
    });
    if (!response.ok) throw new Error('Failed to create auction');
    return response.json();
  },

  // Commands carry an Idempotency-Key chosen by the caller for ONE reviewed intent; a retry must reuse it.
  placeBid: (auctionId, amount, key) => apiFetch(`/auction/${auctionId}/bid`, {
    method: 'POST', body: { amount: String(amount) }, headers: key ? { 'Idempotency-Key': key } : {}, auth: 'required',
  }),

  buyNow: (auctionId, key) => apiFetch(`/auction/${auctionId}/buy-now`, {
    method: 'POST', body: {}, headers: key ? { 'Idempotency-Key': key } : {}, auth: 'required',
  }),
};

export default auctionService;