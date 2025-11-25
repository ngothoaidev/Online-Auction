import React, {useState} from "react";

import { categories } from "../data/mockData";


export default function Header({currentUser, setCurrentPage, onLogout}){
    // const [mobileMenuOpen, setMobileMenuOpen] = useState(false);     // For mobile menu toggle
    const [categoryMenu, openCategoryMenu] = useState(false);
    const [userMenu, openUserMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e) => {
        e.preventDefault();
        if(searchQuery.trim()){
            setCurrentPage('search');
        }
    };

    return (
    <header className="sticky top-0 z-50 bg-(--secondary-dark) border-b border-(--gray-border) shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setCurrentPage('home')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {/* <Gavel className="w-8 h-8 text-[var(--primary-gold)]" /> */}
              <div className="hidden sm:block">
                <div className="text-xl font-bold text-[var(--primary-gold)] tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
                  AUCTION HOUSE
                </div>
                <div className="text-xs text-[var(--gray-text)] -mt-1">Premium Marketplace</div>
              </div>
            </button>

            {/* Desktop Categories */}
            <div className="hidden lg:block relative">
              <button
                onClick={() => openCategoryMenu(!categoryMenu)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary-dark)] hover:bg-opacity-80 transition-all"
              >
                <span>Categories</span>
                {/* <ChevronDown className={`w-4 h-4 transition-transform ${categoryMenuOpen ? 'rotate-180' : ''}`} /> */}
              </button>

            {/* 
                Category Dropdown
                Buggy part: Cannot toggle subcategory properly.
                Possible fix: Using absolute/relative positioning for subcategory menu.
                Expected: When hovering over a category, its subcategories should appear in its left side.
            */}
              {categoryMenu && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--secondary-dark)] rounded-lg shadow-xl border border-[var(--gray-border)] overflow-hidden">
                  {categories.map((category) => (
                    <>
                    <div key={category.id} className="group">
                        <button
                            onClick={() => { setCurrentPage('listProducts');
                              openCategoryMenu(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-[var(--primary-dark)] transition-colors flex items-center justify-between"
                        >
                        <span>{category.name}</span>
                        {/* <ChevronDown className="w-4 h-4 -rotate-90" /> */}
                        </button>
                    </div>
                    <div className="ml-2 w-56 bg-[var(--secondary-dark)] rounded-lg shadow-xl border border-[var(--gray-border)]">
                        {category.subcategories.map((sub) => (
                        <button
                            key={sub.id}
                            onClick={() => { 
                            setCurrentPage('listProducts');
                            openCategoryMenu(false); }}
                            className="w-full text-left px-4 py-2 hover:bg-[var(--primary-dark)] transition-colors text-sm"
                        >
                            {sub.name}
                        </button>
                        ))}
                    </div>
                    </>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search auctions..."
                className="w-full px-4 py-2 pl-10 bg-[var(--primary-dark)] border border-[var(--gray-border)] rounded-lg focus:outline-none focus:border-[var(--primary-gold)] transition-colors"
              />
              {/* <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--gray-text)]" /> */}
            </div>
          </form>

          {/* User Menu / Auth Buttons */}
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="relative hidden lg:block">
                <button
                  onClick={() => openUserMenu(!userMenu)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary-dark)] hover:bg-opacity-80 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-gold)] to-[var(--light-gold)] flex items-center justify-center">
                    {/* <User className="w-5 h-5 text-[var(--primary-dark)]" /> */}
                  </div>
                  <span className="hidden xl:block">{currentUser.name}</span>
                  {/* <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} /> */}
                </button>

                {userMenu && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-[var(--secondary-dark)] rounded-lg shadow-xl border border-[var(--gray-border)] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--gray-border)]">
                      <div className="font-semibold">{currentUser.name}</div>
                      <div className="text-sm text-[var(--gray-text)]">{currentUser.email}</div>
                      <div className="text-xs text-[var(--primary-gold)] mt-1">
                        Rating: +{currentUser.rating.positive} / -{currentUser.rating.negative}
                      </div>
                    </div>
                    <button
                      onClick={() => { setCurrentPage('watchlist');
                        openUserMenu(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-2"
                    >
                      {/* <Heart className="w-4 h-4" /> */}
                      Watchlist
                    </button>
                    <button
                      onClick={() => { setCurrentPage('bid-history');
                        openUserMenu(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-2"
                    >
                      {/* <Gavel className="w-4 h-4" /> */}
                      Bid History
                    </button>
                    <button
                      onClick={() => { setCurrentPage('profile');
                        openUserMenu(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-2"
                    >
                      {/* <Settings className="w-4 h-4" /> */}
                      Profile Settings
                    </button>
                    {/* {currentUser.role === 'seller' && (
                      <button
                        onClick={() => { setCurrentPage('seller-dashboard');
                          openUserMenu(false); }}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-2 border-t border-[var(--gray-border)]"
                      >
                        <Gavel className="w-4 h-4" />
                        Seller Dashboard
                      </button>
                    )} */}
                    {/* {currentUser.role === 'admin' && (
                      <button
                        onClick={() => { setCurrentPage('admin');
                          openUserMenu(false); }}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-2 border-t border-[var(--gray-border)]"
                      >
                        <Settings className="w-4 h-4" />
                        Admin Panel
                      </button>
                    )} */}
                    <button
                      onClick={() => { onLogout();
                        openUserMenu(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-2 border-t border-[var(--gray-border)] text-[var(--accent-red)]"
                    >
                      {/* <LogOut className="w-4 h-4" /> */}
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage('login')}
                  className="px-4 py-2 rounded-lg border border-[var(--primary-gold)] text-[var(--primary-gold)] hover:bg-[var(--primary-gold)] hover:text-[var(--primary-dark)] transition-all"
                >
                  Login
                </button>
                <button
                  onClick={() => setCurrentPage('register')}
                  className="px-4 py-2 rounded-lg bg-[var(--primary-gold)] text-[var(--primary-dark)] hover:bg-[var(--light-gold)] transition-all"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            {/* <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button> */}
          </div>
        </div>

        {/* Mobile Search */}
        {/* <form onSubmit={handleSearch} className="md:hidden pb-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search auctions..."
              className="w-full px-4 py-2 pl-10 bg-[var(--primary-dark)] border border-[var(--gray-border)] rounded-lg focus:outline-none focus:border-[var(--primary-gold)] transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--gray-text)]" />
          </div>
        </form> */}
      </div>

      {/* Mobile Menu */}
      {/* {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[var(--gray-border)] bg-[var(--secondary-dark)]">
          <div className="px-4 py-2">
            {currentUser ? (
              <div className="space-y-2">
                <div className="px-4 py-3 bg-[var(--primary-dark)] rounded-lg">
                  <div className="font-semibold">{currentUser.name}</div>
                  <div className="text-sm text-[var(--gray-text)]">{currentUser.email}</div>
                </div>
                <button
                  onClick={() => { setCurrentPage('watchlist');
                    setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-[var(--primary-dark)] rounded-lg transition-colors"
                >
                  Watchlist
                </button>
                <button
                  onClick={() => { setCurrentPage('bid-history');
                    setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-[var(--primary-dark)] rounded-lg transition-colors"
                >
                  Bid History
                </button>
                <button
                  onClick={() => { setCurrentPage('profile');
                    setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-[var(--primary-dark)] rounded-lg transition-colors"
                >
                  Profile Settings
                </button>
                {currentUser.role === 'seller' && (
                  <button
                    onClick={() => { setCurrentPage('seller-dashboard');
                      setMobileMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-[var(--primary-dark)] rounded-lg transition-colors"
                  >
                    Seller Dashboard
                  </button>
                )}
                <button
                  onClick={() => { onLogout();
                    setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-[var(--primary-dark)] rounded-lg transition-colors text-[var(--accent-red)]"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => { setCurrentPage('login');
                    setMobileMenuOpen(false); }}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--primary-gold)] text-[var(--primary-gold)] hover:bg-[var(--primary-gold)] hover:text-[var(--primary-dark)] transition-all"
                >
                  Login
                </button>
                <button
                  onClick={() => { setCurrentPage('register');
                    setMobileMenuOpen(false); }}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--primary-gold)] text-[var(--primary-dark)] hover:bg-[var(--light-gold)] transition-all"
                >
                  Register
                </button>
              </div>
            )}

            Mobile Categories
            <div className="mt-4 pt-4 border-t border-[var(--gray-border)]">
              <div className="font-semibold mb-2">Categories</div>
              {categories.map((category) => (
                <details key={category.id} className="mb-2">
                  <summary className="px-4 py-2 hover:bg-[var(--primary-dark)] rounded-lg cursor-pointer list-none">
                    {category.name}
                  </summary>
                  <div className="ml-4 mt-1 space-y-1">
                    {category.subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => { setCurrentPage('listings');
                          setMobileMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--primary-dark)] rounded-lg transition-colors text-[var(--gray-text)]"
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      )} */}
    </header>

    )
}