"""
GridFlux Test Suite
Covers:
  - Fuzzy Membership & Mamdani Inference
  - Microgrid Scenario Generation & Physics
  - Differential Evolution (Fuzzy-DE vs Plain-DE)
  - Heuristic Rule-Based Dispatch
  - FastAPI Endpoints
"""

import pytest
import numpy as np
from fastapi.testclient import TestClient

from src.core.fuzzy_controller import FuzzyDispatchController, trimf, trapmf
from src.core.simulation import generate_microgrid_scenario, list_available_presets, BatteryConfig
from src.core.baselines import simulate_rule_based_dispatch
from src.core.de_optimizer import DifferentialEvolutionOptimizer
from backend.main import app


def test_membership_functions():
    # Triangular membership
    assert trimf(2.0, (1.0, 2.0, 3.0)) == 1.0
    assert trimf(1.0, (1.0, 2.0, 3.0)) == 0.0
    assert trimf(1.5, (1.0, 2.0, 3.0)) == 0.5

    # Trapezoidal membership
    assert trapmf(2.5, (1.0, 2.0, 3.0, 4.0)) == 1.0
    assert trapmf(0.5, (1.0, 2.0, 3.0, 4.0)) == 0.0
    assert trapmf(3.5, (1.0, 2.0, 3.0, 4.0)) == 0.5


def test_fuzzy_controller_bounds():
    controller = FuzzyDispatchController()
    res = controller.evaluate_step(ren=0.8, soc=0.3, dem=0.9)

    assert 0.5 <= res["grid_penalty"] <= 3.0
    assert -1.0 <= res["battery_bias"] <= 1.0
    assert 1.0 <= res["peak_shaving_weight"] <= 5.0
    assert res["active_rules_count"] > 0
    assert "top_rules" in res


def test_microgrid_scenario_generator():
    presets = list_available_presets()
    assert len(presets) >= 4

    scenario = generate_microgrid_scenario("default_balanced", steps=24, seed=42)
    assert scenario.time_steps == 24
    assert len(scenario.solar_kw) == 24
    assert len(scenario.load_kw) == 24
    assert len(scenario.tariff_usd) == 24
    assert np.all(scenario.solar_kw >= 0.0)
    assert np.all(scenario.load_kw > 0.0)


def test_rule_based_dispatch():
    scenario = generate_microgrid_scenario("default_balanced", steps=24, seed=42)
    res = simulate_rule_based_dispatch(scenario)

    assert res.total_cost_usd > 0.0
    assert res.peak_grid_import_kw >= 0.0
    assert 0.0 <= res.renewable_utilization_pct <= 100.0
    assert len(res.battery_soc) == 24
    # Check battery bounds
    assert np.all(res.battery_soc >= scenario.battery.soc_min - 0.05)
    assert np.all(res.battery_soc <= scenario.battery.soc_max + 0.05)


def test_differential_evolution_optimizer():
    scenario = generate_microgrid_scenario("default_balanced", steps=12, seed=42)
    optimizer = DifferentialEvolutionOptimizer(population_size=12, max_generations=10, seed=42)

    # Test Plain DE
    pde_res = optimizer.optimize(scenario, use_fuzzy_guidance=False)
    assert pde_res.total_cost_usd > 0.0
    assert len(pde_res.convergence_curve) == 11

    # Test Fuzzy + DE
    fde_res = optimizer.optimize(scenario, use_fuzzy_guidance=True)
    assert fde_res.total_cost_usd > 0.0
    assert len(fde_res.convergence_curve) == 11


def test_fastapi_endpoints():
    client = TestClient(app)

    # Health
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"

    # Scenarios list
    r = client.get("/api/scenarios")
    assert r.status_code == 200
    assert "presets" in r.json()

    # Optimize endpoint
    r = client.post("/api/optimize", json={
        "scenario_id": "default_balanced",
        "steps": 12,
        "population_size": 10,
        "generations": 10,
        "seed": 42,
        "include_baselines": True
    })
    assert r.status_code == 200
    data = r.json()
    assert "fuzzy_de" in data
    assert "plain_de" in data
    assert "rule_based" in data
    assert "fuzzy_explainability" in data
