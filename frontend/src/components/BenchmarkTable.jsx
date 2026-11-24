import React from 'react';
import { Award, CheckCircle2 } from 'lucide-react';

export default function BenchmarkTable({ fdeResult, pdeResult, rbResult }) {
  if (!fdeResult) return null;

  const rows = [
    {
      name: 'Fuzzy + Differential Evolution',
      badge: 'Proposed (CO4 Hybrid)',
      badgeColor: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40',
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
      badge: 'Baseline A (No Fuzzy)',
      badgeColor: 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40',
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
      badgeColor: 'bg-purple-950/60 text-purple-400 border border-purple-800/40',
      cost: rbResult.total_cost_usd,
      peak: rbResult.peak_grid_import_kw,
      wear: rbResult.battery_cycle_cost_usd,
      util: rbResult.renewable_utilization_pct,
      isWinner: false
    });
  }

  // Find lowest cost & lowest peak for bolding
  const minCost = Math.min(...rows.map((r) => r.cost));
  const minPeak = Math.min(...rows.map((r) => r.peak));

  return (
    <div className="bg-[#0c1322] border border-slate-800 rounded p-4 mt-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
          CO4 Soft-Computing Benchmark Comparison
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          Deterministic Evaluator (Same Load & Solar Inputs)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
              <th className="py-2 px-3">Algorithm</th>
              <th className="py-2 px-3 text-right">Total Cost ($)</th>
              <th className="py-2 px-3 text-right">Peak Grid Import</th>
              <th className="py-2 px-3 text-right">Battery Wear ($)</th>
              <th className="py-2 px-3 text-right">Solar Utilization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((row, idx) => {
              const isCostBest = Math.abs(row.cost - minCost) < 0.05;
              const isPeakBest = Math.abs(row.peak - minPeak) < 0.05;

              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-900/50 transition-colors ${
                    row.isWinner ? 'bg-emerald-950/10' : ''
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-200 flex items-center gap-2">
                      {row.isWinner && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      <span>{row.name}</span>
                    </div>
                    <span className={`inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded font-mono ${row.badgeColor}`}>
                      {row.badge}
                    </span>
                  </td>
                  <td className={`py-2.5 px-3 text-right tabular-nums ${isCostBest ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                    ${row.cost.toFixed(2)}
                  </td>
                  <td className={`py-2.5 px-3 text-right tabular-nums ${isPeakBest ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                    {row.peak.toFixed(1)} kW
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">
                    ${row.wear.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-amber-400">
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
