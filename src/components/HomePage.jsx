import { useState } from "react";
import { Trophy, Clock, Gavel, Star, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { products, topBidders } from "../data/mockData";
import AuctionCard from "../components/ui/AuctionCard";

{/* Dummy Hero Section */}
const Hero = () => {
  return (
    <div className="relative bg-gray-900 text-white overflow-hidden">
        <div className="relative rounded-2xl overflow-hidden h-[400px] mb-12 shadow-2xl group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#1A1225] via-transparent to-transparent z-10"></div>
            <img 
            src="https://images.unsplash.com/photo-1599939571322-792a326991f2?q=80&w=2576&auto=format&fit=crop" 
            alt="Luxury Watch" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute bottom-0 left-0 p-10 z-20 max-w-2xl">
            <span className="bg-[#C0341D] text-white text-xs font-bold px-3 py-1 rounded mb-4 inline-block animate-pulse">LIVE NOW</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-sans tracking-tight">Discover Rare Items & <span className="text-[#E0B84C]">Exclusive Deals</span></h1>
            <p className="text-gray-300 text-lg mb-6 line-clamp-2">Bid on thousands of unique items starting from $1. The world's most trusted online auction marketplace.</p>
            <div className="flex items-center gap-4">
            <button className="bg-[#E0B84C] hover:bg-[#E0B800] text-white px-8 py-3 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg">
              Start Bidding
            </button>
            <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-8 py-3 rounded-full font-bold text-lg border border-white/30 transition-all">
              Sell Item
            </button>
          </div>
            </div>
        </div>
    </div>
  );
};

const Section = ({ title, icon: Icon, items, highlightColor = "blue" }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const itemsToShow = 3;
  const maxSlide = 2;

  const nextSlide = () => {
    setCurrentSlide(prev => Math.min(prev + 1, maxSlide));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  };

  // Determine button state
  const isLeftDisabled = currentSlide === 0;
  const isRightDisabled = currentSlide >= maxSlide;

  return (
    <section className="container mx-auto px-4 py-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${highlightColor}-100 dark:bg-${highlightColor}-900/30 text-${highlightColor}-600 dark:text-${highlightColor}-400`}>
                <Icon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {title}
            </h2>
            </div>
            <span className="h-px flex-1 bg-white/10 dark:bg-white/10 transition-colors duration-300 mx-4"></span>
            <button className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
            View All <ArrowRight className="w-4 h-4" />
            </button>
        </div>

        {/* Carousel Container */}
        <div className="relative group/carousel">
            {/* Main Track */}
            <div className="overflow-hidden -mx-3"> {/* Negative margin to counteract item padding */}
            <div 
                className="flex transition-transform duration-500 ease-out" 
                style={{ transform: `translateX(-${currentSlide * (100 / itemsToShow)}%)` }}
            >
                {items.map((item) => (
                <div key={item.id} className="min-w-80% md:min-w-[50%] lg:min-w-[20%] px-3 shrink-0 box-border">
                    <AuctionCard item={item} />
                </div>
                ))}
            </div>
            </div>

            {/* Navigation Buttons (Visible on Hover) */}
            {!isLeftDisabled && (
            <button 
                onClick={prevSlide}
                className="absolute top-1/2 -left-4 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-full shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:scale-110"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            )}
            
            {!isRightDisabled && (
            <button 
                onClick={nextSlide}
                className="absolute top-1/2 -right-4 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-full shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:scale-110"
            >
                <ChevronRight className="w-6 h-6" />
            </button>
            )}
        </div>
    </section>
  );
};

export default function HomePage() {
    return (
        <>
        <div className="min-h-screen bg-[#1A1225] text-white">
            {/* Controls for Demo */}
            {/* <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="bg-[#2A2038] border border-white/10 rounded-xl p-6 mb-10 flex items-center justify-between shadow-lg">
                    <div>
                    <h2 className="text-[#E0B84C] font-bold text-lg mb-1">Developer Preview Controls</h2>
                    <p className="text-gray-400 text-sm">Use this toggle to switch between Guest and User views in the header.</p>
                    </div>
                    <button 
                    onClick={() => setIsLoggedIn(!isLoggedIn)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#E0B84C] focus:ring-offset-2 focus:ring-offset-[#2A2038] ${isLoggedIn ? 'bg-[#E0B84C]' : 'bg-gray-600'}`}
                    >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isLoggedIn ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div> */}
            
            <Hero />

            {/* Dummy Content Grid */}
            <div className="space-y-4">
                {/* Section 1: Ending Soon - Urgency Focus */}
                <Section 
                    title="Ending Soon" 
                    icon={Clock}
                    items={products} 
                    highlightColor="red" 
                />
                
                {/* Section 2: Most Bids - Popularity Focus */}
                <Section 
                    title="Trending Now" 
                    icon={Gavel} 
                    items={products} 
                    highlightColor="orange"
                />
                
                {/* Section 3: Highest Prices - Premium Focus */}
                <Section 
                    title="Premium Collections" 
                    icon={Star} 
                    items={products} 
                    highlightColor="blue"
                />
            </div>

            <section className="py-16 bg-blue-50 dark:bg-gray-800/50 transition-colors duration-300">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-3 mb-10 justify-center">
                    <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                        <Trophy className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Top Bidders Hall of Fame</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-end">
                    {/* Rank 2 */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center border border-gray-200 dark:border-gray-700 order-2 md:order-1 relative mt-8 md:mt-0">
                        <div className="absolute -top-4 bg-gray-300 text-gray-800 font-bold px-3 py-1 rounded-full shadow-sm text-sm border-2 border-white dark:border-gray-800">
                        #2 Silver
                        </div>
                        <div className="w-20 h-20 rounded-full border-4 border-gray-300 mb-4 overflow-hidden">
                        <img src={topBidders[1].avatar} alt="Bidder" className="w-full h-full object-cover" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{topBidders[1].name}</h3>
                        <div className="flex items-center gap-1 text-yellow-500 mb-4">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-medium">{topBidders[1].rating}% Rating</span>
                        </div>
                        <div className="text-center w-full pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{topBidders[1].won}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Auctions Won</p>
                        </div>
                    </div>

                    {/* Rank 1 */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 flex flex-col items-center border-2 border-yellow-400 dark:border-yellow-500/50 order-1 md:order-2 transform md:-translate-y-6 relative z-10">
                        <div className="absolute -top-5 bg-yellow-400 text-yellow-900 font-bold px-4 py-1.5 rounded-full shadow-lg text-base border-4 border-white dark:border-gray-800 flex items-center gap-1">
                        <Trophy className="w-4 h-4" /> #1 Champion
                        </div>
                        <div className="w-24 h-24 rounded-full border-4 border-yellow-400 mb-4 overflow-hidden shadow-lg">
                        <img src={topBidders[0].avatar} alt="Bidder" className="w-full h-full object-cover" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">{topBidders[0].name}</h3>
                        <div className="flex items-center gap-1 text-yellow-500 mb-6">
                        <Star className="w-5 h-5 fill-current" />
                        <span className="font-bold text-lg">{topBidders[0].rating}% Rating</span>
                        </div>
                        <div className="text-center w-full pt-6 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">{topBidders[0].won}</p>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Auctions Won</p>
                        </div>
                    </div>

                    {/* Rank 3 */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center border border-gray-200 dark:border-gray-700 order-3 md:order-3 relative mt-8 md:mt-0">
                        <div className="absolute -top-4 bg-orange-300 text-orange-900 font-bold px-3 py-1 rounded-full shadow-sm text-sm border-2 border-white dark:border-gray-800">
                        #3 Bronze
                        </div>
                        <div className="w-20 h-20 rounded-full border-4 border-orange-300 mb-4 overflow-hidden">
                        <img src={topBidders[2].avatar} alt="Bidder" className="w-full h-full object-cover" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{topBidders[2].name}</h3>
                        <div className="flex items-center gap-1 text-yellow-500 mb-4">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-medium">{topBidders[2].rating}% Rating</span>
                        </div>
                        <div className="text-center w-full pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{topBidders[2].won}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Auctions Won</p>
                        </div>
                    </div>
                    </div>

                    {/* Other Ranks List */}
                    <div className="max-w-3xl mx-auto mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {topBidders.slice(3).map((bidder) => (
                        <div key={bidder.id} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <span className="text-gray-400 font-bold w-6 text-center">#{bidder.rank}</span>
                            <div className="w-10 h-10 rounded-full overflow-hidden">
                            <img src={bidder.avatar} alt={bidder.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                            <h4 className="font-bold text-gray-800 dark:text-gray-200">{bidder.name}</h4>
                            <div className="flex items-center gap-1 text-xs text-yellow-500">
                                <Star className="w-3 h-3 fill-current" />
                                {bidder.rating}% Positive Rating
                            </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block font-bold text-blue-600 dark:text-blue-400">{bidder.won} Won</span>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
            </section>
        </div>
        </>
    );
}