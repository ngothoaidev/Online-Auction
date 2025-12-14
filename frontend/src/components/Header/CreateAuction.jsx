import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNav } from "../../hooks/useNavigate";

const API_URL = import.meta.env.VITE_API_URL;

export default function CreateAuction() {
  const nav = useNav();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", price: "", startingBid: "", category: "", imageUrl: "", auctionEndTime: "" });

  const categories = ["Electronics", "Furniture", "Collectibles", "Art", "Fashion", "Sports", "Books", "Jewelry", "Home & Garden", "Toys"];

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ... logic remains identical ...
  };

  const inputStyle = {
    backgroundColor: "var(--input-bg)",
    borderColor: "var(--input-border)",
    color: "var(--text)",
  };

  return (
    <div className="min-h-screen py-12" style={{ backgroundColor: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => nav.back()} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition">
            <ArrowLeft size={24} style={{ color: "var(--text)" }} />
          </button>
          <h1 className="text-4xl font-bold" style={{ color: "var(--text)" }}>Create New Auction</h1>
        </div>

        {/* Form Card */}
        <div className="rounded-xl shadow-xl p-8 border" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
          {/* Messages */}
          {success && <div className="mb-6 bg-green-100 text-green-700 px-4 py-3 rounded-lg border border-green-200">✓ Auction created successfully! Redirecting...</div>}
          {error && <div className="mb-6 bg-red-100 text-red-700 px-4 py-3 rounded-lg border border-red-200">✕ {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Inputs */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>Product Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter product name"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none transition"
                style={inputStyle} disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describe your product..." rows="5"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none transition resize-none"
                style={inputStyle} disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>Category *</label>
              <select name="category" value={formData.category} onChange={handleChange}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none transition"
                style={inputStyle} disabled={loading}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>Reserve Price *</label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="0.00" step="0.01" min="0"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none transition"
                  style={inputStyle} disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>Starting Bid *</label>
                <input type="number" name="startingBid" value={formData.startingBid} onChange={handleChange} placeholder="0.00" step="0.01" min="0"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none transition"
                  style={inputStyle} disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>Image URL</label>
              <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://..."
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none transition"
                style={inputStyle} disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>Auction End Time *</label>
              <input type="datetime-local" name="auctionEndTime" value={formData.auctionEndTime} onChange={handleChange}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none transition"
                style={inputStyle} disabled={loading}
              />
            </div>

            <div className="flex gap-4 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
              <button type="submit" disabled={loading}
                className="flex-1 font-bold py-3 px-6 rounded-lg transition hover:brightness-110 shadow-lg"
                style={{ backgroundColor: "var(--accent)", color: "#1A1205" }}
              >
                {loading ? "Creating..." : "Create Auction"}
              </button>
              <button type="button" onClick={() => nav.back()} disabled={loading}
                className="flex-1 border rounded-lg font-semibold py-3 px-6 transition hover:bg-[var(--bg-hover)]"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 p-6 rounded-lg border" style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-subtle)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>📝 Tips for Success</h3>
          <ul className="space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <li>✓ Use a clear, descriptive title</li>
            <li>✓ Include detailed information</li>
            <li>✓ Set a competitive starting bid</li>
          </ul>
        </div>
      </div>
    </div>
  );
}