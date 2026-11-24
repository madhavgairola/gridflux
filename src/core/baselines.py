"""
GridFlux Baseline Dispatch Algorithms
Module: src.core.baselines

Implements benchmark dispatch strategies for comparison:
  1. Heuristic Rule-Based Dispatch (Self-Consumption Maximization)
  2. Baseline Metrics Extraction
"""

from dataclasses import dataclass
from typing import Dict, Any
import numpy as np
from src.core.simulation import MicrogridScenario


@dataclass
class DispatchResult:
    algorithm_name: str
    time_steps: int
    dt_hours: float
    solar_kw: np.ndarray
    load_kw: np.ndarray
    battery_kw: np.ndarray       # Positive = Charging, Negative = Discharging
    battery_soc: np.ndarray      # State of Charge [0.0 - 1.0]
    grid_import_kw: np.ndarray   # Positive = Import from Grid, Negative = Export
    total_cost_usd: float        # Total net operational cost ($)
    peak_grid_import_kw: float   # Maximum instantaneous grid import (kW)
    renewable_utilization_pct: float  # Percentage of solar utilized locally
    battery_cycle_cost_usd: float     # Estimated battery throughput degradation cost ($)
    convergence_curve: list[float]    # Convergence history (for DE baselines)
    metadata: Dict[str, Any]


def simulate_rule_based_dispatch(scenario: MicrogridScenario) -> DispatchResult:
    """
    Baseline B: Greedy Heuristic Rule-Based Dispatch.
    Logic:
      1. Priority 1: Solar serves Load directly.
      2. If Solar > Load (Surplus): Charge battery up to max charge power and SoC_max.
         Remaining excess solar is exported to grid.
      3. If Solar < Load (Deficit): Discharge battery up to max discharge power and SoC_min.
         Remaining unserved deficit is imported from the utility grid.
      Zero forward lookahead or tariff awareness.
    """
    T = scenario.time_steps
    dt = scenario.dt_hours
    bat = scenario.battery

    p_bat = np.zeros(T, dtype=float)
    soc = np.zeros(T + 1, dtype=float)
    soc[0] = bat.soc_init

    current_energy = bat.soc_init * bat.capacity_kwh
    e_min = bat.soc_min * bat.capacity_kwh
    e_max = bat.soc_max * bat.capacity_kwh

    p_grid = np.zeros(T, dtype=float)
    solar_used = 0.0
    total_solar = np.sum(scenario.solar_kw) * dt
    battery_energy_throughput = 0.0

    for t in range(T):
        p_sol = scenario.solar_kw[t]
        p_lod = scenario.load_kw[t]
        net_diff = p_sol - p_lod  # Positive = surplus, Negative = deficit

        if net_diff >= 0.0:
            # Surplus solar available: Serve load 100%
            solar_used += p_lod * dt
            surplus = net_diff

            # Charge battery with surplus
            max_charge_energy = (e_max - current_energy) / (bat.eta_charge * dt)
            charge_power = min(surplus, bat.max_charge_kw, max(0.0, max_charge_energy))

            p_bat[t] = charge_power
            energy_in = charge_power * bat.eta_charge * dt
            current_energy += energy_in
            solar_used += charge_power * dt
            battery_energy_throughput += energy_in

            # Remaining excess solar exported to grid
            p_grid[t] = -(surplus - charge_power)
        else:
            # Deficit: Solar is fully consumed by load
            solar_used += p_sol * dt
            deficit = -net_diff

            # Discharge battery to cover deficit
            max_dis_energy = (current_energy - e_min) * bat.eta_discharge / dt
            dis_power = min(deficit, bat.max_discharge_kw, max(0.0, max_dis_energy))

            p_bat[t] = -dis_power
            energy_out = (dis_power / bat.eta_discharge) * dt
            current_energy -= energy_out
            battery_energy_throughput += energy_out

            # Remaining deficit imported from grid
            p_grid[t] = deficit - dis_power

        soc[t + 1] = current_energy / bat.capacity_kwh

    # Financial Cost Calculation
    # Grid import paid at tariff; Grid export compensated at 50% feed-in rate
    import_cost = np.sum(np.maximum(0.0, p_grid) * scenario.tariff_usd * dt)
    export_credit = np.sum(np.maximum(0.0, -p_grid) * (scenario.tariff_usd * 0.5) * dt)
    deg_cost = battery_energy_throughput * bat.deg_cost_per_kwh
    net_total_cost = float(import_cost - export_credit + deg_cost)

    peak_import = float(np.max(np.maximum(0.0, p_grid)))
    utilization = float((solar_used / max(1e-3, total_solar)) * 100.0)

    return DispatchResult(
        algorithm_name="Heuristic Rule-Based",
        time_steps=T,
        dt_hours=dt,
        solar_kw=scenario.solar_kw,
        load_kw=scenario.load_kw,
        battery_kw=np.round(p_bat, 2),
        battery_soc=np.round(soc[:T], 4),
        grid_import_kw=np.round(p_grid, 2),
        total_cost_usd=round(net_total_cost, 2),
        peak_grid_import_kw=round(peak_import, 2),
        renewable_utilization_pct=round(min(100.0, utilization), 1),
        battery_cycle_cost_usd=round(deg_cost, 2),
        convergence_curve=[],
        metadata={
            "description": "Greedy instantaneous self-consumption without lookahead or tariff optimization",
            "import_cost_usd": round(float(import_cost), 2),
            "export_credit_usd": round(float(export_credit), 2),
            "total_throughput_kwh": round(float(battery_energy_throughput), 1)
        }
    )
