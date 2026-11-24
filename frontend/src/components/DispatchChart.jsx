import React, { useState, useRef } from 'react';
import { Layers, GitCompare, Activity } from 'lucide-react';
import PillBadge from './PillBadge';

// Monotone-clamped cubic spline interpolation
function getSmoothSplinePath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    const x = points[0][0];
    const y = points[0][1];
    return `M ${x.toFixed(1)} ${y.toFixed(1)} L ${(x + 0.5).toFixed(1)} ${y.toFixed(1)}`;
  }

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

export default function DispatchChart({
  timeLabels,
  fdeResult,
  pdeResult,
  rbResult,
  solarKw: propSolar,
  loadKw: propLoad,
  batteryKw: propBat,
  gridImportKw: propGrid,
  batterySoc: propSoc,
  selectedHourIndex,
  onHoverHour
}) {
  const [chartMode, setChartMode] = useState('fde'); // 'fde' | 'pde' | 'rb' | 'compare'
  const [activeSeries, setActiveSeries] = useState({
    solar: true,
    load: true,
    battery: true,
    grid: true,
    soc: false
  });

  const svgRef = useRef(null);
  const currentHover = selectedHourIndex !== null && selectedHourIndex >= 0 && selectedHourIndex < (timeLabels ? timeLabels.length : 24)
    ? selectedHourIndex
    : 0;

  if (!timeLabels || timeLabels.length === 0) return null;

  // Resolve dataset according to selected algorithm
  let currentDataset = fdeResult;
  if (chartMode === 'pde' && pdeResult) {
    currentDataset = pdeResult;
  } else if (chartMode === 'rb' && rbResult) {
    currentDataset = rbResult;
  }

  const solarArr = currentDataset ? currentDataset.solar_kw : propSolar || [];
  const loadArr = currentDataset ? currentDataset.load_kw : propLoad || [];
  const batteryArr = currentDataset ? currentDataset.battery_kw : propBat || [];
  const gridArr = currentDataset ? currentDataset.grid_import_kw : propGrid || [];
  const socArr = currentDataset ? currentDataset.battery_soc : propSoc || [];

  const N = timeLabels.length;
  const width = 880;
  const height = 360;
  const padding = { top: 30, right: 30, bottom: 45, left: 75 };

  const minPower = -120;
  const maxPower = 340;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scaleX = (idx) => padding.left + (idx / Math.max(1, N - 1)) * chartW;
  const scaleY = (val) => padding.top + chartH - ((val - minPower) / (maxPower - minPower)) * chartH;
  const scaleSoc = (socVal) => padding.top + chartH - socVal * chartH;

  const yZero = scaleY(0);

  const solarPoints = solarArr.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const loadPoints = loadArr.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const batteryPoints = batteryArr.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const gridPoints = gridArr.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const socPoints = socArr.map((val, idx) => [scaleX(idx), scaleSoc(val)]);

  // Comparative grid import points across all 3 baselines
  const fdeGridPoints = fdeResult ? fdeResult.grid_import_kw.map((val, idx) => [scaleX(idx), scaleY(val)]) : [];
  const pdeGridPoints = pdeResult ? pdeResult.grid_import_kw.map((val, idx) => [scaleX(idx), scaleY(val)]) : [];
  const rbGridPoints = rbResult ? rbResult.grid_import_kw.map((val, idx) => [scaleX(idx), scaleY(val)]) : [];

  const hoverX = scaleX(currentHover);

  const handlePointerMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const chartLeftPx = (padding.left / width) * rect.width;
    const chartWidthPx = (chartW / width) * rect.width;

    const ratio = Math.max(0, Math.min(1, (relX - chartLeftPx) / chartWidthPx));
    const idx = Math.min(N - 1, Math.max(0, Math.round(ratio * (N - 1))));
    if (onHoverHour && idx !== selectedHourIndex) {
      onHoverHour(idx);
    }
  };

  const currentSolar = solarArr[currentHover] ?? 0;
  const currentLoad = loadArr[currentHover] ?? 0;
  const currentBat = batteryArr[currentHover] ?? 0;
  const currentGrid = gridArr[currentHover] ?? 0;
  const currentSoc = socArr[currentHover] ?? 0.5;

  const fdeHoverGrid = fdeResult ? fdeResult.grid_import_kw[currentHover] ?? 0 : 0;
  const pdeHoverGrid = pdeResult ? pdeResult.grid_import_kw[currentHover] ?? 0 : 0;
  const rbHoverGrid = rbResult ? rbResult.grid_import_kw[currentHover] ?? 0 : 0;

  return (
    <div className="flex flex-col bg-[#171717] border border-[#262626] rounded-lg shadow-sm">
      {/* Header, Mode Tabs & Series Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#262626] bg-[#1a1a1a]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              24-Hour Microgrid Power Allocation
            </h2>
            <PillBadge icon={Activity} label="Telemetry & Dispatch" variant="neutral" size="sm" />
          </div>
          <p className="text-xs text-zinc-300 mt-0.5">
            Hover across the chart to inspect time-step physics, battery buffering, and grid import
          </p>
        </div>

        {/* Algorithm Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => setChartMode('fde')}
            className={`px-3 py-1 rounded-full transition-all border cursor-pointer ${
              chartMode === 'fde'
                ? 'bg-[#14231b] text-[#3ecf8e] border-[#244b36] font-semibold'
                : 'bg-[#1e1e1e] border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Fuzzy + DE (Proposed)
          </button>

          {pdeResult && (
            <button
              onClick={() => setChartMode('pde')}
              className={`px-3 py-1 rounded-full transition-all border cursor-pointer ${
                chartMode === 'pde'
                  ? 'bg-[#1a1c2e] text-indigo-400 border-indigo-500/40 font-semibold'
                  : 'bg-[#1e1e1e] border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Plain DE
            </button>
          )}

          {rbResult && (
            <button
              onClick={() => setChartMode('rb')}
              className={`px-3 py-1 rounded-full transition-all border cursor-pointer ${
                chartMode === 'rb'
                  ? 'bg-[#251829] text-purple-400 border-purple-500/40 font-semibold'
                  : 'bg-[#1e1e1e] border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Normal Greedy
            </button>
          )}

          {rbResult && (
            <button
              onClick={() => setChartMode('compare')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all border cursor-pointer ${
                chartMode === 'compare'
                  ? 'bg-[#242416] text-amber-300 border-amber-500/50 font-semibold'
                  : 'bg-[#1e1e1e] border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <GitCompare className="w-3 h-3" />
              <span>Multi-Overlay</span>
            </button>
          )}
        </div>

        {/* Series Toggles */}
        {chartMode !== 'compare' && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setActiveSeries((s) => ({ ...s, solar: !s.solar }))}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs transition-all border cursor-pointer ${
                activeSeries.solar
                  ? 'bg-[#221e14] border-amber-500/50 text-amber-400 font-medium'
                  : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Solar PV</span>
            </button>

            <button
              onClick={() => setActiveSeries((s) => ({ ...s, load: !s.load }))}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs transition-all border cursor-pointer ${
                activeSeries.load
                  ? 'bg-[#202020] border-zinc-500/50 text-zinc-200 font-medium'
                  : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
              <span>Load</span>
            </button>

            <button
              onClick={() => setActiveSeries((s) => ({ ...s, battery: !s.battery }))}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs transition-all border cursor-pointer ${
                activeSeries.battery
                  ? 'bg-[#132228] border-cyan-500/50 text-cyan-400 font-medium'
                  : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Battery</span>
            </button>

            <button
              onClick={() => setActiveSeries((s) => ({ ...s, grid: !s.grid }))}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs transition-all border cursor-pointer ${
                activeSeries.grid
                  ? 'bg-[#261c16] border-orange-500/50 text-orange-400 font-medium'
                  : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              <span>Grid</span>
            </button>

            <button
              onClick={() => setActiveSeries((s) => ({ ...s, soc: !s.soc }))}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs transition-all border cursor-pointer ${
                activeSeries.soc
                  ? 'bg-[#13241b] border-emerald-500/50 text-[#3ecf8e] font-medium'
                  : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
              <span>SoC %</span>
            </button>
          </div>
        )}
      </div>

      {/* Pinned Telemetry Readout Strip */}
      <div className="px-5 py-2.5 bg-[#141414] border-b border-[#262626] flex flex-wrap items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
          <span className="text-zinc-400">HOUR:</span>
          <span className="text-zinc-100 font-bold bg-[#222] px-2 py-0.5 rounded border border-[#333]">
            {timeLabels[currentHover]}
          </span>
        </div>

        {chartMode === 'compare' ? (
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
              <span className="text-[#3ecf8e] font-semibold">Fuzzy+DE:</span>
              <span className="text-zinc-100 font-bold tabular-nums">{fdeHoverGrid.toFixed(1)} kW</span>
            </div>
            {pdeResult && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span className="text-indigo-400 font-semibold">Plain DE:</span>
                <span className="text-zinc-200 font-bold tabular-nums">{pdeHoverGrid.toFixed(1)} kW</span>
              </div>
            )}
            {rbResult && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span className="text-red-400 font-semibold">Normal Greedy:</span>
                <span className="text-zinc-200 font-bold tabular-nums">{rbHoverGrid.toFixed(1)} kW</span>
              </div>
            )}
            {rbResult && (
              <div className="flex items-center gap-1 text-[#3ecf8e] font-bold">
                <span>Shaved: {(rbHoverGrid - fdeHoverGrid).toFixed(1)} kW</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-amber-400">Solar:</span>
              <span className="text-zinc-100 font-semibold tabular-nums">{currentSolar.toFixed(1)} kW</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-zinc-400">Load:</span>
              <span className="text-zinc-200 font-semibold tabular-nums">{currentLoad.toFixed(1)} kW</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-cyan-400">Battery:</span>
              <span className="text-zinc-100 font-semibold tabular-nums">
                {currentBat > 0 ? '+' : ''}{currentBat.toFixed(1)} kW
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-orange-400">Grid Import:</span>
              <span className="text-zinc-100 font-bold tabular-nums">{currentGrid.toFixed(1)} kW</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#3ecf8e]">SoC:</span>
              <span className="text-zinc-100 font-bold tabular-nums">{(currentSoc * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Main SVG Chart with rock-solid hover tracking */}
      <div className="relative p-4 h-[310px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
        >
          <defs>
            <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gridGradFde" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3ecf8e" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3ecf8e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* High-Contrast Y-Axis Gridlines & Values */}
          {[-100, -50, 0, 50, 100, 150, 200, 250, 300].map((tickVal) => {
            const y = scaleY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={tickVal === 0 ? '#444444' : '#262626'}
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

          {/* X-axis tick labels */}
          {timeLabels.map((lbl, idx) => {
            if (idx % 3 !== 0 && idx !== N - 1) return null;
            const x = scaleX(idx);
            return (
              <g key={idx}>
                <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 6} stroke="#383838" />
                <text
                  x={x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#d4d4d8"
                  fontFamily="monospace"
                >
                  {lbl}
                </text>
              </g>
            );
          })}

          {/* MULTI-ALGORITHM COMPARISON OVERLAY */}
          {chartMode === 'compare' ? (
            <g pointerEvents="none">
              {/* Solar PV reference */}
              <path
                d={getSmoothSplinePath(solarPoints)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.8"
                opacity="0.35"
              />
              {/* Demand Load reference */}
              <path
                d={getSmoothSplinePath(loadPoints)}
                fill="none"
                stroke="#a1a1aa"
                strokeWidth="1.8"
                strokeDasharray="4 3"
                opacity="0.35"
              />
              {/* Normal Greedy Grid Import (Red dashed spike!) */}
              {rbGridPoints.length > 0 && (
                <path
                  d={getSmoothSplinePath(rbGridPoints)}
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
                  d={getSmoothSplinePath(pdeGridPoints)}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2.2"
                  strokeDasharray="4 2"
                  strokeLinecap="round"
                />
              )}
              {/* Proposed Fuzzy + DE Grid Import (Solid Mint Green #3ecf8e!) */}
              {fdeGridPoints.length > 0 && (
                <>
                  <path
                    d={`${getSmoothSplinePath(fdeGridPoints)} L ${scaleX(N - 1)} ${yZero} L ${scaleX(0)} ${yZero} Z`}
                    fill="url(#gridGradFde)"
                  />
                  <path
                    d={getSmoothSplinePath(fdeGridPoints)}
                    fill="none"
                    stroke="#3ecf8e"
                    strokeWidth="3.0"
                    strokeLinecap="round"
                  />
                </>
              )}
            </g>
          ) : (
            /* SINGLE ALGORITHM MODE */
            <g pointerEvents="none">
              {/* Trace 1: Solar PV */}
              {activeSeries.solar && solarPoints.length > 0 && (
                <g>
                  <path
                    d={`${getSmoothSplinePath(solarPoints)} L ${scaleX(N - 1)} ${yZero} L ${scaleX(0)} ${yZero} Z`}
                    fill="url(#solarGrad)"
                  />
                  <path
                    d={getSmoothSplinePath(solarPoints)}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Trace 2: Demand Load */}
              {activeSeries.load && loadPoints.length > 0 && (
                <path
                  d={getSmoothSplinePath(loadPoints)}
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth="2.2"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                />
              )}

              {/* Trace 3: Battery Power */}
              {activeSeries.battery && batteryPoints.length > 0 && (
                <path
                  d={getSmoothSplinePath(batteryPoints)}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              )}

              {/* Trace 4: Grid Import */}
              {activeSeries.grid && gridPoints.length > 0 && (
                <path
                  d={getSmoothSplinePath(gridPoints)}
                  fill="none"
                  stroke={chartMode === 'rb' ? '#c084fc' : chartMode === 'pde' ? '#818cf8' : '#f97316'}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              )}

              {/* Trace 5: Battery SoC */}
              {activeSeries.soc && socPoints.length > 0 && (
                <path
                  d={getSmoothSplinePath(socPoints)}
                  fill="none"
                  stroke="#3ecf8e"
                  strokeWidth="2.2"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                />
              )}
            </g>
          )}

          {/* Interactive Hover Vertical Guide Line */}
          <line
            pointerEvents="none"
            x1={hoverX}
            y1={padding.top}
            x2={hoverX}
            y2={height - padding.bottom}
            stroke="#3ecf8e"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Marker dot at hovered grid import */}
          <circle
            pointerEvents="none"
            cx={hoverX}
            cy={scaleY(chartMode === 'compare' ? fdeHoverGrid : currentGrid)}
            r="4.5"
            fill="#3ecf8e"
            stroke="#fff"
            strokeWidth="2"
          />

          {/* Invisible Overlay Rect capturing pointer events */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartW}
            height={chartH}
            fill="transparent"
            className="cursor-crosshair"
            onPointerMove={handlePointerMove}
          />
        </svg>
      </div>
    </div>
  );
}
