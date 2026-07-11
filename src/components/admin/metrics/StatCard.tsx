import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
}

export function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

interface AgentCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
}

export function AgentCard({ label, value, icon: Icon, color }: AgentCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
        <Icon size={16} />
      </div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

interface BarSegment {
  name: string;
  count: number;
}

interface BarChartProps {
  data: BarSegment[];
  title: string;
}

export function NeighborhoodBarChart({ data, title }: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
        <p className="font-bold mb-4">{title}</p>
        <p className="text-sm text-zinc-500">No data yet</p>
      </div>
    );
  }

  const maxCount = data[0].count;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
      <p className="font-bold mb-4">{title}</p>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-400 w-4">{i + 1}.</span>
            <div className="flex-1 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-lg flex items-center px-3 text-white text-xs font-bold"
                style={{ width: `${Math.min((item.count / maxCount) * 100, 100)}%` }}
              >
                {item.name}
              </div>
            </div>
            <span className="text-sm font-bold w-8 text-right">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AdRow {
  id: string;
  title: string;
  business_name: string;
  impressions: number;
  clicks: number;
  active: boolean;
}

interface AdTableProps {
  ads: AdRow[];
  title: string;
}

export function AdPerformanceTable({ ads, title }: AdTableProps) {
  if (ads.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
        <p className="font-bold">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
              <th className="text-left p-4 font-medium">Campaign</th>
              <th className="text-left p-4 font-medium">Business</th>
              <th className="text-right p-4 font-medium">Impressions</th>
              <th className="text-right p-4 font-medium">Clicks</th>
              <th className="text-right p-4 font-medium">CTR</th>
              <th className="text-right p-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => {
              const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions * 100).toFixed(1) : "0.0";
              return (
                <tr key={ad.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <td className="p-4 font-medium">{ad.title}</td>
                  <td className="p-4 text-zinc-500">{ad.business_name}</td>
                  <td className="p-4 text-right">{ad.impressions}</td>
                  <td className="p-4 text-right">{ad.clicks}</td>
                  <td className="p-4 text-right font-mono">{ctr}%</td>
                  <td className="p-4 text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      ad.active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                    }`}>
                      {ad.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
