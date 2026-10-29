/** Builds /search links with proper encoding (names with spaces, accents or & are safe). Empty values are omitted. */
export function searchUrl({ q, category, sortBy }: { q?: string; category?: string; sortBy?: string } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (sortBy) params.set('sortBy', sortBy);
  const qs = params.toString();
  return qs ? `/search?${qs}` : '/search';
}

/** Home tab id -> the sort the /search endpoint understands ("View All" must land on the same ordering). */
export const TAB_SEARCH_SORT: Record<string, string> = {
  endingSoon: 'timeEndingSoon',
  mostBids: 'popularity',
  highestPrice: 'priceHighToLow',
};
