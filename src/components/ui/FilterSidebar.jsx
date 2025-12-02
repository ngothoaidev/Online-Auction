// src/ui/FilterSidebar.jsx
import React from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { categories } from "../../data/mockData";

export default function FilterSidebar({
  isOpen = true,
  onClose,
}) {
  return (
    <aside
      className={`sticky top-30 self-start bg-[#1A1225] border border-white/5 rounded-2xl p-4 md:p-5 text-gray-200 w-full md:w-72 lg:w-80 shadow-2xl/40 ${
        isOpen ? "block" : "hidden md:block"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-[#2A2038] border border-white/10">
            <SlidersHorizontal className="w-4 h-4 text-[#E0B84C]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase">
              Bộ lọc
            </h3>
            <p className="text-[11px] text-gray-400">
              Tinh chỉnh kết quả đấu giá theo nhu cầu.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-5 text-xs overflow-y-auto max-h-96 custom-allscrollbar">
        {/* Trạng thái phiên đấu giá */}
        <div className="space-y-2">
          <p className="font-semibold text-gray-300 uppercase tracking-wide text-[11px]">
            Trạng thái
          </p>
          <div className="flex flex-wrap gap-2">
            {["Tất cả", "Sắp kết thúc", "Mới", "Đấu giá sôi động"].map(
              (label) => (
                <button
                  key={label}
                  className="px-3 py-1.5 rounded-full border border-white/10 bg-[#120A1F] hover:border-[#E0B84C] hover:text-[#E0B84C] text-[11px] transition-colors"
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>

        {/* Danh mục & phân loại */}
        <div className="space-y-2">
          <p className="font-semibold text-gray-300 uppercase tracking-wide text-[11px]">
            Danh mục
          </p>
          <div className="max-h-52 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="border border-white/5 rounded-xl bg-[#120A1F] px-3 py-2"
              >
                <p className="text-[12px] font-medium text-gray-200 mb-1 flex items-center justify-between">
                  <span>{cat.name}</span>
                  <span className="text-[10px] text-gray-500 uppercase">
                    {cat.subcategories?.length || 0} loại
                  </span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.subcategories?.map((sub) => (
                    <button
                      key={sub.id}
                      className="px-2 py-1 rounded-full bg-white/5 text-[11px] text-gray-300 hover:bg-[#E0B84C] hover:text-[#120A1F] transition-colors"
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Khoảng giá */}
        <div className="space-y-2">
          <p className="font-semibold text-gray-300 uppercase tracking-wide text-[11px]">
            Khoảng giá (VND)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-400">Từ</p>
              <input
                type="number"
                placeholder="1.000.000"
                className="w-full rounded-lg bg-[#120A1F] border border-white/10 px-2 py-1.5 text-[11px] placeholder:text-gray-500 focus:outline-none focus:border-[#E0B84C]"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-400">Đến</p>
              <input
                type="number"
                placeholder="50.000.000"
                className="w-full rounded-lg bg-[#120A1F] border border-white/10 px-2 py-1.5 text-[11px] placeholder:text-gray-500 focus:outline-none focus:border-[#E0B84C]"
              />
            </div>
          </div>
        </div>

        {/* Sắp xếp */}
        <div className="space-y-2">
          <p className="font-semibold text-gray-300 uppercase tracking-wide text-[11px]">
            Sắp xếp theo
          </p>
          <select className="w-full rounded-lg bg-[#120A1F] border border-white/10 px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#E0B84C]">
            <option>Thời gian còn lại</option>
            <option>Giá hiện tại tăng dần</option>
            <option>Giá hiện tại giảm dần</option>
            <option>Lượt bid cao nhất</option>
            <option>Mới đăng gần đây</option>
          </select>
        </div>

        {/* Nút hành động */}
        <div className="flex gap-2 pt-1">
          <button className="flex-1 py-2 rounded-lg bg-[#E0B84C] text-[#1A1225] text-[12px] font-semibold hover:brightness-110 transition-all">
            Áp dụng bộ lọc
          </button>
          <button className="px-3 py-2 rounded-lg border border-white/10 text-[11px] text-gray-300 hover:border-red-500 hover:text-red-400 transition-colors">
            Xóa
          </button>
        </div>
      </div>
    </aside>
  );
}
