import React, { useState, useRef } from 'react';

// Monotone-clamped cubic spline interpolation
function getSmoothSplinePath(points) {
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

export default function DispatchChart({
  timeLabels,
  solarKw,
  loadKw,
  batteryKw,
  gridImportKw,
  batterySoc,
  selectedHourIndex,
  onHoverHour
}) {
  const [activeSeries, setActiveSeries] = useState({
    solar: true,
    load: true,
    battery: true,
    grid: true,
    soc: false
  });

  const svgRef = useRef(null);
  const currentHover = selectedHourIndex !== null && selectedHourIndex >= 0 && selectedHourIndex < timeLabels.length
    ? selectedHourIndex
    : 0;

  if (!timeLabels || timeLabels.length === 0) return null;

  const N = timeLabels.length;
  const width = 880;
  const height = 360;
  const padding = { top: 30, right: 30, bottom: 45, left: 75 };

  const minPower = -120;
  const maxPower = 320;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scaleX = (idx) => padding.left + (idx / (N - 1)) * chartW;
  const scaleY = (val) => padding.top + chartH - ((val - minPower) / (maxPower - minPower)) * chartH;
  const scaleSoc = (socVal) => padding.top + chartH - socVal * chartH;

  const yZero = scaleY(0);

  const solarPoints = solarKw.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const loadPoints = loadKw.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const batteryPoints = batteryKw.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const gridPoints = gridImportKw.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const socPoints = batterySoc.map((val, idx) => [scaleX(idx), scaleSoc(val)]);

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

  return (
    <div className="flex flex-col bg-[#171717] border border-[#262626] rounded-lg shadow-sm">
      {/* Header and Series Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#262626] bg-[#1a1a1a]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              24-Hour Microgrid Power Allocation
            </h2>
            <span className="text-[10px] font-mono uppercase bg-[#242424] text-zinc-400 border border-[#333] px-1.5 py-0.5 rounded">
              Telemetry & Dispatch
            </span>
          </div>
          <p className="text-xs text-zinc-300 mt-0.5">
            Hover or drag across the chart to inspect time-step physics and triggered fuzzy rules
          </p>
        </div>

        {/* Legend / Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setActiveSeries((s) => ({ ...s, solar: !s.solar }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all border ${
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all border ${
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all border ${
              activeSeries.battery
                ? 'bg-[#132228] border-cyan-500/50 text-cyan-400 font-medium'
                : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Battery (kW)</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, grid: !s.grid }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all border ${
              activeSeries.grid
                ? 'bg-[#261c16] border-orange-500/50 text-orange-400 font-medium'
                : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            <span>Grid Import</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, soc: !s.soc }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all border ${
              activeSeries.soc
                ? 'bg-[#13241b] border-emerald-500/50 text-[#3ecf8e] font-medium'
                : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
            <span>SoC %</span>
          </button>
        </div>
      </div>

      {/* Pinned Telemetry Readout Strip (Stable fixed height, never pushes layout!) */}
      <div className="px-5 py-2.5 bg-[#141414] border-b border-[#262626] flex flex-wrap items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
          <span className="text-zinc-400">CURRENT TIME:</span>
          <span className="text-zinc-100 font-bold bg-[#222] px-2 py-0.5 rounded border border-[#333]">
            {timeLabels[currentHover]}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-amber-400">Solar:</span>
            <span className="text-zinc-100 font-semibold tabular-nums">{solarKw[currentHover].toFixed(1)} kW</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">Load:</span>
            <span className="text-zinc-200 font-semibold tabular-nums">{loadKw[currentHover].toFixed(1)} kW</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-cyan-400">Battery:</span>
            <span className="text-zinc-100 font-semibold tabular-nums">
              {batteryKw[currentHover] > 0 ? '+' : ''}{batteryKw[currentHover].toFixed(1)} kW
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-orange-400">Grid Import:</span>
            <span className="text-zinc-100 font-bold tabular-nums">{gridImportKw[currentHover].toFixed(1)} kW</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#3ecf8e]">SoC:</span>
            <span className="text-zinc-100 font-bold tabular-nums">{(batterySoc[currentHover] * 100).toFixed(0)}%</span>
          </div>
        </div>
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

          {/* Trace 1: Solar PV (Spline & Area) */}
          {activeSeries.solar && (
            <g pointerEvents="none">
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

          {/* Trace 2: Demand Load (Dashed line) */}
          {activeSeries.load && (
            <path
              pointerEvents="none"
              d={getSmoothSplinePath(loadPoints)}
              fill="none"
              stroke="#a1a1aa"
              strokeWidth="2.2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {/* Trace 3: Battery Power */}
          {activeSeries.battery && (
            <path
              pointerEvents="none"
              d={getSmoothSplinePath(batteryPoints)}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          )}

          {/* Trace 4: Grid Import */}
          {activeSeries.grid && (
            <path
              pointerEvents="none"
              d={getSmoothSplinePath(gridPoints)}
              fill="none"
              stroke="#f97316"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          )}

          {/* Trace 5: Battery SoC */}
          {activeSeries.soc && (
            <path
              pointerEvents="none"
              d={getSmoothSplinePath(socPoints)}
              fill="none"
              stroke="#3ecf8e"
              strokeWidth="2.2"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />
          )}

          {/* Vertical Hairline Cursor */}
          <g pointerEvents="none">
            <line
              x1={hoverX}
              y1={padding.top}
              x2={hoverX}
              y2={height - padding.bottom}
              stroke="#3ecf8e"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {/* Smooth intersection markers */}
            {activeSeries.solar && (
              <circle cx={hoverX} cy={scaleY(solarKw[currentHover])} r="3.5" fill="#f59e0b" stroke="#171717" strokeWidth="1" />
            )}
            {activeSeries.load && (
              <circle cx={hoverX} cy={scaleY(loadKw[currentHover])} r="3.5" fill="#a1a1aa" stroke="#171717" strokeWidth="1" />
            )}
            {activeSeries.battery && (
              <circle cx={hoverX} cy={scaleY(batteryKw[currentHover])} r="3.5" fill="#06b6d4" stroke="#171717" strokeWidth="1" />
            )}
            {activeSeries.grid && (
              <circle cx={hoverX} cy={scaleY(gridImportKw[currentHover])} r="4.5" fill="#f97316" stroke="#171717" strokeWidth="1.5" />
            )}
          </g>

          {/* Invisible interactive overlay capturing mousemove without bubbling */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartW}
            height={chartH}
            fill="transparent"
            className="cursor-crosshair"
            onMouseMove={handlePointerMove}
          />
        </svg>
      </div>
    </div>
  );
}
