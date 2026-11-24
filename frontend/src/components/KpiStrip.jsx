import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function KpiStrip({ fdeResult, pdeResult, rbResult }) {
  if (!fdeResult) return null;

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-6 py-3.5 bg-[#121212] border-b border-[#262626]">
      {/* 1. Net Dispatch Cost */}
      <div className="rounded-lg border border-[#262626] bg-[#171717] p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-zinc-400 text-[11px] uppercase tracking-wider font-mono">
          <span>Net Dispatch Cost</span>
          <span className="text-[#3ecf8e] font-semibold text-[10px] bg-[#14231b] border border-[#244b36] px-1.5 py-0.2 rounded">
            Fuzzy + DE
          </span>
        </div>
        <div className="my-1.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            ${fdeResult.total_cost_usd.toFixed(2)}
          </span>
          <span className="text-xs text-zinc-500 font-mono">24h net</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {costDeltaVsPde !== null && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                Number(costDeltaVsPde) <= 0
                  ? 'bg-[#14231b] text-[#3ecf8e] border border-[#244b36]'
                  : 'bg-[#2b1f13] text-amber-400 border border-[#4d3723]'
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
            <span className="text-zinc-500 text-[10px]">
              vs Rule: {Number(costDeltaVsRb) <= 0 ? '-' : '+'}{Math.abs(costDeltaVsRb)}%
            </span>
          )}
        </div>
      </div>

      {/* 2. Peak Grid Import */}
      <div className="rounded-lg border border-[#262626] bg-[#171717] p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-zinc-400 text-[11px] uppercase tracking-wider font-mono">
          <span>Peak Grid Import</span>
          <span className="text-orange-400 font-semibold text-[10px] bg-[#261c16] border border-orange-500/30 px-1.5 py-0.2 rounded">
            Peak Shaved
          </span>
        </div>
        <div className="my-1.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {fdeResult.peak_grid_import_kw.toFixed(1)}
          </span>
          <span className="text-xs text-zinc-500 font-mono">kW</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {peakReductionVsPde !== null && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[#14231b] text-[#3ecf8e] border border-[#244b36]">
              <ArrowDownRight className="w-2.5 h-2.5" />
              {peakReductionVsPde}% shaved vs DE
            </span>
          )}
          {peakReductionVsRb !== null && (
            <span className="text-zinc-500 text-[10px]">
              {peakReductionVsRb}% vs Rule
            </span>
          )}
        </div>
      </div>

      {/* 3. Renewable Utilization */}
      <div className="rounded-lg border border-[#262626] bg-[#171717] p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-zinc-400 text-[11px] uppercase tracking-wider font-mono">
          <span>Solar Self-Use</span>
          <span className="text-amber-400 font-semibold text-[10px] bg-[#221e14] border border-amber-500/30 px-1.5 py-0.2 rounded">
            Local Retention
          </span>
        </div>
        <div className="my-1.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {fdeResult.renewable_utilization_pct.toFixed(1)}%
          </span>
          <span className="text-xs text-zinc-500 font-mono">utilized</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>Wear: ${fdeResult.battery_cycle_cost_usd.toFixed(2)}</span>
          <span className="text-[#3ecf8e]">Smooth Inverter</span>
        </div>
      </div>

      {/* 4. DE Objective Value */}
      <div className="rounded-lg border border-[#262626] bg-[#171717] p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-zinc-400 text-[11px] uppercase tracking-wider font-mono">
          <span>DE Convergence Cost</span>
          <span className="text-indigo-400 font-semibold text-[10px] bg-[#1a1c2e] border border-indigo-500/30 px-1.5 py-0.2 rounded">
            Objective Fit
          </span>
        </div>
        <div className="my-1.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {fdeResult.convergence_curve.length > 0
              ? `$${fdeResult.convergence_curve[fdeResult.convergence_curve.length - 1].toFixed(1)}`
              : 'N/A'}
          </span>
          <span className="text-xs text-zinc-500 font-mono">Gen {fdeResult.convergence_curve.length}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>Pop: {fdeResult.metadata.population_size || 30}</span>
          <span className="text-[#3ecf8e]">Optimal</span>
        </div>
      </div>
    </div>
  );
}
