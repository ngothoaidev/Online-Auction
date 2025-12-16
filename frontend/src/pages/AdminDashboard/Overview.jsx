import { DollarSign, Gavel, Users, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';

const StatCard = ({ title, value, trend, trendUp, icon: Icon }) => (
  <div className="p-6 rounded-xl border shadow-sm transition-all hover:shadow-md"
    style={{ 
        backgroundColor: 'var(--admin-card-bg)', 
        borderColor: 'var(--admin-card-border)' 
    }}
  >
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-lg"
        style={{ 
            backgroundColor: trendUp ? 'var(--info-soft)' : 'var(--bg-subtle)',
            color: trendUp ? 'var(--info)' : 'var(--text-muted)'
        }}
      >
        <Icon size={24} />
      </div>
      {trend && (
        <span className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1"
            style={{ 
                backgroundColor: trendUp ? 'var(--success-soft)' : 'var(--danger-soft)',
                color: trendUp ? 'var(--success)' : 'var(--danger)'
            }}
        >
          {trendUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>{title}</h3>
    <p className="text-2xl font-bold" style={{ color: 'var(--admin-text-main)' }}>{value}</p>
  </div>
);

export default function OverviewView() {
  return (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--admin-text-main)' }}>System Overview</h1>
        <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Last updated: Just now</div>
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard title="Total Revenue" value="$124,592" trend="12.5%" trendUp={true} icon={DollarSign} />
      <StatCard title="Active Auctions" value="1,492" trend="4.2%" trendUp={true} icon={Gavel} />
      <StatCard title="Active Users" value="8,520" trend="8.1%" trendUp={true} icon={Users} />
      <StatCard title="Pending Reports" value="12" trend="2.4%" trendUp={false} icon={AlertCircle} />
    </div>

    {/* Recent Activity Table */}
    <div className="rounded-xl border shadow-sm overflow-hidden"
        style={{ 
            backgroundColor: 'var(--admin-card-bg)', 
            borderColor: 'var(--admin-card-border)' 
        }}
    >
      <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--admin-card-border)' }}>
        <h2 className="font-bold" style={{ color: 'var(--admin-text-main)' }}>Recent High-Value Bids</h2>
        <button className="text-sm font-medium hover:underline" style={{ color: 'var(--accent)' }}>View All</button>
      </div>
      
      <table className="w-full text-left text-sm">
        <thead className="uppercase font-semibold text-xs" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--admin-text-muted)' }}>
          <tr>
            <th className="px-6 py-4">Item</th>
            <th className="px-6 py-4">Bidder</th>
            <th className="px-6 py-4">Amount</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--admin-card-border)' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <tr key={i} className="transition-colors hover:bg-[var(--bg-hover)]">
              <td className="px-6 py-4 font-medium" style={{ color: 'var(--admin-text-main)' }}>Rolex Submariner #829{i}</td>
              <td className="px-6 py-4 flex items-center gap-2" style={{ color: 'var(--admin-text-muted)' }}>
                <div className="w-6 h-6 rounded-full bg-slate-200" /> user_82{i}
              </td>
              <td className="px-6 py-4 font-bold" style={{ color: 'var(--success)' }}>$12,{i}00</td>
              <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-full text-xs font-bold" 
                    style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)' }}>
                    Winning
                  </span>
              </td>
              <td className="px-6 py-4" style={{ color: 'var(--admin-text-muted)' }}>2 min ago</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};