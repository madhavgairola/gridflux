import React from 'react';
import { Cpu } from 'lucide-react';

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
    <div className="flex flex-col bg-[#171717] border border-[#262626] rounded-lg shadow-sm">
      {/* Supabase Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626] bg-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-[#3ecf8e]" />
          <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">
            Fuzzy Inference Inspector
          </h3>
        </div>
        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[#202020] border border-[#2f2f2f] text-cyan-400">
          T = {hourLabel}
        </span>
      </div>

      <div className="p-4 space-y-3.5">
        {/* 1. Defuzzified Guidance Outputs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#121212] border border-[#262626] rounded-md p-2 text-center">
            <div className="text-[10px] text-zinc-400 font-mono uppercase">Grid Penalty</div>
            <div className="text-base font-bold font-mono text-orange-400 tabular-nums mt-0.5">
              {grid_penalty.toFixed(2)}x
            </div>
            <div className="text-[9px] text-zinc-500 font-mono">Cost weight</div>
          </div>

          <div className="bg-[#121212] border border-[#262626] rounded-md p-2 text-center">
            <div className="text-[10px] text-zinc-400 font-mono uppercase">Battery Bias</div>
            <div className={`text-base font-bold font-mono tabular-nums mt-0.5 ${battery_bias > 0 ? 'text-[#3ecf8e]' : battery_bias < 0 ? 'text-cyan-400' : 'text-zinc-300'}`}>
              {battery_bias > 0 ? `+${battery_bias.toFixed(2)}` : battery_bias.toFixed(2)}
            </div>
            <div className="text-[9px] text-zinc-500 font-mono">
              {battery_bias > 0.1 ? 'Charge' : battery_bias < -0.1 ? 'Discharge' : 'Float'}
            </div>
          </div>

          <div className="bg-[#121212] border border-[#262626] rounded-md p-2 text-center">
            <div className="text-[10px] text-zinc-400 font-mono uppercase">Peak Shave</div>
            <div className="text-base font-bold font-mono text-amber-400 tabular-nums mt-0.5">
              {peak_shaving_weight.toFixed(2)}x
            </div>
            <div className="text-[9px] text-zinc-500 font-mono">Spike filter</div>
          </div>
        </div>

        {/* 2. Input Linguistic Memberships (μ) */}
        <div className="space-y-2 text-xs font-mono bg-[#121212] border border-[#262626] rounded-md p-3">
          <div className="text-[10px] text-zinc-400 uppercase font-medium tracking-wide">
            Linguistic Membership (μ)
          </div>

          {/* Renewable */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-amber-400">Solar PV:</span>
              <span className="text-zinc-300">
                L: {memberships.renewable.L} | M: {memberships.renewable.M} | H: {memberships.renewable.H}
              </span>
            </div>
            <div className="flex h-1.5 w-full rounded bg-[#242424] overflow-hidden">
              <div style={{ width: `${memberships.renewable.L * 100}%` }} className="bg-zinc-600"></div>
              <div style={{ width: `${memberships.renewable.M * 100}%` }} className="bg-amber-500"></div>
              <div style={{ width: `${memberships.renewable.H * 100}%` }} className="bg-amber-300"></div>
            </div>
          </div>

          {/* SoC */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-cyan-400">Battery SoC:</span>
              <span className="text-zinc-300">
                L: {memberships.soc.L} | M: {memberships.soc.M} | H: {memberships.soc.H}
              </span>
            </div>
            <div className="flex h-1.5 w-full rounded bg-[#242424] overflow-hidden">
              <div style={{ width: `${memberships.soc.L * 100}%` }} className="bg-red-500"></div>
              <div style={{ width: `${memberships.soc.M * 100}%` }} className="bg-cyan-400"></div>
              <div style={{ width: `${memberships.soc.H * 100}%` }} className="bg-[#3ecf8e]"></div>
            </div>
          </div>

          {/* Demand */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-orange-400">Demand Stress:</span>
              <span className="text-zinc-300">
                L: {memberships.demand_pressure.L} | M: {memberships.demand_pressure.M} | H: {memberships.demand_pressure.H}
              </span>
            </div>
            <div className="flex h-1.5 w-full rounded bg-[#242424] overflow-hidden">
              <div style={{ width: `${memberships.demand_pressure.L * 100}%` }} className="bg-[#3ecf8e]"></div>
              <div style={{ width: `${memberships.demand_pressure.M * 100}%` }} className="bg-amber-500"></div>
              <div style={{ width: `${memberships.demand_pressure.H * 100}%` }} className="bg-red-500"></div>
            </div>
          </div>
        </div>

        {/* 3. Top Triggered Rules */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-medium font-mono mb-1.5">
            <span>Active Rules ({active_rules_count} fired)</span>
            <span>Strength (w)</span>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[175px] pr-1">
            {top_rules.map((rule, idx) => (
              <div
                key={idx}
                className="bg-[#121212] border border-[#262626] rounded p-2 text-[11px] font-mono flex items-start justify-between gap-2"
              >
                <div className="flex-1 text-zinc-300 leading-tight">
                  {rule.description}
                </div>
                <span className="font-bold text-[#3ecf8e] bg-[#14231b] border border-[#244b36] px-1.5 py-0.2 rounded text-[10px] tabular-nums shrink-0">
                  w = {rule.strength.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
