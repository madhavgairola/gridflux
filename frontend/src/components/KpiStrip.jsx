import React from 'react';
import { ArrowDownRight, ArrowUpRight, Zap, TrendingDown, Sun, Sparkles } from 'lucide-react';
import PillBadge from './PillBadge';

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
        <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
          <span className="uppercase tracking-wider">Net Dispatch Cost</span>
          <PillBadge icon={Zap} label="Fuzzy + DE" variant="emerald" />
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
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${
                Number(costDeltaVsPde) <= 0
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                  : 'border-amber-500/40 bg-amber-950/30 text-amber-300'
              }`}
            >
              {Number(costDeltaVsPde) <= 0 ? (
                <ArrowDownRight className="w-3 h-3" />
              ) : (
                <ArrowUpRight className="w-3 h-3" />
              )}
              <span>{Math.abs(costDeltaVsPde)}% vs Plain DE</span>
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
        <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
          <span className="uppercase tracking-wider">Peak Grid Import</span>
          <PillBadge icon={TrendingDown} label="Peak Shaved" variant="orange" />
        </div>
        <div className="my-1.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {fdeResult.peak_grid_import_kw.toFixed(1)}
          </span>
          <span className="text-xs text-zinc-500 font-mono">kW</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {peakReductionVsPde !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-[10px] font-medium">
              <ArrowDownRight className="w-3 h-3" />
              <span>{peakReductionVsPde}% shaved vs DE</span>
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
        <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
          <span className="uppercase tracking-wider">Solar Self-Use</span>
          <PillBadge icon={Sun} label="Local Retention" variant="amber" />
        </div>
        <div className="my-1.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {fdeResult.renewable_utilization_pct.toFixed(1)}%
          </span>
          <span className="text-xs text-zinc-500 font-mono">utilized</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>Wear: ${fdeResult.battery_cycle_cost_usd.toFixed(2)}</span>
          <span className="text-emerald-400">Smooth Inverter</span>
        </div>
      </div>

      {/* 4. DE Peak Convergence */}
      <div className="rounded-lg border border-[#262626] bg-[#171717] p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
          <span className="uppercase tracking-wider">DE Peak Convergence</span>
          <PillBadge icon={Sparkles} label="Optimal Fit" variant="indigo" />
        </div>
        <div className="my-1.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {fdeResult.convergence_curve.length > 0
              ? `${fdeResult.convergence_curve[fdeResult.convergence_curve.length - 1].toFixed(1)}`
              : 'N/A'}
          </span>
          <span className="text-xs text-zinc-500 font-mono">kW (Gen {fdeResult.convergence_curve.length})</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>Pop: {fdeResult.metadata.population_size || 30}</span>
          <span className="text-emerald-400">Converged</span>
        </div>
      </div>
    </div>
  );
}
