"""
GridFlux Microgrid Simulation & Scenario Generator
Module: src.core.simulation

Provides deterministic, reproducible 24-hour (48 half-hour steps or 24 hourly steps)
telemetry datasets for microgrid renewable dispatch optimization:
  - Solar PV Generation Profile (kW)
  - Microgrid Load Demand Profile (kW)
  - Time-of-Use (ToU) Electricity Tariff ($/kWh)
  - Battery Storage Model (kWh, kW, SoC constraints)
"""

from dataclasses import dataclass, asdict
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd


@dataclass
class BatteryConfig:
    capacity_kwh: float = 500.0          # Total energy capacity (kWh)
    max_charge_kw: float = 150.0         # Maximum charge rate (kW)
    max_discharge_kw: float = 150.0      # Maximum discharge rate (kW)
    eta_charge: float = 0.95             # Charging efficiency
    eta_discharge: float = 0.95          # Discharging efficiency
    soc_min: float = 0.20                # Minimum allowable SoC
    soc_max: float = 0.90                # Maximum allowable SoC
    soc_init: float = 0.50               # Initial starting SoC at t=0
    deg_cost_per_kwh: float = 0.035      # Degradation wear cost ($/kWh throughput)


@dataclass
class MicrogridScenario:
    name: str
    description: str
    time_steps: int                      # Number of discrete intervals (e.g. 24 or 48)
    dt_hours: float                      # Duration of each time step (e.g. 0.5 or 1.0)
    solar_kw: np.ndarray                 # Solar generation profile (kW)
    load_kw: np.ndarray                  # Microgrid load profile (kW)
    tariff_usd: np.ndarray               # Grid tariff profile ($/kWh)
    battery: BatteryConfig               # Battery parameters


def generate_microgrid_scenario(
    preset_name: str = "default_balanced",
    steps: int = 48,
    seed: int = 42,
    battery_config: Optional[BatteryConfig] = None
) -> MicrogridScenario:
    """
    Generate reproducible, physics-consistent microgrid profiles for testing
    and benchmarking optimization algorithms.
    """
    rng = np.random.default_rng(seed)
    dt = 24.0 / steps
    hours = np.linspace(0.0, 24.0, steps, endpoint=False)
    bat = battery_config or BatteryConfig()

    # 1. Base Solar Generation (Peak around 12:00-13:00)
    # Solar bell curve centered at hour 12.5, standard deviation 3.0 hours
    solar_raw = np.maximum(0.0, np.exp(-((hours - 12.5) ** 2) / (2 * (2.8 ** 2))))
    solar_peak_kw = 280.0

    # 2. Base Load Curve (Residential + Light Commercial)
    # Morning peak around 08:30, evening peak around 19:30
    morning_peak = 0.65 * np.exp(-((hours - 8.5) ** 2) / (2 * (1.8 ** 2)))
    evening_peak = 0.95 * np.exp(-((hours - 19.5) ** 2) / (2 * (2.2 ** 2)))
    base_load = 90.0 + 140.0 * (morning_peak + evening_peak)

    # 3. Base Time-of-Use (ToU) Tariff Profile ($/kWh)
    # Off-peak (23:00-06:00): $0.08
    # Mid-peak (06:00-14:00, 20:00-23:00): $0.16
    # On-peak (14:00-20:00): $0.32
    tariff = np.zeros(steps, dtype=float)
    for i, h in enumerate(hours):
        if 14.0 <= h < 20.0:
            tariff[i] = 0.32
        elif (6.0 <= h < 14.0) or (20.0 <= h < 23.0):
            tariff[i] = 0.16
        else:
            tariff[i] = 0.08

    # Apply Scenario Specific Adjustments
    scenario_desc = ""
    if preset_name == "default_balanced":
        scenario_desc = "Balanced spring day with clear midday solar, dual load peaks, and standard ToU tariffs."
        noise = rng.normal(0.0, 5.0, steps)
        solar = np.maximum(0.0, solar_raw * solar_peak_kw + noise)
        load = np.maximum(60.0, base_load + rng.normal(0.0, 6.0, steps))

    elif preset_name == "peak_afternoon_load":
        scenario_desc = "Hot summer afternoon with heavy HVAC cooling spike coinciding with on-peak grid tariff."
        # Extra load spike between 14:00 and 18:30 (+110 kW)
        afternoon_spike = 110.0 * np.exp(-((hours - 16.0) ** 2) / (2 * (1.8 ** 2)))
        solar = np.maximum(0.0, solar_raw * 300.0 + rng.normal(0.0, 6.0, steps))
        load = np.maximum(70.0, base_load + afternoon_spike + rng.normal(0.0, 8.0, steps))

    elif preset_name == "cloudy_surge":
        scenario_desc = "Cloudy rainy day with 65% reduced solar and sharp intermittent generation dips."
        cloud_factor = 0.35 + 0.25 * np.sin(hours * 1.5)
        solar = np.maximum(0.0, solar_raw * solar_peak_kw * cloud_factor + rng.normal(0.0, 8.0, steps))
        load = np.maximum(65.0, base_load * 1.05 + rng.normal(0.0, 7.0, steps))

    elif preset_name == "night_battery_recovery":
        scenario_desc = "Minimal daytime solar with extreme late evening load, demanding off-peak grid battery pre-charging."
        solar = np.maximum(0.0, solar_raw * 120.0 + rng.normal(0.0, 4.0, steps))
        late_evening = 130.0 * np.exp(-((hours - 21.0) ** 2) / (2 * (1.6 ** 2)))
        load = np.maximum(70.0, base_load + late_evening + rng.normal(0.0, 6.0, steps))

    elif preset_name == "high_tariff_spike":
        scenario_desc = "Critical peak pricing event ($0.65/kWh) from 16:00 to 19:00 testing peak-shaving efficacy."
        solar = np.maximum(0.0, solar_raw * 260.0 + rng.normal(0.0, 5.0, steps))
        load = np.maximum(60.0, base_load + rng.normal(0.0, 6.0, steps))
        for i, h in enumerate(hours):
            if 16.0 <= h < 19.0:
                tariff[i] = 0.65
    else:
        raise ValueError(f"Unknown preset scenario: {preset_name}")

    return MicrogridScenario(
        name=preset_name,
        description=scenario_desc,
        time_steps=steps,
        dt_hours=dt,
        solar_kw=np.round(solar, 2),
        load_kw=np.round(load, 2),
        tariff_usd=np.round(tariff, 3),
        battery=bat
    )


def list_available_presets() -> List[Dict[str, str]]:
    """Return catalog of available scenario presets."""
    return [
        {"id": "default_balanced", "name": "Default Balanced", "description": "Clear solar generation with dual diurnal residential/commercial load peaks."},
        {"id": "peak_afternoon_load", "name": "Peak Afternoon Surge", "description": "Intense summer HVAC spike coinciding with on-peak electricity pricing."},
        {"id": "cloudy_surge", "name": "Cloudy & Intermittent", "description": "Overcast day with 65% drop in solar irradiance and sharp fluctuations."},
        {"id": "night_battery_recovery", "name": "Night Battery Recovery", "description": "Heavy late-night demand requiring strategic off-peak battery buffering."},
        {"id": "high_tariff_spike", "name": "High Tariff Spike ($0.65/kWh)", "description": "Critical peak pricing event demanding aggressive peak-shaving dispatch."}
    ]


def scenario_to_dataframe(scenario: MicrogridScenario) -> pd.DataFrame:
    """Convert scenario data into a pandas DataFrame."""
    hours = np.linspace(0.0, 24.0, scenario.time_steps, endpoint=False)
    time_labels = [f"{int(h):02d}:{int((h%1)*60):02d}" for h in hours]
    return pd.DataFrame({
        "time_step": np.arange(scenario.time_steps),
        "hour_label": time_labels,
        "solar_kw": scenario.solar_kw,
        "load_kw": scenario.load_kw,
        "net_unserved_kw": np.maximum(0.0, scenario.load_kw - scenario.solar_kw),
        "tariff_usd_per_kwh": scenario.tariff_usd
    })
