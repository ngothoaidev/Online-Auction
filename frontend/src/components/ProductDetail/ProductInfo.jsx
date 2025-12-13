import { formatCurrency } from '../../utils/format.js';

export default function ProductInfo({ product }) {
  if (!product) return null;

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="rounded-2xl p-6 border" style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>Description</h3>
        <div 
          className="prose prose-sm max-w-none"
          style={{ color: 'var(--text-muted)' }}
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      </div>

      {/* Additional Information */}
      <div className="rounded-2xl p-6 border" style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>Additional Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Category:</span>
            <span style={{ color: 'var(--text)' }} className="font-medium">{product.category}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Subcategory:</span>
            <span style={{ color: 'var(--text)' }} className="font-medium">{product.subcategory}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Starting Price:</span>
            <span style={{ color: 'var(--text)' }} className="font-medium">{formatCurrency(product.startingPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Total Bids:</span>
            <span style={{ color: 'var(--text)' }} className="font-medium">{product.totalBids || product.bidCount || 0}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Seller:</span>
            <span style={{ color: 'var(--text)' }} className="font-medium">{product.sellerName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
