import { ArrowUpDown } from "lucide-react";

export default function SortSelection({orderBy, setOrderBy}){
    return (
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 mr-2" style={{ color: 'var(--text-muted)' }}>
                    <ArrowUpDown size={16} />
                    <span className="text-xs uppercase font-bold order-list">Sort by:</span>
                </div>
                <select value={orderBy} className='bg-transparent text-sm font-medium text-[var(--text)] outline-none cursor-pointer p-1' onChange={(e) => setOrderBy(e.target.value)}>
                    <option value="default" disabled>-- Select --</option>
                    <option value="popularity">Popularity</option>
                    <option value="priceLowToHigh">Price: Low to High</option>
                    <option value="priceHighToLow">Price: High to Low</option>
                    <option value="timeEndingSoon">Time: Ending Soon</option>
                    <option value="timeNewlyListed">Time: Newly Listed</option>
                    <option value="aToZ">A-Z</option>
                    <option value="zToA">Z-A</option>
                </select>
            </div>
        </div>
    )
}