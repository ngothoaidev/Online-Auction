// import { Gavel, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[var(--secondary-dark)] border-t border-[var(--gray-border)] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              {/* <Gavel className="w-8 h-8 text-[var(--primary-gold)]" /> */}
              <div className="text-xl font-bold text-[var(--primary-gold)]" style={{ fontFamily: 'Playfair Display, serif' }}>
                AUCTION HOUSE
              </div>
            </div>
            <p className="text-[var(--gray-text)] text-sm mb-4">
              The premier destination for online auctions. Discover rare treasures and exclusive items.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-[var(--primary-dark)] flex items-center justify-center hover:bg-[var(--primary-gold)] hover:text-[var(--primary-dark)] transition-all">
                {/* <Facebook className="w-5 h-5" /> */}
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-[var(--primary-dark)] flex items-center justify-center hover:bg-[var(--primary-gold)] hover:text-[var(--primary-dark)] transition-all">
                {/* <Twitter className="w-5 h-5" /> */}
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-[var(--primary-dark)] flex items-center justify-center hover:bg-[var(--primary-gold)] hover:text-[var(--primary-dark)] transition-all">
                {/* <Instagram className="w-5 h-5" /> */}
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-[var(--primary-dark)] flex items-center justify-center hover:bg-[var(--primary-gold)] hover:text-[var(--primary-dark)] transition-all">
                {/* <Linkedin className="w-5 h-5" /> */}
              </a>
            </div>
          </div>

          {/* About */}
          <div>
            <h4 className="font-semibold mb-4">About</h4>
            <ul className="space-y-2 text-sm text-[var(--gray-text)]">
              <li><a href="#" className="hover:text-[var(--primary-gold)] transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-[var(--primary-gold)] transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-[var(--primary-gold)] transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-[var(--primary-gold)] transition-colors">Press</a></li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-semibold mb-4">Policies</h4>
            <ul className="space-y-2 text-sm text-[var(--gray-text)]">
              <li><a href="#" className="hover:text-[var(--primary-gold)] transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[var(--primary-gold)] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[var(--primary-gold)] transition-colors">Bidding Rules</a></li>
              <li><a href="#" className="hover:text-[var(--primary-gold)] transition-colors">Seller Agreement</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-[var(--gray-text)]">
              <li><a href="#" className="hover:text-[var(--primary-gold)] transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-[var(--primary-gold)] transition-colors">Contact Support</a></li>
              <li><a href="#" className="hover:text-[var(--primary-gold)] transition-colors">Report a Problem</a></li>
              <li><a href="#" className="hover:text-[var(--primary-gold)] transition-colors">Feedback</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--gray-border)] text-center text-sm text-[var(--gray-text)]">
          <p>&copy; 2025 Auction House. All rights reserved. Built with precision and care.</p>
        </div>
      </div>
    </footer>
  );
}
