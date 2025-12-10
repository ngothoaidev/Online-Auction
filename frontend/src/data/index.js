/**
 * Mock Data Export Center
 * Centralized export point for all mock data and generators
 */

// Import constants
export {
  CATEGORIES_REF,
  ADJECTIVES,
  BRANDS,
  SAMPLE_IMAGES,
  Q_AND_A,
  categories,
  heroSlides
} from './constants.js';

// Import user data
export { mockUserData, mockNotifications } from './users.js';

// Import generators
export {
  generateProducts,
  generateBids,
  generateQuestions,
  generateTopBidders
} from './generators.js';

// Generate and export instances
import { generateProducts, generateBids, generateQuestions, generateTopBidders } from './generators.js';

// Generate 50 Products
export const products = generateProducts(50);

// Generate 150 Bids (linked to those products)
export const bids = generateBids(150, products);

// Generate 100 Questions (linked to those products)
export const questions = generateQuestions(100, products);

// Generate 5 Top Bidders
export const topBidders = generateTopBidders(5);
