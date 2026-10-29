import { apiFetch } from './apiClient.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'An error occurred');
  }
  return data;
};

const orderService = {
  /**
   * Get order by auction ID
   * @param {string} auctionId - Auction ID
   * @returns {Promise<Object>} Order object
   */
  getByAuctionId: async (auctionId) => {
    // GET /order/auction/:auctionId is read-only: 200 order | 202 {status:'settlement_pending',retryAfter} | 403 | 404
    const response = await fetch(`${API_BASE_URL}/order/auction/${auctionId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Order object
   */
  getById: async (orderId) => {
    const response = await fetch(`${API_BASE_URL}/order/${orderId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get all orders for current user
   * @returns {Promise<Array>} Array of orders
   */
  getMyOrders: async () => {
    const response = await fetch(`${API_BASE_URL}/order/my`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Submit payment details (buyer)
   * @param {string} orderId - Order ID
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Updated order
   */
  submitPayment: async (orderId, paymentData) => {
    const response = await fetch(`${API_BASE_URL}/order/${orderId}/payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData),
    });
    return handleResponse(response);
  },

  /**
   * Confirm payment received (seller)
   * @param {string} orderId - Order ID
   * @param {Object} confirmData - Confirmation details with shipping info
   * @returns {Promise<Object>} Updated order
   */
  confirmPayment: async (orderId, confirmData) => {
    const response = await fetch(`${API_BASE_URL}/order/${orderId}/confirm`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(confirmData),
    });
    return handleResponse(response);
  },

  /**
   * Confirm receipt of goods (buyer)
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Updated order
   */
  confirmReceipt: async (orderId) => {
    const response = await fetch(`${API_BASE_URL}/order/${orderId}/receipt`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Submit a review
   * @param {string} orderId - Order ID
   * @param {Object} reviewData - Review details { rating: 1|-1, comment: string }
   * @returns {Promise<Object>} Updated order
   */
  submitReview: async (orderId, reviewData) => {
    // Transform rating (1/-1) to isGoodRating (boolean)
    const transformedData = {
      isGoodRating: reviewData.rating === 1,
      comment: reviewData.comment,
    };
    
    const response = await fetch(`${API_BASE_URL}/order/${orderId}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(transformedData),
    });
    return handleResponse(response);
  },

  /**
   * Cancel order (seller only)
   * @param {string} orderId - Order ID
   * @param {Object} cancelData - Cancel reason and optional negative review
   * @returns {Promise<Object>} Updated order
   */
  cancelOrder: async (orderId, cancelData) => {
    const response = await fetch(`${API_BASE_URL}/order/${orderId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(cancelData),
    });
    return handleResponse(response);
  },

  /**
   * Get chat messages for an order
   * @param {string} orderId - Order ID
   * @returns {Promise<Array>} Array of messages
   */
  getMessages: async (orderId) => {
    const response = await fetch(`${API_BASE_URL}/order/${orderId}/messages`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Send a chat message
   * @param {string} orderId - Order ID
   * @param {string} message - Message content
   * @returns {Promise<Object>} Created message
   */
  sendMessage: async (orderId, message, imageAssetId) => {
    const response = await fetch(`${API_BASE_URL}/order/${orderId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message, imageAssetId }),
    });
    return handleResponse(response);
  },
};

// --- private proofs ---
orderService.uploadProof = async (orderId, purpose, file) => {
  const token = localStorage.getItem('authToken');
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_BASE_URL}/order/${orderId}/proofs?purpose=${encodeURIComponent(purpose)}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  return handleResponse(response); // { assetId, previewPath, mime, size }
};

orderService.fetchProofBlobUrl = async (path) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error('Could not load the file');
  return URL.createObjectURL(await response.blob());
};

orderService.markMessagesRead = async (orderId) => {
  const response = await fetch(`${API_BASE_URL}/order/${orderId}/messages/read`, { method: 'POST', headers: getAuthHeaders(), body: '{}' });
  return handleResponse(response);
};

orderService.submitShipping = async (orderId, data) => {
  const response = await fetch(`${API_BASE_URL}/order/${orderId}/shipping`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) });
  return handleResponse(response);
};

// --- online payment through the configured adapter (mock = demo, no real money) ---
orderService.createPaymentAttempt = (orderId, data) => apiFetch(`/order/${orderId}/payment-attempts`, { method: 'POST', body: data, auth: 'required' });
orderService.simulateMockPayment = (reference, outcome, deliver = true) =>
  apiFetch(`/payments/mock/${encodeURIComponent(reference)}/simulate`, { method: 'POST', body: { outcome, deliver }, auth: 'required' });

export default orderService;
