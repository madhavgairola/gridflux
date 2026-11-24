"""
GridFlux Differential Evolution (DE) Microgrid Dispatch Optimizer
Module: src.core.de_optimizer

Implements:
  1. Hybrid Fuzzy + Differential Evolution (Fuzzy-DE) Optimizer [Proposed System]
  2. Standard Differential Evolution (Plain DE) [Baseline A]

Algorithms follow standard Storn & Price DE paradigms (DE/rand/1/bin, DE/best/1/bin)
with vectorized evaluation, constraint penalization, and generation-by-generation
convergence recording.
"""

from typing import Dict, Any, Optional, Tuple
import numpy as np
from src.core.simulation import MicrogridScenario
from src.core.fuzzy_controller import FuzzyDispatchController
from src.core.baselines import DispatchResult


class DifferentialEvolutionOptimizer:
    """
    Differential Evolution Optimizer for multi-period microgrid power dispatch.
    """

    def __init__(
        self,
        population_size: int = 40,
        max_generations: int = 60,
        mutation_factor: float = 0.7,
        crossover_rate: float = 0.85,
        strategy: str = "best1bin",  # "rand1bin" or "best1bin"
        seed: int = 42
    ):
        self.pop_size = max(10, population_size)
        self.max_iter = max(10, max_generations)
        self.F = mutation_factor
        self.Cr = crossover_rate
        self.strategy = strategy
        self.seed = seed
        self.rng = np.random.default_rng(seed)

    def _simulate_candidate_physics(
        self,
        p_bat_candidate: np.ndarray,
        scenario: MicrogridScenario
    ) -> Tuple[np.ndarray, np.ndarray, float, float]:
        """
        Simulate battery dynamics and compute physical grid interaction.
        Returns:
          - p_grid: Realized net grid power (kW)
          - soc: Battery state of charge curve
          - soc_violation_penalty: Quadratic penalty for SoC boundary breach
          - throughput: Total energy cycled through battery (kWh)
        """
        T = scenario.time_steps
        dt = scenario.dt_hours
        bat = scenario.battery

        current_e = bat.soc_init * bat.capacity_kwh
        e_min = bat.soc_min * bat.capacity_kwh
        e_max = bat.soc_max * bat.capacity_kwh

        soc = np.zeros(T, dtype=float)
        p_grid = np.zeros(T, dtype=float)
        penalty = 0.0
        throughput = 0.0

        for t in range(T):
            u = p_bat_candidate[t]  # Commanded battery power

            # Boundary clipping check
            if u >= 0.0:
                e_next = current_e + u * bat.eta_charge * dt
                throughput += u * bat.eta_charge * dt
            else:
                e_next = current_e - (abs(u) / bat.eta_discharge) * dt
                throughput += (abs(u) / bat.eta_discharge) * dt

            # Quadratic penalty if outside [e_min, e_max]
            if e_next < e_min:
                penalty += ((e_min - e_next) / bat.capacity_kwh) ** 2 * 2000.0
                current_e = max(e_min * 0.9, e_next)
            elif e_next > e_max:
                penalty += ((e_next - e_max) / bat.capacity_kwh) ** 2 * 2000.0
                current_e = min(e_max * 1.1, e_next)
            else:
                current_e = e_next

            soc[t] = current_e / bat.capacity_kwh
            # Power balance: P_grid = P_load - P_solar + P_bat
            p_grid[t] = scenario.load_kw[t] - scenario.solar_kw[t] + u

        return p_grid, soc, penalty, throughput

    def _compute_fitness(
        self,
        p_bat: np.ndarray,
        scenario: MicrogridScenario,
        fuzzy_guidance: Optional[Dict[str, np.ndarray]] = None
    ) -> float:
        """
        Multi-term objective function.
        Cost = Grid Electricity Cost
             - Export Revenues
             + Battery Degradation Wear
             + Peak Grid Import Surcharge
             + SoC Barrier Penalties
             + [Fuzzy Operating Guidance Penalty (if enabled)]
        """
        dt = scenario.dt_hours
        bat = scenario.battery
        p_grid, soc, soc_penalty, throughput = self._simulate_candidate_physics(p_bat, scenario)

        p_import = np.maximum(0.0, p_grid)
        p_export = np.maximum(0.0, -p_grid)

        # Baseline standard electricity costs
        base_tariff = scenario.tariff_usd
        export_rate = base_tariff * 0.50

        if fuzzy_guidance is not None:
            # HYBRID FUZZY + DE OBJECTIVE
            w_grid = fuzzy_guidance["grid_penalty_series"]
            w_bias = fuzzy_guidance["battery_bias_series"]
            w_peak = fuzzy_guidance["peak_weight_series"]

            # 1. Fuzzy-weighted grid import cost
            energy_cost = np.sum(p_import * (base_tariff * w_grid) * dt)
            export_credit = np.sum(p_export * export_rate * dt)

            # 2. Battery cycle wear
            wear_cost = throughput * bat.deg_cost_per_kwh

            # 3. Fuzzy adaptive peak shaving
            peak_val = np.max(p_import) if len(p_import) > 0 else 0.0
            peak_penalty = (peak_val ** 2) * 0.003 * float(np.mean(w_peak))

            # 4. Fuzzy battery dispatch directional alignment
            # Penalize discharging when fuzzy system urges charge (+), and vice versa
            bias_mismatch = np.sum(np.maximum(0.0, -w_bias * p_bat)) * 0.015

            total_fitness = energy_cost - export_credit + wear_cost + peak_penalty + bias_mismatch + soc_penalty
        else:
            # STANDARD PLAIN DE OBJECTIVE (Baseline A)
            energy_cost = np.sum(p_import * base_tariff * dt)
            export_credit = np.sum(p_export * export_rate * dt)
            wear_cost = throughput * bat.deg_cost_per_kwh
            peak_val = np.max(p_import) if len(p_import) > 0 else 0.0
            peak_penalty = (peak_val ** 2) * 0.003

            total_fitness = energy_cost - export_credit + wear_cost + peak_penalty + soc_penalty

        return float(total_fitness)

    def optimize(
        self,
        scenario: MicrogridScenario,
        use_fuzzy_guidance: bool = True
    ) -> DispatchResult:
        """
        Execute Differential Evolution optimization loop.
        """
        T = scenario.time_steps
        dt = scenario.dt_hours
        bat = scenario.battery

        # Parameter bounds for each decision variable x_t in [-P_max_dis, +P_max_ch]
        lb = -bat.max_discharge_kw
        ub = bat.max_charge_kw

        # Prepare Fuzzy Guidance if enabled
        fuzzy_info = None
        fuzzy_step_details = []
        if use_fuzzy_guidance:
            fuzzy_engine = FuzzyDispatchController()
            # Normalize inputs for fuzzy evaluation
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

        # Initialize Population
        pop = self.rng.uniform(lb, ub, size=(self.pop_size, T))

        # Seed initial heuristic individual into population for fast convergence
        heuristic_individual = np.zeros(T, dtype=float)
        for t in range(T):
            diff = scenario.solar_kw[t] - scenario.load_kw[t]
            if diff > 0:
                heuristic_individual[t] = min(diff, ub)
            else:
                heuristic_individual[t] = max(diff, lb)
        pop[0] = heuristic_individual

        fitness = np.zeros(self.pop_size, dtype=float)
        for i in range(self.pop_size):
            fitness[i] = self._compute_fitness(pop[i], scenario, fuzzy_info)

        best_idx = int(np.argmin(fitness))
        best_vec = pop[best_idx].copy()
        best_cost = fitness[best_idx]

        convergence_curve = [float(best_cost)]

        # DE Evolution Loop
        for gen in range(self.max_iter):
            for i in range(self.pop_size):
                # Select distinct random donor indices
                candidates = [idx for idx in range(self.pop_size) if idx != i]
                r1, r2, r3 = self.rng.choice(candidates, size=3, replace=False)

                # Mutation
                if self.strategy == "best1bin":
                    v = best_vec + self.F * (pop[r1] - pop[r2])
                else:  # "rand1bin"
                    v = pop[r1] + self.F * (pop[r2] - pop[r3])

                # Bound handling (reflection/clamping)
                v = np.clip(v, lb, ub)

                # Binomial Crossover
                j_rand = self.rng.integers(0, T)
                cross_mask = (self.rng.random(T) < self.Cr)
                cross_mask[j_rand] = True
                u = np.where(cross_mask, v, pop[i])

                # Selection
                trial_fitness = self._compute_fitness(u, scenario, fuzzy_info)
                if trial_fitness <= fitness[i]:
                    pop[i] = u
                    fitness[i] = trial_fitness
                    if trial_fitness < best_cost:
                        best_cost = trial_fitness
                        best_vec = u.copy()

            convergence_curve.append(float(best_cost))

        # Realize optimal physical state from best vector
        p_grid, soc, _, throughput = self._simulate_candidate_physics(best_vec, scenario)

        # Standard physical operational metrics (unweighted actual USD dollars for fair comparison)
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
            battery_kw=np.round(best_vec, 2),
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
                "mutation_factor": self.F,
                "crossover_rate": self.Cr,
                "actual_import_cost_usd": round(import_cost, 2),
                "actual_export_credit_usd": round(export_credit, 2),
                "total_throughput_kwh": round(throughput, 1),
                "fuzzy_active": use_fuzzy_guidance,
                "fuzzy_step_details": fuzzy_step_details[:10] if use_fuzzy_guidance else []
            }
        )
