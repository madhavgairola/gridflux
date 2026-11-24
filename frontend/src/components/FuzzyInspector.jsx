import React from 'react';
import { Cpu, Zap, Activity, Info } from 'lucide-react';

export default function FuzzyInspector({
  fuzzyExplainability,
  selectedHourIndex,
  timeLabels
}) {
  if (!fuzzyExplainability || !fuzzyExplainability.step_details) return null;

  const currentStep = fuzzyExplainability.step_details[selectedHourIndex] || fuzzyExplainability.step_details[0];
  const hourLabel = timeLabels[selectedHourIndex] || '00:00';

  const { memberships, active_rules_count, top_rules, grid_penalty, battery_bias, peak_shaving_weight } = currentStep;

  return (
    <div className="flex flex-col bg-[#0c1322] border border-slate-800 rounded p-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
            Fuzzy Inference Inspector
          </h3>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400">
          T = {hourLabel}
        </span>
      </div>

      {/* 1. Defuzzified Guidance Outputs */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#090e18] border border-slate-800/80 rounded p-2 text-center">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Grid Penalty W_g</div>
          <div className="text-sm font-bold font-mono text-orange-400 tabular-nums">
            {grid_penalty.toFixed(2)}x
          </div>
          <div className="text-[9px] text-slate-400">Tariff multiplier</div>
        </div>

        <div className="bg-[#090e18] border border-slate-800/80 rounded p-2 text-center">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Battery Bias B_b</div>
          <div className={`text-sm font-bold font-mono tabular-nums ${battery_bias > 0 ? 'text-emerald-400' : battery_bias < 0 ? 'text-cyan-400' : 'text-slate-300'}`}>
            {battery_bias > 0 ? `+${battery_bias.toFixed(2)}` : battery_bias.toFixed(2)}
          </div>
          <div className="text-[9px] text-slate-400">
            {battery_bias > 0.1 ? 'Charge bias' : battery_bias < -0.1 ? 'Discharge bias' : 'Float/neutral'}
          </div>
        </div>

        <div className="bg-[#090e18] border border-slate-800/80 rounded p-2 text-center">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Peak Shave W_p</div>
          <div className="text-sm font-bold font-mono text-amber-400 tabular-nums">
            {peak_shaving_weight.toFixed(2)}x
          </div>
          <div className="text-[9px] text-slate-400">Spike penalty</div>
        </div>
      </div>

      {/* 2. Input Linguistic Memberships (μ) */}
      <div className="space-y-2 mb-3 text-xs font-mono bg-[#090e18] border border-slate-800 rounded p-2.5">
        <div className="text-[10px] text-slate-400 uppercase font-semibold">
          Linguistic Membership Degrees (μ)
        </div>

        {/* Renewable */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-amber-400">Renewables:</span>
            <span className="text-slate-300">
              L: {memberships.renewable.L} | M: {memberships.renewable.M} | H: {memberships.renewable.H}
            </span>
          </div>
          <div className="flex h-1.5 w-full rounded bg-slate-800 overflow-hidden">
            <div style={{ width: `${memberships.renewable.L * 100}%` }} className="bg-slate-500"></div>
            <div style={{ width: `${memberships.renewable.M * 100}%` }} className="bg-amber-400"></div>
            <div style={{ width: `${memberships.renewable.H * 100}%` }} className="bg-yellow-300"></div>
          </div>
        </div>

        {/* SoC */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-cyan-400">Battery SoC:</span>
            <span className="text-slate-300">
              L: {memberships.soc.L} | M: {memberships.soc.M} | H: {memberships.soc.H}
            </span>
          </div>
          <div className="flex h-1.5 w-full rounded bg-slate-800 overflow-hidden">
            <div style={{ width: `${memberships.soc.L * 100}%` }} className="bg-red-500"></div>
            <div style={{ width: `${memberships.soc.M * 100}%` }} className="bg-cyan-400"></div>
            <div style={{ width: `${memberships.soc.H * 100}%` }} className="bg-emerald-400"></div>
          </div>
        </div>

        {/* Demand */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-orange-400">Grid Demand:</span>
            <span className="text-slate-300">
              L: {memberships.demand_pressure.L} | M: {memberships.demand_pressure.M} | H: {memberships.demand_pressure.H}
            </span>
          </div>
          <div className="flex h-1.5 w-full rounded bg-slate-800 overflow-hidden">
            <div style={{ width: `${memberships.demand_pressure.L * 100}%` }} className="bg-emerald-500"></div>
            <div style={{ width: `${memberships.demand_pressure.M * 100}%` }} className="bg-amber-400"></div>
            <div style={{ width: `${memberships.demand_pressure.H * 100}%` }} className="bg-red-500"></div>
          </div>
        </div>
      </div>

      {/* 3. Top Triggered Mamdani Rules */}
      <div className="flex-1">
        <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold font-mono mb-1.5">
          <span>Active Rules ({active_rules_count} fired)</span>
          <span>Firing Strength (w)</span>
        </div>

        <div className="space-y-1.5 overflow-y-auto max-h-[160px] pr-1">
          {top_rules.map((rule, idx) => (
            <div
              key={idx}
              className="bg-[#090e18] border border-slate-800/80 rounded p-2 text-[11px] font-mono flex items-start justify-between gap-2"
            >
              <div className="flex-1 text-slate-300 leading-tight">
                {rule.description}
              </div>
              <span className="font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded text-[10px] tabular-nums">
                w = {rule.strength.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
