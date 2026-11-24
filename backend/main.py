"""
GridFlux FastAPI Backend
Module: backend.main

Provides REST endpoints for microgrid telemetry, scenario presets,
hybrid Fuzzy + Differential Evolution optimization, baseline comparisons,
and CSV/JSON metric exports.
"""

import sys
from pathlib import Path

# Add project root to sys.path so src.core is importable
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, JSONResponse
from pydantic import BaseModel, Field
import numpy as np
import pandas as pd

from src.core import (
    generate_microgrid_scenario,
    list_available_presets,
    scenario_to_dataframe,
    simulate_rule_based_dispatch,
    DifferentialEvolutionOptimizer,
    FuzzyDispatchController
)

app = FastAPI(
    title="GridFlux API",
    description="Soft-Computing Microgrid Load & Renewable Dispatch Optimization Engine (Fuzzy + DE)",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OptimizationRequest(BaseModel):
    scenario_id: str = Field(default="default_balanced", description="Preset scenario identifier")
    steps: int = Field(default=24, ge=12, le=48, description="Number of daily time steps")
    population_size: int = Field(default=30, ge=10, le=100, description="DE population size")
    generations: int = Field(default=35, ge=10, le=150, description="DE maximum generations")
    seed: int = Field(default=42, ge=0, description="Random seed for deterministic runs")
    mutation_factor: float = Field(default=0.7, ge=0.1, le=1.5, description="DE mutation scaling factor F")
    crossover_rate: float = Field(default=0.85, ge=0.1, le=1.0, description="DE crossover probability Cr")
    strategy: str = Field(default="best1bin", description="DE strategy (best1bin or rand1bin)")
    include_baselines: bool = Field(default=True, description="Whether to compute Plain DE and Rule-Based baselines")


def serialize_dispatch_result(res) -> Dict[str, Any]:
    return {
        "algorithm_name": res.algorithm_name,
        "time_steps": res.time_steps,
        "dt_hours": res.dt_hours,
        "solar_kw": res.solar_kw.tolist(),
        "load_kw": res.load_kw.tolist(),
        "battery_kw": res.battery_kw.tolist(),
        "battery_soc": res.battery_soc.tolist(),
        "grid_import_kw": res.grid_import_kw.tolist(),
        "total_cost_usd": res.total_cost_usd,
        "peak_grid_import_kw": res.peak_grid_import_kw,
        "renewable_utilization_pct": res.renewable_utilization_pct,
        "battery_cycle_cost_usd": res.battery_cycle_cost_usd,
        "convergence_curve": res.convergence_curve,
        "metadata": res.metadata
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "GridFlux Soft Computing Optimization API",
        "framework": "FastAPI + NumPy + SciPy"
    }


@app.get("/api/scenarios")
def get_scenarios():
    """Return available scenario presets."""
    return {"presets": list_available_presets()}


@app.get("/api/scenarios/{scenario_id}")
def get_scenario_detail(scenario_id: str, steps: int = Query(default=24, ge=12, le=48), seed: int = 42):
    """Return detailed time-series profiles and battery constraints for a scenario."""
    try:
        sc = generate_microgrid_scenario(preset_name=scenario_id, steps=steps, seed=seed)
        hours = np.linspace(0.0, 24.0, sc.time_steps, endpoint=False)
        labels = [f"{int(h):02d}:{int((h%1)*60):02d}" for h in hours]
        return {
            "name": sc.name,
            "description": sc.description,
            "time_steps": sc.time_steps,
            "dt_hours": sc.dt_hours,
            "time_labels": labels,
            "solar_kw": sc.solar_kw.tolist(),
            "load_kw": sc.load_kw.tolist(),
            "tariff_usd": sc.tariff_usd.tolist(),
            "battery": {
                "capacity_kwh": sc.battery.capacity_kwh,
                "max_charge_kw": sc.battery.max_charge_kw,
                "max_discharge_kw": sc.battery.max_discharge_kw,
                "soc_min": sc.battery.soc_min,
                "soc_max": sc.battery.soc_max,
                "soc_init": sc.battery.soc_init
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/optimize")
def run_optimization(req: OptimizationRequest):
    """
    Run the proposed Hybrid Fuzzy + Differential Evolution optimization
    along with benchmark comparisons against Plain DE and Heuristic Rule-Based dispatch.
    """
    try:
        scenario = generate_microgrid_scenario(
            preset_name=req.scenario_id,
            steps=req.steps,
            seed=req.seed
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 1. Proposed Hybrid: Fuzzy + Differential Evolution
    optimizer = DifferentialEvolutionOptimizer(
        population_size=req.population_size,
        max_generations=req.generations,
        mutation_factor=req.mutation_factor,
        crossover_rate=req.crossover_rate,
        strategy=req.strategy,
        seed=req.seed
    )
    fuzzy_de_res = optimizer.optimize(scenario, use_fuzzy_guidance=True)

    plain_de_res = None
    rule_based_res = None

    if req.include_baselines:
        # 2. Baseline A: Standard Differential Evolution (same seed and parameters)
        plain_optimizer = DifferentialEvolutionOptimizer(
            population_size=req.population_size,
            max_generations=req.generations,
            mutation_factor=req.mutation_factor,
            crossover_rate=req.crossover_rate,
            strategy=req.strategy,
            seed=req.seed
        )
        plain_de_res = plain_optimizer.optimize(scenario, use_fuzzy_guidance=False)

        # 3. Baseline B: Heuristic Rule-Based dispatch
        rule_based_res = simulate_rule_based_dispatch(scenario)

    # Fuzzy Controller Explainability Data
    fuzzy_controller = FuzzyDispatchController()
    max_sol = max(1.0, float(np.max(scenario.solar_kw)))
    max_lod = max(1.0, float(np.max(scenario.load_kw)))
    ren_norm = scenario.solar_kw / max_sol
    dem_norm = (scenario.load_kw / max_lod) * 0.7 + (scenario.tariff_usd / 0.65) * 0.3
    soc_series = np.array(fuzzy_de_res.battery_soc)

    fuzzy_eval = fuzzy_controller.evaluate_horizon(
        renewable_series=ren_norm,
        soc_series=soc_series,
        demand_pressure_series=dem_norm
    )

    hours = np.linspace(0.0, 24.0, scenario.time_steps, endpoint=False)
    time_labels = [f"{int(h):02d}:{int((h%1)*60):02d}" for h in hours]

    return {
        "scenario": {
            "name": scenario.name,
            "description": scenario.description,
            "time_steps": scenario.time_steps,
            "dt_hours": scenario.dt_hours,
            "time_labels": time_labels
        },
        "fuzzy_de": serialize_dispatch_result(fuzzy_de_res),
        "plain_de": serialize_dispatch_result(plain_de_res) if plain_de_res else None,
        "rule_based": serialize_dispatch_result(rule_based_res) if rule_based_res else None,
        "fuzzy_explainability": {
            "grid_penalty_series": fuzzy_eval["grid_penalty_series"].tolist(),
            "battery_bias_series": fuzzy_eval["battery_bias_series"].tolist(),
            "peak_weight_series": fuzzy_eval["peak_weight_series"].tolist(),
            "step_details": fuzzy_eval["step_details"]
        }
    }


@app.get("/api/export/{scenario_id}/csv")
def export_csv(
    scenario_id: str,
    steps: int = 24,
    seed: int = 42,
    population_size: int = 30,
    generations: int = 35
):
    """Export time-series dispatch table across all 3 methods to CSV."""
    scenario = generate_microgrid_scenario(preset_name=scenario_id, steps=steps, seed=seed)
    optimizer = DifferentialEvolutionOptimizer(population_size=population_size, max_generations=generations, seed=seed)
    fde = optimizer.optimize(scenario, use_fuzzy_guidance=True)
    pde = optimizer.optimize(scenario, use_fuzzy_guidance=False)
    rb = simulate_rule_based_dispatch(scenario)

    hours = np.linspace(0.0, 24.0, steps, endpoint=False)
    labels = [f"{int(h):02d}:{int((h%1)*60):02d}" for h in hours]

    df = pd.DataFrame({
        "time_step": np.arange(steps),
        "hour": labels,
        "solar_kw": scenario.solar_kw,
        "load_kw": scenario.load_kw,
        "tariff_usd_per_kwh": scenario.tariff_usd,
        "fde_battery_kw": fde.battery_kw,
        "fde_battery_soc": fde.battery_soc,
        "fde_grid_import_kw": fde.grid_import_kw,
        "pde_battery_kw": pde.battery_kw,
        "pde_grid_import_kw": pde.grid_import_kw,
        "rule_based_battery_kw": rb.battery_kw,
        "rule_based_grid_import_kw": rb.grid_import_kw,
    })

    csv_data = df.to_csv(index=False)
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=gridflux_dispatch_{scenario_id}.csv"}
    )
