import React, { useState } from 'react';
import { Cpu, Clock, Sliders } from 'lucide-react';

export default function FuzzyInspector({
  fuzzyExplainability,
  selectedHourIndex,
  onHourChange,
  timeLabels
}) {
  const steps = fuzzyExplainability && Array.isArray(fuzzyExplainability.step_details)
    ? fuzzyExplainability.step_details
    : [];

  const labels = Array.isArray(timeLabels) && timeLabels.length > 0
    ? timeLabels
    : Array.from({ length: Math.max(1, steps.length) }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  const [localHour, setLocalHour] = useState(
    typeof selectedHourIndex === 'number' && selectedHourIndex >= 0 && selectedHourIndex < labels.length
      ? selectedHourIndex
      : 0
  );

  const activeHour = typeof selectedHourIndex === 'number' && selectedHourIndex >= 0 && selectedHourIndex < labels.length
    ? selectedHourIndex
    : localHour;

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center bg-[#171717] border border-[#262626] rounded-lg p-8 min-h-[300px]">
        <span className="text-xs font-mono text-zinc-500">
          Fuzzy inference explainability data unavailable. Run optimization to evaluate rules.
        </span>
      </div>
    );
  }

  const safeIdx = Math.max(0, Math.min(activeHour, steps.length - 1));
  const currentStep = steps[safeIdx] || steps[0] || {};
  const hourLabel = labels[safeIdx] || `${String(safeIdx).padStart(2, '0')}:00`;

  const memberships = currentStep.memberships || {
    renewable: { L: 0, M: 0, H: 0 },
    soc: { L: 0, M: 0, H: 0 },
    demand_pressure: { L: 0, M: 0, H: 0 }
  };

  const renL = Number(memberships.renewable?.L) || 0;
  const renM = Number(memberships.renewable?.M) || 0;
  const renH = Number(memberships.renewable?.H) || 0;

  const socL = Number(memberships.soc?.L) || 0;
  const socM = Number(memberships.soc?.M) || 0;
  const socH = Number(memberships.soc?.H) || 0;

  const demL = Number(memberships.demand_pressure?.L) || 0;
  const demM = Number(memberships.demand_pressure?.M) || 0;
  const demH = Number(memberships.demand_pressure?.H) || 0;

  const active_rules_count = typeof currentStep.active_rules_count === 'number'
    ? currentStep.active_rules_count
    : (currentStep.top_rules?.length || 0);

  const top_rules = Array.isArray(currentStep.top_rules) ? currentStep.top_rules : [];

  const grid_penalty = typeof currentStep.grid_penalty === 'number' ? currentStep.grid_penalty : 1.0;
  const battery_bias = typeof currentStep.battery_bias === 'number' ? currentStep.battery_bias : 0.0;
  const peak_shaving_weight = typeof currentStep.peak_shaving_weight === 'number' ? currentStep.peak_shaving_weight : 1.0;

  const handleHourScrub = (h) => {
    setLocalHour(h);
    if (onHourChange) {
      onHourChange(h);
    }
  };

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
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-[#3ecf8e]" />
          <span className="font-semibold text-zinc-200 bg-[#202020] border border-[#2f2f2f] px-2.5 py-0.5 rounded-full text-xs">
            {hourLabel}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Hour Timeline Scrubber inside Inspector */}
        <div className="bg-[#141414] border border-[#262626] rounded-md p-2.5 space-y-1 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1 text-zinc-300">
              <Sliders className="w-3 h-3 text-[#3ecf8e]" />
              <span>Inspect Time-Step:</span>
            </span>
            <span className="text-[#3ecf8e] font-bold">{hourLabel}</span>
          </div>
          <input
            type="range"
            min="0"
            max={steps.length - 1}
            value={safeIdx}
            onChange={(e) => handleHourScrub(Number(e.target.value))}
            className="w-full accent-[#3ecf8e] bg-[#242424] h-1.5 rounded cursor-pointer"
          />
        </div>

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
              {battery_bias > 0.05 ? 'Charge' : battery_bias < -0.05 ? 'Discharge' : 'Float'}
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
                L: {renL.toFixed(2)} | M: {renM.toFixed(2)} | H: {renH.toFixed(2)}
              </span>
            </div>
            <div className="flex h-1.5 w-full rounded bg-[#242424] overflow-hidden">
              <div style={{ width: `${Math.min(100, renL * 100)}%` }} className="bg-zinc-600"></div>
              <div style={{ width: `${Math.min(100, renM * 100)}%` }} className="bg-amber-500"></div>
              <div style={{ width: `${Math.min(100, renH * 100)}%` }} className="bg-amber-300"></div>
            </div>
          </div>

          {/* SoC */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-cyan-400">Battery SoC:</span>
              <span className="text-zinc-300">
                L: {socL.toFixed(2)} | M: {socM.toFixed(2)} | H: {socH.toFixed(2)}
              </span>
            </div>
            <div className="flex h-1.5 w-full rounded bg-[#242424] overflow-hidden">
              <div style={{ width: `${Math.min(100, socL * 100)}%` }} className="bg-red-500"></div>
              <div style={{ width: `${Math.min(100, socM * 100)}%` }} className="bg-cyan-400"></div>
              <div style={{ width: `${Math.min(100, socH * 100)}%` }} className="bg-[#3ecf8e]"></div>
            </div>
          </div>

          {/* Demand */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-orange-400">Demand Stress:</span>
              <span className="text-zinc-300">
                L: {demL.toFixed(2)} | M: {demM.toFixed(2)} | H: {demH.toFixed(2)}
              </span>
            </div>
            <div className="flex h-1.5 w-full rounded bg-[#242424] overflow-hidden">
              <div style={{ width: `${Math.min(100, demL * 100)}%` }} className="bg-[#3ecf8e]"></div>
              <div style={{ width: `${Math.min(100, demM * 100)}%` }} className="bg-amber-500"></div>
              <div style={{ width: `${Math.min(100, demH * 100)}%` }} className="bg-red-500"></div>
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
            {top_rules.length === 0 ? (
              <div className="bg-[#121212] border border-[#262626] rounded p-2.5 text-[11px] font-mono text-zinc-500 text-center">
                Operating in balanced default state.
              </div>
            ) : (
              top_rules.map((rule, idx) => (
                <div
                  key={idx}
                  className="bg-[#121212] border border-[#262626] rounded p-2 text-[11px] font-mono flex items-start justify-between gap-2"
                >
                  <div className="flex-1 text-zinc-300 leading-tight">
                    {rule.description || `Rule ${idx + 1}`}
                  </div>
                  <span className="font-mono text-[10px] font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 px-2 py-0.5 rounded-full tabular-nums shrink-0">
                    w = {(typeof rule.strength === 'number' ? rule.strength : 0).toFixed(3)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
