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



export const mockUserData = {
  id: 'u1',
  name: 'John Doe',
  username: 'johndoe123',
  email: 'john.doe@example.com',
  bio: 'Passionate collector and tech enthusiast. Love finding rare items and great deals!',
  birthDate: '1990-05-15',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  isSeller: true, // Change to false to disable seller tab
  rating: {
    positive: 45,
    negative: 2,
    percentage: 96
  },
  reviews: [
    { 
      id: 1, 
      from: 'Alice Johnson', 
      type: 'positive', 
      comment: 'Great buyer! Fast payment and excellent communication.', 
      date: new Date('2024-11-20'),
      productTitle: 'Vintage Camera'
    },
    { 
      id: 2, 
      from: 'Bob Smith', 
      type: 'positive', 
      comment: 'Very professional and reliable. Highly recommended!', 
      date: new Date('2024-11-15'),
      productTitle: 'Apple MacBook Pro'
    },
    { 
      id: 3, 
      from: 'Charlie Brown', 
      type: 'negative', 
      comment: 'Slow response time, but eventually completed the transaction.', 
      date: new Date('2024-11-10'),
      productTitle: 'Sony Headphones'
    },
  ],
  favoriteProducts: [
    { 
      id: 'p101', 
      title: 'Vintage Rolex Watch', 
      currentPrice: 2500, 
      endTime: new Date('2024-12-15'),
      image: 'https://picsum.photos/seed/101/400/400',
      totalBids: 23
    },
    { 
      id: 'p102', 
      title: 'Samsung Galaxy S24', 
      currentPrice: 899, 
      endTime: new Date('2024-12-10'),
      image: 'https://picsum.photos/seed/102/400/400',
      totalBids: 12
    },
  ],
  activeBids: [
    { 
      id: 'p103', 
      title: 'Apple MacBook Pro M3', 
      yourBid: 1800, 
      currentPrice: 1850,
      isWinning: false,
      endTime: new Date('2024-12-12'),
      image: 'https://picsum.photos/seed/103/400/400',
      totalBids: 34
    },
    { 
      id: 'p104', 
      title: 'Sony A7 IV Camera', 
      yourBid: 2100, 
      currentPrice: 2100,
      isWinning: true,
      endTime: new Date('2024-12-14'),
      image: 'https://picsum.photos/seed/104/400/400',
      totalBids: 18
    },
  ],
  wonAuctions: [
    { 
      id: 'p105', 
      title: 'Nike Air Jordan 1', 
      winningBid: 450, 
      endTime: new Date('2024-11-25'),
      image: 'https://picsum.photos/seed/105/400/400',
      sellerName: 'SneakerShop',
      sellerId: 's101',
      reviewed: false
    },
    { 
      id: 'p106', 
      title: 'iPad Pro 12.9"', 
      winningBid: 950, 
      endTime: new Date('2024-11-20'),
      image: 'https://picsum.photos/seed/106/400/400',
      sellerName: 'TechStore',
      sellerId: 's102',
      reviewed: true
    },
  ],
  // Seller data
  activeListings: [
    { 
      id: 'p201', 
      title: 'Canon EOS R5', 
      currentPrice: 3200, 
      startingPrice: 2800,
      endTime: new Date('2024-12-18'),
      image: 'https://picsum.photos/seed/201/400/400',
      totalBids: 15,
      highestBidder: 'user456'
    },
    { 
      id: 'p202', 
      title: 'Gaming PC RTX 4090', 
      currentPrice: 2500, 
      startingPrice: 2000,
      endTime: new Date('2024-12-20'),
      image: 'https://picsum.photos/seed/202/400/400',
      totalBids: 28,
      highestBidder: 'user789'
    },
  ],
  soldItems: [
    { 
      id: 'p203', 
      title: 'DJI Mavic 3 Drone', 
      soldPrice: 1800, 
      endTime: new Date('2024-11-22'),
      image: 'https://picsum.photos/seed/203/400/400',
      buyerName: 'DroneEnthusiast',
      buyerId: 'b101',
      reviewed: false,
      status: 'completed' // or 'cancelled'
    },
    { 
      id: 'p204', 
      title: 'Bose QuietComfort 45', 
      soldPrice: 280, 
      endTime: new Date('2024-11-18'),
      image: 'https://picsum.photos/seed/204/400/400',
      buyerName: 'MusicLover',
      buyerId: 'b102',
      reviewed: true,
      status: 'completed'
    },
  ]
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
    
    const startTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const endTime = new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000);

    const imageLink = `https://picsum.photos/seed/${i * 123}/400/400`;
    return {
      id: generateId('p', i),
      title: `${adj} ${brand} ${subcategory.charAt(0).toUpperCase() + subcategory.slice(1)}`,
      description: `<p>This is a <strong>${adj.toLowerCase()}</strong> item from ${brand}. Great condition.</p><ul><li>Authentic ${brand}</li><li>Fast Shipping</li></ul>`,
      images: [imageLink, imageLink, imageLink],
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
      startTime,
      endTime,
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

export const mockNotifications = [
  { icon: "bell", message: "Your bid on 'Vintage Rolex Watch' has been outbid.", time: new Date(now.getTime() - 10 * 60 * 1000) },
  { icon: "trophy", message: "You won the auction for 'Apple MacBook Pro'!", time: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
  { icon: "question", message: "New question on your listing 'Sony Camera': 'Is the lens included?'", time: new Date(now.getTime() - 5 * 60 * 1000) },
  { icon: "check-circle", message: "Your item 'Nike Sneakers' has been approved and is now live.", time: new Date(now.getTime() - 1 * 60 * 60 * 1000) },
];

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
export const products = generateProducts(50);

// Generate 150 Bids (linked to those products)
export const bids = generateBids(150, products);

// Generate 100 Questions (linked to those products)
export const questions = generateQuestions(100, products);

// Generate 100 Top Bidders
export const topBidders = generateTopBidders(5);

// Keep existing static categories
export const categories = CATEGORIES_REF.map(c => ({
    id: c.id,
    name: c.id.charAt(0).toUpperCase() + c.id.slice(1),
    subcategories: c.subs.map(s => ({ id: s, name: s.charAt(0).toUpperCase() + s.slice(1) }))
}));

export const heroSlides = [
  {
    id: 1,
    tag: "LIVE AUCTIONS",
    title: "Curated Rare Items &",
    highlight: "Exclusive Deals",
    description: "Bid on thousands of verified unique items starting from $1. Experience the thrill of winning on the world's most premium marketplace.",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
    gradient: "from-[#7C00FE] to-[#F5004F]",
    shadow: "shadow-[#7C00FE]/20"
  },
  {
    id: 2,
    tag: "LUXURY WATCHES",
    title: "Timeless Elegance &",
    highlight: "Precision Craft",
    description: "Discover our exclusive collection of authenticated luxury timepieces. From vintage classics to modern masterpieces.",
    image: "https://images.unsplash.com/photo-1614850523060-8da1d56ae167?auto=format&fit=crop&q=80&w=800",
    gradient: "from-[#F9E400] to-[#FFAF00]",
    shadow: "shadow-[#F9E400]/20"
  },
  {
    id: 3,
    tag: "MODERN ART",
    title: "Abstract Visions &",
    highlight: "Creative Genius",
    description: "Invest in the future with our curated selection of modern art pieces, sculptures, and rare digital collectibles.",
    image: "https://images.unsplash.com/photo-1618005198910-a522119f12a6?auto=format&fit=crop&q=80&w=800",
    gradient: "from-[#F5004F] to-[#FFAF00]",
    shadow: "shadow-[#F5004F]/20"
  }
];