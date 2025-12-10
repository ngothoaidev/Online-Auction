/**
 * Constants and static data for the auction platform
 */

export const CATEGORIES_REF = [
  { id: 'electronics', subs: ['mobile', 'laptops', 'cameras', 'audio'] },
  { id: 'fashion', subs: ['shoes', 'watches', 'bags', 'jewelry'] },
  { id: 'collectibles', subs: ['art', 'coins', 'stamps', 'antiques'] },
  { id: 'home', subs: ['furniture', 'decor', 'tools', 'appliances'] }
];

export const ADJECTIVES = [
  'Vintage',
  'Brand New',
  'Refurbished',
  'Rare',
  'Limited Edition',
  'Custom',
  'Antique',
  'Professional',
  'Lightly Used',
  'Premium'
];

export const BRANDS = {
  electronics: ['Apple', 'Sony', 'Samsung', 'Dell', 'Canon', 'Bose', 'Nintendo'],
  fashion: ['Nike', 'Gucci', 'Rolex', 'Adidas', 'Louis Vuitton', 'Casio', 'Zara'],
  collectibles: ['Picasso', 'Roman', 'Ming Dynasty', 'US Mint', 'Royal Mail', 'Victorian'],
  home: ['IKEA', 'Dyson', 'Herman Miller', 'KitchenAid', 'Bosch', 'Makita']
};

export const SAMPLE_IMAGES = {
  electronics: ['laptop-modern', 'smartphone-modern', 'camera-vintage'],
  fashion: ['fashion-luxury', 'sneakers-modern', 'watch-classic'],
  collectibles: ['painting-abstract', 'coin-rare', 'stamp-collection'],
  home: ['furniture-classic', 'decor-modern', 'tools-power']
};

export const Q_AND_A = [
  { q: "Is the price negotiable?", a: "Sorry, this is an auction format only." },
  { q: "Do you ship internationally?", a: "Yes, we ship via FedEx Global." },
  { q: "Is there a warranty?", a: "The manufacturer warranty is still valid for 6 months." },
  { q: "Can I see more photos?", a: "I have uploaded all available angles." },
  { q: "Does it come with original box?", a: "Yes, original packaging included." }
];

export const categories = CATEGORIES_REF.map(c => ({
  id: c.id,
  name: c.id.charAt(0).toUpperCase() + c.id.slice(1),
  subcategories: c.subs.map(s => ({
    id: s,
    name: s.charAt(0).toUpperCase() + s.slice(1)
  }))
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
