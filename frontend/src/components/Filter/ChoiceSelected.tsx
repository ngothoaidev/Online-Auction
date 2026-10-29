import { X } from "lucide-react";
export default function ChoiceSelected({ selectedCategory, setSelectedCategory, priceRange, setPriceRange, orderBy, setOrderBy }) {
    return (
        <div className="flex gap-2 mt-3 pt-3 border-t animate-in fade-in slide-in-from-top-1 border-(--border)">
            {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-(--accent-strong) bg-(--accent-soft)">
                    {selectedCategory}
                    <X size={12} className="cursor-pointer hover:scale-110" onClick={() => setSelectedCategory(null)} />
                </span>
            )}
            {priceRange.min && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-(--accent-strong) bg-(--accent-soft)">
                    &gt; {priceRange.min}
                    <X size={12} className="cursor-pointer hover:scale-110" onClick={() => setPriceRange({...priceRange, min: ''})} />
                </span>
            )}
            {priceRange.max && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-(--accent-strong) font-medium bg-(--accent-soft)">
                    &lt; {priceRange.max}
                    <X size={12} className="cursor-pointer hover:scale-110" onClick={() => setPriceRange({...priceRange, max: ''})} />
                </span>
            )}
            {orderBy !== "default" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-(--accent-strong) font-medium bg-(--accent-soft)">
                    {orderBy === "popularity" ? "Popularity" : orderBy === "priceLowToHigh" ? "Price: Low to High" : orderBy === "priceHighToLow" ? "Price: High to Low" : orderBy === "timeEndingSoon" ? "Time: Ending Soon" : orderBy === "timeNewlyListed" ? "Time: Newly Listed" : orderBy === "aToZ" ? "A-Z" : orderBy === "zToA" ? "Z-A" : ""} 
                    <X size={12} className="cursor-pointer hover:scale-110" onClick={() => setOrderBy("default")} />
                </span>
            )}
            <button onClick={() => { setSelectedCategory(null); setPriceRange({min:'', max:''}); setOrderBy("default"); }}
                className="text-xs text-(--text-muted) underline ml-auto hover:text-(--danger) transition-colors">
                Clear all
            </button>
        </div>
    );
}