import React from 'react';

// Monotone-preserving path to avoid wavy overshoot on convergence curves
function getMonotonePath(points) {
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

  // Fritsch-Carlson monotone tangents
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

export default function ConvergenceChart({ fdeCurve, pdeCurve }) {
  const safeFde = Array.isArray(fdeCurve) ? fdeCurve.filter((v) => typeof v === 'number' && !isNaN(v)) : [];
  const safePde = Array.isArray(pdeCurve) ? pdeCurve.filter((v) => typeof v === 'number' && !isNaN(v)) : [];

  if (safeFde.length === 0) {
    return (
      <div className="flex items-center justify-center bg-[#171717] border border-[#262626] rounded-lg p-8 min-h-[200px]">
        <span className="text-xs font-mono text-zinc-500">
          Convergence profile unavailable. Run optimization to generate curves.
        </span>
      </div>
    );
  }

  const width = 880;
  const height = 240;
  const padding = { top: 25, right: 65, bottom: 40, left: 75 };

  const N = Math.max(safeFde.length, safePde.length);
  const allVals = [...safeFde, ...safePde];
  const minVal = Math.floor(Math.min(...allVals) * 0.95);
  const maxVal = Math.ceil(Math.max(...allVals) * 1.05);

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scaleX = (idx) => padding.left + (idx / Math.max(1, N - 1)) * chartW;
  const scaleY = (val) => padding.top + chartH - ((val - minVal) / Math.max(1, maxVal - minVal)) * chartH;

  const fdePoints = safeFde.map((val, idx) => [scaleX(idx), scaleY(val)]);
  const pdePoints = safePde.map((val, idx) => [scaleX(idx), scaleY(val)]);

  const lastFde = safeFde[safeFde.length - 1];
  const lastPde = safePde.length > 0 ? safePde[safePde.length - 1] : null;

  // Generation ticks
  const genTicks = [0, Math.floor(N / 4), Math.floor(N / 2), Math.floor((3 * N) / 4), N - 1];

  return (
    <div className="flex flex-col bg-[#171717] border border-[#262626] rounded-lg shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#262626] bg-[#1a1a1a]">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
            Differential Evolution Convergence Profile
          </h3>
          <p className="text-xs text-zinc-300 mt-0.5">
            Objective fitness cost ($) across optimization generations
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#3ecf8e]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3ecf8e]"></span>
            <span className="font-medium">Fuzzy + DE (Proposed)</span>
          </div>
          {safePde.length > 0 && (
            <div className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
              <span className="font-medium">Plain DE (Baseline)</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative p-4 h-[210px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          {/* High-Contrast Grid lines & Legible Y-Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const val = minVal + frac * (maxVal - minVal);
            const y = scaleY(val);
            return (
              <g key={`y-${idx}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#2c2c2c"
                  strokeWidth="1"
                  strokeDasharray="4 4"
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
                  ${Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* X-axis ticks (Generations) */}
          {genTicks.map((genIdx, idx) => {
            const x = scaleX(genIdx);
            return (
              <g key={`gen-${idx}-${genIdx}`}>
                <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 6} stroke="#383838" />
                <text
                  x={x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#d4d4d8"
                  fontFamily="monospace"
                >
                  Gen {genIdx}
                </text>
              </g>
            );
          })}

          {/* Plain DE curve */}
          {safePde.length > 0 && (
            <path
              d={getMonotonePath(pdePoints)}
              fill="none"
              stroke="#818cf8"
              strokeWidth="2.0"
              strokeDasharray="5 3"
              strokeLinecap="round"
            />
          )}

          {/* Proposed Fuzzy + DE curve */}
          <path
            d={getMonotonePath(fdePoints)}
            fill="none"
            stroke="#3ecf8e"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Final converged markers with value tags */}
          {typeof lastFde === 'number' && (
            <>
              <circle
                cx={scaleX(safeFde.length - 1)}
                cy={scaleY(lastFde)}
                r="4.5"
                fill="#3ecf8e"
                stroke="#171717"
                strokeWidth="2"
              />
              <text
                x={scaleX(safeFde.length - 1) + 8}
                y={scaleY(lastFde) + 4}
                fill="#3ecf8e"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                ${lastFde.toFixed(1)}
              </text>
            </>
          )}

          {typeof lastPde === 'number' && (
            <>
              <circle
                cx={scaleX(safePde.length - 1)}
                cy={scaleY(lastPde)}
                r="4.5"
                fill="#818cf8"
                stroke="#171717"
                strokeWidth="2"
              />
              <text
                x={scaleX(safePde.length - 1) + 8}
                y={scaleY(lastPde) + 4}
                fill="#818cf8"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                ${lastPde.toFixed(1)}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
