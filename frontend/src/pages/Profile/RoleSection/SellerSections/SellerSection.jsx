import CardSection from "../CardSections";

export default function SellerSection({userData, formatTime, setReviewModal, handleCancelTransaction}) {
    return (
        <div className="space-y-8">
            {/* Active Listings */}
            {userData.activeListings.length > 0 && (
            <CardSection type="activeListings" products={userData.activeListings} formatTime={formatTime} />
            )}

            {/* Sold Items */}
            {userData.soldItems.length > 0 && (
            <CardSection type="soldItems" products={userData.soldItems} setReviewModal={setReviewModal} handleCancelTransaction={handleCancelTransaction} />
            )} 
        </div>
    );
}