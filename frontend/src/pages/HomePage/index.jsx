import { Trophy, Star, Shield, Zap, Globe, Users, Gavel } from "lucide-react";
import { useNav } from '../../hooks/useNavigate';
import { topBidders } from "../../data";
import ProductTabs from "./ProductTabs";
import Hero from "./Hero";
import CTA from "./CTA";
import './HomePage.css'

export default function HomePage() {
    const nav = useNav();

    // Reusable Card Wrapper Class
    // Note: I added 'backdrop-blur-sm' to give cards a glassy feel against the purple background
    const cardClass = "max-w-7xl mx-auto rounded-3xl overflow-hidden shadow-2xl mb-12 transition-transform duration-300 hover:shadow-2xl relative z-10";

    return (
        <div className="min-h-screen pb-12 relative text-stone-100">
            
            {/* --- GLOBAL BACKGROUND --- */}
            {/* FLOATING ORBS */}
            <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none animate-pulse -z-30 transition-all duration-500
                bg-[#7C00FE]/5 dark:bg-[#7C00FE]/20"
            ></div>

            <div className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none -z-30 transition-all duration-500
                bg-[#F5004F]/5 dark:bg-[#F5004F]/20"
            ></div>

            {/* --- CONTENT START --- */}

            {/* 1. HERO */}
            <div className="mb-8">
                <Hero />
            </div>

            {/* 2. LIVE STATS CARD */}
            <div className={`${cardClass} border border-white/10`} style={{ backgroundColor: "var(--bg)" }}>
                <div className="container mx-auto px-4 py-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-gray-200 dark:divide-gray-700">
                        <div className="space-y-1">
                            <p className="text-3xl font-bold" style={{ color: "var(--accent)" }}>$2.4M+</p>
                            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-subtle)" }}>Volume Traded</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-bold" style={{ color: "var(--info)" }}>12k+</p>
                            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-subtle)" }}>Active Bidders</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-bold" style={{ color: "var(--success)" }}>850+</p>
                            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-subtle)" }}>Live Auctions</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-bold" style={{ color: "var(--warning)" }}>99.9%</p>
                            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-subtle)" }}>Verified Sellers</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. PRODUCTS CARD */}
            <div className={`${cardClass} py-8`} style={{ backgroundColor: "var(--bg)" }}>
                <ProductTabs />
            </div>

            {/* 4. HOW IT WORKS CARD */}
            <div className={`${cardClass} py-16`} style={{ backgroundColor: "var(--card-bg)" }}>
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "var(--text)" }}>Start Bidding in Minutes</h2>
                        <p className="text-lg" style={{ color: "var(--text-subtle)" }}>We've streamlined the experience so you can focus on winning.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative px-4">
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 border-t-2 border-dashed" style={{ borderColor: "var(--border-subtle)" }}></div>

                        {[
                            { icon: Users, title: "Create Account", desc: "Sign up for free and verify your identity.", color: "var(--accent)" },
                            { icon: Gavel, title: "Place Your Bid", desc: "Find unique items and place your best bid.", color: "var(--info)" },
                            { icon: Trophy, title: "Win & Collect", desc: "Secure payment and track your delivery.", color: "var(--success)" }
                        ].map((step, idx) => (
                            <div key={idx} className="relative flex flex-col items-center text-center group">
                                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 relative z-10 transition-transform duration-300 group-hover:scale-110 shadow-lg" style={{ backgroundColor: "var(--bg)", border: "4px solid var(--bg-subtle)" }}>
                                    <step.icon className="w-10 h-10" style={{ color: step.color }} />
                                </div>
                                <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>{idx + 1}. {step.title}</h3>
                                <p className="text-sm px-4" style={{ color: "var(--text-subtle)" }}>{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 5. TOP BIDDERS CARD */}
            <div className={`${cardClass} py-16`} style={{ backgroundColor: "var(--bg)" }}>
                <div className="container mx-auto px-4">
                    {/* Header Section ... (unchanged) */}
                    <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-4 px-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl shadow-sm" style={{ backgroundColor: "var(--accent-soft)" }}>
                                <Trophy className="w-8 h-8" style={{ color: "var(--accent-strong)" }} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold" style={{ color: "var(--text)" }}>Hall of Fame</h2>
                                <p className="text-sm" style={{ color: "var(--text-subtle)" }}>Top 5 Bidders this month</p>
                            </div>
                        </div>
                        <button onClick={() => nav.go('/leaderboard')} className="text-sm font-bold uppercase tracking-wider hover:underline" style={{ color: "var(--accent)" }}>
                            View Full Leaderboard
                        </button>
                    </div>

                    {/* THE TOP 3 CARDS (Ranks 1, 2, 3) 
                        (These remain unchanged as they are the core of the layout)
                    */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-end px-4 mb-8">
                        {/* Rank 2 */}
                        <div className="rounded-2xl shadow-lg p-6 flex flex-col items-center border order-2 md:order-1 relative mt-8 md:mt-0" style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border)" }}>
                            <div className="absolute -top-4 bg-gray-200 text-gray-700 font-bold px-4 py-1 rounded-full shadow-sm text-sm border-2" style={{ borderColor: "var(--bg-subtle)" }}>#2 Silver</div>
                            <div className="w-20 h-20 rounded-full border-4 border-gray-200 mb-4 overflow-hidden"><img src={topBidders[1].avatar} className="w-full h-full object-cover" /></div>
                            <h3 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>{topBidders[1].name}</h3>
                            <p className="font-bold" style={{ color: "var(--info)" }}>{topBidders[1].won} Won</p>
                        </div>

                        {/* Rank 1 */}
                        <div className="rounded-2xl shadow-2xl p-8 flex flex-col items-center border-2 order-1 md:order-2 transform md:-translate-y-6 relative z-10" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--accent)" }}>
                            <div className="absolute -top-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-6 py-2 rounded-full shadow-lg text-base border-4 gap-2 flex" style={{ borderColor: "var(--card-bg)" }}>
                                <Trophy className="w-4 h-4" /> #1 Champion
                            </div>
                            <div className="w-28 h-28 rounded-full border-4 mb-4 overflow-hidden shadow-xl" style={{ borderColor: "var(--accent)" }}><img src={topBidders[0].avatar} className="w-full h-full object-cover" /></div>
                            <h3 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>{topBidders[0].name}</h3>
                            <p className="text-3xl font-extrabold" style={{ color: "var(--info)" }}>{topBidders[0].won} Won</p>
                        </div>

                        {/* Rank 3 */}
                        <div className="rounded-2xl shadow-lg p-6 flex flex-col items-center border order-3 md:order-3 relative mt-8 md:mt-0" style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border)" }}>
                            <div className="absolute -top-4 bg-orange-200 text-orange-800 font-bold px-4 py-1 rounded-full shadow-sm text-sm border-2" style={{ borderColor: "var(--bg-subtle)" }}>#3 Bronze</div>
                            <div className="w-20 h-20 rounded-full border-4 border-orange-200 mb-4 overflow-hidden"><img src={topBidders[2].avatar} className="w-full h-full object-cover" /></div>
                            <h3 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>{topBidders[2].name}</h3>
                            <p className="font-bold" style={{ color: "var(--info)" }}>{topBidders[2].won} Won</p>
                        </div>
                    </div>

                    {/* UPDATED LIST: Only show Rank 4 and 5 
                        (topBidders.slice(3, 5))
                    */}
                    <div className="max-w-3xl mx-auto rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
                        {topBidders.slice(3, 5).map((bidder) => (
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
            </div>

            {/* 6. WHY CHOOSE US CARD */}
            <div className={`${cardClass} py-16`} style={{ backgroundColor: "var(--card-bg)" }}>
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                        {[
                            { title: "Bank-Grade Security", icon: Shield, color: "var(--success)", bg: "var(--success-bg)", desc: "Encrypted transactions and escrow protection." },
                            { title: "Real-Time Bidding", icon: Zap, color: "var(--info)", bg: "var(--info-bg)", desc: "Zero latency updates via WebSocket technology." },
                            { title: "Global Marketplace", icon: Globe, color: "var(--warning)", bg: "var(--warning-bg)", desc: "Access unique items from verified sellers worldwide." }
                        ].map((feat, idx) => (
                            <div key={idx} className="p-8 rounded-2xl transition-all duration-300 hover:scale-105" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}>
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6" style={{ backgroundColor: feat.bg, color: feat.color }}>
                                    <feat.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3" style={{ color: "var(--text)" }}>{feat.title}</h3>
                                <p style={{ color: "var(--text-subtle)" }}>{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 7. CTA SECTION */}
            <CTA />

        </div>
    );
}