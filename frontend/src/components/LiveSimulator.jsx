import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Sun, Battery, Zap, Building2, CheckCircle2, Award, Clock } from 'lucide-react';

// Monotone-clamped cubic spline for progressive curves
function getMonotonePath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;

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
  rbResult,
  timeLabels,
  currentHour,
  onHourChange
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [activeSeries, setActiveSeries] = useState({
    solar: true,
    load: true,
    battery: true,
    grid: true
  });

  const N = timeLabels ? timeLabels.length : 24;

  // Auto-advance timer when playing
  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      const intervalMs = Math.max(120, Math.floor(800 / speed));
      timer = setInterval(() => {
        onHourChange((prev) => {
          if (prev >= N - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
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
  const isSimulationComplete = t >= N - 1;

  // Current values at simulated hour t
  const solarNow = fdeResult.solar_kw[t];
  const loadNow = fdeResult.load_kw[t];
  const batFde = fdeResult.battery_kw[t];
  const gridFde = fdeResult.grid_import_kw[t];
  const socFde = fdeResult.battery_soc[t];

  const batRb = rbResult ? rbResult.battery_kw[t] : 0;
  const gridRb = rbResult ? rbResult.grid_import_kw[t] : 0;
  const socRb = rbResult ? rbResult.battery_soc[t] : 0.5;

  // Cumulative tracking up to hour t
  const dt = fdeResult.dt_hours || 1.0;
  let cumCostFde = 0;
  let cumCostRb = 0;
  let maxGridFdeSoFar = 0;
  let maxGridRbSoFar = 0;

  for (let i = 0; i <= t; i++) {
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

  // Progressive Chart Geometry
  const width = 880;
  const height = 320;
  const padding = { top: 25, right: 30, bottom: 40, left: 75 };

  const minPower = -120;
  const maxPower = 320;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scaleX = (idx) => padding.left + (idx / (N - 1)) * chartW;
  const scaleY = (val) => padding.top + chartH - ((val - minPower) / (maxPower - minPower)) * chartH;
  const yZero = scaleY(0);

  // PROGRESSIVE SLICING: ONLY UP TO CURRENT HOUR t!
  const revealedLength = t + 1;
  const solarPoints = fdeResult.solar_kw.slice(0, revealedLength).map((val, idx) => [scaleX(idx), scaleY(val)]);
  const loadPoints = fdeResult.load_kw.slice(0, revealedLength).map((val, idx) => [scaleX(idx), scaleY(val)]);
  const batteryPoints = fdeResult.battery_kw.slice(0, revealedLength).map((val, idx) => [scaleX(idx), scaleY(val)]);
  const gridPoints = fdeResult.grid_import_kw.slice(0, revealedLength).map((val, idx) => [scaleX(idx), scaleY(val)]);

  const currentX = scaleX(t);

  // AI Narrative Commentary
  let aiExplanation = '';
  if (solarNow > loadNow) {
    if (batFde > 10) {
      aiExplanation = `Surplus solar (${solarNow.toFixed(1)} kW > load ${loadNow.toFixed(1)} kW). Fuzzy controller routes +${batFde.toFixed(1)} kW into Battery. Utility grid import is 0 kW.`;
    } else {
      aiExplanation = `Solar fully powers the microgrid. Battery is at ${(socFde * 100).toFixed(0)}% capacity. Clean renewable autonomy.`;
    }
  } else if (loadNow > 180) {
    if (batFde < -15) {
      aiExplanation = `High load demand (${loadNow.toFixed(1)} kW). Fuzzy controller fires discharge (-${Math.abs(batFde).toFixed(1)} kW), trimming grid draw to ${gridFde.toFixed(1)} kW (preventing a ${gridRb.toFixed(1)} kW baseline surge!).`;
    } else {
      aiExplanation = `High demand window. Balanced dispatch preserving battery reserves.`;
    }
  } else {
    aiExplanation = `Off-peak steady balance. Battery floating, grid import held at economic baseline.`;
  }

  return (
    <div className="space-y-5">
      {/* 1. Supabase-style Playback Bar */}
      <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-[#3ecf8e] animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-sm font-semibold text-zinc-100 font-mono tracking-wide">
              {isPlaying ? 'SIMULATION IN PROGRESS' : isSimulationComplete ? 'SIMULATION COMPLETED' : 'SIMULATION PAUSED'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#202020] border border-[#333] px-3 py-1 rounded-md text-xs font-mono text-zinc-200">
            <Clock className="w-3.5 h-3.5 text-[#3ecf8e]" />
            <span>Progress: <b className="text-zinc-100">{hourLabel}</b> / 24:00</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => {
              if (isSimulationComplete) {
                onHourChange(0);
                setIsPlaying(true);
              } else {
                setIsPlaying(!isPlaying);
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md font-semibold text-xs transition-all ${
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
                <span>Re-simulate 24h</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Simulation</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              onHourChange(0);
            }}
            className="flex items-center gap-1 bg-[#222] hover:bg-[#282828] border border-[#333] text-zinc-300 px-3 py-2 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to 00:00</span>
          </button>

          <div className="flex items-center bg-[#222] border border-[#333] rounded-md overflow-hidden">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeed(spd)}
                className={`px-2.5 py-1.5 text-xs transition-colors ${
                  speed === spd ? 'bg-[#333] text-[#3ecf8e] font-bold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Interactive Power Flow Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Sun className="w-4 h-4" /> Solar PV
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
            Capacity: 280 kW max
          </div>
        </div>

        <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <Battery className="w-4 h-4" /> Battery Storage
            </span>
            <span className="text-[10px] bg-[#14231b] text-[#3ecf8e] border border-[#244b36] px-1.5 py-0.2 rounded">
              {batFde > 5 ? 'Charging' : batFde < -5 ? 'Discharging' : 'Float'}
            </span>
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-bold font-mono text-zinc-100 tabular-nums">
                {batFde > 0 ? '+' : ''}{batFde.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-400 ml-1 font-mono">kW</span>
            </div>
            <span className="text-lg font-bold font-mono text-[#3ecf8e]">
              {(socFde * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#242424] rounded-full overflow-hidden">
            <div
              style={{ width: `${socFde * 100}%` }}
              className="h-full bg-[#3ecf8e] transition-all duration-200"
            ></div>
          </div>
        </div>

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
            Served: 100% reliably
          </div>
        </div>

        <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-orange-400 font-medium">
              <Zap className="w-4 h-4" /> Grid Connection
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded border ${
                gridFde <= 5
                  ? 'bg-[#14231b] text-[#3ecf8e] border-[#244b36]'
                  : 'bg-[#261c16] text-orange-400 border-orange-500/30'
              }`}
            >
              {gridFde <= 5 ? 'Zero Draw' : 'Importing'}
            </span>
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-bold font-mono text-zinc-100 tabular-nums">
                {gridFde.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-400 ml-1 font-mono">kW</span>
            </div>
            {rbResult && (
              <span className="text-xs font-mono text-zinc-500 line-through">
                {gridRb.toFixed(1)} kW
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-[#3ecf8e]">
            {gridFde < gridRb ? `Shaved ${(gridRb - gridFde).toFixed(1)} kW` : 'Grid optimal'}
          </div>
        </div>
      </div>

      {/* 3. PROGRESSIVE REAL-TIME CHART: Draws hour-by-hour up to hour t! */}
      <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-[#262626] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Live Progressive Power Curve Drawing
              </h3>
              <span className="text-[10px] font-mono text-[#3ecf8e] bg-[#14231b] border border-[#244b36] px-2 py-0.5 rounded">
                Plotting up to {hourLabel}
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              Graph reveals in real time as the scenario runs from 00:00 to 24:00
            </p>
          </div>

          {/* Series Toggles */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setActiveSeries((s) => ({ ...s, solar: !s.solar }))}
              className={`px-2.5 py-1 rounded text-xs border ${
                activeSeries.solar ? 'bg-[#221e14] border-amber-500/50 text-amber-400' : 'bg-[#1f1f1f] text-zinc-500 border-transparent'
              }`}
            >
              Solar PV
            </button>
            <button
              onClick={() => setActiveSeries((s) => ({ ...s, load: !s.load }))}
              className={`px-2.5 py-1 rounded text-xs border ${
                activeSeries.load ? 'bg-[#202020] border-zinc-500/50 text-zinc-200' : 'bg-[#1f1f1f] text-zinc-500 border-transparent'
              }`}
            >
              Load
            </button>
            <button
              onClick={() => setActiveSeries((s) => ({ ...s, battery: !s.battery }))}
              className={`px-2.5 py-1 rounded text-xs border ${
                activeSeries.battery ? 'bg-[#132228] border-cyan-500/50 text-cyan-400' : 'bg-[#1f1f1f] text-zinc-500 border-transparent'
              }`}
            >
              Battery
            </button>
            <button
              onClick={() => setActiveSeries((s) => ({ ...s, grid: !s.grid }))}
              className={`px-2.5 py-1 rounded text-xs border ${
                activeSeries.grid ? 'bg-[#261c16] border-orange-500/50 text-orange-400' : 'bg-[#1f1f1f] text-zinc-500 border-transparent'
              }`}
            >
              Grid Import
            </button>
          </div>
        </div>

        {/* SVG Drawing Canvas */}
        <div className="relative h-[290px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <defs>
              <linearGradient id="liveSolarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
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

            {/* Trace 1: Solar (Drawn up to hour t!) */}
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
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>
            )}

            {/* Trace 2: Load (Drawn up to hour t!) */}
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

            {/* Trace 3: Battery (Drawn up to hour t!) */}
            {activeSeries.battery && batteryPoints.length > 0 && (
              <path
                d={getMonotonePath(batteryPoints)}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            )}

            {/* Trace 4: Grid Import (Drawn up to hour t!) */}
            {activeSeries.grid && gridPoints.length > 0 && (
              <path
                d={getMonotonePath(gridPoints)}
                fill="none"
                stroke="#f97316"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            )}

            {/* Live Front Needle / Cursor */}
            <line
              x1={currentX}
              y1={padding.top}
              x2={currentX}
              y2={height - padding.bottom}
              stroke="#3ecf8e"
              strokeWidth="2"
            />
            <circle
              cx={currentX}
              cy={scaleY(gridImportKw[t])}
              r="5"
              fill="#f97316"
              stroke="#fff"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>

      {/* 4. Live "What Would Have Happened" Baseline Comparison */}
      <div className="bg-[#171717] border border-[#262626] rounded-lg p-4 shadow-sm">
        <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
          <span>Comparative Scenario Benchmark (Hour {hourLabel})</span>
          <span className="text-[10px] font-normal text-zinc-400 lowercase">vs Unoptimized Baseline</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-3.5">
            <div className="text-zinc-400 text-[10px] uppercase font-semibold">
              Proposed Fuzzy + DE
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Current Grid Import:</span>
                <span className="font-bold text-zinc-100 tabular-nums">{gridFde.toFixed(1)} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Peak Import So Far:</span>
                <span className="text-orange-400 font-bold tabular-nums">{maxGridFdeSoFar.toFixed(1)} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Battery Status:</span>
                <span className="text-cyan-400 tabular-nums">{(socFde * 100).toFixed(0)}% SoC</span>
              </div>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-3.5">
            <div className="text-zinc-400 text-[10px] uppercase font-semibold">
              Normal Heuristic / Greedy
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Current Grid Import:</span>
                <span className="font-bold text-zinc-300 tabular-nums">{gridRb.toFixed(1)} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Peak Spike So Far:</span>
                <span className="text-red-400 font-bold tabular-nums">{maxGridRbSoFar.toFixed(1)} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Battery Status:</span>
                <span className="text-zinc-400 tabular-nums">{(socRb * 100).toFixed(0)}% SoC</span>
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

        {/* Live AI Commentary */}
        <div className="mt-3 pt-3 border-t border-[#262626] flex items-center gap-2 text-xs font-mono">
          <span className="text-[#3ecf8e] font-bold shrink-0">[AI DECISION]:</span>
          <span className="text-zinc-200">{aiExplanation}</span>
        </div>
      </div>

      {/* 5. Simulation Complete Report Card */}
      {isSimulationComplete && (
        <div className="bg-[#14231b] border border-[#244b36] rounded-lg p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1b3a29] border border-[#3ecf8e] flex items-center justify-center text-[#3ecf8e]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                24-Hour Microgrid Simulation Complete!
              </h3>
              <p className="text-xs text-zinc-300">
                The hybrid Fuzzy + DE system successfully shaved the grid peak and preserved battery health.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <div>
              <div className="text-zinc-400 text-[10px]">TOTAL SAVINGS</div>
              <div className="text-lg font-bold text-[#3ecf8e]">+${liveSavedDollars.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-zinc-400 text-[10px]">PEAK POWER SHAVED</div>
              <div className="text-lg font-bold text-[#3ecf8e]">-{liveShavedKw.toFixed(1)} kW</div>
            </div>
            <div>
              <div className="text-zinc-400 text-[10px]">SOLAR SELF-USE</div>
              <div className="text-lg font-bold text-amber-400">{fdeResult.renewable_utilization_pct.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
