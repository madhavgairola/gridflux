import React, { useState } from 'react';

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
  const height = 340;
  const padding = { top: 25, right: 35, bottom: 35, left: 55 };

  // Determine vertical scale bounds for power (kW)
  const allPowerVals = [
    ...(activeSeries.solar ? solarKw : []),
    ...(activeSeries.load ? loadKw : []),
    ...(activeSeries.battery ? batteryKw : []),
    ...(activeSeries.grid ? gridImportKw : [])
  ];

  const minPower = Math.min(-160, Math.min(...allPowerVals, 0));
  const maxPower = Math.max(300, Math.max(...allPowerVals, 100));

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scaleX = (idx) => padding.left + (idx / (N - 1)) * chartW;
  const scaleY = (val) => padding.top + chartH - ((val - minPower) / (maxPower - minPower)) * chartH;
  const scaleSoc = (socVal) => padding.top + chartH - socVal * chartH;

  // Zero-line Y coordinate
  const yZero = scaleY(0);

  // SVG Path Generator
  const generatePath = (data) => {
    return data.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(idx).toFixed(1)} ${scaleY(val).toFixed(1)}`).join(' ');
  };

  const generateSocPath = (data) => {
    return data.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(idx).toFixed(1)} ${scaleSoc(val).toFixed(1)}`).join(' ');
  };

  const currentHover = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < N ? hoverIdx : 0;

  return (
    <div className="flex flex-col h-full bg-[#0c1322] border border-slate-800 rounded p-4">
      {/* Header & Series Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 font-mono tracking-wide">
            24-Hour Microgrid Power Allocation (kW)
          </h2>
          <p className="text-[11px] text-slate-400">
            Fuzzy + DE optimized dispatch: Solar direct feed, battery buffering, and trimmed grid draw
          </p>
        </div>

        {/* Legend / Toggle filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <button
            onClick={() => setActiveSeries((s) => ({ ...s, solar: !s.solar }))}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
              activeSeries.solar
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 opacity-60'
            }`}
          >
            <span className="w-2.5 h-0.5 bg-amber-400 rounded"></span>
            <span>Solar PV</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, load: !s.load }))}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
              activeSeries.load
                ? 'bg-slate-500/10 border-slate-400/40 text-slate-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 opacity-60'
            }`}
          >
            <span className="w-2.5 h-0.5 bg-slate-300 rounded border-dashed"></span>
            <span>Demand Load</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, battery: !s.battery }))}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
              activeSeries.battery
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 opacity-60'
            }`}
          >
            <span className="w-2.5 h-0.5 bg-cyan-400 rounded"></span>
            <span>Battery (Chg/Dis)</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, grid: !s.grid }))}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
              activeSeries.grid
                ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 opacity-60'
            }`}
          >
            <span className="w-2.5 h-0.5 bg-orange-400 rounded"></span>
            <span>Grid Import</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, soc: !s.soc }))}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
              activeSeries.soc
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 opacity-60'
            }`}
          >
            <span className="w-2.5 h-0.5 bg-emerald-400 rounded"></span>
            <span>SoC %</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 min-h-[300px]">
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
          {/* Grid lines & Y-axis labels */}
          {[-150, -100, -50, 0, 50, 100, 150, 200, 250, 300].map((tickVal) => {
            if (tickVal < minPower || tickVal > maxPower) return null;
            const y = scaleY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={tickVal === 0 ? '#475569' : '#1e293b'}
                  strokeWidth={tickVal === 0 ? 1.5 : 1}
                  strokeDasharray={tickVal === 0 ? 'none' : '3 3'}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {tickVal} kW
                </text>
              </g>
            );
          })}

          {/* X-axis tick labels */}
          {timeLabels.map((lbl, idx) => {
            // Label every 4th step for readability
            if (idx % (N === 48 ? 6 : 3) !== 0 && idx !== N - 1) return null;
            const x = scaleX(idx);
            return (
              <g key={idx}>
                <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 5} stroke="#334155" />
                <text
                  x={x}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#94a3b8"
                  fontFamily="monospace"
                >
                  {lbl}
                </text>
              </g>
            );
          })}

          {/* Trace 1: Solar Generation Area & Line */}
          {activeSeries.solar && (
            <g>
              <path
                d={`${generatePath(solarKw)} L ${scaleX(N - 1)} ${yZero} L ${scaleX(0)} ${yZero} Z`}
                fill="rgba(234, 179, 8, 0.08)"
              />
              <path
                d={generatePath(solarKw)}
                fill="none"
                stroke="#eab308"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* Trace 2: Demand Load */}
          {activeSeries.load && (
            <path
              d={generatePath(loadKw)}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          )}

          {/* Trace 3: Battery Power */}
          {activeSeries.battery && (
            <path
              d={generatePath(batteryKw)}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}

          {/* Trace 4: Grid Import */}
          {activeSeries.grid && (
            <path
              d={generatePath(gridImportKw)}
              fill="none"
              stroke="#f97316"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          )}

          {/* Trace 5: Battery SoC (if active) */}
          {activeSeries.soc && (
            <path
              d={generateSocPath(batterySoc)}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="2 2"
            />
          )}

          {/* Interactive Scrubbing Line */}
          {currentHover !== null && (
            <g>
              <line
                x1={scaleX(currentHover)}
                y1={padding.top}
                x2={scaleX(currentHover)}
                y2={height - padding.bottom}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={scaleX(currentHover)}
                cy={scaleY(gridImportKw[currentHover])}
                r="4"
                fill="#f97316"
                stroke="#0c1322"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover Readout Bar */}
        <div className="absolute top-2 right-2 bg-slate-900/90 border border-slate-700/80 rounded px-3 py-1.5 flex items-center gap-3 text-xs font-mono shadow-lg">
          <span className="font-bold text-slate-200">
            {timeLabels[currentHover]}
          </span>
          <span className="text-amber-400">
            Solar: {solarKw[currentHover].toFixed(1)} kW
          </span>
          <span className="text-slate-300">
            Load: {loadKw[currentHover].toFixed(1)} kW
          </span>
          <span className="text-cyan-400">
            Bat: {batteryKw[currentHover] > 0 ? '+' : ''}{batteryKw[currentHover].toFixed(1)} kW
          </span>
          <span className="text-orange-400 font-semibold">
            Grid: {gridImportKw[currentHover].toFixed(1)} kW
          </span>
          <span className="text-emerald-400">
            SoC: {(batterySoc[currentHover] * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
