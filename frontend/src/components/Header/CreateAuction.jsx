import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from ".";
import Footer from "../Footer";

const API_URL = import.meta.env.VITE_API_URL;

export default function CreateAuction() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    startingBid: "",
    category: "",
    imageUrl: "",
    auctionEndTime: "",
  });

  const categories = [
    "Electronics",
    "Furniture",
    "Collectibles",
    "Art",
    "Fashion",
    "Sports",
    "Books",
    "Jewelry",
    "Home & Garden",
    "Toys",
  ];

  // Mock user ID - Replace with actual user from context/auth
  const userId = 1;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.name.trim()) {
      setError("Product name is required");
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError("Price must be greater than 0");
      return;
    }
    if (!formData.startingBid || parseFloat(formData.startingBid) <= 0) {
      setError("Starting bid must be greater than 0");
      return;
    }
    if (parseFloat(formData.startingBid) > parseFloat(formData.price)) {
      setError("Starting bid cannot be greater than price");
      return;
    }
    if (!formData.category) {
      setError("Category is required");
      return;
    }
    if (!formData.auctionEndTime) {
      setError("Auction end time is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          startingBid: parseFloat(formData.startingBid),
          currentBid: parseFloat(formData.startingBid),
          sellerId: userId,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create auction");
      }

      const data = await response.json();
      setSuccess(true);
      setFormData({
        name: "",
        description: "",
        price: "",
        startingBid: "",
        category: "",
        imageUrl: "",
        auctionEndTime: "",
      });

      // Redirect to product detail or profile after 2 seconds
      setTimeout(() => {
        navigate(`/product/${data.data.id}`);
      }, 2000);
    } catch (err) {
      setError(err.message || "An error occurred while creating the auction");
      console.error("Error creating auction:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <div className="min-h-screen py-12" style={{ backgroundColor: "var(--bg)" }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <ArrowLeft size={24} style={{ color: "var(--text)" }} />
            </button>
            <h1 className="text-4xl font-bold" style={{ color: "var(--text)" }}>
              Create New Auction
            </h1>
          </div>

          {/* Form Card */}
          <div
            className="rounded-lg shadow-lg p-8"
            style={{ backgroundColor: "var(--bg-soft)" }}
          >
            {/* Success Message */}
            {success && (
              <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
                ✓ Auction created successfully! Redirecting...
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                ✕ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text)" }}
                >
                  Product Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter product name"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                  disabled={loading}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text)" }}
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your product..."
                  rows="5"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                  disabled={loading}
                />
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text)" }}
                >
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                  disabled={loading}
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price and Starting Bid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text)" }}
                  >
                    Reserve Price *
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    style={{
                      backgroundColor: "var(--bg)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label
                    htmlFor="startingBid"
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text)" }}
                  >
                    Starting Bid *
                  </label>
                  <input
                    type="number"
                    id="startingBid"
                    name="startingBid"
                    value={formData.startingBid}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    style={{
                      backgroundColor: "var(--bg)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label
                  htmlFor="imageUrl"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text)" }}
                >
                  Image URL
                </label>
                <input
                  type="url"
                  id="imageUrl"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                  disabled={loading}
                />
                {formData.imageUrl && (
                  <div className="mt-3">
                    <p
                      className="text-sm font-medium mb-2"
                      style={{ color: "var(--text)" }}
                    >
                      Preview:
                    </p>
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="max-w-xs h-auto rounded-lg object-cover"
                      onError={(e) => {
                        e.target.src =
                          "https://via.placeholder.com/300x300?text=Image+Error";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Auction End Time */}
              <div>
                <label
                  htmlFor="auctionEndTime"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text)" }}
                >
                  Auction End Time *
                </label>
                <input
                  type="datetime-local"
                  id="auctionEndTime"
                  name="auctionEndTime"
                  value={formData.auctionEndTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                  disabled={loading}
                />
                <p
                  className="text-xs mt-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Select when the auction should end
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  {loading ? "Creating Auction..." : "Create Auction"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                  className="flex-1 border rounded-lg font-semibold py-3 px-6 transition"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Info Section */}
          <div
            className="mt-8 p-6 rounded-lg"
            style={{ backgroundColor: "var(--bg-soft)" }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>
              📝 Tips for Creating a Successful Auction
            </h3>
            <ul className="space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>✓ Use a clear, descriptive title for your product</li>
              <li>✓ Include detailed information in the description</li>
              <li>✓ Set a competitive starting bid to attract bidders</li>
              <li>✓ Choose an appropriate reserve price</li>
              <li>✓ Use a high-quality product image for better engagement</li>
              <li>✓ Set a reasonable auction end time (typically 3-7 days)</li>
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
