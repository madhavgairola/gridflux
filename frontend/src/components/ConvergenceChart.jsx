import React from 'react';

export default function ConvergenceChart({ fdeCurve, pdeCurve }) {
  if (!fdeCurve || fdeCurve.length === 0) return null;

  const width = 880;
  const height = 240;
  const padding = { top: 20, right: 35, bottom: 30, left: 55 };

  const N = Math.max(fdeCurve.length, pdeCurve ? pdeCurve.length : 0);
  const allVals = [...fdeCurve, ...(pdeCurve || [])];
  const minVal = Math.min(...allVals) * 0.95;
  const maxVal = Math.max(...allVals) * 1.05;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scaleX = (idx) => padding.left + (idx / Math.max(1, N - 1)) * chartW;
  const scaleY = (val) => padding.top + chartH - ((val - minVal) / Math.max(1, maxVal - minVal)) * chartH;

  const generatePath = (data) => {
    return data.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(idx).toFixed(1)} ${scaleY(val).toFixed(1)}`).join(' ');
  };

  return (
    <div className="flex flex-col bg-[#0c1322] border border-slate-800 rounded p-4 mt-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-200 font-mono tracking-wide">
            Differential Evolution Convergence Profile (Objective Fitness vs Generation)
          </h3>
          <p className="text-[11px] text-slate-400">
            Fuzzy soft constraints reshape the search landscape, reducing generational oscillation and avoiding local minima
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-3 h-0.5 bg-emerald-400 rounded"></span>
            <span>Fuzzy + DE (Proposed)</span>
          </div>
          {pdeCurve && (
            <div className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-3 h-0.5 bg-indigo-400 rounded border-dashed"></span>
              <span>Plain DE (Baseline)</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative h-[180px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
            const val = minVal + frac * (maxVal - minVal);
            const y = scaleY(val);
            return (
              <g key={frac}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  ${val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Plain DE curve */}
          {pdeCurve && pdeCurve.length > 0 && (
            <path
              d={generatePath(pdeCurve)}
              fill="none"
              stroke="#6366f1"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
          )}

          {/* Fuzzy + DE curve */}
          <path
            d={generatePath(fdeCurve)}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Final markers */}
          <circle
            cx={scaleX(fdeCurve.length - 1)}
            cy={scaleY(fdeCurve[fdeCurve.length - 1])}
            r="3.5"
            fill="#10b981"
          />
          {pdeCurve && (
            <circle
              cx={scaleX(pdeCurve.length - 1)}
              cy={scaleY(pdeCurve[pdeCurve.length - 1])}
              r="3.5"
              fill="#6366f1"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
