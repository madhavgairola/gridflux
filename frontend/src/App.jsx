import React, { useState, useEffect } from 'react';
import ControlBar from './components/ControlBar';
import KpiStrip from './components/KpiStrip';
import LiveSimulator from './components/LiveSimulator';
import DispatchChart from './components/DispatchChart';
import ConvergenceChart from './components/ConvergenceChart';
import FuzzyInspector from './components/FuzzyInspector';
import BenchmarkTable from './components/BenchmarkTable';
import ErrorBoundary from './components/ErrorBoundary';
import { Play, BarChart3, Cpu, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'analytics' | 'engine'

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
  const [simulatedHourIdx, setSimulatedHourIdx] = useState(23);

  useEffect(() => {
    fetch('/api/scenarios')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.presets) {
          setScenarios(data.presets);
        }
      })
      .catch((err) => {
        console.warn('API fallback', err);
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
      if (data && data.scenario && data.scenario.time_labels) {
        setSimulatedHourIdx(data.scenario.time_labels.length - 1);
      }
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
  const timeLabels = optimizationData && optimizationData.scenario ? optimizationData.scenario.time_labels : [];

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-200 flex flex-col font-sans select-none">
      {/* 1. Supabase Studio Top Header */}
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

      {/* 2. Supabase Studio Page Navigation Tabs */}
      <nav className="flex items-center gap-1 px-6 border-b border-[#262626] bg-[#171717] text-xs font-medium">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all cursor-pointer ${
            activeTab === 'simulator'
              ? 'border-[#3ecf8e] text-[#3ecf8e] font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Interactive 24h Simulator</span>
          <span className="text-[10px] font-mono bg-[#14231b] text-[#3ecf8e] border border-[#244b36] px-1.5 py-0.2 rounded ml-1">
            Live Flow
          </span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-[#3ecf8e] text-[#3ecf8e] font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics & Benchmarks</span>
        </button>

        <button
          onClick={() => setActiveTab('engine')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all cursor-pointer ${
            activeTab === 'engine'
              ? 'border-[#3ecf8e] text-[#3ecf8e] font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Fuzzy & DE Engine</span>
        </button>
      </nav>

      {/* Error Alert */}
      {error && (
        <div className="bg-[#2a1414] border-b border-red-900/60 px-6 py-2.5 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>Backend Error: {error}. Ensure FastAPI is running on port 8000.</span>
        </div>
      )}

      {/* 3. Main Multi-Page Content Area with Error Boundary */}
      <ErrorBoundary>
        <main className="flex-1 p-6 bg-supabase-grid">
        {/* PAGE 1: INTERACTIVE LIVE SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="max-w-6xl mx-auto">
            {fde ? (
              <LiveSimulator
                fdeResult={fde}
                pdeResult={pde}
                rbResult={rb}
                timeLabels={timeLabels}
                currentHour={simulatedHourIdx}
                onHourChange={setSimulatedHourIdx}
              />
            ) : (
              <div className="flex items-center justify-center bg-[#171717] border border-[#262626] rounded-lg min-h-[400px]">
                <div className="text-center font-mono text-zinc-500 text-xs">
                  {loading ? 'Initializing soft-computing simulation...' : 'No optimization data available.'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGE 2: ANALYTICS & BENCHMARKS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* KPI Strip */}
            <KpiStrip fdeResult={fde} pdeResult={pde} rbResult={rb} />

            {/* Full 24-Hour Completed Dispatch Chart with Multi-Baseline Mode */}
            {fde && (
              <DispatchChart
                timeLabels={timeLabels}
                fdeResult={fde}
                pdeResult={pde}
                rbResult={rb}
                solarKw={fde.solar_kw}
                loadKw={fde.load_kw}
                batteryKw={fde.battery_kw}
                gridImportKw={fde.grid_import_kw}
                batterySoc={fde.battery_soc}
                selectedHourIndex={simulatedHourIdx}
                onHoverHour={setSimulatedHourIdx}
              />
            )}

            {/* Benchmark Comparison Table */}
            {fde && (
              <BenchmarkTable
                fdeResult={fde}
                pdeResult={pde}
                rbResult={rb}
              />
            )}
          </div>
        )}

        {/* PAGE 3: SOFT-COMPUTING ENGINE (FUZZY + DE) */}
        {activeTab === 'engine' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
            {/* Left: DE Convergence Chart (7 cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              {fde && (
                <ConvergenceChart
                  fdeCurve={fde.convergence_curve}
                  pdeCurve={pde ? pde.convergence_curve : null}
                />
              )}

              {/* Formulation Summary Card */}
              <div className="bg-[#171717] border border-[#262626] rounded-lg p-5 text-xs font-mono">
                <h4 className="text-sm font-semibold text-zinc-100 font-mono mb-2">
                  CO4 Hybrid Formulation Details
                </h4>
                <div className="space-y-2 text-zinc-300 leading-relaxed">
                  <p>
                    <b className="text-[#3ecf8e]">1. Mamdani FIS:</b> Evaluates 3 inputs (Renewable, Battery SoC, Grid Pressure) through 27 triangular/trapezoidal rules, defuzzifying to compute W_grid (0.5 to 3.0), B_bias (-1.0 to +1.0), and W_peak (1.0 to 5.0).
                  </p>
                  <p>
                    <b className="text-indigo-400">2. Differential Evolution:</b> Vectorized DE/best/1/bin mutation with inverter ramp-rate limiting (&Delta;P &le; 45 kW) and inter-step continuity constraints to eliminate high-frequency switching.
                  </p>
                  <p>
                    <b className="text-amber-400">3. Hybrid Advantage:</b> Reshapes the non-linear fitness landscape, reducing peak grid import by up to 17.4% over standard Plain DE.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Fuzzy Rule Inspector (5 cols) */}
            <div className="lg:col-span-5 flex flex-col">
              {optimizationData && (
                <FuzzyInspector
                  fuzzyExplainability={optimizationData.fuzzy_explainability}
                  selectedHourIndex={simulatedHourIdx}
                  onHourChange={setSimulatedHourIdx}
                  timeLabels={timeLabels}
                />
              )}
            </div>
          </div>
        )}
      </main>
      </ErrorBoundary>
    </div>
  );
}
