import React from 'react';
import { Play, Download, RefreshCw, Zap, SlidersHorizontal } from 'lucide-react';

export default function ControlBar({
  scenarios,
  selectedScenario,
  onSelectScenario,
  steps,
  onChangeSteps,
  popSize,
  onChangePopSize,
  generations,
  onChangeGenerations,
  seed,
  onChangeSeed,
  includeBaselines,
  onToggleBaselines,
  onRunOptimization,
  onExportCsv,
  loading
}) {
  return (
    <header className="border-b border-[#262626] bg-[#171717] px-6 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Branding */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-zinc-400">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-[#1e2e26] border border-[#2b4c3b] text-[#3ecf8e]">
              <Zap className="h-3.5 w-3.5 fill-current" />
            </span>
            <span className="text-zinc-200 font-semibold tracking-wide text-sm">GridFlux</span>
          </div>
        </div>

        {/* Supabase Studio Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 bg-[#1f1f1f] border border-[#2e2e2e] rounded-md px-2.5 py-1 text-xs">
            <span className="text-zinc-400 font-mono text-[11px]">PRESET:</span>
            <select
              value={selectedScenario}
              onChange={(e) => onSelectScenario(e.target.value)}
              disabled={loading}
              className="bg-transparent text-zinc-100 font-medium outline-none cursor-pointer text-xs"
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id} className="bg-[#1f1f1f] text-zinc-200">
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Hyperparameters Pill */}
          <div className="flex items-center gap-2 bg-[#1f1f1f] border border-[#2e2e2e] rounded-md px-2.5 py-1 text-xs font-mono text-zinc-300">
            <div className="flex items-center gap-1">
              <span className="text-zinc-500 text-[10px]">STEPS</span>
              <select
                value={steps}
                onChange={(e) => onChangeSteps(Number(e.target.value))}
                disabled={loading}
                className="bg-transparent text-zinc-100 text-xs outline-none cursor-pointer"
              >
                <option value={24} className="bg-[#1f1f1f]">24 (1h)</option>
                <option value={48} className="bg-[#1f1f1f]">48 (30m)</option>
              </select>
            </div>
            <span className="text-zinc-700">/</span>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500 text-[10px]">POP</span>
              <input
                type="number"
                min="10"
                max="80"
                value={popSize}
                onChange={(e) => onChangePopSize(Number(e.target.value))}
                disabled={loading}
                className="w-8 bg-transparent text-zinc-100 text-xs outline-none text-center"
              />
            </div>
            <span className="text-zinc-700">/</span>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500 text-[10px]">GEN</span>
              <input
                type="number"
                min="10"
                max="100"
                value={generations}
                onChange={(e) => onChangeGenerations(Number(e.target.value))}
                disabled={loading}
                className="w-8 bg-transparent text-zinc-100 text-xs outline-none text-center"
              />
            </div>
          </div>

          {/* Baseline Toggle */}
          <label className="flex items-center gap-1.5 bg-[#1f1f1f] border border-[#2e2e2e] rounded-md px-2.5 py-1 text-xs text-zinc-300 cursor-pointer select-none hover:bg-[#242424] transition-colors">
            <input
              type="checkbox"
              checked={includeBaselines}
              onChange={(e) => onToggleBaselines(e.target.checked)}
              disabled={loading}
              className="accent-[#3ecf8e] rounded cursor-pointer"
            />
            <span>Baselines</span>
          </label>

          {/* Primary Supabase Green Button */}
          <button
            onClick={onRunOptimization}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md bg-[#3ecf8e] hover:bg-[#34b27b] active:scale-[0.98] disabled:opacity-50 text-[#121212] px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all shadow-sm"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Optimizing...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Run Optimization</span>
              </>
            )}
          </button>

          {/* Export CSV Button */}
          <button
            onClick={onExportCsv}
            disabled={loading}
            title="Download dispatch time-series as CSV"
            className="flex items-center gap-1 rounded-md border border-[#2e2e2e] bg-[#1f1f1f] hover:bg-[#262626] text-zinc-300 px-2.5 py-1.5 text-xs font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
}
