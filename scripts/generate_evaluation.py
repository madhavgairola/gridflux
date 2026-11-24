"""
GridFlux Automated Evaluation & Report Generator
Course: Fundamentals of Soft Computing Lab (26B16CS311) - CO4 Hybrid System

Executes comparative benchmarks across all scenario presets:
  1. Hybrid Fuzzy + Differential Evolution (Proposed System)
  2. Standard Differential Evolution (Baseline A)
  3. Heuristic Rule-Based Dispatch (Baseline B)

Generates:
  - data/benchmark_results.json
  - data/benchmark_summary.csv
  - data/benchmark_comparison.png (Multi-panel publication plot)
"""

import sys
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt

from src.core import (
    generate_microgrid_scenario,
    list_available_presets,
    simulate_rule_based_dispatch,
    DifferentialEvolutionOptimizer
)


def run_comprehensive_benchmark():
    presets = list_available_presets()
    results = []
    plot_data = {}

    print("================================================================================")
    print("GRIDFLUX: Soft-Computing Microgrid Optimization Benchmark (Fuzzy + DE vs Baselines)")
    print("Fundamentals of Soft Computing Lab (26B16CS311) - CO4 System")
    print("================================================================================")

    for preset in presets:
        sc_id = preset["id"]
        sc_name = preset["name"]
        print(f"\nEvaluating Scenario: {sc_name} ({sc_id})...")

        scenario = generate_microgrid_scenario(sc_id, steps=24, seed=42)

        # 1. Proposed: Fuzzy + DE
        de_opt = DifferentialEvolutionOptimizer(population_size=30, max_generations=35, seed=42)
        fde = de_opt.optimize(scenario, use_fuzzy_guidance=True)

        # 2. Baseline A: Plain DE
        plain_opt = DifferentialEvolutionOptimizer(population_size=30, max_generations=35, seed=42)
        pde = plain_opt.optimize(scenario, use_fuzzy_guidance=False)

        # 3. Baseline B: Rule-Based
        rb = simulate_rule_based_dispatch(scenario)

        # Peak Shaving Reduction
        peak_shave_vs_pde = ((pde.peak_grid_import_kw - fde.peak_grid_import_kw) / max(1e-3, pde.peak_grid_import_kw)) * 100
        peak_shave_vs_rb = ((rb.peak_grid_import_kw - fde.peak_grid_import_kw) / max(1e-3, rb.peak_grid_import_kw)) * 100

        # Cost Delta
        cost_savings_vs_pde = ((pde.total_cost_usd - fde.total_cost_usd) / max(1e-3, pde.total_cost_usd)) * 100
        cost_savings_vs_rb = ((rb.total_cost_usd - fde.total_cost_usd) / max(1e-3, rb.total_cost_usd)) * 100

        entry = {
            "scenario_id": sc_id,
            "scenario_name": sc_name,
            # Proposed Fuzzy+DE
            "fde_cost_usd": fde.total_cost_usd,
            "fde_peak_kw": fde.peak_grid_import_kw,
            "fde_util_pct": fde.renewable_utilization_pct,
            "fde_wear_usd": fde.battery_cycle_cost_usd,
            # Plain DE
            "pde_cost_usd": pde.total_cost_usd,
            "pde_peak_kw": pde.peak_grid_import_kw,
            "pde_util_pct": pde.renewable_utilization_pct,
            "pde_wear_usd": pde.battery_cycle_cost_usd,
            # Rule-Based
            "rb_cost_usd": rb.total_cost_usd,
            "rb_peak_kw": rb.peak_grid_import_kw,
            "rb_util_pct": rb.renewable_utilization_pct,
            "rb_wear_usd": rb.battery_cycle_cost_usd,
            # Comparison Deltas
            "peak_shaved_vs_pde_pct": round(peak_shave_vs_pde, 1),
            "peak_shaved_vs_rb_pct": round(peak_shave_vs_rb, 1),
            "cost_savings_vs_pde_pct": round(cost_savings_vs_pde, 1),
            "cost_savings_vs_rb_pct": round(cost_savings_vs_rb, 1)
        }
        results.append(entry)

        if sc_id == "default_balanced":
            plot_data["fde"] = fde
            plot_data["pde"] = pde
            plot_data["rb"] = rb
            plot_data["scenario"] = scenario

        print(f"  Fuzzy+DE: Cost=${fde.total_cost_usd:.2f} | Peak={fde.peak_grid_import_kw:.1f} kW | Util={fde.renewable_utilization_pct:.1f}%")
        print(f"  Plain DE: Cost=${pde.total_cost_usd:.2f} | Peak={pde.peak_grid_import_kw:.1f} kW | Util={pde.renewable_utilization_pct:.1f}%")
        print(f"  Rule-Based: Cost=${rb.total_cost_usd:.2f} | Peak={rb.peak_grid_import_kw:.1f} kW | Util={rb.renewable_utilization_pct:.1f}%")
        print(f"  --> Peak Shaving vs Plain DE: {peak_shave_vs_pde:+.1f}% | Cost Savings: {cost_savings_vs_pde:+.1f}%")

    # Export to CSV
    df = pd.DataFrame(results)
    csv_path = ROOT_DIR / "data" / "benchmark_summary.csv"
    df.to_csv(csv_path, index=False)
    print(f"\n[OK] Benchmark summary written to {csv_path}")

    # Export to JSON
    json_path = ROOT_DIR / "data" / "benchmark_results.json"
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"[OK] Benchmark JSON written to {json_path}")

    # Generate Publication Plots
    plot_path = ROOT_DIR / "data" / "benchmark_comparison.png"
    generate_plots(df, plot_data, plot_path)
    print(f"[OK] Evaluation figures generated at {plot_path}")


def generate_plots(df: pd.DataFrame, plot_data: dict, out_path: Path):
    """Generate a clean 4-panel publication plot for the PBL report."""
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    fig, axs = plt.subplots(2, 2, figsize=(14, 10))

    # Panel 1: Peak Grid Import Comparison across all scenarios
    ax1 = axs[0, 0]
    x = np.arange(len(df))
    width = 0.25
    ax1.bar(x - width, df["fde_peak_kw"], width, label="Fuzzy + DE (Proposed)", color="#10b981")
    ax1.bar(x, df["pde_peak_kw"], width, label="Plain DE (Baseline A)", color="#6366f1")
    ax1.bar(x + width, df["rb_peak_kw"], width, label="Rule-Based (Baseline B)", color="#a855f7")
    ax1.set_ylabel("Peak Grid Import (kW)", fontweight="bold")
    ax1.set_title("Peak Grid Import Across Scenarios (Peak Shaving)", fontweight="bold")
    ax1.set_xticks(x)
    ax1.set_xticklabels([name[:14] for name in df["scenario_name"]], rotation=20, ha="right", fontsize=9)
    ax1.legend(frameon=True)

    # Panel 2: Total Dispatch Cost Comparison
    ax2 = axs[0, 1]
    ax2.bar(x - width, df["fde_cost_usd"], width, label="Fuzzy + DE", color="#10b981")
    ax2.bar(x, df["pde_cost_usd"], width, label="Plain DE", color="#6366f1")
    ax2.bar(x + width, df["rb_cost_usd"], width, label="Rule-Based", color="#a855f7")
    ax2.set_ylabel("Total Net Cost ($)", fontweight="bold")
    ax2.set_title("24-Hour Net Dispatch Operating Cost ($)", fontweight="bold")
    ax2.set_xticks(x)
    ax2.set_xticklabels([name[:14] for name in df["scenario_name"]], rotation=20, ha="right", fontsize=9)
    ax2.legend(frameon=True)

    # Panel 3: Convergence Curve (Default Scenario)
    ax3 = axs[1, 0]
    if "fde" in plot_data and "pde" in plot_data:
        fde = plot_data["fde"]
        pde = plot_data["pde"]
        gens = np.arange(len(fde.convergence_curve))
        ax3.plot(gens, fde.convergence_curve, label="Fuzzy + DE (Proposed)", color="#10b981", linewidth=2.5)
        ax3.plot(gens, pde.convergence_curve, label="Plain DE (Baseline)", color="#6366f1", linewidth=2.0, linestyle="--")
        ax3.set_xlabel("Generation / Iteration", fontweight="bold")
        ax3.set_ylabel("Objective Fitness Cost ($)", fontweight="bold")
        ax3.set_title("DE Optimization Convergence History", fontweight="bold")
        ax3.legend(frameon=True)

    # Panel 4: Dispatch Power Profile (Default Scenario)
    ax4 = axs[1, 1]
    if "fde" in plot_data:
        fde = plot_data["fde"]
        hours = np.linspace(0, 24, len(fde.solar_kw), endpoint=False)
        ax4.plot(hours, fde.solar_kw, label="Solar PV", color="#eab308", linewidth=2.0)
        ax4.plot(hours, fde.load_kw, label="Microgrid Load", color="#475569", linewidth=2.0, linestyle=":")
        ax4.plot(hours, fde.battery_kw, label="Battery Power (Chg/Dis)", color="#06b6d4", linewidth=2.0)
        ax4.plot(hours, fde.grid_import_kw, label="Net Grid Import", color="#f97316", linewidth=2.5)
        ax4.axhline(0, color="gray", linewidth=0.8, linestyle="--")
        ax4.set_xlabel("Hour of Day (h)", fontweight="bold")
        ax4.set_ylabel("Power (kW)", fontweight="bold")
        ax4.set_title("Fuzzy + DE Optimal Power Allocation Profile", fontweight="bold")
        ax4.legend(frameon=True, fontsize=8)

    plt.tight_layout()
    plt.savefig(out_path, dpi=200)
    plt.close()


if __name__ == "__main__":
    run_comprehensive_benchmark()
