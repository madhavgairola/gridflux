import React from 'react';
import { CheckCircle2, Zap, Cpu, Layers } from 'lucide-react';
import PillBadge from './PillBadge';

export default function BenchmarkTable({ fdeResult, pdeResult, rbResult }) {
  if (!fdeResult) return null;

  const rows = [
    {
      name: 'Fuzzy + Differential Evolution',
      badge: 'Proposed (CO4 Hybrid)',
      variant: 'emerald',
      icon: Zap,
      cost: fdeResult.total_cost_usd,
      peak: fdeResult.peak_grid_import_kw,
      wear: fdeResult.battery_cycle_cost_usd,
      util: fdeResult.renewable_utilization_pct,
      isWinner: true
    }
  ];

  if (pdeResult) {
    rows.push({
      name: 'Standard Differential Evolution',
      badge: 'Baseline A (Plain DE)',
      variant: 'blue',
      icon: Cpu,
      cost: pdeResult.total_cost_usd,
      peak: pdeResult.peak_grid_import_kw,
      wear: pdeResult.battery_cycle_cost_usd,
      util: pdeResult.renewable_utilization_pct,
      isWinner: false
    });
  }

  if (rbResult) {
    rows.push({
      name: 'Heuristic Greedy Schedule',
      badge: 'Baseline B (Rule-Based)',
      variant: 'indigo',
      icon: Layers,
      cost: rbResult.total_cost_usd,
      peak: rbResult.peak_grid_import_kw,
      wear: rbResult.battery_cycle_cost_usd,
      util: rbResult.renewable_utilization_pct,
      isWinner: false
    });
  }

  const minCost = Math.min(...rows.map((r) => r.cost));
  const minPeak = Math.min(...rows.map((r) => r.peak));

  return (
    <div className="bg-[#171717] border border-[#262626] rounded-lg mt-3 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626] bg-[#1a1a1a]">
        <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">
          Algorithm Benchmark Performance
        </h3>
        <span className="text-[11px] font-mono text-zinc-400">
          Normalized across 24h simulation horizon
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-[#242424] text-[11px] text-zinc-400 uppercase bg-[#141414]">
              <th className="py-2.5 px-3.5 font-medium">Optimization Algorithm</th>
              <th className="py-2.5 px-3.5 text-right font-medium">24h Net Cost</th>
              <th className="py-2.5 px-3.5 text-right font-medium">Peak Grid Draw</th>
              <th className="py-2.5 px-3.5 text-right font-medium">Battery Wear</th>
              <th className="py-2.5 px-3.5 text-right font-medium">Solar Self-Use</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#242424]">
            {rows.map((row, idx) => {
              const isCostBest = Math.abs(row.cost - minCost) < 0.05;
              const isPeakBest = Math.abs(row.peak - minPeak) < 0.05;

              return (
                <tr
                  key={idx}
                  className={`hover:bg-[#1c1c1c] transition-colors ${
                    row.isWinner ? 'bg-[#141c18]/40' : ''
                  }`}
                >
                  <td className="py-2.5 px-3.5">
                    <div className="font-medium text-zinc-200 flex items-center gap-1.5">
                      {row.isWinner && <CheckCircle2 className="w-3.5 h-3.5 text-[#3ecf8e] shrink-0" />}
                      <span>{row.name}</span>
                    </div>
                    <div className="mt-1">
                      <PillBadge icon={row.icon} label={row.badge} variant={row.variant} size="sm" />
                    </div>
                  </td>
                  <td className={`py-2.5 px-3.5 text-right tabular-nums ${isCostBest ? 'text-[#3ecf8e] font-semibold' : 'text-zinc-300'}`}>
                    ${row.cost.toFixed(2)}
                  </td>
                  <td className={`py-2.5 px-3.5 text-right tabular-nums ${isPeakBest ? 'text-[#3ecf8e] font-semibold' : 'text-zinc-300'}`}>
                    {row.peak.toFixed(1)} kW
                  </td>
                  <td className="py-2.5 px-3.5 text-right tabular-nums text-zinc-400">
                    ${row.wear.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right tabular-nums text-amber-400">
                    {row.util.toFixed(1)}%
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
