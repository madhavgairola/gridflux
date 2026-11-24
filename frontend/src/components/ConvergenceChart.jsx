import React from 'react';

// Smooth spline generator for convergence curves
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

export default function ConvergenceChart({ fdeCurve, pdeCurve }) {
  if (!fdeCurve || fdeCurve.length === 0) return null;

  const width = 880;
  const height = 230;
  const padding = { top: 20, right: 30, bottom: 35, left: 60 };

  const N = Math.max(fdeCurve.length, pdeCurve ? pdeCurve.length : 0);
  const allVals = [...fdeCurve, ...(pdeCurve || [])];
  const minVal = Math.min(...allVals) * 0.95;
  const maxVal = Math.max(...allVals) * 1.05;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scaleX = (idx) => padding.left + (idx / Math.max(1, N - 1)) * chartW;
  const scaleY = (val) => padding.top + chartH - ((val - minVal) / Math.max(1, maxVal - minVal)) * chartH;

  const fdePoints = fdeCurve.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const pdePoints = pdeCurve ? pdeCurve.map((val, idx) => [scaleX(idx), scaleY(val)]) : [];

  return (
    <div className="flex flex-col bg-[#171717] border border-[#262626] rounded-lg mt-3 shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#262626] bg-[#1a1a1a]">
        <div>
          <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">
            Differential Evolution Convergence Profile
          </h3>
          <p className="text-[11px] text-zinc-400">
            Fuzzy soft constraints reshape search landscape, accelerating convergence and eliminating local oscillatory traps
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#3ecf8e]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3ecf8e]"></span>
            <span>Fuzzy + DE (Proposed)</span>
          </div>
          {pdeCurve && (
            <div className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
              <span>Plain DE (Baseline)</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative p-4 h-[180px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          {/* Subtle Grid lines */}
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
                  stroke="#222222"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9"
                  fill="#71717a"
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
              d={getSmoothSplinePath(pdePoints)}
              fill="none"
              stroke="#818cf8"
              strokeWidth="1.8"
              strokeDasharray="4 2"
              strokeLinecap="round"
            />
          )}

          {/* Fuzzy + DE curve */}
          <path
            d={getSmoothSplinePath(fdePoints)}
            fill="none"
            stroke="#3ecf8e"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* End Markers */}
          <circle
            cx={scaleX(fdeCurve.length - 1)}
            cy={scaleY(fdeCurve[fdeCurve.length - 1])}
            r="4"
            fill="#3ecf8e"
            stroke="#171717"
            strokeWidth="1.5"
          />
          {pdeCurve && (
            <circle
              cx={scaleX(pdeCurve.length - 1)}
              cy={scaleY(pdeCurve[pdeCurve.length - 1])}
              r="3.5"
              fill="#818cf8"
              stroke="#171717"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
