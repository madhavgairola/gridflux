import React from 'react';
import { Play, Download, Settings, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

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
    <header className="border-b border-slate-800 bg-[#0c1322] px-6 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Academic context */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Zap className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-wider text-slate-100 font-mono">GRIDFLUX</span>
          </div>
          <span className="hidden sm:inline-block rounded border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[11px] font-mono text-slate-400">
            26B16CS311 • CO4 Soft Computing Lab
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
            <ShieldCheck className="w-3 h-3" /> Hybrid Fuzzy + DE
          </span>
        </div>

        {/* Controls Cluster */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Scenario Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Scenario:</span>
            <select
              value={selectedScenario}
              onChange={(e) => onSelectScenario(e.target.value)}
              disabled={loading}
              className="bg-transparent text-xs font-medium text-slate-200 outline-none cursor-pointer"
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id} className="bg-slate-900 text-slate-200">
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Steps & Hyperparameters */}
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-mono">STEPS</span>
              <select
                value={steps}
                onChange={(e) => onChangeSteps(Number(e.target.value))}
                disabled={loading}
                className="bg-transparent text-slate-200 font-mono text-xs outline-none"
              >
                <option value={24} className="bg-slate-900">24 (1h)</option>
                <option value={48} className="bg-slate-900">48 (30m)</option>
              </select>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-mono">POP</span>
              <input
                type="number"
                min="10"
                max="80"
                value={popSize}
                onChange={(e) => onChangePopSize(Number(e.target.value))}
                disabled={loading}
                className="w-10 bg-transparent text-slate-200 font-mono text-xs outline-none text-center"
              />
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-mono">GEN</span>
              <input
                type="number"
                min="10"
                max="100"
                value={generations}
                onChange={(e) => onChangeGenerations(Number(e.target.value))}
                disabled={loading}
                className="w-10 bg-transparent text-slate-200 font-mono text-xs outline-none text-center"
              />
            </div>
          </div>

          {/* Baselines toggle */}
          <label className="flex items-center gap-2 cursor-pointer bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 select-none">
            <input
              type="checkbox"
              checked={includeBaselines}
              onChange={(e) => onToggleBaselines(e.target.checked)}
              disabled={loading}
              className="accent-emerald-500 rounded"
            />
            <span>Compare Baselines</span>
          </label>

          {/* Action Trigger */}
          <button
            onClick={onRunOptimization}
            disabled={loading}
            className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors"
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

          {/* CSV Export */}
          <button
            onClick={onExportCsv}
            disabled={loading}
            title="Export full dispatch time-series table to CSV"
            className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 text-xs font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
}
