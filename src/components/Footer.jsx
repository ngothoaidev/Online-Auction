import React from 'react';
import { useNav } from '../useNavigate.js';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Mail, 
  MapPin, 
  Phone, 
  ArrowRight, 
  ShieldCheck 
} from 'lucide-react';

/**
 * Footer Component - Online Auction Platform
 * Matches the global "Dark Premium" theme.
 */

const Footer = () => {
  const nav = useNav();
  return (
    <footer className="bg-[#1A1225] border-t border-white/5 font-sans pt-16 pb-8 text-[#B8B0C8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* TOP SECTION: Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* COLUMN 1: Brand & tagline */}
          <div className="space-y-6">
            <div className="flex-shrink-0 cursor-pointer group w-fit">
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="text-[#E0B84C]">AURUM</span> AUCTIONS
              </h2>
              <div className="h-0.5 w-0 group-hover:w-full bg-[#E0B84C] transition-all duration-300"></div>
            </div>
            <p className="text-sm leading-relaxed text-gray-400 max-w-xs">
              The world's premier destination for exclusive collectibles, luxury timepieces, and rare digital assets. Experience the thrill of the bid.
            </p>
            <div className="flex items-center gap-4">
              <SocialLink href="#" icon={<Facebook size={18} />} />
              <SocialLink href="#" icon={<Twitter size={18} />} />
              <SocialLink href="#" icon={<Instagram size={18} />} />
              <SocialLink href="#" icon={<Linkedin size={18} />} />
            </div>
          </div>

          {/* COLUMN 2: Quick Links (Company) */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6 tracking-wide">Company</h3>
            <ul className="space-y-4 text-sm">
              <FooterLink href="#">About Us</FooterLink>
              <FooterLink href="#">Careers</FooterLink>
              <FooterLink href="#">Press & Media</FooterLink>
              <FooterLink href="#">Our Partners</FooterLink>
              <FooterLink href="#">Sitemap</FooterLink>
            </ul>
          </div>

          {/* COLUMN 3: Support & Policies */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6 tracking-wide">Support</h3>
            <ul className="space-y-4 text-sm">
              <FooterLink href="#">Help Center</FooterLink>
              <FooterLink href="#">Buying Guides</FooterLink>
              <FooterLink href="#">Selling Guides</FooterLink>
              <FooterLink href="#">Trust & Safety</FooterLink>
              <FooterLink href="#">Privacy Policy</FooterLink>
              <FooterLink href="#">Terms of Service</FooterLink>
            </ul>
          </div>

          {/* COLUMN 4: Contact & Newsletter */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6 tracking-wide">Stay Connected</h3>
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 text-sm group cursor-pointer">
                <MapPin className="text-[#E0B84C] mt-0.5 group-hover:text-white transition-colors" size={16} />
                <span>123 Luxury Lane, Suite 100<br />New York, NY 10012</span>
              </div>
              <div className="flex items-center gap-3 text-sm group cursor-pointer">
                <Phone className="text-[#E0B84C] group-hover:text-white transition-colors" size={16} />
                <span>+1 (888) 123-4567</span>
              </div>
              <div className="flex items-center gap-3 text-sm group cursor-pointer">
                <Mail className="text-[#E0B84C] group-hover:text-white transition-colors" size={16} />
                <span>concierge@aurum.com</span>
              </div>
            </div>

            {/* Newsletter Input */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Subscribe to our newsletter</p>
              <div className="relative group">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="w-full bg-[#2A2038] text-white text-sm border border-white/10 rounded-lg py-3 pl-4 pr-12 focus:outline-none focus:border-[#E0B84C] focus:ring-1 focus:ring-[#E0B84C] transition-all"
                />
                <button className="absolute right-1 top-1 bottom-1 bg-[#E0B84C] hover:bg-[#B88A20] text-[#1A1225] rounded-md px-3 transition-colors flex items-center justify-center">
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR: Copyright & Trust Badges */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} Aurum Auctions Inc. All rights reserved.</p>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2" title="Secure Payment">
              <ShieldCheck size={16} className="text-[#E0B84C]" />
              <span>256-bit SSL Secure</span>
            </div>
            <span className="hidden md:inline text-gray-700">|</span>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
            <a href="#" className="hover:text-white transition-colors">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Helper Component for list links
const FooterLink = ({ href, children }) => (
  <li>
    <a 
      href={href} 
      className="hover:text-[#E0B84C] hover:pl-2 transition-all duration-300 block w-fit"
    >
      {children}
    </a>
  </li>
);

// Helper Component for social icon circles
const SocialLink = ({ href, icon }) => (
  <a 
    href={href} 
    className="w-8 h-8 rounded-full bg-[#2A2038] flex items-center justify-center text-gray-400 hover:bg-[#E0B84C] hover:text-[#1A1225] transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-lg hover:shadow-[#E0B84C]/20"
  >
    {icon}
  </a>
);

export default Footer;