import { useAuth } from '../../contexts/AuthContext';
import { useNav } from '../../hooks/useNavigate';

export default function Hero() {
  const { user } = useAuth();
  const nav = useNav();

  const content = user 
    ? {
        tag: "Welcome Back",
        title: `Hello, ${user.email?.split('@')[0] || 'Bidder'}`, 
        highlight: "Ready to Win?",
        // Light Mode: Gold to Orange | Dark Mode: Yellow to Pink
        gradient: "from-amber-600 to-orange-600 dark:from-[#F9E400] dark:to-[#F5004F]", 
        description: "You are all set. Check out the latest listings or manage your active bids from your dashboard.",
        primaryBtn: { text: "Browse Auctions", action: nav.activeListings },
        secondaryBtn: { text: "My Dashboard", action: nav.me },
      }
    : {
        tag: "Premium Marketplace",
        title: "Discover Unique",
        highlight: "Treasures & Rarity",
        // Light Mode: Teal to Blue | Dark Mode: Cyan to Purple
        gradient: "from-teal-600 to-blue-600 dark:from-[#00dbde] dark:to-[#fc00ff]",
        description: "Join the world's most secure auction platform. Verify your identity in seconds and start bidding on exclusive collectibles today.",
        primaryBtn: { text: "Register Now", action: nav.register },
        secondaryBtn: { text: "About Us", action: () => nav.go('/about') },
      };

  return (
    <div className="relative min-h-[550px] flex items-center justify-center overflow-hidden transition-colors duration-500"
      style={{ background: 'var(--hero-bg)' }}
    >
      
      {/* --- BACKGROUND EFFECTS --- */}
      
      {/* 1. Dot Pattern */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none transition-opacity duration-500" 
        style={{ 
          backgroundImage: 'var(--hero-pattern)',
          backgroundSize: '32px 32px' 
        }}
      ></div>

      {/* 2. Floating Orbs (Theme Aware) */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none animate-pulse transition-colors duration-500"
           style={{ backgroundColor: 'var(--hero-orb-1)' }}></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none transition-colors duration-500"
           style={{ backgroundColor: 'var(--hero-orb-2)' }}></div>

      {/* --- MAIN CONTENT --- */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
            
            {/* Tag Pill */}
            <div className="inline-block backdrop-blur-md text-xs font-bold px-4 py-1.5 rounded-full mb-8 shadow-lg transition-colors duration-300 border"
                style={{ 
                  backgroundColor: 'var(--bg-soft)', 
                  color: 'var(--accent)',
                  borderColor: 'var(--border)'
                }}
            >
              ● {content.tag}
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight tracking-tight drop-shadow-xl" 
                style={{ color: 'var(--text)' }}>
              {content.title} <br/>
              <span className={`text-transparent bg-clip-text bg-gradient-to-r ${content.gradient} filter drop-shadow-sm`}>
                  {content.highlight}
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-2xl mb-10 max-w-2xl font-light leading-relaxed transition-colors duration-300"
               style={{ color: 'var(--hero-text-secondary)' }}>
              {content.description}
            </p>

            {/* Buttons Row */}
            <div className="flex flex-col sm:flex-row gap-5">
              <button 
                  onClick={content.primaryBtn.action}
                  className="px-10 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-xl min-w-[200px] text-white"
                  style={{ backgroundColor: 'var(--accent)' }}
              >
                  {content.primaryBtn.text}
              </button>
              
              <button 
                  onClick={content.secondaryBtn.action}
                  className="backdrop-blur-md px-10 py-4 rounded-full font-bold text-lg border transition-all hover:bg-black/5 dark:hover:bg-white/10 min-w-[200px]"
                  style={{ 
                    color: 'var(--text)', 
                    borderColor: 'var(--border)' 
                  }}
              >
                  {content.secondaryBtn.text}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};