import { useState, useRef, useEffect } from "react";
import { ChevronDown, Filter, X, Check } from "lucide-react";
import { categories } from "../../data/constants";

export default function FilterBar() {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const barRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (barRef.current && !barRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const FilterButton = ({ label, isActive, name }) => (
    <button
      onClick={() => toggleDropdown(name)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium ${
        isActive || activeDropdown === name ? "filter-btn-active" : "filter-btn-default"
      }`}
    >
      {label}
      <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === name ? "rotate-180" : ""}`} />
    </button>
  );

  return (
    <div ref={barRef} className="sticky top-24 z-30 mb-8 transition-all duration-300">
      
      {/* THEME: Glassmorphism Container */}
      <div className="filter-bar-glass rounded-2xl p-3">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {/* LEFT: Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 mr-2" style={{ color: 'var(--text-muted)' }}>
                <Filter size={18} />
                <span className="text-sm font-semibold uppercase tracking-wide">Filter</span>
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <FilterButton 
                name="category" 
                label={selectedCategory === "All" ? "Category" : selectedCategory} 
                isActive={selectedCategory !== "All"}
              />
              {activeDropdown === "category" && (
                <div className="filter-dropdown-panel absolute top-full mt-2 left-0 w-64 rounded-xl p-2 z-40 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                  <button onClick={() => { setSelectedCategory("All"); setActiveDropdown(null); }}
                     className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-hover)] transition-colors font-medium">
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <div key={cat.id}>
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase mt-1" style={{ color: 'var(--text-subtle)' }}>
                        {cat.name}
                      </div>
                      {cat.subcategories?.map((sub) => (
                        <button key={sub.id} onClick={() => { setSelectedCategory(sub.name); setActiveDropdown(null); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-hover)] flex justify-between items-center group transition-colors"
                        >
                          {sub.name}
                          {selectedCategory === sub.name && <Check size={14} style={{ color: 'var(--accent)' }} />}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price Dropdown */}
            <div className="relative">
              <FilterButton 
                name="price" 
                label={priceRange.min || priceRange.max ? `Price: ${priceRange.min} - ${priceRange.max}` : "Price"} 
                isActive={priceRange.min || priceRange.max}
              />
              {activeDropdown === "price" && (
                <div className="filter-dropdown-panel absolute top-full mt-2 left-0 w-72 rounded-xl p-4 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <h4 className="text-sm font-bold mb-3">Price Range (VND)</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <input type="number" placeholder="Min" value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]"
                      style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                    <input type="number" placeholder="Max" value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]"
                      style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setPriceRange({min:'', max:''}); setActiveDropdown(null); }}
                        className="flex-1 py-2 text-xs font-medium border rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                        Reset
                    </button>
                    <button onClick={() => setActiveDropdown(null)}
                        className="flex-1 py-2 text-xs font-bold rounded-lg hover:brightness-110 transition-colors shadow-md"
                        style={{ backgroundColor: 'var(--accent)', color: '#1A1205' }}>
                        Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
            
             {/* Quick Toggles */}
             <div className="hidden sm:flex rounded-full p-1 border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                 {['Active', 'Ending Soon', 'New'].map((status) => (
                     <button key={status} className="px-3 py-1.5 text-xs font-medium rounded-full transition-all hover:bg-[var(--bg-soft)] hover:shadow-sm"
                        style={{ color: 'var(--text-muted)' }}>
                        {status}
                     </button>
                 ))}
            </div>
          </div>

          {/* RIGHT: Sort */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
             <div className="flex items-center gap-2">
                 <span className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Sort by:</span>
                 <select className="bg-transparent text-sm font-medium outline-none cursor-pointer p-1" style={{ color: 'var(--text)' }}>
                    <option>Recommended</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                    <option>Time: Ending Soon</option>
                 </select>
             </div>
          </div>
        </div>

        {/* Active Filters Tag Row */}
        {(selectedCategory !== "All" || priceRange.min) && (
            <div className="flex gap-2 mt-3 pt-3 border-t animate-in fade-in slide-in-from-top-1" style={{ borderColor: 'var(--border)' }}>
                {selectedCategory !== "All" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
                        {selectedCategory}
                        <X size={12} className="cursor-pointer hover:scale-110" onClick={() => setSelectedCategory("All")} />
                    </span>
                )}
                 {priceRange.min && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
                        &gt; {priceRange.min}
                        <X size={12} className="cursor-pointer hover:scale-110" onClick={() => setPriceRange({...priceRange, min: ''})} />
                    </span>
                )}
                 <button onClick={() => { setSelectedCategory("All"); setPriceRange({min:'', max:''}) }}
                    className="text-xs underline ml-auto hover:text-[var(--danger)] transition-colors" style={{ color: 'var(--text-muted)' }}>
                    Clear all
                 </button>
            </div>
        )}
      </div>
    </div>
  );
}