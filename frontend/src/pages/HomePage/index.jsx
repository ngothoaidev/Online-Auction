import { Trophy, Star } from "lucide-react";
import { useNav } from '../../hooks/useNavigate.js';
import { topBidders } from "../../data/index.js";
import Header from "../../components/Header/index.jsx";
import Footer from "../../components/Footer.jsx";
import ProductTabs from "./ProductTabs.jsx";
import Hero from "./Hero.jsx";

export default function HomePage() {
    const nav = useNav();
    return (
        <div className="min-h-screen transition-colors duration-300" 
              style={{ backgroundColor: "var(--bg-soft)", color: "var(--text)" }}
        >
            {/* Hero Section */}
            <Hero />

            {/* Dummy Content Grid */}
            <ProductTabs nav={nav} />

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
    );
}