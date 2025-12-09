import { AlertCircle, MoreVertical } from 'lucide-react';

export default function LiveAuctionsView() {
    return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800">Auction Management</h1>
            <div className="flex gap-2">
                <button className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50">Filter</button>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Create Auction</button>
            </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                        <th className="px-6 py-4">Product Details</th>
                        <th className="px-6 py-4">Current Price</th>
                        <th className="px-6 py-4">Bids</th>
                        <th className="px-6 py-4">Ends In</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {/* Row 1: Active Healthy Auction */}
                    <tr className="hover:bg-slate-50 group">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-200 flex-shrink-0"></div>
                                <div>
                                    <div className="font-bold text-slate-900">Vintage Gibson Les Paul</div>
                                    <div className="text-xs text-slate-400">ID: #GK-9281</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 font-medium">$4,250</td>
                        <td className="px-6 py-4">24</td>
                        <td className="px-6 py-4 text-orange-600 font-medium">02h 15m</td>
                        <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                             <button className="p-2 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600">
                                <MoreVertical size={16} />
                             </button>
                        </td>
                    </tr>

                    {/* Row 2: Flagged/Suspicious Auction */}
                    <tr className="hover:bg-slate-50 bg-rose-50/50">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-200 flex-shrink-0"></div>
                                <div>
                                    <div className="font-bold text-slate-900">PS5 Bundle (Unverified)</div>
                                    <div className="text-xs text-slate-400">ID: #PS-1102</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 font-medium">$850</td>
                        <td className="px-6 py-4">2</td>
                        <td className="px-6 py-4 text-slate-500">4d 12h</td>
                        <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                                <AlertCircle size={12} />
                                Flagged
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                             <button className="text-xs font-bold text-rose-600 hover:underline">Suspend</button>
                             <button className="p-2 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600">
                                <MoreVertical size={16} />
                             </button>
                        </td>
                    </tr>
                </tbody>
            </table>
            
            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Showing 1-10 of 1,492 auctions</span>
                <div className="flex gap-2">
                    <button className="px-3 py-1 border border-slate-200 rounded text-xs font-medium hover:bg-slate-50 text-slate-600">Prev</button>
                    <button className="px-3 py-1 border border-slate-200 rounded text-xs font-medium hover:bg-slate-50 text-slate-600">Next</button>
                </div>
            </div>
        </div>
    </div>
    );
};