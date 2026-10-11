import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';
import { searchUrl } from '../../utils/searchUrl.js';

export default function CategoryDropper({ categories }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSub, setActiveSub] = useState(null); // Track active sub-category by ID
  const containerRef = useRef(null);
  const timeoutRef = useRef(null); // To handle smooth close delays

  // --- HANDLERS ---

  // Toggle Main Dropdown
  const toggleOpen = () => setIsOpen((prev) => !prev);

  // Hover Handlers (Desktop) with delay to prevent flickering
  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setActiveSub(null); // Reset sub-menus on close
    }, 200); // 200ms delay for smoother UX
  };

  // Sub-menu interaction
  const handleSubEnter = (id) => {
    if (window.matchMedia('(hover: hover)').matches) {
       setActiveSub(id);
    }
  };

  // Toggle sub-menu on click (for Touch)
  const toggleSub = (e, id) => {
    e.preventDefault(); // Prevent Link navigation if clicking the arrow area
    e.stopPropagation();
    setActiveSub(activeSub === id ? null : id);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveSub(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative h-full hidden lg:flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* TRIGGER BUTTON */}
      <button 
        onClick={toggleOpen}
        className={`flex items-center gap-2 py-2 px-3 rounded-lg font-medium text-sm tracking-wide transition-all duration-200 
        ${isOpen ? 'bg-(--header-hover) text-(--text)' : 'text-(--header-text) hover:bg-(--header-hover) hover:text-(--text)'}`}
      >
        <LayoutGrid 
          size={18} 
          className={`transition-colors ${isOpen ? 'text-(--accent) opacity-100' : 'opacity-70 group-hover:opacity-100'}`} 
        />
        <span>Categories</span>
        <ChevronDown 
          size={14} 
          className={`transition-transform duration-300 opacity-50 ${isOpen ? '-rotate-180 opacity-100' : ''}`} 
        />
      </button>

      {/* INVISIBLE BRIDGE (Keeps menu open when moving mouse from button to panel) */}
      {isOpen && <div className="absolute top-full left-0 w-full h-4 bg-transparent"></div>}

      {/* DROPDOWN PANEL */}
      <div 
        className={`absolute top-[calc(100%+0.75rem)] left-0 w-64 rounded-xl shadow-2xl border flex flex-col py-2 backdrop-blur-xl z-50 overflow-visible
        bg-(--card-bg) border-(--border) shadow-(--card-shadow) transition-all duration-200 origin-top-left
        ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 pointer-events-none'}`}
      >
        {/* Decorative Arrow */}
        <div className="absolute -top-1.5 left-8 w-3 h-3 rotate-45 border-l border-t bg-(--card-bg) border-(--border)"></div>

        {categories.map((cat) => {
           const isSubOpen = activeSub === cat.id;

           return (
            <div 
                className="relative px-2" 
                key={cat.id}
                onMouseEnter={() => handleSubEnter(cat.id)}
            >
              
              {/* MAIN CATEGORY ITEM */}
              <div className="flex items-center justify-between group/item">
                  <Link 
                    to={searchUrl({ category: cat.name })}
                    onClick={() => setIsOpen(false)} // Close menu on navigation
                    className={`grow flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${isSubOpen ? 'bg-(--accent-soft) text-(--accent-strong)' : 'text-(--text) hover:bg-(--accent-soft) hover:text-(--accent-strong)'}`}
                  >
                      {cat.name}
                  </Link>

                  {/* TOUCH-FRIENDLY SUBMENU TOGGLE (The Arrow) */}
                  {cat.subcategories?.length > 0 && (
                    <button
                        onClick={(e) => toggleSub(e, cat.id)}
                        className={`p-2 ml-1 rounded-md transition-all hover:bg-(--bg-hover)
                        ${isSubOpen ? 'text-(--accent) opacity-100' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <ChevronRight size={14} className={`transition-transform ${isSubOpen ? 'rotate-90' : ''}`} />
                    </button>
                  )}
              </div>
              
              {/* SUBCATEGORIES FLYOUT */}
              {/* Desktop: Shows to the right (absolute)
                 Mobile/Constraint: If screen is small, this might need to be an accordion. 
                 Currently keeping Flyout style but controllable via click.
              */}
              {cat.subcategories?.length > 0 && (
                <div 
                    className={`absolute left-[calc(100%-0.5rem)] top-0 w-64 pl-4 pt-1 z-50 transition-all duration-200
                    ${isSubOpen ? 'opacity-100 visible translate-x-0' : 'opacity-0 invisible -translate-x-2 pointer-events-none'}`}
                >
                  <div className="shadow-xl rounded-xl border p-2 overflow-hidden bg-(--card-bg) border-(--border)">
                    
                    <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider mb-1 text-(--text-subtle)">
                      {cat.name} Collection
                    </div>
                    
                    {cat.subcategories.map((sub, sIdx) => (
                      <Link 
                        key={sIdx} 
                        to={searchUrl({ category: sub.name })}
                        onClick={() => setIsOpen(false)}
                        className="block px-4 py-2.5 rounded-lg text-sm transition-all duration-100
                        text-(--text-muted)
                        hover:bg-(--bg-hover) 
                        hover:text-(--accent) 
                        hover:pl-5" 
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}