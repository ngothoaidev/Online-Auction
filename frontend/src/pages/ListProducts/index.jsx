import {useState} from "react";
import { House, ChevronLeft, ChevronRight } from "lucide-react";
import { products } from "../../data/index.js";
import AuctionCard from "../../components/AuctionCard/DefaultAuctionCard";
import FilterBar from "./FilterBar";
import './ListProducts.css'

export default function ListProduct() {
    const category = "electronics";
    const subcategory = "smartphones";

    const [filteredProducts, setItems] = useState(products);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const items = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
          
          {/* Breadcrumbs */}
          <div className="mb-8">
              <ul className="flex items-center gap-2 text-sm">
                <li className="flex items-center gap-2 transition-colors cursor-pointer hover:underline" style={{ color: 'var(--text-muted)' }}>
                    <House size={16} />
                    <span>Home</span>
                </li>
                <li style={{ color: 'var(--border-strong)' }}>/</li>
                <li className="transition-colors cursor-pointer hover:underline" style={{ color: 'var(--text-muted)' }}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                </li>
                <li style={{ color: 'var(--border-strong)' }}>/</li>
                <li className="font-semibold" style={{ color: 'var(--accent)' }}>
                    {subcategory.charAt(0).toUpperCase() + subcategory.slice(1)}
                </li>
              </ul>
              <h1 className="mt-2 text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                {subcategory.charAt(0).toUpperCase() + subcategory.slice(1)}
              </h1>
          </div>

          <FilterBar />

          <section className="transition-colors duration-100">
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-center">
                    <AuctionCard product={item} variant="default" />
                  </div>
                ))}
              </div>

              {/* THEME: Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-12 gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn p-2 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-lg text-sm transition-all ${
                        currentPage === i + 1 ? 'pagination-btn-active' : 'pagination-btn'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-btn p-2 rounded-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
          </section>
      </div>
    );
}