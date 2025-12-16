import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';
import { categories } from '../../data/constants';

export default function CategoryDropper() {
  return (
    <div className="relative group h-full flex items-center">
      {/* TRIGGER BUTTON */}
      <button 
        className="flex items-center gap-2 py-2 px-3 rounded-lg font-medium text-sm tracking-wide transition-all duration-200 
        text-[var(--header-text)] 
        hover:bg-[var(--header-hover)] 
        group-hover:text-[var(--text)]"
      >
        <LayoutGrid size={18} className="opacity-70 group-hover:opacity-100 group-hover:text-[var(--accent)] transition-colors" />
        <span>Categories</span>
        <ChevronDown 
          size={14} 
          className="transition-transform duration-300 group-hover:-rotate-180 opacity-50 group-hover:opacity-100" 
        />
      </button>

      {/* INVISIBLE BRIDGE */}
      <div className="absolute top-full left-0 w-full h-4 bg-transparent"></div>

      {/* DROPDOWN PANEL */}
      <div 
        className="absolute top-[calc(100%+0.5rem)] left-0 w-64 rounded-xl shadow-2xl border opacity-0 invisible 
        group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 
        flex flex-col py-2 backdrop-blur-xl z-50 overflow-visible
        bg-[var(--card-bg)] border-[var(--border)] shadow-[var(--card-shadow)]"
      >
        {/* Decorative Arrow */}
        <div className="absolute -top-1.5 left-8 w-3 h-3 rotate-45 border-l border-t bg-[var(--card-bg)] border-[var(--border)]"></div>

        {categories.map((cat) => (
          <div className="group/item relative px-2" key={cat.id}>
            
            {/* MAIN CATEGORY LINK 
                Refactored: Removed onMouseEnter/Leave, added hover: classes
            */}
            <Link 
              to={`/search?category=${cat.name}`}
              className="flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
              text-[var(--text)]
              hover:bg-[var(--accent-soft)] 
              hover:text-[var(--accent-strong)]"
            >
                <div className="flex items-center gap-3">
                    <span>{cat.name}</span>
                </div>
                {cat.subcategories?.length > 0 && (
                  <ChevronRight size={14} className="opacity-40 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" />
                )}
            </Link>
            
            {/* SUBCATEGORIES FLYOUT */}
            {cat.subcategories?.length > 0 && (
              <div className="hidden group-hover/item:block absolute left-[calc(100%-0.5rem)] top-0 w-64 pl-4 pt-1 z-50">
                <div className="shadow-xl rounded-xl border p-2 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200
                     bg-[var(--card-bg)] border-[var(--border)]">
                  
                  <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider mb-1 text-[var(--text-subtle)]">
                    {cat.name} Collection
                  </div>
                  
                  {cat.subcategories.map((sub, sIdx) => (
                    <Link 
                      key={sIdx} 
                      to={`/search?category=${cat.name}&subcategory=${sub.name}`}
                      className="block px-4 py-2.5 rounded-lg text-sm transition-all duration-100
                      text-[var(--text-muted)]
                      hover:bg-[var(--bg-hover)] 
                      hover:text-[var(--accent)] 
                      hover:pl-5" 
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}