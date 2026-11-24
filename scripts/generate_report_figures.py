import os
import sys
sys.path.insert(0, os.path.abspath('.'))
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

os.makedirs("figures", exist_ok=True)
plt.rcParams.update({'font.sans-serif': 'DejaVu Sans', 'font.size': 10, 'figure.autolayout': True})

# -------------------------------------------------------------
# Figure 1: 4-Layer Architecture Diagram
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(9, 6), dpi=300)
ax.set_xlim(0, 10)
ax.set_ylim(0, 8.5)
ax.axis('off')

layers = [
    ("Layer 1: Frontend Presentation (React 19, Vite, Tailwind CSS)",
     "Interactive 24h Simulator • Multi-Baseline Analytics • Fuzzy Engine Inspector\nCustom PillBadge System • Progressive SVG Timeline Canvas • Telemetry HUD",
     "#e8f5e9", "#2e7d32", 6.8),
    ("Layer 2: REST API & Service Layer (FastAPI, Uvicorn, port 8000)",
     "POST /api/optimize • GET /api/scenarios • GET /api/export/{id}/csv • GET /api/health\nPydantic Request Validation • In-Memory Caching • JSON Serialization",
     "#e3f2fd", "#1565c0", 4.8),
    ("Layer 3: Core Soft-Computing Engine (src/core/)",
     "FuzzyDispatchController (27 Mamdani Rules, Centroid Defuzzification)\nDifferentialEvolutionOptimizer (DE/best/1/bin, Ramp-Rate Limit, Physics Simulation)\nMicrogridScenario Generator • Baseline Greedy Rule-Based Simulator",
     "#fff3e0", "#e65100", 2.6),
    ("Layer 4: Scientific & Numerical Foundation",
     "NumPy (Vectorized Population Matrices) • SciPy (Optimization Utilities) • Pandas (DataFrames)",
     "#f3e5f5", "#7b1fa2", 0.6)
]

for title, desc, bg, border, y in layers:
    rect = patches.FancyBboxPatch((0.5, y), 9.0, 1.4, boxstyle="round,pad=0.2",
                                  facecolor=bg, edgecolor=border, linewidth=2.0)
    ax.add_patch(rect)
    ax.text(5.0, y + 1.05, title, ha='center', va='center', fontsize=11, fontweight='bold', color=border)
    ax.text(5.0, y + 0.45, desc, ha='center', va='center', fontsize=8.5, color='#333333', multialignment='center')

# Arrows between layers
for y_arrow in [6.6, 4.6, 2.4]:
    ax.annotate('', xy=(5.0, y_arrow - 0.25), xytext=(5.0, y_arrow + 0.15),
                arrowprops=dict(facecolor='#555555', edgecolor='#555555', width=1.5, headwidth=7, shrink=0.05))

plt.title("GridFlux: 4-Layer Hybrid Soft-Computing Architecture", fontsize=13, fontweight='bold', pad=15)
plt.savefig("figures/fig1_architecture.png", dpi=300)
plt.close()
print("Saved fig1_architecture.png")

# -------------------------------------------------------------
# Figure 2: Mamdani Input Membership Functions
# -------------------------------------------------------------
from src.core.fuzzy_controller import trimf, trapmf

x = np.linspace(0, 1, 300)
fig, axes = plt.subplots(1, 3, figsize=(12, 3.2), dpi=300)

# 1. Renewable
ren_L = trapmf(x, (0.0, 0.0, 0.15, 0.40))
ren_M = trimf(x, (0.25, 0.50, 0.75))
ren_H = trapmf(x, (0.60, 0.85, 1.0, 1.0))
axes[0].plot(x, ren_L, label="Low", color="#1976d2", lw=2)
axes[0].plot(x, ren_M, label="Medium", color="#ff9800", lw=2)
axes[0].plot(x, ren_H, label="High", color="#388e3c", lw=2)
axes[0].set_title("Renewable Availability (R)", fontsize=11, fontweight='bold')
axes[0].set_xlabel("Normalized Generation [0, 1]")
axes[0].set_ylabel("Membership Degree μ(x)")
axes[0].grid(True, linestyle="--", alpha=0.5)
axes[0].legend(fontsize=8, loc='center left')

# 2. SoC
soc_L = trapmf(x, (0.0, 0.0, 0.25, 0.45))
soc_M = trimf(x, (0.35, 0.55, 0.75))
soc_H = trapmf(x, (0.65, 0.85, 1.0, 1.0))
axes[1].plot(x, soc_L, label="Low", color="#d32f2f", lw=2)
axes[1].plot(x, soc_M, label="Medium", color="#ff9800", lw=2)
axes[1].plot(x, soc_H, label="High", color="#388e3c", lw=2)
axes[1].set_title("Battery State of Charge (SoC)", fontsize=11, fontweight='bold')
axes[1].set_xlabel("Normalized Energy [0, 1]")
axes[1].grid(True, linestyle="--", alpha=0.5)
axes[1].legend(fontsize=8, loc='center left')

# 3. Demand Pressure
dem_L = trapmf(x, (0.0, 0.0, 0.20, 0.45))
dem_M = trimf(x, (0.30, 0.55, 0.75))
dem_H = trapmf(x, (0.60, 0.80, 1.0, 1.0))
axes[2].plot(x, dem_L, label="Low", color="#388e3c", lw=2)
axes[2].plot(x, dem_M, label="Medium", color="#ff9800", lw=2)
axes[2].plot(x, dem_H, label="High", color="#d32f2f", lw=2)
axes[2].set_title("Grid Demand Pressure (D)", fontsize=11, fontweight='bold')
axes[2].set_xlabel("Normalized Stress [0, 1]")
axes[2].grid(True, linestyle="--", alpha=0.5)
axes[2].legend(fontsize=8, loc='center left')

plt.suptitle("Mamdani FIS Input Linguistic Membership Functions", fontsize=12, fontweight='bold')
plt.savefig("figures/fig2_fuzzy_mfs.png", dpi=300)
plt.close()
print("Saved fig2_fuzzy_mfs.png")

# -------------------------------------------------------------
# Figure 3: 24-Hour Dispatch Power Profiles
# -------------------------------------------------------------
from src.core.simulation import generate_microgrid_scenario
from src.core.de_optimizer import DifferentialEvolutionOptimizer
from src.core.baselines import simulate_rule_based_dispatch

sc = generate_microgrid_scenario("default_balanced", steps=24, seed=42)
opt = DifferentialEvolutionOptimizer(population_size=30, max_generations=35, seed=42)
fde = opt.optimize(sc, use_fuzzy_guidance=True)
rb = simulate_rule_based_dispatch(sc)

hours = np.linspace(0, 24, 24, endpoint=False)
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 6), sharex=True, dpi=300)

# Subplot 1: Proposed Hybrid Fuzzy + DE
ax1.plot(hours, sc.load_kw, '--', color='#757575', label='Load Demand (kW)', lw=1.8)
ax1.fill_between(hours, sc.solar_kw, color='#ffe082', alpha=0.4, label='Solar PV (kW)')
ax1.plot(hours, sc.solar_kw, color='#f57f17', lw=1.5)
ax1.plot(hours, fde.battery_kw, color='#00acc1', lw=2.2, label='Battery Dispatched (kW)')
ax1.plot(hours, fde.grid_import_kw, color='#e65100', lw=2.5, label='Utility Grid Import (kW)')
ax1.axhline(fde.peak_grid_import_kw, color='#d32f2f', linestyle=':', lw=1.5, label=f'Peak Import: {fde.peak_grid_import_kw:.1f} kW')
ax1.set_title("Proposed Hybrid Fuzzy + DE Dispatch (Peak Shaved to 117.7 kW)", fontsize=11, fontweight='bold')
ax1.set_ylabel("Power (kW)")
ax1.grid(True, linestyle="--", alpha=0.5)
ax1.legend(loc='upper right', fontsize=8, ncol=2)

# Subplot 2: Greedy Heuristic Rule-Based
ax2.plot(hours, sc.load_kw, '--', color='#757575', label='Load Demand (kW)', lw=1.8)
ax2.fill_between(hours, sc.solar_kw, color='#ffe082', alpha=0.4, label='Solar PV (kW)')
ax2.plot(hours, sc.solar_kw, color='#f57f17', lw=1.5)
ax2.plot(hours, rb.battery_kw, color='#00acc1', lw=2.2, label='Battery Dispatched (kW)')
ax2.plot(hours, rb.grid_import_kw, color='#d81b60', lw=2.5, label='Utility Grid Import (kW)')
ax2.axhline(rb.peak_grid_import_kw, color='#d32f2f', linestyle=':', lw=1.5, label=f'Severe Twilight Peak: {rb.peak_grid_import_kw:.1f} kW')
ax2.set_title("Heuristic Greedy Dispatch (Catastrophic Twilight Surge of 213.5 kW)", fontsize=11, fontweight='bold')
ax2.set_xlabel("Hour of Day (00:00 to 24:00)")
ax2.set_ylabel("Power (kW)")
ax2.grid(True, linestyle="--", alpha=0.5)
ax2.legend(loc='upper right', fontsize=8, ncol=2)

plt.savefig("figures/fig3_dispatch_curves.png", dpi=300)
plt.close()
print("Saved fig3_dispatch_curves.png")

# -------------------------------------------------------------
# Figure 4: Convergence Curve (Peak Grid Draw vs Generations)
# -------------------------------------------------------------
pde = opt.optimize(sc, use_fuzzy_guidance=False)

fig, ax = plt.subplots(figsize=(8, 4.2), dpi=300)
gens = np.arange(len(fde.convergence_curve))
ax.plot(gens, fde.convergence_curve, color='#2e7d32', lw=2.5, marker='o', markersize=4, label=f'Fuzzy + DE (Proposed): Converges to {fde.convergence_curve[-1]:.1f} kW')
ax.plot(gens, pde.convergence_curve, color='#5c6bc0', lw=2.2, linestyle='--', marker='s', markersize=4, label=f'Plain DE (Baseline): Stagnates at {pde.convergence_curve[-1]:.1f} kW')

ax.annotate(f'-22.9 kW Shaved (-16.3%)', xy=(34, fde.convergence_curve[-1]), xytext=(22, 126),
            arrowprops=dict(facecolor='#2e7d32', edgecolor='#2e7d32', width=1.5, headwidth=6),
            fontsize=9.5, fontweight='bold', color='#1b5e20',
            bbox=dict(boxstyle="round,pad=0.3", fc="#e8f5e9", ec="#2e7d32", lw=1.5))

ax.set_title("Differential Evolution Peak Grid Draw Convergence Profile", fontsize=11, fontweight='bold')
ax.set_xlabel("Optimization Generation (0 to 35)")
ax.set_ylabel("Peak Utility Grid Draw (kW)")
ax.grid(True, linestyle="--", alpha=0.6)
ax.legend(fontsize=9, loc='upper right')

plt.savefig("figures/fig4_convergence.png", dpi=300)
plt.close()
print("Saved fig4_convergence.png")

# -------------------------------------------------------------
# Figure 5: Multi-Scenario Benchmark Comparison
# -------------------------------------------------------------
scenarios = ['Default Balanced', 'Peak Afternoon', 'Cloudy Surge', 'High Tariff Spike']
fde_peaks = [117.72, 136.64, 143.81, 121.15]
pde_peaks = [140.61, 152.50, 149.46, 143.64]
rb_peaks  = [213.49, 228.93, 231.41, 214.04]

x_ind = np.arange(len(scenarios))
w = 0.25

fig, (ax_p, ax_c) = plt.subplots(1, 2, figsize=(11, 4.2), dpi=300)

# Peak comparison
ax_p.bar(x_ind - w, fde_peaks, w, label='Fuzzy + DE (Proposed)', color='#2e7d32')
ax_p.bar(x_ind, pde_peaks, w, label='Plain DE (Baseline)', color='#5c6bc0')
ax_p.bar(x_ind + w, rb_peaks, w, label='Greedy Rule-Based', color='#d81b60')
ax_p.set_title("Peak Grid Import Comparison (Lower is Superior)", fontsize=10.5, fontweight='bold')
ax_p.set_xticks(x_ind)
ax_p.set_xticklabels(scenarios, rotation=15, ha='right', fontsize=8.5)
ax_p.set_ylabel("Peak Grid Draw (kW)")
ax_p.grid(True, linestyle="--", alpha=0.4, axis='y')
ax_p.legend(fontsize=8)

# Cost comparison
fde_costs = [233.73, 327.38, 457.14, 277.89]
pde_costs = [228.15, 327.58, 465.27, 281.04]
rb_costs  = [211.21, 316.88, 490.31, 230.97]

ax_c.bar(x_ind - w, fde_costs, w, label='Fuzzy + DE (Proposed)', color='#2e7d32')
ax_c.bar(x_ind, pde_costs, w, label='Plain DE (Baseline)', color='#5c6bc0')
ax_c.bar(x_ind + w, rb_costs, w, label='Greedy Rule-Based', color='#d81b60')
ax_c.set_title("24-Hour Net Operational Cost ($)", fontsize=10.5, fontweight='bold')
ax_c.set_xticks(x_ind)
ax_c.set_xticklabels(scenarios, rotation=15, ha='right', fontsize=8.5)
ax_c.set_ylabel("Total Cost ($)")
ax_c.grid(True, linestyle="--", alpha=0.4, axis='y')
ax_c.legend(fontsize=8)

plt.suptitle("Microgrid Multi-Scenario Performance Evaluation", fontsize=12, fontweight='bold')
plt.savefig("figures/fig5_scenario_comparison.png", dpi=300)
plt.close()
print("Saved fig5_scenario_comparison.png")
