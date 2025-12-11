import { categories } from "../../data/constants";

export default function CategoryFilter({
  selectedCategories = [],
  onCategoryChange
}) {
  const toggleCategory = (categoryName) => {
    if (selectedCategories.includes(categoryName)) {
      onCategoryChange(selectedCategories.filter(c => c !== categoryName));
    } else {
      onCategoryChange([...selectedCategories, categoryName]);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
        Category
      </h4>
      <div className="space-y-2">
        {categories.map((category) => (
          <label key={category.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCategories.includes(category.name)}
              onChange={() => toggleCategory(category.name)}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              {category.name}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}