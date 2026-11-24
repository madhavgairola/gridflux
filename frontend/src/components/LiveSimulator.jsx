import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Sun, Battery, Zap, Building2, CheckCircle2, Clock, GitCompare, Layers, Eye } from 'lucide-react';

// Safe Monotone-clamped cubic spline for progressive curves
function getMonotonePath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    // Single point: emit tiny horizontal segment so SVG renders visible line/cap
    const x = points[0][0];
    const y = points[0][1];
    return `M ${x.toFixed(1)} ${y.toFixed(1)} L ${(x + 0.5).toFixed(1)} ${y.toFixed(1)}`;
  }
  if (points.length === 2) return `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)} L ${points[1][0].toFixed(1)} ${points[1][1].toFixed(1)}`;

  const n = points.length;
  const dxs = [];
  const dys = [];
  const ms = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    dxs.push(dx);
    dys.push(dy);
    ms.push(dx === 0 ? 0 : dy / dx);
  }

  const tangents = [ms[0]];
  for (let i = 0; i < n - 2; i++) {
    const m = ms[i];
    const nextM = ms[i + 1];
    if (m * nextM <= 0) {
      tangents.push(0);
    } else {
      const dx1 = dxs[i];
      const dx2 = dxs[i + 1];
      const common = dx1 + dx2;
      tangents.push(common === 0 ? 0 : (3 * common) / ((common + dx2) / m + (common + dx1) / nextM));
    }
  }
  tangents.push(ms[ms.length - 1]);

  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = dxs[i];
    const cp1x = p1[0] + dx / 3;
    const cp1y = p1[1] + (tangents[i] * dx) / 3;
    const cp2x = p2[0] - dx / 3;
    const cp2y = p2[1] - (tangents[i + 1] * dx) / 3;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export default function LiveSimulator({
  fdeResult,
  pdeResult,
  rbResult,
  timeLabels,
  currentHour,
  onHourChange
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [simMode, setSimMode] = useState('fde'); // 'fde' | 'pde' | 'rb' | 'dual'
  const [activeSeries, setActiveSeries] = useState({
    solar: true,
    load: true,
    battery: true,
    grid: true
  });

  const N = timeLabels && timeLabels.length > 0 ? timeLabels.length : 24;

  // Auto-advance timer when playing
  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      const intervalMs = Math.max(120, Math.floor(800 / speed));
      timer = setInterval(() => {
        onHourChange((prev) => {
          const currentVal = typeof prev === 'number' ? prev : 0;
          if (currentVal >= N - 1) {
            setIsPlaying(false);
            return currentVal;
          }
          return currentVal + 1;
        });
      }, intervalMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, speed, N, onHourChange]);

  if (!fdeResult || !timeLabels || timeLabels.length === 0) return null;

  // Resolve which dataset is active
  let activeDataset = fdeResult;
  let activeModeName = 'Proposed: Fuzzy + DE';
  let activeColor = '#3ecf8e';

  if (simMode === 'pde' && pdeResult) {
    activeDataset = pdeResult;
    activeModeName = 'Standard Plain DE (No Fuzzy)';
    activeColor = '#818cf8';
  } else if (simMode === 'rb' && rbResult) {
    activeDataset = rbResult;
    activeModeName = 'Heuristic Greedy Baseline';
    activeColor = '#c084fc';
  } else if (simMode === 'dual') {
    activeDataset = fdeResult;
    activeModeName = 'Dual Head-to-Head Comparison';
    activeColor = '#3ecf8e';
  }

  const t = Math.max(0, Math.min(Number(currentHour) || 0, N - 1));
  const hourLabel = timeLabels[t] || '00:00';
  const isSimulationComplete = t >= N - 1;

  // Real-time telemetry at hour t
  const solarNow = Number(activeDataset.solar_kw[t]) || 0;
  const loadNow = Number(activeDataset.load_kw[t]) || 0;
  const batNow = Number(activeDataset.battery_kw[t]) || 0;
  const gridNow = Number(activeDataset.grid_import_kw[t]) || 0;
  const socNow = Number(activeDataset.battery_soc[t]) || 0.5;

  // Baseline telemetry at hour t for comparison
  const gridFdeNow = Number(fdeResult.grid_import_kw[t]) || 0;
  const gridPdeNow = pdeResult ? Number(pdeResult.grid_import_kw[t]) || 0 : 0;
  const gridRbNow = rbResult ? Number(rbResult.grid_import_kw[t]) || 0 : 0;
  const batRbNow = rbResult ? Number(rbResult.battery_kw[t]) || 0 : 0;
  const socRbNow = rbResult ? Number(rbResult.battery_soc[t]) || 0.5 : 0.5;

  // Cumulative cost calculations up to hour t
  const dt = fdeResult.dt_hours || 1.0;
  let cumCostFde = 0;
  let cumCostRb = 0;
  let maxGridFdeSoFar = 0;
  let maxGridRbSoFar = 0;

  for (let i = 0; i <= t; i++) {
    cumCostFde += Math.max(0, Number(fdeResult.grid_import_kw[i]) || 0) * 0.18 * dt;
    if (rbResult && rbResult.grid_import_kw) {
      cumCostRb += Math.max(0, Number(rbResult.grid_import_kw[i]) || 0) * 0.18 * dt;
      maxGridRbSoFar = Math.max(maxGridRbSoFar, Number(rbResult.grid_import_kw[i]) || 0);
    }
    maxGridFdeSoFar = Math.max(maxGridFdeSoFar, Number(fdeResult.grid_import_kw[i]) || 0);
  }

  const liveSavedDollars = Math.max(0, cumCostRb - cumCostFde);
  const liveShavedKw = Math.max(0, maxGridRbSoFar - maxGridFdeSoFar);

  // Progressive Chart Dimensions & Scale
  const width = 880;
  const height = 330;
  const padding = { top: 25, right: 30, bottom: 40, left: 75 };

  // Dynamic Y-axis bounds ensuring high peaks in rule-based never clip
  const minPower = -120;
  const maxPower = 340;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scaleX = (idx) => padding.left + (idx / Math.max(1, N - 1)) * chartW;
  const scaleY = (val) => padding.top + chartH - ((val - minPower) / (maxPower - minPower)) * chartH;
  const yZero = scaleY(0);

  // PROGRESSIVE REVEAL: Sliced up to current hour t
  // If at t=0, show at least first 2 points or starting point so chart is never blank!
  const revealedLength = Math.max(1, t + 1);

  const solarPoints = activeDataset.solar_kw.slice(0, revealedLength).map((val, idx) => [scaleX(idx), scaleY(val)]);
  const loadPoints = activeDataset.load_kw.slice(0, revealedLength).map((val, idx) => [scaleX(idx), scaleY(val)]);
  const batteryPoints = activeDataset.battery_kw.slice(0, revealedLength).map((val, idx) => [scaleX(idx), scaleY(val)]);
  const gridPoints = activeDataset.grid_import_kw.slice(0, revealedLength).map((val, idx) => [scaleX(idx), scaleY(val)]);

  // Dual Comparison Overlay Points (revealed up to t)
  const fdeGridPoints = fdeResult.grid_import_kw.slice(0, revealedLength).map((val, idx) => [scaleX(idx), scaleY(val)]);
  const pdeGridPoints = pdeResult && pdeResult.grid_import_kw
    ? pdeResult.grid_import_kw.slice(0, revealedLength).map((val, idx) => [scaleX(idx), scaleY(val)])
    : [];
  const rbGridPoints = rbResult && rbResult.grid_import_kw
    ? rbResult.grid_import_kw.slice(0, revealedLength).map((val, idx) => [scaleX(idx), scaleY(val)])
    : [];

  // Full 24-Hour Silhouette/Ghost Curves (always visible faintly so chart is never empty!)
  const ghostSolarPoints = activeDataset.solar_kw.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const ghostLoadPoints = activeDataset.load_kw.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const ghostBatteryPoints = activeDataset.battery_kw.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const ghostGridPoints = activeDataset.grid_import_kw.map((val, idx) => [scaleX(idx), scaleY(val)]);

  const ghostFdeGridPoints = fdeResult.grid_import_kw.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const ghostPdeGridPoints = pdeResult && pdeResult.grid_import_kw
    ? pdeResult.grid_import_kw.map((val, idx) => [scaleX(idx), scaleY(val)])
    : [];
  const ghostRbGridPoints = rbResult && rbResult.grid_import_kw
    ? rbResult.grid_import_kw.map((val, idx) => [scaleX(idx), scaleY(val)])
    : [];

  const handleSelectMode = (mode) => {
    setSimMode(mode);
    // If paused at 00:00, reveal the day so the user instantly sees this mode's curve
    if (t === 0 && !isPlaying) {
      onHourChange(N - 1);
    }
  };

  const currentX = scaleX(t);

  return (
    <div className="space-y-5">
      {/* 1. Supabase-style Algorithm Mode Selector & Playback Bar */}
      <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 shadow-sm space-y-4">
        {/* Row 1: Algorithm Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262626] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#3ecf8e]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-100 font-mono">
              Simulation Dispatch Mode:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <button
              onClick={() => handleSelectMode('fde')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all border cursor-pointer ${
                simMode === 'fde'
                  ? 'bg-[#14231b] text-[#3ecf8e] border-[#244b36] font-bold shadow-sm'
                  : 'bg-[#1f1f1f] text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
              <span>Proposed: Fuzzy + DE</span>
            </button>

            {pdeResult && (
              <button
                onClick={() => handleSelectMode('pde')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all border cursor-pointer ${
                  simMode === 'pde'
                    ? 'bg-[#1a1c2e] text-indigo-400 border-indigo-500/40 font-bold shadow-sm'
                    : 'bg-[#1f1f1f] text-zinc-400 border-transparent hover:text-zinc-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span>Plain DE (No Fuzzy)</span>
              </button>
            )}

            {rbResult && (
              <button
                onClick={() => handleSelectMode('rb')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all border cursor-pointer ${
                  simMode === 'rb'
                    ? 'bg-[#251829] text-purple-400 border-purple-500/40 font-bold shadow-sm'
                    : 'bg-[#1f1f1f] text-zinc-400 border-transparent hover:text-zinc-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                <span>Normal Heuristic Greedy</span>
              </button>
            )}

            {rbResult && (
              <button
                onClick={() => handleSelectMode('dual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all border cursor-pointer ${
                  simMode === 'dual'
                    ? 'bg-[#242416] text-amber-300 border-amber-500/50 font-bold shadow-sm'
                    : 'bg-[#1f1f1f] text-zinc-400 border-transparent hover:text-zinc-200'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Head-to-Head Comparison</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Playback Controls & Timeline Scrubber */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            {/* Play / Pause */}
            <button
              onClick={() => {
                if (isSimulationComplete) {
                  onHourChange(0);
                  setIsPlaying(true);
                } else {
                  setIsPlaying(!isPlaying);
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md font-semibold text-xs transition-all cursor-pointer ${
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
              ) : isSimulationComplete ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replay 24h</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Simulation</span>
                </>
              )}
            </button>

            {/* Quick Full Day Reveal */}
            <button
              onClick={() => {
                setIsPlaying(false);
                onHourChange(N - 1);
              }}
              className="flex items-center gap-1 bg-[#222] hover:bg-[#282828] border border-[#333] text-zinc-200 px-3 py-2 rounded-md transition-colors cursor-pointer"
              title="Show completed 24-hour graph"
            >
              <Eye className="w-3.5 h-3.5 text-[#3ecf8e]" />
              <span>Show Full Day</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-[#222] border border-[#333] rounded-md overflow-hidden">
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSpeed(spd)}
                  className={`px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                    speed === spd ? 'bg-[#333] text-[#3ecf8e] font-bold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Drag Scrubber Slider */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] font-mono text-zinc-400">
            <span>00:00</span>
            <span className="text-[#3ecf8e] font-bold">{hourLabel}</span>
            <span>24:00</span>
          </div>
          <input
            type="range"
            min="0"
            max={N - 1}
            value={t}
            onChange={(e) => {
              setIsPlaying(false);
              onHourChange(Number(e.target.value));
            }}
            className="w-full accent-[#3ecf8e] bg-[#262626] h-2 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* 2. Microgrid Physical Flow Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Solar PV */}
        <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Sun className="w-4 h-4" /> Solar PV Array
            </span>
            <span className="text-[10px] bg-[#221e14] text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded">
              {solarNow > 10 ? 'Generating' : 'Dark'}
            </span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold font-mono text-zinc-100 tabular-nums">
              {solarNow.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-400 ml-1 font-mono">kW</span>
          </div>
          <div className="text-xs font-mono text-zinc-400">
            Peak Capacity: 280 kW max
          </div>
        </div>

        {/* Battery Storage */}
        <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <Battery className="w-4 h-4" /> Battery Storage
            </span>
            <span className="text-[10px] bg-[#14231b] text-[#3ecf8e] border border-[#244b36] px-1.5 py-0.2 rounded font-mono">
              {batNow > 5 ? 'Charging' : batNow < -5 ? 'Discharging' : 'Float'}
            </span>
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-bold font-mono text-zinc-100 tabular-nums">
                {batNow > 0 ? '+' : ''}{batNow.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-400 ml-1 font-mono">kW</span>
            </div>
            <span className="text-lg font-bold font-mono text-[#3ecf8e]">
              {(socNow * 100).toFixed(0)}% SoC
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#242424] rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.min(100, Math.max(0, socNow * 100))}%` }}
              className="h-full bg-[#3ecf8e] transition-all duration-200"
            ></div>
          </div>
        </div>

        {/* Microgrid Load */}
        <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-zinc-200 font-medium">
              <Building2 className="w-4 h-4" /> Microgrid Load
            </span>
            <span className="text-[10px] bg-[#222] text-zinc-400 border border-[#333] px-1.5 py-0.2 rounded">
              Demand
            </span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold font-mono text-zinc-100 tabular-nums">
              {loadNow.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-400 ml-1 font-mono">kW</span>
          </div>
          <div className="text-xs font-mono text-zinc-400">
            Reliability: 100% served
          </div>
        </div>

        {/* Utility Grid Connection */}
        <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-orange-400 font-medium">
              <Zap className="w-4 h-4" /> Utility Grid Import
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${
                gridNow <= 5
                  ? 'bg-[#14231b] text-[#3ecf8e] border-[#244b36]'
                  : 'bg-[#261c16] text-orange-400 border-orange-500/30'
              }`}
            >
              {gridNow <= 5 ? 'Zero Draw' : 'Importing'}
            </span>
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-bold font-mono text-zinc-100 tabular-nums">
                {gridNow.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-400 ml-1 font-mono">kW</span>
            </div>
            {rbResult && simMode !== 'rb' && (
              <span className="text-xs font-mono text-zinc-500 line-through" title="Greedy baseline draw">
                {gridRbNow.toFixed(1)} kW
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-[#3ecf8e]">
            {simMode !== 'rb' && gridNow < gridRbNow ? `Shaved ${(gridRbNow - gridNow).toFixed(1)} kW` : 'Active state'}
          </div>
        </div>
      </div>

      {/* 3. Progressive Drawing Canvas */}
      <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-[#262626] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                {simMode === 'dual'
                  ? 'Dual Comparison: Fuzzy+DE vs Baseline Grid Import Over Time'
                  : `Live Progressive Power Curve: ${activeModeName}`}
              </h3>
              <span className="text-[10px] font-mono text-[#3ecf8e] bg-[#14231b] border border-[#244b36] px-2 py-0.5 rounded">
                Plotting from 00:00 to {hourLabel}
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              {simMode === 'dual'
                ? 'Solid Green = Proposed Fuzzy+DE | Dashed Red = Normal Greedy Baseline (Huge Peak Spikes!)'
                : 'Curves reveal progressively as time advances. Scrub slider or press Play to simulate.'}
            </p>
          </div>

          {/* Series Toggles or Legend */}
          {simMode === 'dual' ? (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#14231b] text-[#3ecf8e] border border-[#244b36]">
                <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
                <span>Fuzzy + DE Import</span>
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#2b1618] text-red-400 border border-red-500/30">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span>Normal Greedy Import</span>
              </span>
              {pdeResult && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1a1c2e] text-indigo-400 border border-indigo-500/30">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  <span>Plain DE</span>
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <button
                onClick={() => setActiveSeries((s) => ({ ...s, solar: !s.solar }))}
                className={`px-2.5 py-1 rounded text-xs border cursor-pointer ${
                  activeSeries.solar ? 'bg-[#221e14] border-amber-500/50 text-amber-400' : 'bg-[#1f1f1f] text-zinc-500 border-transparent'
                }`}
              >
                Solar PV
              </button>
              <button
                onClick={() => setActiveSeries((s) => ({ ...s, load: !s.load }))}
                className={`px-2.5 py-1 rounded text-xs border cursor-pointer ${
                  activeSeries.load ? 'bg-[#202020] border-zinc-500/50 text-zinc-200' : 'bg-[#1f1f1f] text-zinc-500 border-transparent'
                }`}
              >
                Load
              </button>
              <button
                onClick={() => setActiveSeries((s) => ({ ...s, battery: !s.battery }))}
                className={`px-2.5 py-1 rounded text-xs border cursor-pointer ${
                  activeSeries.battery ? 'bg-[#132228] border-cyan-500/50 text-cyan-400' : 'bg-[#1f1f1f] text-zinc-500 border-transparent'
                }`}
              >
                Battery
              </button>
              <button
                onClick={() => setActiveSeries((s) => ({ ...s, grid: !s.grid }))}
                className={`px-2.5 py-1 rounded text-xs border cursor-pointer ${
                  activeSeries.grid ? 'bg-[#261c16] border-orange-500/50 text-orange-400' : 'bg-[#1f1f1f] text-zinc-500 border-transparent'
                }`}
              >
                Grid Import
              </button>
            </div>
          )}
        </div>

        {/* SVG Drawing Canvas */}
        <div className="relative h-[290px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <defs>
              <linearGradient id="liveSolarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="fdeGridGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3ecf8e" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3ecf8e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Y-Axis Gridlines & Values */}
            {[-100, -50, 0, 50, 100, 150, 200, 250, 300].map((tickVal) => {
              const y = scaleY(tickVal);
              return (
                <g key={tickVal}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke={tickVal === 0 ? '#444' : '#262626'}
                    strokeWidth={tickVal === 0 ? 1.5 : 1}
                    strokeDasharray={tickVal === 0 ? 'none' : '4 4'}
                  />
                  <text
                    x={padding.left - 12}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#e4e4e7"
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    {tickVal} kW
                  </text>
                </g>
              );
            })}

            {/* X-axis tick labels across all 24h */}
            {timeLabels.map((lbl, idx) => {
              if (idx % 3 !== 0 && idx !== N - 1) return null;
              const x = scaleX(idx);
              const isPast = idx <= t;
              return (
                <g key={idx}>
                  <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 6} stroke={isPast ? '#3ecf8e' : '#333'} />
                  <text
                    x={x}
                    y={height - padding.bottom + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill={isPast ? '#f4f4f5' : '#52525b'}
                    fontFamily="monospace"
                    fontWeight={isPast ? '600' : 'normal'}
                  >
                    {lbl}
                  </text>
                </g>
              );
            })}

            {/* UNREVEALED FUTURE ZONE MASK */}
            {t < N - 1 && (
              <rect
                x={currentX}
                y={padding.top}
                width={width - padding.right - currentX}
                height={chartH}
                fill="rgba(18, 18, 18, 0.45)"
                stroke="#333"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            )}

            {/* DUAL COMPARISON MODE RENDERING */}
            {simMode === 'dual' ? (
              <g pointerEvents="none">
                {/* 24-Hour Ghost Reference Silhouettes */}
                {ghostRbGridPoints.length > 0 && (
                  <path
                    d={getMonotonePath(ghostRbGridPoints)}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.22"
                  />
                )}
                {ghostPdeGridPoints.length > 0 && (
                  <path
                    d={getMonotonePath(ghostPdeGridPoints)}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.22"
                  />
                )}
                {ghostFdeGridPoints.length > 0 && (
                  <path
                    d={getMonotonePath(ghostFdeGridPoints)}
                    fill="none"
                    stroke="#3ecf8e"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.25"
                  />
                )}

                {/* Solar PV Reference */}
                <path
                  d={getMonotonePath(solarPoints)}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.8"
                  opacity="0.4"
                />

                {/* Microgrid Load Reference */}
                <path
                  d={getMonotonePath(loadPoints)}
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                  opacity="0.4"
                />

                {/* Baseline Normal Greedy Grid Import (Red dashed spike!) */}
                {rbGridPoints.length > 0 && (
                  <path
                    d={getMonotonePath(rbGridPoints)}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.8"
                    strokeDasharray="6 3"
                    strokeLinecap="round"
                  />
                )}

                {/* Plain DE Grid Import (Indigo dashed) */}
                {pdeGridPoints.length > 0 && (
                  <path
                    d={getMonotonePath(pdeGridPoints)}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2.0"
                    strokeDasharray="4 2"
                    strokeLinecap="round"
                  />
                )}

                {/* Proposed Fuzzy + DE Grid Import (Solid Mint Green #3ecf8e!) */}
                {fdeGridPoints.length > 0 && (
                  <>
                    <path
                      d={`${getMonotonePath(fdeGridPoints)} L ${currentX} ${yZero} L ${scaleX(0)} ${yZero} Z`}
                      fill="url(#fdeGridGrad)"
                    />
                    <path
                      d={getMonotonePath(fdeGridPoints)}
                      fill="none"
                      stroke="#3ecf8e"
                      strokeWidth="3.0"
                      strokeLinecap="round"
                    />
                  </>
                )}
              </g>
            ) : (
              /* SINGLE ALGORITHM MODE RENDERING (fde / pde / rb) */
              <g pointerEvents="none">
                {/* 24-Hour Ghost Reference Silhouettes */}
                {activeSeries.solar && ghostSolarPoints.length > 0 && (
                  <path
                    d={getMonotonePath(ghostSolarPoints)}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.4"
                    strokeDasharray="3 3"
                    opacity="0.2"
                  />
                )}
                {activeSeries.load && ghostLoadPoints.length > 0 && (
                  <path
                    d={getMonotonePath(ghostLoadPoints)}
                    fill="none"
                    stroke="#a1a1aa"
                    strokeWidth="1.4"
                    strokeDasharray="3 3"
                    opacity="0.2"
                  />
                )}
                {activeSeries.battery && ghostBatteryPoints.length > 0 && (
                  <path
                    d={getMonotonePath(ghostBatteryPoints)}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.4"
                    strokeDasharray="3 3"
                    opacity="0.2"
                  />
                )}
                {activeSeries.grid && ghostGridPoints.length > 0 && (
                  <path
                    d={getMonotonePath(ghostGridPoints)}
                    fill="none"
                    stroke={simMode === 'rb' ? '#c084fc' : simMode === 'pde' ? '#818cf8' : '#f97316'}
                    strokeWidth="1.4"
                    strokeDasharray="3 3"
                    opacity="0.2"
                  />
                )}

                {/* Trace 1: Solar */}
                {activeSeries.solar && solarPoints.length > 0 && (
                  <g>
                    <path
                      d={`${getMonotonePath(solarPoints)} L ${currentX} ${yZero} L ${scaleX(0)} ${yZero} Z`}
                      fill="url(#liveSolarGrad)"
                    />
                    <path
                      d={getMonotonePath(solarPoints)}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </g>
                )}

                {/* Trace 2: Load */}
                {activeSeries.load && loadPoints.length > 0 && (
                  <path
                    d={getMonotonePath(loadPoints)}
                    fill="none"
                    stroke="#a1a1aa"
                    strokeWidth="2.2"
                    strokeDasharray="4 3"
                    strokeLinecap="round"
                  />
                )}

                {/* Trace 3: Battery */}
                {activeSeries.battery && batteryPoints.length > 0 && (
                  <path
                    d={getMonotonePath(batteryPoints)}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                )}

                {/* Trace 4: Grid Import */}
                {activeSeries.grid && gridPoints.length > 0 && (
                  <path
                    d={getMonotonePath(gridPoints)}
                    fill="none"
                    stroke={simMode === 'rb' ? '#c084fc' : simMode === 'pde' ? '#818cf8' : '#f97316'}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                )}
              </g>
            )}

            {/* Live Front Needle / Cursor */}
            <line
              pointerEvents="none"
              x1={currentX}
              y1={padding.top}
              x2={currentX}
              y2={height - padding.bottom}
              stroke="#3ecf8e"
              strokeWidth="2"
            />
            {/* Safe marker at current head */}
            <circle
              pointerEvents="none"
              cx={currentX}
              cy={scaleY(gridNow)}
              r="5"
              fill="#f97316"
              stroke="#fff"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>

      {/* 4. Live Comparative Benchmark Box */}
      <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 shadow-sm">
        <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-mono mb-3 flex items-center justify-between">
          <span>Comparative Scenario Benchmark (Hour {hourLabel})</span>
          <span className="text-[10px] text-zinc-400 font-normal">Active Mode: {simMode.toUpperCase()}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-3.5">
            <div className="text-zinc-400 text-[10px] uppercase font-semibold">
              Proposed Fuzzy + DE
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Current Grid Import:</span>
                <span className="font-bold text-zinc-100 tabular-nums">
                  {gridFdeNow.toFixed(1)} kW
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Peak Import So Far:</span>
                <span className="text-orange-400 font-bold tabular-nums">{maxGridFdeSoFar.toFixed(1)} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Battery Status:</span>
                <span className="text-cyan-400 tabular-nums">
                  {fdeResult.battery_soc ? (Number(fdeResult.battery_soc[t]) * 100).toFixed(0) : 50}% SoC
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-3.5">
            <div className="text-zinc-400 text-[10px] uppercase font-semibold">
              Normal Heuristic Greedy
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Current Grid Import:</span>
                <span className="font-bold text-zinc-300 tabular-nums">{gridRbNow.toFixed(1)} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Peak Spike So Far:</span>
                <span className="text-red-400 font-bold tabular-nums">{maxGridRbSoFar.toFixed(1)} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Battery Status:</span>
                <span className="text-zinc-400 tabular-nums">{(socRbNow * 100).toFixed(0)}% SoC</span>
              </div>
            </div>
          </div>

          <div className="bg-[#14231b] border border-[#244b36] rounded-lg p-3.5 flex flex-col justify-between">
            <div className="text-[#3ecf8e] text-[10px] uppercase font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Realized AI Performance</span>
            </div>
            <div className="my-1.5">
              <div className="text-2xl font-bold font-mono text-[#3ecf8e] tabular-nums">
                {liveShavedKw > 0 ? `-${liveShavedKw.toFixed(1)} kW` : 'Optimizing'}
              </div>
              <div className="text-[11px] text-zinc-300 mt-0.5">
                Peak grid surge shaved off utility grid
              </div>
            </div>
            <div className="text-xs text-zinc-300">
              Money Saved: <b className="text-white">+${liveSavedDollars.toFixed(2)}</b>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
