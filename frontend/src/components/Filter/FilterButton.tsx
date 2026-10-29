import {ChevronDown} from "lucide-react";
import React from "react";

export default function FilterButton({ label, name, toggleDropdown, activeDropdown }){
  return (
    <button
      onClick={() => toggleDropdown(name)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium ${
        activeDropdown === name ? "filter-btn-active" : "filter-btn-default"
      }`}
    >
      {label}
      <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === name ? "rotate-180" : ""}`} />
    </button>
  );
}