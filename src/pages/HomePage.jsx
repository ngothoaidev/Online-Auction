import { useState, useEffect } from "react";
import { Trophy, Clock, Gavel, Star, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { products, topBidders, heroSlides } from "../data/mockData.js";
import AuctionCard from "../components/AuctionCard.jsx";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

{/* Dummy Hero Section */}
// const Hero = () => {
//   return (
//     <div className="relative bg-gray-900 text-white overflow-hidden">
//         <div className="relative rounded-2xl overflow-hidden h-[400px] mb-12 shadow-2xl group">
//             <div className="absolute inset-0 bg-gradient-to-r from-[#1A1225] via-transparent to-transparent z-10"></div>
//             <img 
//             src="https://images.unsplash.com/photo-1599939571322-792a326991f2?q=80&w=2576&auto=format&fit=crop" 
//             alt="Luxury Watch" 
//             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
//             />
//             <div className="absolute bottom-0 left-0 p-10 z-20 max-w-2xl">
//             <span className="bg-[#C0341D] text-white text-xs font-bold px-3 py-1 rounded mb-4 inline-block animate-pulse">LIVE NOW</span>
//             <h1 className="text-4xl md:text-5xl font-bold mb-4 font-sans tracking-tight">Discover Rare Items & <span className="text-[#E0B84C]">Exclusive Deals</span></h1>
//             <p className="text-gray-300 text-lg mb-6 line-clamp-2">Bid on thousands of unique items starting from $1. The world's most trusted online auction marketplace.</p>
//             <div className="flex items-center gap-4">
//             <button className="bg-[#E0B84C] hover:bg-[#E0B800] text-white px-8 py-3 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg">
//               Start Bidding
//             </button>
//             <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-8 py-3 rounded-full font-bold text-lg border border-white/30 transition-all">
//               Sell Item
//             </button>
//           </div>
//             </div>
//         </div>
//     </div>
//   );
// };

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000); // Change slide every 5 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative text-white overflow-hidden min-h-[550px] flex items-center group">
      {/* 1. Base Gradient Background (Static) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a0050] via-[#400080] to-[#1a0033] opacity-90 transition-colors duration-1000"></div>
      
      {/* 2. Subtle Dot Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, #F9E400 1px, transparent 1px)',
          backgroundSize: '32px 32px' 
        }}
      ></div>

      {/* 3. Floating Light Orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#7C00FE]/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#F5004F]/20 rounded-full blur-[100px] pointer-events-none"></div>

      {/* 4. Sliding Content Container */}
      <div className="container mx-auto px-4 relative z-10 h-full">
        <div 
        className="flex transition-transform duration-700 ease-in-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
        {heroSlides.map((slide) => (
            <div key={slide.id} className="w-full shrink-0 flex flex-col md:flex-row items-center justify-between p-10">
            
            {/* Text Section */}
            <div className="max-w-2xl mb-10 md:mb-0 pr-4">
                <div className={`inline-block bg-white/10 backdrop-blur-md text-[#F9E400] text-xs font-bold px-3 py-1 rounded-full mb-6 border border-[#F9E400]/40 shadow-lg ${slide.shadow}`}>
                ● {slide.tag}
                </div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight drop-shadow-lg">
                {slide.title} <br/>
                <span className={`text-transparent bg-clip-text bg-gradient-to-r ${slide.gradient} filter drop-shadow-sm`}>
                    {slide.highlight}
                </span>
                </h1>
                <p className="text-lg text-stone-200 mb-8 max-w-lg font-light leading-relaxed drop-shadow-md">
                {slide.description}
                </p>
                <div className="flex gap-4">
                <button className="bg-[#F5004F] hover:bg-[#d00043] text-white px-8 py-3.5 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-xl shadow-[#F5004F]/30">
                    Start Bidding
                </button>
                <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-3.5 rounded-full font-bold text-lg border border-white/30 transition-all hover:border-[#F9E400]/50">
                    Sell Item
                </button>
                </div>
            </div>

            {/* Floating Image Section */}
            <div className="w-full md:w-1/2 flex justify-center md:justify-end relative h-[350px] md:h-[400px]">
                <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                    src={slide.image}
                    alt="Abstract Shape" 
                    className="max-h-full max-w-full object-contain drop-shadow-2xl animate-float mix-blend-screen opacity-90"
                    style={{ 
                        maskImage: 'radial-gradient(circle, black 60%, transparent 100%)',
                        WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 100%)'
                    }}
                    />
                </div>
            </div>

            </div>
        ))}
        </div>

        {/* Navigation Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                currentSlide === idx ? 'bg-[#F9E400] w-8' : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ProductTabs = ({ navigate }) => {
  const [activeTab, setActiveTab] = useState('endingSoon');

  const tabs = [
    { id: 'endingSoon', label: 'Ending Soon', icon: Clock, color: '#F5004F', data: products },
    { id: 'mostBids', label: 'Most Active', icon: Gavel, color: '#7C00FE', data: products },
    { id: 'highestPrice', label: 'Premium', icon: Star, color: '#F9E400', data: products },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <section className="py-16 container mx-auto px-4">
      <div className="flex flex-wrap justify-center gap-4 mb-10">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wide transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? `text-white shadow-lg shadow-${tab.color}/20 scale-105` 
                  : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
              style={{ 
                backgroundColor: isActive ? tab.color : undefined,
                color: isActive && tab.id === 'highestPrice' ? 'black' : undefined 
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mx-10 animate-fade-in">
        {activeTabData.data.map((item) => (
          <div key={item.id} className="transform transition-all duration-500 hover:-translate-y-1">
            <AuctionCard item={item} navigate={navigate} />
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <button 
          onClick={() => navigate('search')}
          className="inline-flex items-center gap-2 font-bold uppercase tracking-widest text-xs border-b-2 border-transparent hover:border-current pb-1 transition-all"
          style={{ color: activeTabData.color }}
        >
          View All {activeTabData.label} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

export default function HomePage({ darkMode, toggleDarkMode }) {
    return (
        <>
        <Header darkMode={darkMode} toggleTheme={toggleDarkMode} />
        <div className="min-h-screen transition-colors duration-300" 
              style={{ backgroundColor: "var(--bg-soft)", color: "var(--text)" }}
        >
            {/* Hero Section */}
            <Hero />

            {/* Dummy Content Grid */}
            <ProductTabs />

            {/* Top Bidders Section */}
            <section className="py-16 transition-colors duration-300" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-3 mb-10 justify-center">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent-strong)" }}>
                        <Trophy className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold" style={{ color: "var(--text)" }}>Top Bidders Hall of Fame</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-end">
                    {/* Rank 2 */}
                    <div className="rounded-2xl shadow-lg p-6 flex flex-col items-center border order-2 md:order-1 relative mt-8 md:mt-0" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
                        <div className="absolute -top-4 bg-gray-300 text-gray-800 font-bold px-3 py-1 rounded-full shadow-sm text-sm border-2" style={{ borderColor: "var(--card-bg)" }}>
                        #2 Silver
                        </div>
                        <div className="w-20 h-20 rounded-full border-4 border-gray-300 mb-4 overflow-hidden">
                        <img src={topBidders[1].avatar} alt="Bidder" className="w-full h-full object-cover" />
                        </div>
                        <h3 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>{topBidders[1].name}</h3>
                        <div className="flex items-center gap-1 mb-4" style={{ color: "var(--accent)" }}>
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-medium">{topBidders[1].rating}% Rating</span>
                        </div>
                        <div className="text-center w-full pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                        <p className="text-2xl font-bold" style={{ color: "var(--info)" }}>{topBidders[1].won}</p>
                        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>Auctions Won</p>
                        </div>
                    </div>

                    {/* Rank 1 */}
                    <div className="rounded-2xl shadow-xl p-8 flex flex-col items-center border-2 order-1 md:order-2 transform md:-translate-y-6 relative z-10" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--accent)" }}>
                        <div className="absolute -top-5 font-bold px-4 py-1.5 rounded-full shadow-lg text-base border-4 flex items-center gap-1" style={{ backgroundColor: "var(--accent)", color: "var(--bg)", borderColor: "var(--card-bg)" }}>
                        <Trophy className="w-4 h-4" /> #1 Champion
                        </div>
                        <div className="w-24 h-24 rounded-full border-4 mb-4 overflow-hidden shadow-lg" style={{ borderColor: "var(--accent)" }}>
                        <img src={topBidders[0].avatar} alt="Bidder" className="w-full h-full object-cover" />
                        </div>
                        <h3 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>{topBidders[0].name}</h3>
                        <div className="flex items-center gap-1 mb-6" style={{ color: "var(--accent)" }}>
                        <Star className="w-5 h-5 fill-current" />
                        <span className="font-bold text-lg">{topBidders[0].rating}% Rating</span>
                        </div>
                        <div className="text-center w-full pt-6 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                        <p className="text-4xl font-extrabold" style={{ color: "var(--info)" }}>{topBidders[0].won}</p>
                        <p className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>Auctions Won</p>
                        </div>
                    </div>

                    {/* Rank 3 */}
                    <div className="rounded-2xl shadow-lg p-6 flex flex-col items-center border order-3 md:order-3 relative mt-8 md:mt-0" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
                        <div className="absolute -top-4 bg-orange-300 text-orange-900 font-bold px-3 py-1 rounded-full shadow-sm text-sm border-2" style={{ borderColor: "var(--card-bg)" }}>
                        #3 Bronze
                        </div>
                        <div className="w-20 h-20 rounded-full border-4 border-orange-300 mb-4 overflow-hidden">
                        <img src={topBidders[2].avatar} alt="Bidder" className="w-full h-full object-cover" />
                        </div>
                        <h3 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>{topBidders[2].name}</h3>
                        <div className="flex items-center gap-1 mb-4" style={{ color: "var(--accent)" }}>
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-medium">{topBidders[2].rating}% Rating</span>
                        </div>
                        <div className="text-center w-full pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                        <p className="text-2xl font-bold" style={{ color: "var(--info)" }}>{topBidders[2].won}</p>
                        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>Auctions Won</p>
                        </div>
                    </div>
                    </div>

                    {/* Other Ranks List */}
                    <div className="max-w-3xl mx-auto mt-8 rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
                    {topBidders.slice(3).map((bidder) => (
                        <div key={bidder.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-[var(--bg-hover)] transition-colors" style={{ borderColor: "var(--border-subtle)" }}>
                        <div className="flex items-center gap-4">
                            <span className="font-bold w-6 text-center" style={{ color: "var(--text-subtle)" }}>#{bidder.rank}</span>
                            <div className="w-10 h-10 rounded-full overflow-hidden">
                            <img src={bidder.avatar} alt={bidder.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                            <h4 className="font-bold" style={{ color: "var(--text)" }}>{bidder.name}</h4>
                            <div className="flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
                                <Star className="w-3 h-3 fill-current" />
                                {bidder.rating}% Positive Rating
                            </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block font-bold" style={{ color: "var(--info)" }}>{bidder.won} Won</span>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
            </section>
        </div>
        <Footer />
        </>
    );
}