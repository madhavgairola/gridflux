import React, { useState } from 'react';

// Generates smooth cubic Bézier spline interpolation through all points
function getSmoothSplinePath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

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

  const [hoverIdx, setHoverIdx] = useState(selectedHourIndex || 0);

  if (!timeLabels || timeLabels.length === 0) return null;

  const N = timeLabels.length;
  const width = 880;
  const height = 350;
  const padding = { top: 25, right: 30, bottom: 40, left: 60 };

  // Calculate power limits (kW)
  const minPower = -120;
  const maxPower = 320;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scaleX = (idx) => padding.left + (idx / (N - 1)) * chartW;
  const scaleY = (val) => padding.top + chartH - ((val - minPower) / (maxPower - minPower)) * chartH;
  const scaleSoc = (socVal) => padding.top + chartH - socVal * chartH;

  const yZero = scaleY(0);

  // Generate coordinate pairs for splines
  const solarPoints = solarKw.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const loadPoints = loadKw.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const batteryPoints = batteryKw.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const gridPoints = gridImportKw.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const socPoints = batterySoc.map((val, idx) => [scaleX(idx), scaleSoc(val)]);

  const currentHover = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < N ? hoverIdx : 0;
  const hoverX = scaleX(currentHover);

  return (
    <div className="flex flex-col h-full bg-[#171717] border border-[#262626] rounded-lg shadow-sm">
      {/* Supabase-style Chart Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#262626] bg-[#1a1a1a]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Power Allocation & Microgrid Balance
            </h2>
            <span className="text-[10px] font-mono uppercase bg-[#242424] text-zinc-400 border border-[#333] px-1.5 py-0.5 rounded">
              24h Horizon
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Smooth physical dispatch: Continuous solar absorption, ramp-limited battery buffering, and flattened grid import
          </p>
        </div>

        {/* Supabase Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setActiveSeries((s) => ({ ...s, solar: !s.solar }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all border ${
              activeSeries.solar
                ? 'bg-[#221e14] border-amber-500/40 text-amber-400'
                : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Solar PV</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, load: !s.load }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all border ${
              activeSeries.load
                ? 'bg-[#202020] border-zinc-500/40 text-zinc-200'
                : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
            <span>Load</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, battery: !s.battery }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all border ${
              activeSeries.battery
                ? 'bg-[#132228] border-cyan-500/40 text-cyan-400'
                : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Battery (kW)</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, grid: !s.grid }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all border ${
              activeSeries.grid
                ? 'bg-[#261c16] border-orange-500/40 text-orange-400'
                : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            <span>Grid Import</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, soc: !s.soc }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all border ${
              activeSeries.soc
                ? 'bg-[#13241b] border-emerald-500/40 text-[#3ecf8e]'
                : 'bg-[#1e1e1e] border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
            <span>SoC %</span>
          </button>
        </div>
      </div>

      {/* SVG Smooth Spline Chart */}
      <div className="relative flex-1 p-4 min-h-[320px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const ratio = (relX - (padding.left / width) * rect.width) / ((chartW / width) * rect.width);
            const idx = Math.min(N - 1, Math.max(0, Math.round(ratio * (N - 1))));
            setHoverIdx(idx);
            if (onHoverHour) onHoverHour(idx);
          }}
        >
          <defs>
            {/* Subtle Solar Gradient */}
            <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            {/* Subtle Grid Import Gradient */}
            <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {[-100, -50, 0, 50, 100, 150, 200, 250, 300].map((tickVal) => {
            const y = scaleY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={tickVal === 0 ? '#383838' : '#222222'}
                  strokeWidth={tickVal === 0 ? 1.5 : 1}
                  strokeDasharray={tickVal === 0 ? 'none' : '3 3'}
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="#71717a"
                  fontFamily="monospace"
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
                <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 5} stroke="#2e2e2e" />
                <text
                  x={x}
                  y={height - padding.bottom + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#71717a"
                  fontFamily="monospace"
                >
                  {lbl}
                </text>
              </g>
            );
          })}

          {/* Trace 1: Solar PV (Smooth Spline & Gradient) */}
          {activeSeries.solar && (
            <g>
              <path
                d={`${getSmoothSplinePath(solarPoints)} L ${scaleX(N - 1)} ${yZero} L ${scaleX(0)} ${yZero} Z`}
                fill="url(#solarGradient)"
              />
              <path
                d={getSmoothSplinePath(solarPoints)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* Trace 2: Demand Load (Smooth dashed spline) */}
          {activeSeries.load && (
            <path
              d={getSmoothSplinePath(loadPoints)}
              fill="none"
              stroke="#a1a1aa"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {/* Trace 3: Battery Power (Smooth spline) */}
          {activeSeries.battery && (
            <path
              d={getSmoothSplinePath(batteryPoints)}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          )}

          {/* Trace 4: Grid Import (Smooth spline) */}
          {activeSeries.grid && (
            <g>
              <path
                d={getSmoothSplinePath(gridPoints)}
                fill="none"
                stroke="#f97316"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* Trace 5: Battery SoC (Smooth spline) */}
          {activeSeries.soc && (
            <path
              d={getSmoothSplinePath(socPoints)}
              fill="none"
              stroke="#3ecf8e"
              strokeWidth="2"
              strokeDasharray="2 2"
              strokeLinecap="round"
            />
          )}

          {/* Interactive Supabase-style Cursor Hairline */}
          {currentHover !== null && (
            <g>
              <line
                x1={hoverX}
                y1={padding.top}
                x2={hoverX}
                y2={height - padding.bottom}
                stroke="#3ecf8e"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              {/* Intersection dots */}
              {activeSeries.solar && (
                <circle cx={hoverX} cy={scaleY(solarKw[currentHover])} r="3" fill="#f59e0b" />
              )}
              {activeSeries.load && (
                <circle cx={hoverX} cy={scaleY(loadKw[currentHover])} r="3" fill="#a1a1aa" />
              )}
              {activeSeries.battery && (
                <circle cx={hoverX} cy={scaleY(batteryKw[currentHover])} r="3" fill="#06b6d4" />
              )}
              {activeSeries.grid && (
                <circle cx={hoverX} cy={scaleY(gridImportKw[currentHover])} r="4" fill="#f97316" stroke="#171717" strokeWidth="1.5" />
              )}
            </g>
          )}
        </svg>

        {/* Supabase Studio-style Floating Inspector Card */}
        <div className="absolute top-4 right-4 bg-[#1f1f1f] border border-[#2e2e2e] rounded-lg px-3.5 py-2.5 shadow-xl flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 border-r border-[#333] pr-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]"></span>
            <span className="text-zinc-100 font-bold">{timeLabels[currentHover]}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-amber-400">
              Solar: <b className="text-zinc-100 tabular-nums">{solarKw[currentHover].toFixed(1)}</b> kW
            </span>
            <span className="text-zinc-400">
              Load: <b className="text-zinc-200 tabular-nums">{loadKw[currentHover].toFixed(1)}</b> kW
            </span>
            <span className="text-cyan-400">
              Bat: <b className="text-zinc-100 tabular-nums">{batteryKw[currentHover] > 0 ? '+' : ''}{batteryKw[currentHover].toFixed(1)}</b> kW
            </span>
            <span className="text-orange-400 font-medium">
              Grid: <b className="text-zinc-100 tabular-nums">{gridImportKw[currentHover].toFixed(1)}</b> kW
            </span>
            <span className="text-[#3ecf8e]">
              SoC: <b className="text-zinc-100 tabular-nums">{(batterySoc[currentHover] * 100).toFixed(0)}%</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
