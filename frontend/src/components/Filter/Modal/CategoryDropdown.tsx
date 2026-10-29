import { Layers, Check } from "lucide-react";
import FilterButton from "../FilterButton";
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';


export default function CategoryDropdown({ selectedCategory, setSelectedCategory, activeDropdown, toggleDropdown, setActiveDropdown}) {
    const [categories, setCategories] = useState([]);
    useEffect(() => {
        fetch(`${API_URL}/categories`)
            .then(response => response.json())
            .then(data => {
                console.log("Fetched categories:", data);
                setCategories(data);
            })
            .catch(error => {
                console.error("Error fetching categories:", error);
            });
    }, []);
    
    return (
        <div className="relative">
            <FilterButton 
                name="category" 
                label={!selectedCategory ? "Category" : selectedCategory} 
                toggleDropdown={toggleDropdown}
                activeDropdown={activeDropdown}
            />
        {activeDropdown === "category" && (
            <div className="filter-dropdown-panel absolute top-full mt-2 left-0 w-64 rounded-xl p-2 z-40 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                <button 
                    onClick={() => { setSelectedCategory(null); setActiveDropdown(null); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${!selectedCategory ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'hover:bg-[var(--bg-hover)]'}`}>
                        <Layers size={16} />
                        <span>All Categories</span>
                        {!selectedCategory && <Check size={16} className="ml-auto" />}
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
                    </button>))}
                </div>))}
            </div>
        )}
    </div>
    )
}