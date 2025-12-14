import { useNav } from '../../hooks/useNavigate';
import { useAuth } from '../../contexts/AuthContext';

export default function CTA() {
  const nav = useNav();
  const { user } = useAuth();

  let ctaContent = {
    title: "Ready to Start Winning?",
    description: "Join thousands of bidders securing exclusive deals every day. Sign up now and get 5 free bid credits.",
    primaryBtn: { text: "Create Free Account", action: nav.register },
    secondaryBtn: { text: "Browse Auctions", action: nav.activeListings }
  };

  if (user) {
    if (user.role === 'seller') {
        ctaContent = {
            title: "Turn Your Collection into a Legacy",
            description: "The market is hot. List your rare items today and reach thousands of verified premium collectors instantly.",
            primaryBtn: { text: "Create New Auction", action: nav.create },
            secondaryBtn: { text: "Seller Dashboard", action: nav.me }
        };
    } else {
        ctaContent = {
            title: "Ready to Become a Seller?",
            description: "Have hidden treasures gathering dust? Upgrade your account to Seller status and start turning your items into cash.",
            primaryBtn: { text: "Apply to Sell", action: () => nav.go('/become-seller') },
            secondaryBtn: { text: "Continue Bidding", action: nav.activeListings }
        };
    }
  }

  return (
    <div className="py-24 text-center relative z-10">
        <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold mb-6 drop-shadow-sm" style={{ color: "var(--text)" }}>
                {ctaContent.title}
            </h2>
            
            <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
                {ctaContent.description}
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button 
                    onClick={ctaContent.primaryBtn.action}
                    className="px-10 py-4 font-bold rounded-full shadow-lg hover:scale-105 transition-transform hover:brightness-110"
                    style={{ backgroundColor: "var(--accent)", color: "#1A1205" }}
                >
                    {ctaContent.primaryBtn.text}
                </button>
                
                <button 
                    onClick={ctaContent.secondaryBtn.action}
                    className="px-10 py-4 font-bold rounded-full border-2 hover:bg-[var(--bg-hover)] transition-colors"
                    style={{ color: "var(--text)", borderColor: "var(--border)" }}
                >
                    {ctaContent.secondaryBtn.text}
                </button>
            </div>
        </div>
    </div>
  );
}