import DefaultAuctionCard from './DefaultAuctionCard';
import WonAuctionCard from './WonAuctionCard';
import SoldAuctionCard from './SoldAuctionCard';
import './auction.css';

/**
 * AuctionCard Controller Component
 * Routes to different auction card layouts based on type prop
 * 
 * @param {Object} props - Component props
 * @param {Object} props.product - Product/auction item data containing all information
 * @param {string} props.type - Card variant type: 'default', 'won', 'sold'
 * @param {Function} props.onReview - Callback for review action
 * @param {Function} props.onCancel - Callback for cancel action (sold only)
 * @returns {JSX.Element} Rendered auction card variant
 */
export default function AuctionCard({
  product,
  type = 'default',
  onReview,
  onCancel,
}) {
  switch (type) {
    case 'won':
      return (
        <WonAuctionCard
          product={product}
          onReview={onReview}
        />
      );
    
    case 'sold':
      return (
        <SoldAuctionCard
          product={product}
          onReview={onReview}
          onCancel={onCancel}
        />
      );
    
    case 'default':
    default:
      return (
        <DefaultAuctionCard
          item={product}
        />
      );
  }
}

// Export all variants for direct imports if needed
export { DefaultAuctionCard, WonAuctionCard, SoldAuctionCard };
