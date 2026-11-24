import React, { useState, useEffect } from 'react';
import ControlBar from './components/ControlBar';
import KpiStrip from './components/KpiStrip';
import LiveSimulator from './components/LiveSimulator';
import DispatchChart from './components/DispatchChart';
import ConvergenceChart from './components/ConvergenceChart';
import FuzzyInspector from './components/FuzzyInspector';
import BenchmarkTable from './components/BenchmarkTable';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [scenarios, setScenarios] = useState([
    { id: 'default_balanced', name: 'Default Balanced' },
    { id: 'peak_afternoon_load', name: 'Peak Afternoon Surge' },
    { id: 'cloudy_surge', name: 'Cloudy & Intermittent' },
    { id: 'night_battery_recovery', name: 'Night Battery Recovery' },
    { id: 'high_tariff_spike', name: 'High Tariff Spike' }
  ]);

  const [selectedScenario, setSelectedScenario] = useState('default_balanced');
  const [steps, setSteps] = useState(24);
  const [popSize, setPopSize] = useState(30);
  const [generations, setGenerations] = useState(35);
  const [seed, setSeed] = useState(42);
  const [includeBaselines, setIncludeBaselines] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [optimizationData, setOptimizationData] = useState(null);
  const [hoveredHourIdx, setHoveredHourIdx] = useState(12);

  useEffect(() => {
    fetch('/api/scenarios')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.presets) {
          setScenarios(data.presets);
        }
      })
      .catch((err) => {
        console.warn('API not reachable yet; using fallback presets catalog', err);
      });

    runOptimization();
  }, []);

  const runOptimization = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: selectedScenario,
          steps: steps,
          population_size: popSize,
          generations: generations,
          seed: seed,
          mutation_factor: 0.65,
          crossover_rate: 0.85,
          strategy: 'best1bin',
          include_baselines: includeBaselines
        })
      });

      if (!response.ok) {
        const errDetail = await response.json();
        throw new Error(errDetail.detail || 'Optimization failed');
      }

      const data = await response.json();
      setOptimizationData(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not connect to optimization backend');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    window.open(`/api/export/${selectedScenario}/csv?steps=${steps}&seed=${seed}&population_size=${popSize}&generations=${generations}`, '_blank');
  };

  const fde = optimizationData ? optimizationData.fuzzy_de : null;
  const pde = optimizationData ? optimizationData.plain_de : null;
  const rb = optimizationData ? optimizationData.rule_based : null;
  const timeLabels = optimizationData ? optimizationData.scenario.time_labels : [];

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-200 flex flex-col font-sans select-none">
      {/* Top Header / Control Bar */}
      <ControlBar
        scenarios={scenarios}
        selectedScenario={selectedScenario}
        onSelectScenario={(sc) => {
          setSelectedScenario(sc);
        }}
        steps={steps}
        onChangeSteps={setSteps}
        popSize={popSize}
        onChangePopSize={setPopSize}
        generations={generations}
        onChangeGenerations={setGenerations}
        seed={seed}
        onChangeSeed={setSeed}
        includeBaselines={includeBaselines}
        onToggleBaselines={setIncludeBaselines}
        onRunOptimization={runOptimization}
        onExportCsv={handleExportCsv}
        loading={loading}
      />

      {/* Error Alert */}
      {error && (
        <div className="bg-[#2a1414] border-b border-red-900/60 px-6 py-2.5 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>Backend Error: {error}. Ensure FastAPI is running on port 8000.</span>
        </div>
      )}

      {/* KPI Readout Strip */}
      <KpiStrip fdeResult={fde} pdeResult={pde} rbResult={rb} />

      {/* Main Analytical Content Workspace */}
      <main className="flex-1 p-6 bg-supabase-grid">
        {/* 1. Live Interactive Microgrid Simulator & Flow Diagram */}
        {fde && (
          <LiveSimulator
            fdeResult={fde}
            rbResult={rb}
            timeLabels={timeLabels}
            currentHour={hoveredHourIdx}
            onHourChange={setHoveredHourIdx}
          />
        )}

        {/* 2. Analytical Charts & Fuzzy Inspector Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Primary Visualizations */}
          <div className="lg:col-span-8 flex flex-col">
            {fde ? (
              <>
                <DispatchChart
                  timeLabels={timeLabels}
                  solarKw={fde.solar_kw}
                  loadKw={fde.load_kw}
                  batteryKw={fde.battery_kw}
                  gridImportKw={fde.grid_import_kw}
                  batterySoc={fde.battery_soc}
                  selectedHourIndex={hoveredHourIdx}
                  onHoverHour={setHoveredHourIdx}
                />

                <ConvergenceChart
                  fdeCurve={fde.convergence_curve}
                  pdeCurve={pde ? pde.convergence_curve : null}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[#171717] border border-[#262626] rounded-lg min-h-[400px]">
                <div className="text-center font-mono text-zinc-500 text-xs">
                  {loading ? 'Executing Differential Evolution optimization...' : 'No optimization data available.'}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (4 cols): Fuzzy Inspector & Benchmark Table */}
          <div className="lg:col-span-4 flex flex-col">
            {optimizationData ? (
              <>
                <FuzzyInspector
                  fuzzyExplainability={optimizationData.fuzzy_explainability}
                  selectedHourIndex={hoveredHourIdx}
                  timeLabels={timeLabels}
                />
                <BenchmarkTable
                  fdeResult={fde}
                  pdeResult={pde}
                  rbResult={rb}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[#171717] border border-[#262626] rounded-lg min-h-[300px]">
                <div className="text-center font-mono text-zinc-500 text-xs">
                  Waiting for optimization results...
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Supabase-style Footer */}
      <footer className="border-t border-[#262626] bg-[#141414] px-6 py-2.5 text-[11px] font-mono text-zinc-500 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-zinc-300 font-medium">GridFlux v1.2.0</span>
          <span>•</span>
          <span>Mamdani FIS (27 Rules) + DE/best/1/bin</span>
          <span>•</span>
          <span className="text-[#3ecf8e]">Interactive Simulator Active</span>
        </div>
        <div>
          Course 26B16CS311: Fundamentals of Soft Computing • CO4 System
        </div>
      </footer>
    </div>
  );
}
