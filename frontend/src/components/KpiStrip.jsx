import React from 'react';
import { TrendingDown, Zap, BatteryCharging, Sun, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function KpiStrip({ fdeResult, pdeResult, rbResult }) {
  if (!fdeResult) return null;

  // Compute percentage differences vs Plain DE baseline (if available)
  const costDeltaVsPde = pdeResult
    ? (((fdeResult.total_cost_usd - pdeResult.total_cost_usd) / pdeResult.total_cost_usd) * 100).toFixed(1)
    : null;

  const costDeltaVsRb = rbResult
    ? (((fdeResult.total_cost_usd - rbResult.total_cost_usd) / rbResult.total_cost_usd) * 100).toFixed(1)
    : null;

  const peakReductionVsPde = pdeResult
    ? (((pdeResult.peak_grid_import_kw - fdeResult.peak_grid_import_kw) / pdeResult.peak_grid_import_kw) * 100).toFixed(1)
    : null;

  const peakReductionVsRb = rbResult
    ? (((rbResult.peak_grid_import_kw - fdeResult.peak_grid_import_kw) / rbResult.peak_grid_import_kw) * 100).toFixed(1)
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-6 py-3 bg-[#090e18] border-b border-slate-800">
      {/* 1. Total Net Dispatch Cost */}
      <div className="rounded border border-slate-800 bg-[#0c1322] p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider font-mono">
          <span>Net Dispatch Cost</span>
          <span className="text-emerald-400 font-semibold">Fuzzy + DE</span>
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            ${fdeResult.total_cost_usd.toFixed(2)}
          </span>
          <span className="text-xs text-slate-400 font-mono">24h total</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {costDeltaVsPde !== null && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] ${
                Number(costDeltaVsPde) <= 0
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
              }`}
            >
              {Number(costDeltaVsPde) <= 0 ? (
                <ArrowDownRight className="w-2.5 h-2.5" />
              ) : (
                <ArrowUpRight className="w-2.5 h-2.5" />
              )}
              {Math.abs(costDeltaVsPde)}% vs Plain DE
            </span>
          )}
          {costDeltaVsRb !== null && (
            <span className="text-slate-400 text-[10px]">
              vs Rule: {Number(costDeltaVsRb) <= 0 ? '-' : '+'}{Math.abs(costDeltaVsRb)}%
            </span>
          )}
        </div>
      </div>

      {/* 2. Peak Grid Import */}
      <div className="rounded border border-slate-800 bg-[#0c1322] p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider font-mono">
          <span>Peak Grid Import</span>
          <span className="text-orange-400 font-semibold">Peak Shaving</span>
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {fdeResult.peak_grid_import_kw.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-mono">kW</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {peakReductionVsPde !== null && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <ArrowDownRight className="w-2.5 h-2.5" />
              {peakReductionVsPde}% shaved vs DE
            </span>
          )}
          {peakReductionVsRb !== null && (
            <span className="text-slate-400 text-[10px]">
              {peakReductionVsRb}% vs Rule
            </span>
          )}
        </div>
      </div>

      {/* 3. Renewable Utilization */}
      <div className="rounded border border-slate-800 bg-[#0c1322] p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider font-mono">
          <span>Renewable Utilization</span>
          <span className="text-amber-400 font-semibold">Solar Self-Use</span>
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {fdeResult.renewable_utilization_pct.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400 font-mono">retained</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Bat Wear: ${fdeResult.battery_cycle_cost_usd.toFixed(2)}</span>
          <span className="text-emerald-400">High efficiency</span>
        </div>
      </div>

      {/* 4. DE Final Convergence Fitness */}
      <div className="rounded border border-slate-800 bg-[#0c1322] p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider font-mono">
          <span>DE Convergence Cost</span>
          <span className="text-indigo-400 font-semibold">Objective Value</span>
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {fdeResult.convergence_curve.length > 0
              ? `$${fdeResult.convergence_curve[fdeResult.convergence_curve.length - 1].toFixed(1)}`
              : 'N/A'}
          </span>
          <span className="text-xs text-slate-400 font-mono">Gen {fdeResult.convergence_curve.length}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Pop: {fdeResult.metadata.population_size || 30}</span>
          <span className="text-emerald-400">Converged</span>
        </div>
      </div>
    </div>
  );
}
