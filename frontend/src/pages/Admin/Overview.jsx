import { Icon, DollarSign, Gavel, Users, AlertCircle } from 'lucide-react';

const StatCard = ({ title, value, trend, trendUp, icon: Icon }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${trendUp ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600'}`}>
        <Icon size={24} />
      </div>
      {trend && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

export default function OverviewView() {
  return (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">System Overview</h1>
        <div className="text-sm text-slate-500">Last updated: Just now</div>
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard title="Total Revenue" value="$124,592" trend="+12.5%" trendUp={true} icon={DollarSign} />
      <StatCard title="Active Auctions" value="1,492" trend="+4.2%" trendUp={true} icon={Gavel} />
      <StatCard title="Active Users" value="8,520" trend="+8.1%" trendUp={true} icon={Users} />
      <StatCard title="Pending Reports" value="12" trend="-2.4%" trendUp={false} icon={AlertCircle} />
    </div>

    {/* Recent Activity Table (Simplified) */}
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h2 className="font-bold text-slate-800">Recent High-Value Bids</h2>
        <button className="text-sm text-indigo-600 font-medium hover:underline">View All</button>
      </div>
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
          <tr>
            <th className="px-6 py-4">Item</th>
            <th className="px-6 py-4">Bidder</th>
            <th className="px-6 py-4">Amount</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="px-6 py-4 font-medium text-slate-900">Rolex Submariner #829{i}</td>
              <td className="px-6 py-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-200" /> user_82{i}
              </td>
              <td className="px-6 py-4 text-emerald-600 font-bold">$12,{i}00</td>
              <td className="px-6 py-4"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">Winning</span></td>
              <td className="px-6 py-4 text-slate-400">2 min ago</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};