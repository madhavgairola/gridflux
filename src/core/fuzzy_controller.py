"""
GridFlux Fuzzy Inference Controller
Module: src.core.fuzzy_controller

Course / Lab: Fundamentals of Soft Computing Lab (26B16CS311) - CO4 Hybrid System
Implements a Mamdani-style Fuzzy Inference System (FIS) evaluating:
  Inputs:
    1. Renewable Generation Ratio (R in [0, 1])
    2. Battery State of Charge (SoC in [0, 1])
    3. Grid Demand Pressure (D in [0, 1], combining load and tariff signals)
  Outputs:
    1. Grid Penalty Multiplier (W_grid in [0.5, 3.0])
    2. Battery Dispatch Bias (B_bias in [-1.0, 1.0]: +1=strong charge, -1=strong discharge)
    3. Peak Shaving Weight (W_peak in [1.0, 5.0])
"""

from typing import Dict, List, Tuple, Any
import numpy as np


def trimf(x: float | np.ndarray, params: Tuple[float, float, float]) -> float | np.ndarray:
    """Triangular membership function."""
    a, b, c = params
    if isinstance(x, np.ndarray):
        y = np.zeros_like(x, dtype=float)
        idx1 = (a < x) & (x <= b)
        idx2 = (b < x) & (x < c)
        if b > a:
            y[idx1] = (x[idx1] - a) / (b - a)
        if c > b:
            y[idx2] = (c - x[idx2]) / (c - b)
        y[x == b] = 1.0
        return y
    else:
        if x <= a or x >= c:
            return 0.0
        elif x == b:
            return 1.0
        elif a < x < b:
            return (x - a) / (b - a)
        else:
            return (c - x) / (c - b)


def trapmf(x: float | np.ndarray, params: Tuple[float, float, float, float]) -> float | np.ndarray:
    """Trapezoidal membership function."""
    a, b, c, d = params
    if isinstance(x, np.ndarray):
        y = np.zeros_like(x, dtype=float)
        idx1 = (a < x) & (x < b)
        idx2 = (b <= x) & (x <= c)
        idx3 = (c < x) & (x < d)
        if b > a:
            y[idx1] = (x[idx1] - a) / (b - a)
        y[idx2] = 1.0
        if d > c:
            y[idx3] = (d - x[idx3]) / (d - c)
        return y
    else:
        if x <= a or x >= d:
            return 0.0
        elif b <= x <= c:
            return 1.0
        elif a < x < b:
            return (x - a) / (b - a)
        else:
            return (d - x) / (d - c)


class FuzzyDispatchController:
    """
    Mamdani Fuzzy Inference Controller for Smart Grid Micro-Load Management.
    Translates imprecise environmental and operational telemetry into actionable
    dispatch weights that guide the Differential Evolution optimizer.
    """

    def __init__(self):
        # Discretization resolution for defuzzification
        self.output_res = 101

        # Universe of discourse for outputs
        self.grid_pen_x = np.linspace(0.5, 3.0, self.output_res)
        self.bat_bias_x = np.linspace(-1.0, 1.0, self.output_res)
        self.peak_shave_x = np.linspace(1.0, 5.0, self.output_res)

        # Output fuzzy sets definition
        # Grid Penalty: Low (L), Medium (M), High (H)
        self.out_grid_L = trapmf(self.grid_pen_x, (0.5, 0.5, 0.9, 1.4))
        self.out_grid_M = trimf(self.grid_pen_x, (1.0, 1.7, 2.3))
        self.out_grid_H = trapmf(self.grid_pen_x, (1.8, 2.4, 3.0, 3.0))

        # Battery Bias: Discharge (D), Neutral (N), Charge (C)
        self.out_bias_D = trapmf(self.bat_bias_x, (-1.0, -1.0, -0.6, -0.1))
        self.out_bias_N = trimf(self.bat_bias_x, (-0.3, 0.0, 0.3))
        self.out_bias_C = trapmf(self.bat_bias_x, (0.1, 0.6, 1.0, 1.0))

        # Peak Shaving Weight: Relaxed (R), Standard (S), Aggressive (A)
        self.out_peak_R = trapmf(self.peak_shave_x, (1.0, 1.0, 1.5, 2.5))
        self.out_peak_S = trimf(self.peak_shave_x, (2.0, 3.0, 4.0))
        self.out_peak_A = trapmf(self.peak_shave_x, (3.5, 4.2, 5.0, 5.0))

        # Rule Definitions
        # (Renewable, SoC, Demand) -> (GridPen, BatBias, PeakShave, RuleName)
        self.rules = [
            # High Renewable scenarios (Surplus generation)
            ("H", "L", "L", "L", "C", "R", "R1: Surplus solar, low SoC -> Priority charge battery"),
            ("H", "M", "L", "L", "C", "R", "R2: Surplus solar, mid SoC -> Charge battery & buffer"),
            ("H", "H", "L", "L", "N", "R", "R3: Surplus solar, full battery -> Neutral dispatch"),
            ("H", "L", "M", "M", "C", "S", "R4: High solar, mid load -> Charge battery moderately"),
            ("H", "M", "M", "L", "N", "S", "R5: High solar, balanced microgrid -> Self-sustain"),
            ("H", "H", "M", "L", "D", "S", "R6: High solar & full battery -> Displace remaining grid"),
            ("H", "L", "H", "H", "N", "A", "R7: Peak load with high solar but low SoC -> Protect battery"),
            ("H", "M", "H", "M", "D", "A", "R8: Peak load, high solar, mid SoC -> Assist with battery"),
            ("H", "H", "H", "L", "D", "A", "R9: Peak load, high solar, full battery -> Full battery assist"),

            # Medium Renewable scenarios (Intermittent generation)
            ("M", "L", "L", "L", "C", "R", "R10: Moderate solar, off-peak -> Trickle charge battery"),
            ("M", "M", "L", "L", "N", "R", "R11: Moderate solar, off-peak -> Normal balance"),
            ("M", "H", "L", "L", "N", "R", "R12: Moderate solar, full battery, off-peak -> Idle battery"),
            ("M", "L", "M", "M", "N", "S", "R13: Mid solar, mid SoC, mid load -> Standard grid flow"),
            ("M", "M", "M", "M", "D", "S", "R14: Mid solar, good SoC -> Discharge battery to trim grid"),
            ("M", "H", "M", "L", "D", "S", "R15: Mid solar, high SoC -> Active discharge"),
            ("M", "L", "H", "H", "N", "A", "R16: Peak load, intermittent solar, low SoC -> Avoid grid spikes"),
            ("M", "M", "H", "H", "D", "A", "R17: Peak load, mid SoC -> Aggressive discharge peak shave"),
            ("M", "H", "H", "M", "D", "A", "R18: Peak load, high SoC -> Heavy discharge to protect grid"),

            # Low Renewable scenarios (Night time or heavy cloud cover)
            ("L", "L", "L", "L", "C", "R", "R19: Night off-peak, cheap tariff -> Off-peak grid charge"),
            ("L", "M", "L", "L", "N", "R", "R20: Night off-peak, mid SoC -> Hold battery reserve"),
            ("L", "H", "L", "L", "N", "R", "R21: Night off-peak, high SoC -> Maintain storage"),
            ("L", "L", "M", "M", "N", "S", "R22: Daytime cloud, low SoC -> Rely on grid baseline"),
            ("L", "M", "M", "M", "D", "S", "R23: Daytime cloud, mid SoC -> Support load from storage"),
            ("L", "H", "M", "L", "D", "S", "R24: Daytime cloud, full battery -> Displace costly grid"),
            ("L", "L", "H", "H", "N", "A", "R25: Extreme stress: no solar, empty battery, peak tariff -> Severe penalty"),
            ("L", "M", "H", "H", "D", "A", "R26: Peak demand, low solar, mid SoC -> Emergency peak shave"),
            ("L", "H", "H", "M", "D", "A", "R27: Peak demand, zero solar, high battery -> Maximum battery discharge")
        ]

    def fuzzify_inputs(self, ren: float, soc: float, dem: float) -> Tuple[Dict[str, float], Dict[str, float], Dict[str, float]]:
        """
        Evaluate membership degree for the 3 input linguistic variables.
        All inputs are clamped to [0.0, 1.0].
        """
        r = float(np.clip(ren, 0.0, 1.0))
        s = float(np.clip(soc, 0.0, 1.0))
        d = float(np.clip(dem, 0.0, 1.0))

        # Renewable Generation: Low (L), Medium (M), High (H)
        mu_ren = {
            "L": float(trapmf(r, (0.0, 0.0, 0.15, 0.40))),
            "M": float(trimf(r, (0.25, 0.50, 0.75))),
            "H": float(trapmf(r, (0.60, 0.80, 1.0, 1.0)))
        }

        # Battery State of Charge (SoC): Low (L), Medium (M), High (H)
        mu_soc = {
            "L": float(trapmf(s, (0.0, 0.0, 0.30, 0.48))),
            "M": float(trimf(s, (0.35, 0.60, 0.80))),
            "H": float(trapmf(s, (0.70, 0.85, 1.0, 1.0)))
        }

        # Grid Demand Pressure: Low (L), Medium (M), High (H)
        mu_dem = {
            "L": float(trapmf(d, (0.0, 0.0, 0.20, 0.45))),
            "M": float(trimf(d, (0.30, 0.55, 0.75))),
            "H": float(trapmf(d, (0.60, 0.80, 1.0, 1.0)))
        }

        return mu_ren, mu_soc, mu_dem

    def evaluate_step(self, ren: float, soc: float, dem: float) -> Dict[str, Any]:
        """
        Evaluate fuzzy rules for a single time step.
        Returns defuzzified outputs and full explainability metrics (active rules, memberships).
        """
        mu_ren, mu_soc, mu_dem = self.fuzzify_inputs(ren, soc, dem)

        # Output fuzzy sets aggregated using Maximum (Mamdani union)
        agg_grid = np.zeros(self.output_res)
        agg_bias = np.zeros(self.output_res)
        agg_peak = np.zeros(self.output_res)

        active_rules = []

        for r_in, s_in, d_in, g_out, b_out, p_out, rule_desc in self.rules:
            # T-norm: Minimum for fuzzy conjunction (AND)
            firing_strength = min(mu_ren[r_in], mu_soc[s_in], mu_dem[d_in])

            if firing_strength > 1e-4:
                active_rules.append({
                    "description": rule_desc,
                    "strength": round(float(firing_strength), 4),
                    "inputs": {"renewable": r_in, "soc": s_in, "demand": d_in},
                    "consequents": {"grid_penalty": g_out, "battery_bias": b_out, "peak_shaving": p_out}
                })

                # Implication: Mamdani clipping (min)
                # 1. Grid Penalty
                if g_out == "L":
                    clipped_g = np.minimum(firing_strength, self.out_grid_L)
                elif g_out == "M":
                    clipped_g = np.minimum(firing_strength, self.out_grid_M)
                else:
                    clipped_g = np.minimum(firing_strength, self.out_grid_H)
                agg_grid = np.maximum(agg_grid, clipped_g)

                # 2. Battery Bias
                if b_out == "D":
                    clipped_b = np.minimum(firing_strength, self.out_bias_D)
                elif b_out == "N":
                    clipped_b = np.minimum(firing_strength, self.out_bias_N)
                else:
                    clipped_b = np.minimum(firing_strength, self.out_bias_C)
                agg_bias = np.maximum(agg_bias, clipped_b)

                # 3. Peak Shaving
                if p_out == "R":
                    clipped_p = np.minimum(firing_strength, self.out_peak_R)
                elif p_out == "S":
                    clipped_p = np.minimum(firing_strength, self.out_peak_S)
                else:
                    clipped_p = np.minimum(firing_strength, self.out_peak_A)
                agg_peak = np.maximum(agg_peak, clipped_p)

        # Defuzzification: Center of Gravity (Centroid)
        def defuzz_centroid(x_vals: np.ndarray, y_vals: np.ndarray, default_val: float) -> float:
            total_area = np.sum(y_vals)
            if total_area < 1e-6:
                return float(default_val)
            return float(np.sum(x_vals * y_vals) / total_area)

        grid_penalty = defuzz_centroid(self.grid_pen_x, agg_grid, 1.5)
        battery_bias = defuzz_centroid(self.bat_bias_x, agg_bias, 0.0)
        peak_shave = defuzz_centroid(self.peak_shave_x, agg_peak, 2.5)

        # Sort active rules by strength descending
        active_rules.sort(key=lambda x: x["strength"], reverse=True)

        return {
            "grid_penalty": round(grid_penalty, 4),
            "battery_bias": round(battery_bias, 4),
            "peak_shaving_weight": round(peak_shave, 4),
            "memberships": {
                "renewable": {k: round(v, 4) for k, v in mu_ren.items()},
                "soc": {k: round(v, 4) for k, v in mu_soc.items()},
                "demand_pressure": {k: round(v, 4) for k, v in mu_dem.items()}
            },
            "active_rules_count": len(active_rules),
            "top_rules": active_rules[:5]
        }

    def evaluate_horizon(
        self,
        renewable_series: np.ndarray,
        soc_series: np.ndarray,
        demand_pressure_series: np.ndarray
    ) -> Dict[str, Any]:
        """
        Evaluate fuzzy parameters across a multi-step time horizon (e.g. 24 or 48 steps).
        Returns vectorized guidance arrays for the Differential Evolution optimizer.
        """
        T = len(renewable_series)
        grid_penalties = np.zeros(T, dtype=float)
        battery_biases = np.zeros(T, dtype=float)
        peak_weights = np.zeros(T, dtype=float)

        all_step_data = []

        for t in range(T):
            res = self.evaluate_step(
                ren=float(renewable_series[t]),
                soc=float(soc_series[t]),
                dem=float(demand_pressure_series[t])
            )
            grid_penalties[t] = res["grid_penalty"]
            battery_biases[t] = res["battery_bias"]
            peak_weights[t] = res["peak_shaving_weight"]
            all_step_data.append(res)

        return {
            "grid_penalty_series": grid_penalties,
            "battery_bias_series": battery_biases,
            "peak_weight_series": peak_weights,
            "step_details": all_step_data
        }
