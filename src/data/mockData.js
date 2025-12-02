// --- 1. Helper Data & Constants ---
const CATEGORIES_REF = [
  { id: 'electronics', subs: ['mobile', 'laptops', 'cameras', 'audio'] },
  { id: 'fashion', subs: ['shoes', 'watches', 'bags', 'jewelry'] },
  { id: 'collectibles', subs: ['art', 'coins', 'stamps', 'antiques'] },
  { id: 'home', subs: ['furniture', 'decor', 'tools', 'appliances'] }
];

const ADJECTIVES = ['Vintage', 'Brand New', 'Refurbished', 'Rare', 'Limited Edition', 'Custom', 'Antique', 'Professional', 'Lightly Used', 'Premium'];
const BRANDS = {
  electronics: ['Apple', 'Sony', 'Samsung', 'Dell', 'Canon', 'Bose', 'Nintendo'],
  fashion: ['Nike', 'Gucci', 'Rolex', 'Adidas', 'Louis Vuitton', 'Casio', 'Zara'],
  collectibles: ['Picasso', 'Roman', 'Ming Dynasty', 'US Mint', 'Royal Mail', 'Victorian'],
  home: ['IKEA', 'Dyson', 'Herman Miller', 'KitchenAid', 'Bosch', 'Makita']
};

const SAMPLE_IMAGES = {
  electronics: ['laptop-modern', 'smartphone-modern', 'camera-vintage'],
  fashion: ['fashion-luxury', 'sneakers-modern', 'watch-classic'],
  collectibles: ['painting-abstract', 'coin-rare', 'stamp-collection'],
  home: ['furniture-classic', 'decor-modern', 'tools-power']
};

const Q_AND_A = [
  { q: "Is the price negotiable?", a: "Sorry, this is an auction format only." },
  { q: "Do you ship internationally?", a: "Yes, we ship via FedEx Global." },
  { q: "Is there a warranty?", a: "The manufacturer warranty is still valid for 6 months." },
  { q: "Can I see more photos?", a: "I have uploaded all available angles." },
  { q: "Does it come with original box?", a: "Yes, original packaging included." }
];

// --- 2. Utility Functions ---
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateId = (prefix, index) => `${prefix}${index + 100}`; // e.g., p101, p102
const now = new Date();

// --- 3. Generators ---

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
    const daysLeft = isEndingSoon ? (getRandomInt(1, 24) / 24) : getRandomInt(1, 10);
    
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000);

    return {
      id: generateId('p', i),
      title: `${adj} ${brand} ${subcategory.charAt(0).toUpperCase() + subcategory.slice(1)}`,
      description: `<p>This is a <strong>${adj.toLowerCase()}</strong> item from ${brand}. Great condition.</p><ul><li>Authentic ${brand}</li><li>Fast Shipping</li></ul>`,
      images: [getRandomItem(SAMPLE_IMAGES[category]), getRandomItem(SAMPLE_IMAGES[category])],
      startingPrice,
      currentPrice,
      buyNowPrice,
      biddingStep: startingPrice > 1000 ? 50 : 10,
      sellerId: generateId('s', getRandomInt(1, 20)),
      sellerName: `${brand} Reseller`,
      sellerRating: { positive: getRandomInt(50, 500), negative: getRandomInt(0, 10) },
      highestBidderId: generateId('b', getRandomInt(1, 50)),
      highestBidderName: `user${getRandomInt(100, 999)}`,
      category,
      subcategory,
      startDate,
      endDate,
      totalBids: getRandomInt(0, 45),
      autoExtend: Math.random() > 0.5,
      status: 'active',
      watchers: Array.from({length: getRandomInt(0, 5)}, () => generateId('u', getRandomInt(1, 100))),
      badges: isEndingSoon ? ['ending-soon'] : (currentPrice > 2000 ? ['high-bids'] : []),
    };
  });
};

export const generateBids = (count = 100, products) => {
  return Array.from({ length: count }, (_, i) => {
    const product = getRandomItem(products);
    return {
      id: generateId('bid', i),
      productId: product.id,
      bidderId: generateId('u', getRandomInt(1, 200)),
      bidderName: `bidder${getRandomInt(100, 999)}`,
      amount: product.currentPrice - getRandomInt(10, 100), // Historical bid
      timestamp: new Date(now.getTime() - getRandomInt(1, 300) * 60 * 1000),
      status: 'active',
    };
  });
};

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
      timestamp: new Date(now.getTime() - getRandomInt(1, 5) * 24 * 60 * 60 * 1000),
      answeredAt: new Date(now.getTime() - getRandomInt(1, 20) * 60 * 60 * 1000),
    };
  });
};

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

// --- 4. Execution (Generate the Data) ---

// Generate 100 Products
export const products = generateProducts(100);

// Generate 150 Bids (linked to those products)
export const bids = generateBids(150, products);

// Generate 100 Questions (linked to those products)
export const questions = generateQuestions(100, products);

// Generate 100 Top Bidders
export const topBidders = generateTopBidders(100);

// Keep existing static categories
export const categories = CATEGORIES_REF.map(c => ({
    id: c.id,
    name: c.id.charAt(0).toUpperCase() + c.id.slice(1),
    subcategories: c.subs.map(s => ({ id: s, name: s.charAt(0).toUpperCase() + s.slice(1) }))
}));