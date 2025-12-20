import AuctionCard from './AuctionCard';

export default function ProductGrid({ 
  items = [], 
  cardVariant = "default", 
  emptyState, 
  columns = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
}) {

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl border-2 border-dashed" style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
        {emptyState ? (
            emptyState
        ) : (
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>No Items Found</h3>
        )}
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${columns}`}>
      {items.map((item) => (
        <div key={item.id} className="flex justify-center w-full">
            <AuctionCard product={item} variant={cardVariant} />
        </div>
      ))}
    </div>
  );
}