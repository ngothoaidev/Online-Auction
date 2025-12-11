import ViewAllActiveBidFilterSection from "./ViewAllActiveBidFIlterSection";
import ViewAllActiveListingFilterSection from "./ViewAllActiveListingFilterSection";
import ViewAllSoldItemFilterSection from "./ViewAllSoldItemFilterSection";
import ViewAllWonItemFilterSection from "./ViewAllWonItemFilterSection";
import ViewAllFavoriteProductFilterSection from "./ViewAllFavoriteProductFilterSection";
import ViewAllProductFilterSection from "./ViewAllProductFilterSection";


export default function FilterSection({type, onFilterChange}){
    switch(type)
    {
        case "activeBid":
            return <ViewAllActiveBidFilterSection onFilterChange={onFilterChange} />;
        case "activeListing":
            return <ViewAllActiveListingFilterSection onFilterChange={onFilterChange} />;
        case "soldItem":
            return <ViewAllSoldItemFilterSection onFilterChange={onFilterChange} />;
        case "wonItem":
            return <ViewAllWonItemFilterSection onFilterChange={onFilterChange} />;
        case "favoriteProduct":
            return <ViewAllFavoriteProductFilterSection onFilterChange={onFilterChange} />;
        case "product":
            return <ViewAllProductFilterSection onFilterChange={onFilterChange} />;
        default:
            return null;
    }
}

export {
    ViewAllActiveBidFilterSection,
    ViewAllActiveListingFilterSection,
    ViewAllSoldItemFilterSection,
    ViewAllWonItemFilterSection,
    ViewAllFavoriteProductFilterSection,
    ViewAllProductFilterSection
};