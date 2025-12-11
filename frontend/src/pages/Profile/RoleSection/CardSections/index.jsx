// import DefaultAuctionCard from './DefaultAuctionCard';
// import WonAuctionCard from './WonAuctionCard';
// import SoldAuctionCard from './SoldAuctionCard';

// Component Exports
import ActiveBidsSection from "./ActiveBidsSection";
import ActiveListingSection from "./ActiveListingSection";
import FavoriteSection from "./FavoriteSection";
import SoldItemSection from "./SoldItemSection";
import WonSection from "./WonSection";


/**
 * Section Controller Component
 * Routes to different profile card sections based on type prop
 * 
 * @param {Object} props - Component props
 * @param {string} props.type - Section variant type: 'activeListings', 'activeBids', 'won', 'favorites', 'soldItems'
 * @returns {JSX.Element} Rendered profile card section variant
 */

export default function CardSection({
    products,
    formatTime,
    setReviewModal,
    handleCancelTransaction,
    type,
}) {
    // Get only 2 items for preview
    products = products.slice(0, 2);
    switch (type) {
        case 'activeListings':
            return <ActiveListingSection products={products} formatTime={formatTime} />;
        case 'activeBids':
            return <ActiveBidsSection products={products} formatTime={formatTime} />;
        case 'wonItems':
            return <WonSection products={products} formatTime={formatTime} setReviewModal={setReviewModal} />;
        case 'favorites':
            return <FavoriteSection products={products} formatTime={formatTime} />;
        case 'soldItems':
            return <SoldItemSection products={products} setReviewModal={setReviewModal} handleCancelTransaction={handleCancelTransaction} />;
        default:
            return null;
    }
}

export {
    ActiveBidsSection,
    ActiveListingSection,
    FavoriteSection,
    SoldItemSection,
    WonSection,
};