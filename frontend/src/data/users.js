/**
 * Mock user data for the auction platform
 */

export const mockUserData = {
  id: 'u1',
  name: 'John Doe',
  username: 'johndoe123',
  email: 'john.doe@example.com',
  bio: 'Passionate collector and tech enthusiast. Love finding rare items and great deals!',
  birthDate: '1990-05-15',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  role: 'admin', // or 'seller' or 'admin'
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
  ]
};

export const mockNotifications = [
  {
    icon: 'bell',
    message: "Your bid on 'Vintage Rolex Watch' has been outbid.",
    time: new Date(new Date().getTime() - 10 * 60 * 1000)
  },
  {
    icon: 'trophy',
    message: "You won the auction for 'Apple MacBook Pro'!",
    time: new Date(new Date().getTime() - 2 * 60 * 60 * 1000)
  },
  {
    icon: 'question',
    message: "New question on your listing 'Sony Camera': 'Is the lens included?'",
    time: new Date(new Date().getTime() - 5 * 60 * 1000)
  },
  {
    icon: 'check-circle',
    message: "Your item 'Nike Sneakers' has been approved and is now live.",
    time: new Date(new Date().getTime() - 1 * 60 * 60 * 1000)
  }
];
