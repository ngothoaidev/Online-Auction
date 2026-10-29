// Shared props of the search filter bar and its dropdowns.
export type PriceRange = { min: string | number; max: string | number };

export type DropdownControl = {
  activeDropdown: string | null;
  toggleDropdown: (name: string) => void;
  setActiveDropdown: (name: string | null) => void;
};
