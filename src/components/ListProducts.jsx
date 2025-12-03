// src/components/ListProduct.jsx
import React, {useState} from "react";
import { products } from "../data/mockData";
import AuctionCard from "./ui/AuctionCard";
import { House } from "lucide-react";
import FilterSidebar from "./ui/FilterSidebar";
export default function ListProduct() {
    const category = "electronics";
    const subcategory = "smartphones";


    // Filter products based on category and subcategory if provided
    // For simplicity, using all products here
    const [items, setItems] = useState(products);
    return (
        <div className="flex gap-6 px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">
            <FilterSidebar isOpen={true} onClose={() => {}} />
            <section className="bg-[#120A1F] py-10 w-[75%]">
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

                  <button className="hidden md:inline-flex items-center gap-2 text-xs md:text-sm font-medium text-[#E0B84C] hover:text-white border border-[#E0B84C] px-3 py-1.5 rounded-full transition-colors">
                    Xem tất cả
                  </button>
                </div>

                {/* Grid sản phẩm */}
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <AuctionCard key={item.id} item={item} />
                  ))}
                </div>
              
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
