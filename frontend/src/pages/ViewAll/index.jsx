// Component Exports
import ViewAllActiveBid from "./ViewAllActiveBid";
import ViewAllActiveListing from "./ViewAllActiveListings";
import ViewAllFavoriteProducts from "./ViewAllFavoriteProducts";
import ViewAllSoldItems from "./ViewAllSoldItems";
import ViewAllWonItems from "./ViewAllWonItems";
import ViewAllReviews from "./ViewAllReviews";

import { useParams } from "react-router-dom";
/**
 * Section Controller Component
 * Routes to different profile card sections based on type prop
 * 
 * @param {Object} props - Component props
 * @param {string} props.type - Section variant type: 'activeListings', 'activeBids', 'won', 'favorites', 'soldItems'
 * @returns {JSX.Element} Rendered profile card section variant
 */

export default function ViewAll() {
    const { type } = useParams();
    switch (type) {
        case 'active-listings':
            return <ViewAllActiveListing />;
        case 'active-bids':
            return <ViewAllActiveBid />;
        case 'favorites-products':
            return <ViewAllFavoriteProducts/>;
        case 'won-auctions':
            return <ViewAllWonItems />;
        case 'sold-items':
            return <ViewAllSoldItems />;
        case 'reviews':
            return <ViewAllReviews />;
        default:
            return null;
    }
}

export {
    ViewAllActiveBid,
    ViewAllActiveListing,
    ViewAllFavoriteProducts,
    ViewAllSoldItems,
    ViewAllWonItems,
    ViewAllReviews,
};