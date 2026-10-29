import React, { useState, useEffect } from "react";
import { useFeedback } from '../../ui/Feedback';
import FilterButton from "../FilterButton";
import { Minus, Plus } from "lucide-react";
import type { DropdownControl, PriceRange } from "../types";

export default function PriceDropdown({ priceRange, setPriceRange, activeDropdown, toggleDropdown, setActiveDropdown }: DropdownControl & {
    priceRange: PriceRange; setPriceRange: (r: PriceRange) => void;
}){
  const { notify } = useFeedback();
    const isActive = activeDropdown === 'price';
    
    // Local state for deferred updates (Only apply on button click)
    const [localMin, setLocalMin] = useState<string | number>(priceRange.min || "");
    const [localMax, setLocalMax] = useState<string | number>(priceRange.max || "");

    // Sync local state when dropdown opens
    useEffect(() => {
        if (isActive) {
            setLocalMin(priceRange.min || "");
            setLocalMax(priceRange.max || "");
        }
    }, [isActive, priceRange]);

    // Slider Constants
    const SLIDER_MIN = 0;
    const SLIDER_MAX = 5000000; // Example Max: 5 Million VND (Adjust as needed)
    const SLIDER_STEP = 50000;
    
    const handleApply = () => {
        if (localMin && Number(localMin) < 0) return notify("Price cannot be negative.", 'error');
        if (localMax && Number(localMax) < 0) return notify("Price cannot be negative.", 'error');
        if (localMin && localMax && Number(localMin) > Number(localMax)) {
            return notify("Minimum price cannot be greater than maximum price.", 'error');
        }
        
        // Update Parent State
        setPriceRange({ min: localMin, max: localMax });
        setActiveDropdown(null);
    };

    const handleReset = () => {
        setLocalMin("");
        setLocalMax("");
        setPriceRange({ min: "", max: "" });
        setActiveDropdown(null);
    };

    // Helper to update via buttons
    const adjustVal = (setter: (v: number) => void, val: string | number, delta: number) => {
        const current = val === "" ? 0 : Number(val);
        const next = Math.max(0, current + delta);
        setter(next);
    };

    // Calculate percentages for slider track background
    const getPercent = (value: number) => Math.round(((value || 0) - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN) * 100);
    const minPercent = getPercent(Number(localMin) || 0);
    const maxPercent = getPercent(Number(localMax) || SLIDER_MAX);

    return (
        <div className="relative">
            <FilterButton 
                name="price" 
                label={priceRange.min || priceRange.max ? `Price: ${priceRange.min} - ${priceRange.max || 'Any'}` : "Price"} 
                toggleDropdown={toggleDropdown}
                activeDropdown={activeDropdown}
            />
            {isActive && (
            <div className="filter-dropdown-panel absolute top-full mt-2 left-0 w-72 rounded-xl p-4 z-40 animate-in fade-in zoom-in-95 duration-100">
                <h4 className="text-sm font-bold mb-3">Price (VND)</h4>
                
                {/* --- MANUAL INPUTS --- */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--text-subtle)]">Min</label>
                        <div className="price-input-group flex items-center bg-[var(--input-bg)] rounded-lg border border-[var(--border)] px-1">
                            <button onClick={() => adjustVal(setLocalMin, localMin, -10000)} className="p-1 hover:text-[var(--accent)]"><Minus size={12}/></button>
                            <input 
                                type="number" 
                                value={localMin} 
                                onChange={(e) => setLocalMin(e.target.value)}
                                className="w-full bg-transparent text-center text-xs font-semibold p-1 outline-none"
                                placeholder="0"
                            />
                            <button onClick={() => adjustVal(setLocalMin, localMin, 10000)} className="p-1 hover:text-[var(--accent)]"><Plus size={12}/></button>
                        </div>
                    </div>

                    <div className="pt-4 text-[var(--text-muted)]">-</div>

                    <div className="flex-1 space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--text-subtle)]">Max</label>
                        <div className="price-input-group flex items-center bg-[var(--input-bg)] rounded-lg border border-[var(--border)] px-1">
                            <button onClick={() => adjustVal(setLocalMax, localMax, -10000)} className="p-1 hover:text-[var(--accent)]"><Minus size={12}/></button>
                            <input 
                                type="number" 
                                value={localMax} 
                                onChange={(e) => setLocalMax(e.target.value)}
                                className="w-full bg-transparent text-center text-xs font-semibold p-1 outline-none"
                                placeholder="Any"
                            />
                            <button onClick={() => adjustVal(setLocalMax, localMax, 10000)} className="p-1 hover:text-[var(--accent)]"><Plus size={12}/></button>
                        </div>
                    </div>
                </div>

                {/* --- DUAL RANGE SLIDER --- */}
                <div className="relative h-6 w-full mb-2">
                    {/* Track Background */}
                    <div className="absolute top-1/2 left-0 w-full h-1.5 rounded-full bg-[var(--border)] -translate-y-1/2 overflow-hidden">
                            {/* Active Range (Gold) */}
                            <div 
                            className="absolute h-full bg-[var(--accent)]"
                            style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
                            />
                    </div>

                    {/* Invisible Range Inputs */}
                    <input 
                        type="range"
                        min={SLIDER_MIN} max={SLIDER_MAX} step={SLIDER_STEP}
                        value={Number(localMin) || 0}
                        onChange={(e) => {
                            const val = Math.min(Number(e.target.value), (Number(localMax) || SLIDER_MAX) - SLIDER_STEP);
                            setLocalMin(val);
                        }}
                        className="absolute top-0 left-0 w-full h-full appearance-none pointer-events-none bg-transparent z-10 
                                    [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--accent)] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                        <input 
                        type="range"
                        min={SLIDER_MIN} max={SLIDER_MAX} step={SLIDER_STEP}
                        value={Number(localMax) || SLIDER_MAX}
                        onChange={(e) => {
                            const val = Math.max(Number(e.target.value), (Number(localMin) || 0) + SLIDER_STEP);
                            setLocalMax(val);
                        }}
                        className="absolute top-0 left-0 w-full h-full appearance-none pointer-events-none bg-transparent z-20 
                                    [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--accent)] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                </div>

                <div className="flex gap-2">
                    <button onClick={() => { setPriceRange({min:'', max:''}); setActiveDropdown(null); }}
                        className="flex-1 py-2 text-xs font-medium border rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                        Reset
                    </button>
                    <button onClick={handleApply}
                        className="flex-1 py-2 text-xs font-bold rounded-lg hover:brightness-110 transition-colors shadow-md"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--on-ink)' }}>
                        Apply
                    </button>
                </div>
            </div>
            )}
        </div>
    )
}