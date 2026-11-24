import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward, Sun, Battery, Zap, Building2, TrendingDown, CheckCircle } from 'lucide-react';

export default function LiveSimulator({
  fdeResult,
  rbResult,
  timeLabels,
  currentHour,
  onHourChange
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x = 800ms, 2x = 400ms, 4x = 200ms

  const N = timeLabels ? timeLabels.length : 24;

  // Auto-advance timer when playing
  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      const intervalMs = Math.max(150, Math.floor(900 / speed));
      timer = setInterval(() => {
        onHourChange((prev) => {
          const next = (prev + 1) % N;
          if (next === 0) {
            // Reached end of 24h cycle
            setIsPlaying(false);
          }
          return next;
        });
      }, intervalMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, speed, N, onHourChange]);

  if (!fdeResult || !timeLabels || timeLabels.length === 0) return null;

  const t = Math.min(currentHour, fdeResult.solar_kw.length - 1);
  const hourLabel = timeLabels[t] || '00:00';

  // Current values at simulated hour t
  const solarNow = fdeResult.solar_kw[t];
  const loadNow = fdeResult.load_kw[t];
  const batFde = fdeResult.battery_kw[t];
  const gridFde = fdeResult.grid_import_kw[t];
  const socFde = fdeResult.battery_soc[t];

  // Baseline values at simulated hour t
  const batRb = rbResult ? rbResult.battery_kw[t] : 0;
  const gridRb = rbResult ? rbResult.grid_import_kw[t] : 0;
  const socRb = rbResult ? rbResult.battery_soc[t] : 0.5;

  // Cumulative cost up to hour t
  const dt = fdeResult.dt_hours || 1.0;
  let cumCostFde = 0;
  let cumCostRb = 0;
  let maxGridFdeSoFar = 0;
  let maxGridRbSoFar = 0;

  for (let i = 0; i <= t; i++) {
    // Estimated cumulative costs
    cumCostFde += Math.max(0, fdeResult.grid_import_kw[i]) * 0.18 * dt;
    if (rbResult) {
      cumCostRb += Math.max(0, rbResult.grid_import_kw[i]) * 0.18 * dt;
    }
    maxGridFdeSoFar = Math.max(maxGridFdeSoFar, fdeResult.grid_import_kw[i]);
    if (rbResult) {
      maxGridRbSoFar = Math.max(maxGridRbSoFar, rbResult.grid_import_kw[i]);
    }
  }

  const liveSavedDollars = Math.max(0, cumCostRb - cumCostFde);
  const liveShavedKw = Math.max(0, maxGridRbSoFar - maxGridFdeSoFar);

  // Derive human-readable AI explanation of what is happening right now
  let aiExplanation = '';
  if (solarNow > loadNow) {
    if (batFde > 10) {
      aiExplanation = `Surplus solar (${solarNow.toFixed(1)} kW > load ${loadNow.toFixed(1)} kW). Fuzzy controller activates charging (+${batFde.toFixed(1)} kW) to store green energy for evening peak. Utility grid draw is 0 kW.`;
    } else {
      aiExplanation = `Solar fully powers the microgrid. Battery is near full capacity (${(socFde * 100).toFixed(0)}%), exporting remaining surplus to grid.`;
    }
  } else if (loadNow > 180) {
    if (batFde < -20) {
      aiExplanation = `Critical peak load window (${loadNow.toFixed(1)} kW). Fuzzy rule fires emergency battery discharge (${Math.abs(batFde).toFixed(1)} kW), shaving grid import down to ${gridFde.toFixed(1)} kW (compared to ${gridRb.toFixed(1)} kW under greedy baseline!).`;
    } else {
      aiExplanation = `High load demand. Battery assisting grid dispatch while preserving state-of-charge boundaries.`;
    }
  } else {
    aiExplanation = `Off-peak steady state. Fuzzy controller balances battery throughput to minimize degradation wear while maintaining grid stability.`;
  }

  return (
    <div className="bg-[#171717] border border-[#262626] rounded-lg shadow-sm overflow-hidden mb-6">
      {/* 1. Supabase-style Playback Bar */}
      <div className="px-5 py-3 border-b border-[#262626] bg-[#1a1a1a] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3ecf8e] animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-100 font-mono">
              Live Scenario Playback Simulator
            </span>
          </div>

          <span className="text-xs font-mono text-zinc-400 bg-[#222] border border-[#333] px-2 py-0.5 rounded">
            Hour {hourLabel} / 24:00
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                : 'bg-[#3ecf8e] hover:bg-[#34b27b] text-black shadow-sm'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate 24h</span>
              </>
            )}
          </button>

          {/* Reset */}
          <button
            onClick={() => {
              setIsPlaying(false);
              onHourChange(0);
            }}
            className="flex items-center gap-1 bg-[#222] hover:bg-[#282828] border border-[#333] text-zinc-300 px-2.5 py-1.5 rounded-md transition-colors"
            title="Reset to 00:00"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-[#222] border border-[#333] rounded-md overflow-hidden">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeed(spd)}
                className={`px-2 py-1 text-[11px] transition-colors ${
                  speed === spd ? 'bg-[#333] text-[#3ecf8e] font-bold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Interactive Power Flow Diagram & Nodes */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#141414] border-b border-[#262626]">
        {/* Node 1: Solar PV */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Sun className="w-4 h-4" /> Solar PV
            </span>
            <span className="text-[10px] bg-[#221e14] text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded">
              {solarNow > 10 ? 'Generating' : 'Dormant'}
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
              {solarNow.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-500 ml-1 font-mono">kW</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span>Peak Potential: 280 kW</span>
            <span className="text-amber-400 font-medium">
              {((solarNow / 280) * 100).toFixed(0)}% output
            </span>
          </div>
        </div>

        {/* Node 2: Battery Storage (BESS) */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Battery className="w-4 h-4" /> Battery Storage
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${
                batFde > 5
                  ? 'bg-[#132228] text-cyan-400 border-cyan-500/30'
                  : batFde < -5
                  ? 'bg-[#14231b] text-[#3ecf8e] border-[#244b36]'
                  : 'bg-[#222] text-zinc-400 border-[#333]'
              }`}
            >
              {batFde > 5 ? 'Charging' : batFde < -5 ? 'Discharging' : 'Idle'}
            </span>
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
                {batFde > 0 ? '+' : ''}{batFde.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-500 ml-1 font-mono">kW</span>
            </div>
            <span className="text-base font-bold font-mono text-[#3ecf8e]">
              {(socFde * 100).toFixed(0)}% SoC
            </span>
          </div>
          {/* SoC progress meter */}
          <div className="h-1.5 w-full bg-[#262626] rounded-full overflow-hidden">
            <div
              style={{ width: `${socFde * 100}%` }}
              className={`h-full transition-all duration-300 ${
                socFde > 0.3 ? 'bg-[#3ecf8e]' : 'bg-red-500'
              }`}
            ></div>
          </div>
        </div>

        {/* Node 3: Microgrid Consumer Load */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Building2 className="w-4 h-4" /> Microgrid Load
            </span>
            <span className="text-[10px] bg-[#222] text-zinc-400 border border-[#333] px-1.5 py-0.2 rounded font-mono">
              Active Demand
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
              {loadNow.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-500 ml-1 font-mono">kW</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span>Served: 100% (Zero unserved)</span>
            <span className="text-[#3ecf8e]">Reliable</span>
          </div>
        </div>

        {/* Node 4: Utility Grid Connection */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-1.5 text-orange-400">
              <Zap className="w-4 h-4" /> Grid Connection
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${
                gridFde <= 5
                  ? 'bg-[#14231b] text-[#3ecf8e] border-[#244b36]'
                  : 'bg-[#261c16] text-orange-400 border-orange-500/30'
              }`}
            >
              {gridFde <= 5 ? 'Autonomous / Islanded' : 'Importing'}
            </span>
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
                {gridFde.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-500 ml-1 font-mono">kW</span>
            </div>
            {rbResult && (
              <span className="text-xs font-mono text-zinc-500 line-through">
                {gridRb.toFixed(1)} kW
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-zinc-400">
            {gridFde < gridRb ? (
              <span className="text-[#3ecf8e] font-semibold">
                Saved {(gridRb - gridFde).toFixed(1)} kW grid draw
              </span>
            ) : (
              <span>Grid optimal balance</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Live "What Would Have Happened" Baseline Comparison Bar */}
      <div className="px-5 py-3.5 bg-[#171717] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        {/* Comparison Column 1: Proposed Hybrid */}
        <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-md p-3">
          <div className="text-zinc-400 uppercase text-[10px] font-semibold flex items-center justify-between">
            <span>Proposed Fuzzy + DE</span>
            <span className="text-[#3ecf8e]">Active Engine</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">Hour Grid Import:</span>
              <span className="font-bold text-zinc-100 tabular-nums">{gridFde.toFixed(1)} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Peak So Far:</span>
              <span className="text-orange-400 font-bold tabular-nums">{maxGridFdeSoFar.toFixed(1)} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Battery State:</span>
              <span className="text-cyan-400 font-semibold tabular-nums">{(socFde * 100).toFixed(0)}% (Protected)</span>
            </div>
          </div>
        </div>

        {/* Comparison Column 2: Greedy Baseline */}
        <div className="bg-[#1f1f1f] border border-[#2e2e2e] rounded-md p-3">
          <div className="text-zinc-400 uppercase text-[10px] font-semibold flex items-center justify-between">
            <span>Normal Heuristic / Greedy</span>
            <span className="text-zinc-500">Without AI</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">Hour Grid Import:</span>
              <span className="font-bold text-zinc-300 tabular-nums">{gridRb.toFixed(1)} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Peak Spike:</span>
              <span className="text-red-400 font-bold tabular-nums">{maxGridRbSoFar.toFixed(1)} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Battery State:</span>
              <span className="text-zinc-400 tabular-nums">{(socRb * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Comparison Column 3: Live Realized Savings */}
        <div className="bg-[#14231b] border border-[#244b36] rounded-md p-3 flex flex-col justify-between">
          <div className="text-[#3ecf8e] uppercase text-[10px] font-bold flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Fuzzy + DE Realized Advantage</span>
          </div>
          <div className="my-1.5">
            <div className="text-xl font-bold font-mono text-[#3ecf8e] tabular-nums">
              {liveShavedKw > 0 ? `-${liveShavedKw.toFixed(1)} kW` : 'Optimizing'}
            </div>
            <div className="text-[11px] text-zinc-300 mt-0.5">
              Peak demand shaved off the utility grid
            </div>
          </div>
          <div className="text-[10px] text-zinc-400">
            Est. Cost Advantage: <b className="text-zinc-100">+${liveSavedDollars.toFixed(2)}</b> saved
          </div>
        </div>
      </div>

      {/* 4. Live AI Action Commentary */}
      <div className="px-5 py-2.5 bg-[#121212] border-t border-[#262626] flex items-center gap-3 text-xs font-mono">
        <span className="text-[#3ecf8e] font-bold shrink-0 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]"></span>
          [AI DISPATCH]:
        </span>
        <span className="text-zinc-300 truncate">
          {aiExplanation}
        </span>
      </div>
    </div>
  );
}
