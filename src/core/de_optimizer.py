"""
GridFlux Differential Evolution (DE) Microgrid Dispatch Optimizer
Module: src.core.de_optimizer

Implements:
  1. Hybrid Fuzzy + Differential Evolution (Fuzzy-DE) Optimizer [Proposed System]
  2. Standard Differential Evolution (Plain DE) [Baseline A]

Includes realistic physical battery inverter ramp-rate constraints, temporal
smoothing, and boundary protection to eliminate wobbly high-frequency oscillations.
"""

from typing import Dict, Any, Optional, Tuple
import numpy as np
from scipy.interpolate import CubicSpline
from src.core.simulation import MicrogridScenario
from src.core.fuzzy_controller import FuzzyDispatchController
from src.core.baselines import DispatchResult


class DifferentialEvolutionOptimizer:
    """
    Differential Evolution Optimizer for multi-period microgrid power dispatch
    with inverter ramp-rate limits and physics-informed temporal smoothness.
    """

    def __init__(
        self,
        population_size: int = 40,
        max_generations: int = 50,
        mutation_factor: float = 0.65,
        crossover_rate: float = 0.85,
        strategy: str = "best1bin",
        max_ramp_kw: float = 45.0,  # Max battery power delta per step (kW)
        seed: int = 42
    ):
        self.pop_size = max(10, population_size)
        self.max_iter = max(10, max_generations)
        self.F = mutation_factor
        self.Cr = crossover_rate
        self.strategy = strategy
        self.max_ramp_kw = max_ramp_kw
        self.seed = seed
        self.rng = np.random.default_rng(seed)

    def _apply_ramp_rate_limit(self, raw_p_bat: np.ndarray, scenario: MicrogridScenario) -> np.ndarray:
        """
        Enforce physical power inverter ramp-rate limits (|P(t) - P(t-1)| <= max_ramp).
        Ensures smooth, non-oscillating battery charging and discharging.
        """
        T = scenario.time_steps
        bat = scenario.battery
        smoothed = np.zeros(T, dtype=float)

        prev_p = 0.0
        for t in range(T):
            target_p = np.clip(raw_p_bat[t], -bat.max_discharge_kw, bat.max_charge_kw)
            delta = target_p - prev_p
            if abs(delta) > self.max_ramp_kw:
                target_p = prev_p + np.sign(delta) * self.max_ramp_kw
            smoothed[t] = target_p
            prev_p = target_p

        return smoothed

    def _simulate_candidate_physics(
        self,
        p_bat_candidate: np.ndarray,
        scenario: MicrogridScenario
    ) -> Tuple[np.ndarray, np.ndarray, float, float, np.ndarray]:
        """
        Simulate battery dynamics and compute physical grid interaction.
        Returns:
          - p_grid: Realized net grid power (kW)
          - soc: Battery state of charge curve
          - soc_violation_penalty: Quadratic penalty for SoC boundary breach
          - throughput: Total energy cycled through battery (kWh)
          - p_bat_realized: Ramp-rate compliant battery power (kW)
        """
        T = scenario.time_steps
        dt = scenario.dt_hours
        bat = scenario.battery

        p_bat_realized = self._apply_ramp_rate_limit(p_bat_candidate, scenario)

        current_e = bat.soc_init * bat.capacity_kwh
        e_min = bat.soc_min * bat.capacity_kwh
        e_max = bat.soc_max * bat.capacity_kwh

        soc = np.zeros(T, dtype=float)
        p_grid = np.zeros(T, dtype=float)
        penalty = 0.0
        throughput = 0.0

        for t in range(T):
            u = p_bat_realized[t]

            if u >= 0.0:
                e_next = current_e + u * bat.eta_charge * dt
                throughput += u * bat.eta_charge * dt
            else:
                e_next = current_e - (abs(u) / bat.eta_discharge) * dt
                throughput += (abs(u) / bat.eta_discharge) * dt

            # Quadratic penalty if outside [e_min, e_max]
            if e_next < e_min:
                penalty += ((e_min - e_next) / bat.capacity_kwh) ** 2 * 3000.0
                current_e = max(e_min * 0.9, e_next)
            elif e_next > e_max:
                penalty += ((e_next - e_max) / bat.capacity_kwh) ** 2 * 3000.0
                current_e = min(e_max * 1.1, e_next)
            else:
                current_e = e_next

            soc[t] = current_e / bat.capacity_kwh
            p_grid[t] = scenario.load_kw[t] - scenario.solar_kw[t] + u

        return p_grid, soc, penalty, throughput, p_bat_realized

    def _compute_fitness(
        self,
        p_bat: np.ndarray,
        scenario: MicrogridScenario,
        fuzzy_guidance: Optional[Dict[str, np.ndarray]] = None
    ) -> float:
        dt = scenario.dt_hours
        bat = scenario.battery
        p_grid, soc, soc_penalty, throughput, p_bat_real = self._simulate_candidate_physics(p_bat, scenario)

        p_import = np.maximum(0.0, p_grid)
        p_export = np.maximum(0.0, -p_grid)

        base_tariff = scenario.tariff_usd
        export_rate = base_tariff * 0.50

        # Ramp-rate smoothness penalty to stop erratic switching
        ramp_diffs = np.diff(p_bat_real)
        ramp_penalty = np.sum(ramp_diffs ** 2) * 0.0015

        if fuzzy_guidance is not None:
            w_grid = fuzzy_guidance["grid_penalty_series"]
            w_bias = fuzzy_guidance["battery_bias_series"]
            w_peak = fuzzy_guidance["peak_weight_series"]

            energy_cost = np.sum(p_import * (base_tariff * w_grid) * dt)
            export_credit = np.sum(p_export * export_rate * dt)
            wear_cost = throughput * bat.deg_cost_per_kwh

            peak_val = np.max(p_import) if len(p_import) > 0 else 0.0
            peak_penalty = (peak_val ** 2) * 0.004 * float(np.mean(w_peak))

            # Directional bias alignment with fuzzy guidance
            bias_mismatch = np.sum(np.maximum(0.0, -w_bias * p_bat_real)) * 0.02

            total_fitness = energy_cost - export_credit + wear_cost + peak_penalty + bias_mismatch + soc_penalty + ramp_penalty
        else:
            energy_cost = np.sum(p_import * base_tariff * dt)
            export_credit = np.sum(p_export * export_rate * dt)
            wear_cost = throughput * bat.deg_cost_per_kwh
            peak_val = np.max(p_import) if len(p_import) > 0 else 0.0
            peak_penalty = (peak_val ** 2) * 0.004

            total_fitness = energy_cost - export_credit + wear_cost + peak_penalty + soc_penalty + ramp_penalty

        return float(total_fitness)

    def optimize(
        self,
        scenario: MicrogridScenario,
        use_fuzzy_guidance: bool = True
    ) -> DispatchResult:
        T = scenario.time_steps
        dt = scenario.dt_hours
        bat = scenario.battery

        lb = -bat.max_discharge_kw
        ub = bat.max_charge_kw

        fuzzy_info = None
        fuzzy_step_details = []
        if use_fuzzy_guidance:
            fuzzy_engine = FuzzyDispatchController()
            max_sol = max(1.0, float(np.max(scenario.solar_kw)))
            max_lod = max(1.0, float(np.max(scenario.load_kw)))
            ren_norm = scenario.solar_kw / max_sol
            dem_norm = (scenario.load_kw / max_lod) * 0.7 + (scenario.tariff_usd / 0.65) * 0.3
            soc_prior = np.full(T, bat.soc_init)

            fuzzy_info = fuzzy_engine.evaluate_horizon(
                renewable_series=ren_norm,
                soc_series=soc_prior,
                demand_pressure_series=dem_norm
            )
            fuzzy_step_details = fuzzy_info["step_details"]

        # Initialize Population with smooth spline candidates and heuristic seeds
        pop = np.zeros((self.pop_size, T), dtype=float)

        # 1. Heuristic seed: Solar absorption & peak support
        diff = scenario.solar_kw - scenario.load_kw
        heuristic_seed = np.clip(diff, lb, ub)
        pop[0] = self._apply_ramp_rate_limit(heuristic_seed, scenario)

        # 2. Smooth cubic spline random seeds across 6 macro knots
        knot_indices = np.linspace(0, T - 1, 6, dtype=int)
        for i in range(1, self.pop_size):
            knot_vals = self.rng.uniform(lb * 0.8, ub * 0.8, size=6)
            cs = CubicSpline(knot_indices, knot_vals)
            continuous_curve = cs(np.arange(T))
            # Add minor high-frequency variation
            jitter = self.rng.normal(0, 5.0, size=T)
            pop[i] = self._apply_ramp_rate_limit(continuous_curve + jitter, scenario)

        fitness = np.zeros(self.pop_size, dtype=float)
        for i in range(self.pop_size):
            fitness[i] = self._compute_fitness(pop[i], scenario, fuzzy_info)

        best_idx = int(np.argmin(fitness))
        best_vec = pop[best_idx].copy()
        best_cost = fitness[best_idx]

        convergence_curve = [float(best_cost)]

        for gen in range(self.max_iter):
            for i in range(self.pop_size):
                candidates = [idx for idx in range(self.pop_size) if idx != i]
                r1, r2, r3 = self.rng.choice(candidates, size=3, replace=False)

                if self.strategy == "best1bin":
                    v = best_vec + self.F * (pop[r1] - pop[r2])
                else:
                    v = pop[r1] + self.F * (pop[r2] - pop[r3])

                v = self._apply_ramp_rate_limit(np.clip(v, lb, ub), scenario)

                j_rand = self.rng.integers(0, T)
                cross_mask = (self.rng.random(T) < self.Cr)
                cross_mask[j_rand] = True
                u = np.where(cross_mask, v, pop[i])
                u = self._apply_ramp_rate_limit(u, scenario)

                trial_fitness = self._compute_fitness(u, scenario, fuzzy_info)
                if trial_fitness <= fitness[i]:
                    pop[i] = u
                    fitness[i] = trial_fitness
                    if trial_fitness < best_cost:
                        best_cost = trial_fitness
                        best_vec = u.copy()

            convergence_curve.append(float(best_cost))

        p_grid, soc, _, throughput, p_bat_opt = self._simulate_candidate_physics(best_vec, scenario)

        import_cost = float(np.sum(np.maximum(0.0, p_grid) * scenario.tariff_usd * dt))
        export_credit = float(np.sum(np.maximum(0.0, -p_grid) * (scenario.tariff_usd * 0.5) * dt))
        deg_cost = float(throughput * bat.deg_cost_per_kwh)
        net_actual_cost = import_cost - export_credit + deg_cost

        peak_grid = float(np.max(np.maximum(0.0, p_grid)))

        total_solar = float(np.sum(scenario.solar_kw) * dt)
        solar_curtailed_or_exported = float(np.sum(np.maximum(0.0, -p_grid)) * dt)
        renewable_util = max(0.0, min(100.0, ((total_solar - solar_curtailed_or_exported) / max(1e-3, total_solar)) * 100.0))

        algo_name = "Fuzzy + Differential Evolution" if use_fuzzy_guidance else "Standard Differential Evolution"

        return DispatchResult(
            algorithm_name=algo_name,
            time_steps=T,
            dt_hours=dt,
            solar_kw=scenario.solar_kw,
            load_kw=scenario.load_kw,
            battery_kw=np.round(p_bat_opt, 2),
            battery_soc=np.round(soc, 4),
            grid_import_kw=np.round(p_grid, 2),
            total_cost_usd=round(net_actual_cost, 2),
            peak_grid_import_kw=round(peak_grid, 2),
            renewable_utilization_pct=round(renewable_util, 1),
            battery_cycle_cost_usd=round(deg_cost, 2),
            convergence_curve=[round(c, 2) for c in convergence_curve],
            metadata={
                "population_size": self.pop_size,
                "generations": self.max_iter,
                "strategy": self.strategy,
                "max_ramp_kw": self.max_ramp_kw,
                "actual_import_cost_usd": round(import_cost, 2),
                "actual_export_credit_usd": round(export_credit, 2),
                "total_throughput_kwh": round(throughput, 1),
                "fuzzy_active": use_fuzzy_guidance,
                "fuzzy_step_details": fuzzy_step_details[:10] if use_fuzzy_guidance else []
            }
        )
