// src/components/ListProduct.jsx
import {useState} from "react";
import { House, ChevronLeft, ChevronRight } from "lucide-react";
import { products } from "../../data/index.js";
import AuctionCard from "../../components/AuctionCard/DefaultAuctionCard";
import FilterSidebar from "./FilterSidebar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function ListProduct() {
    const category = "electronics";
    const subcategory = "smartphones";

    // Filter products based on category and subcategory if provided
    // For simplicity, using all products here
    const [filteredProducts, setItems] = useState(products);
    const [currentPage, setCurrentPage] = useState(1);

    // Pagination Logic
    const itemsPerPage = 9;
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const items = filteredProducts.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    return (
      <div className="flex gap-6 px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">
          <FilterSidebar isOpen={true} onClose={() => {}} />
          <section className="list-products-section py-10 w-[75%] rounded-2xl shadow-lg transition-colors duration-100\">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <ul className="flex items-center gap-2 flex-wrap">
                    <li className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                        <House size={16} />
                        <span>Homepage</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="text-gray-600">/</span>
                        <span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="text-gray-600">/</span>
                        <span className="text-sm text-[#E0B84C] font-medium">
                          {subcategory.charAt(0).toUpperCase() + subcategory.slice(1)}
                        </span>
                    </li>
                  </ul>
                  <h1 className="mt-3 text-1px md:text-2xl font-bold  text-gray-400">
                    {subcategory.charAt(0).toUpperCase() + subcategory.slice(1)}
                  </h1>
                </div>

                {/* <button className="hidden md:inline-flex items-center gap-2 text-xs md:text-sm font-medium text-[#E0B84C] hover:text-white border border-[#E0B84C] px-3 py-1.5 rounded-full transition-colors">
                  Xem tất cả
                </button> */}
              </div>

              {/* Grid sản phẩm */}
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <AuctionCard key={item.id} item={item} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-12 gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:invisible hover:bg-stone-100 dark:hover:bg-stone-700 dark:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-lg font-bold text-sm transition-all shadow-sm ${
                        currentPage === i + 1
                          ? 'bg-[var(--theme-primary)] text-white shadow-[var(--theme-primary)]/30'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:invisible hover:bg-stone-100 dark:hover:bg-stone-700 dark:text-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            
              {/* Nút xem thêm ở mobile */}
              <div className="mt-6 flex md:hidden justify-center">
                <button className="text-xs font-medium text-[#E0B84C] border border-[#E0B84C] px-4 py-2 rounded-full hover:text-white hover:bg-[#E0B84C33] transition-colors">
                  Xem thêm sản phẩm
                </button>
              </div>
            </div>
          </section>
      </div>
    );
}
