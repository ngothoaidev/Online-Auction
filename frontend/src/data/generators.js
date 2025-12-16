/**
 * Data generation utilities for mock products, bids, questions, and bidders
 */

import { CATEGORIES_REF, BRANDS, ADJECTIVES, Q_AND_A } from './constants.js';

const now = new Date();

// --- Utility Functions ---
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateId = (prefix, index) => `${prefix}${index + 100}`; // e.g., p101, p102

/**
 * Generate mock products with random data
 * @param {number} count - Number of products to generate
 * @returns {Array} Array of product objects
 */
export const generateProducts = (count = 100) => {
  return Array.from({ length: count }, (_, i) => {
    const catObj = getRandomItem(CATEGORIES_REF);
    const category = catObj.id;
    const subcategory = getRandomItem(catObj.subs);
    const brand = getRandomItem(BRANDS[category] || ['Generic']);
    const adj = getRandomItem(ADJECTIVES);

    // Pricing Math
    const startingPrice = getRandomInt(50, 5000);
    const currentPrice = startingPrice + getRandomInt(0, 500);
    const buyNowPrice = Math.floor(currentPrice * 1.5);

    // Dates (Mix of active and ending soon)
    const isEndingSoon = Math.random() > 0.8;
    const daysAgo = getRandomInt(1, 7);
    const daysLeft = isEndingSoon ? getRandomInt(1, 24) / 24 : getRandomInt(1, 10);

    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const endTime = new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000);

    const imageLink = `https://picsum.photos/seed/${i * 123}/400/400`;
    return {
      id: generateId('p', i),
      title: `${adj} ${brand} ${subcategory.charAt(0).toUpperCase() + subcategory.slice(1)}`,
      description: `<p>This is a <strong>${adj.toLowerCase()}</strong> item from ${brand}. Great condition.</p><ul><li>Authentic ${brand}</li><li>Fast Shipping</li></ul>`,
      image: imageLink,
      images: [imageLink, imageLink, imageLink],
      startingPrice,
      currentPrice,
      buyNowPrice,
      biddingStep: startingPrice > 1000 ? 50 : 10,
      sellerId: generateId('s', getRandomInt(1, 20)),
      sellerName: `${brand} Reseller`,
      sellerRating: {
        positive: getRandomInt(50, 500),
        negative: getRandomInt(0, 10)
      },
      highestBidderId: generateId('b', getRandomInt(1, 50)),
      highestBidderName: `user${getRandomInt(100, 999)}`,
      highestBidder: {
        id: generateId('b', getRandomInt(1, 50)),
        name: `user${getRandomInt(100, 999)}`,
        avatar: `https://i.pravatar.cc/150?u=${Math.random()}`
      },
      category,
      subcategory,
      createdAt,
      endTime: endTime,
      totalBids: getRandomInt(0, 45),
      bidCount: getRandomInt(0, 45),
      autoExtend: Math.random() > 0.5,
      status: 'active',
      watchers: Array.from(
        { length: getRandomInt(0, 5) },
        () => generateId('u', getRandomInt(1, 100))
      ),
      badges: isEndingSoon ? ['ending-soon'] : currentPrice > 2000 ? ['high-bids'] : []
    };
  });
};

/**
 * Generate mock bids for products
 * @param {number} count - Number of bids to generate
 * @param {Array} products - Array of products to generate bids for
 * @returns {Array} Array of bid objects
 */
export const generateBids = (count = 100, products) => {
  return Array.from({ length: count }, (_, i) => {
    const product = getRandomItem(products);
    return {
      id: generateId('bid', i),
      productId: product.id,
      bidderId: generateId('u', getRandomInt(1, 200)),
      bidderName: `bidder${getRandomInt(100, 999)}`,
      amount: product.currentPrice - getRandomInt(10, 100), // Historical bid
      timestamp: new Date(
        now.getTime() - getRandomInt(1, 300) * 60 * 1000
      ),
      status: 'active'
    };
  });
};

/**
 * Generate mock questions and answers for products
 * @param {number} count - Number of questions to generate
 * @param {Array} products - Array of products to generate questions for
 * @returns {Array} Array of question objects
 */
export const generateQuestions = (count = 100, products) => {
  return Array.from({ length: count }, (_, i) => {
    const qa = getRandomItem(Q_AND_A);
    const product = getRandomItem(products);
    return {
      id: generateId('q', i),
      productId: product.id,
      askerId: generateId('u', getRandomInt(1, 200)),
      askerName: `User ${getRandomInt(1, 500)}`,
      question: qa.q,
      answer: qa.a,
      timestamp: new Date(
        now.getTime() - getRandomInt(1, 5) * 24 * 60 * 60 * 1000
      ),
      answeredAt: new Date(
        now.getTime() - getRandomInt(1, 20) * 60 * 60 * 1000
      )
    };
  });
};

/**
 * Generate mock top bidders
 * @param {number} count - Number of bidders to generate
 * @returns {Array} Array of bidder objects
 */
export const generateTopBidders = (count = 100) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `****User${getRandomInt(1000, 9999)}`,
    rating: getRandomInt(80, 100),
    won: getRandomInt(1, 150),
    avatar: `https://i.pravatar.cc/150?u=${i}`,
    rank: i + 1
  }));
};
