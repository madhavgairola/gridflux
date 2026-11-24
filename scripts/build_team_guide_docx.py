import os
import sys
sys.path.insert(0, os.path.abspath('.'))

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

from scripts.docx_helpers import (
    set_cell_background,
    set_cell_margins,
    set_table_borders,
    add_callout,
    style_heading,
    format_cell_text
)

def build_team_guide():
    doc = docx.Document()

    # Page setup - A4
    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.87)
    section.bottom_margin = Inches(0.87)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

    # Header and Footer
    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hrun = hp.add_run("GridFlux • Teammate Technical Guide & Viva Reference (CO4)")
    hrun.font.name = "Arial"
    hrun.font.size = Pt(8.5)
    hrun.font.italic = True
    hrun.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    frun = fp.add_run("Jaypee Institute of Information Technology • Soft Computing Lab (26B16CS311)")
    frun.font.name = "Arial"
    frun.font.size = Pt(8.5)
    frun.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

    # Color Palette
    NAVY = (0x1B, 0x36, 0x5D)
    STEEL = (0x2B, 0x54, 0x7E)
    DARK = (0x22, 0x22, 0x22)
    GRAY = (0x55, 0x55, 0x55)
    GREEN = (0x1B, 0x5E, 0x20)
    ORANGE = (0xE6, 0x51, 0x00)

    def add_p(text, bold_prefix=None, space_after=4, italic=False, color=DARK):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            rb = p.add_run(bold_prefix)
            rb.font.name = "Arial"
            rb.font.size = Pt(10.0)
            rb.font.bold = True
            rb.font.color.rgb = RGBColor(*NAVY)
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(10.0)
        r.font.italic = italic
        r.font.color.rgb = RGBColor(*color)
        return p

    def add_bullet(text, bold_prefix=None, space_after=3):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            rb = p.add_run(bold_prefix)
            rb.font.name = "Arial"
            rb.font.size = Pt(9.5)
            rb.font.bold = True
            rb.font.color.rgb = RGBColor(*NAVY)
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(*DARK)
        return p

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.keep_with_next = True
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(14.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(*NAVY)
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.keep_with_next = True
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(12.0)
        r.font.bold = True
        r.font.color.rgb = RGBColor(*STEEL)
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.keep_with_next = True
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
        return p

    def add_img(path, caption, width=Inches(6.0)):
        if os.path.exists(path):
            ip = doc.add_paragraph()
            ip.alignment = WD_ALIGN_PARAGRAPH.CENTER
            ip.paragraph_format.space_before = Pt(8)
            ip.paragraph_format.space_after = Pt(2)
            ip.add_run().add_picture(path, width=width)

            cp = doc.add_paragraph()
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            cp.paragraph_format.space_before = Pt(2)
            cp.paragraph_format.space_after = Pt(8)
            crun = cp.add_run(caption)
            crun.font.name = "Arial"
            crun.font.size = Pt(8.5)
            crun.font.italic = True
            crun.font.color.rgb = RGBColor(*GRAY)

    # =========================================================
    # TITLE & HEADER BLOCK
    # =========================================================
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("JAYPEE INSTITUTE OF INFORMATION TECHNOLOGY, NOIDA\n")
    r.font.name = "Arial"
    r.font.size = Pt(14.0)
    r.font.bold = True
    r.font.color.rgb = RGBColor(*NAVY)

    r_sub = p.add_run("DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING AND INFORMATION TECHNOLOGY\n")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(10.5)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(*STEEL)

    # Logo
    logo_path = "assets/word/media/image1.png"
    if os.path.exists(logo_path):
        lp = doc.add_paragraph()
        lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        lp.paragraph_format.space_before = Pt(6)
        lp.paragraph_format.space_after = Pt(6)
        lp.add_run().add_picture(logo_path, width=Inches(1.6))

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(4)
    r1 = p_title.add_run("GRIDFLUX: TEAMMATE COMPLETE PROJECT GUIDE & VIVA CHEAT SHEET\n")
    r1.font.name = "Arial"
    r1.font.size = Pt(16.0)
    r1.font.bold = True
    r1.font.color.rgb = RGBColor(*NAVY)

    r2 = p_title.add_run("Everything you need to know: Working, Architecture, Theory, Math, Codebase & Viva Questions\n")
    r2.font.name = "Arial"
    r2.font.size = Pt(10.5)
    r2.font.italic = True
    r2.font.color.rgb = RGBColor(*GRAY)

    add_callout(
        doc,
        "PURPOSE OF THIS DOCUMENT:\n"
        "This guide is prepared for all project teammates to understand the complete end-to-end working of GridFlux. "
        "It covers the real-world microgrid problem, how our Hybrid Soft-Computing System (CO4) works, the mathematical "
        "formulation of Fuzzy Logic + Differential Evolution, code walkthrough, benchmark numbers, and answers to common "
        "faculty viva questions so that every member can confidently explain and defend the project.",
        title="TEAM COLLABORATION & VIVA PREPARATION GUIDE",
        border_color="1B365D",
        bg_color="EBF3FA"
    )

    # Metadata Grid
    t_meta = doc.add_table(rows=2, cols=3)
    t_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_heads = ["Course & Outcome", "Academic Session & Date", "Project Links"]
    for i, h in enumerate(meta_heads):
        format_cell_text(t_meta.cell(0, i), h, bold=True, font_size=9.0, color=(0xFF, 0xFF, 0xFF))
        set_cell_background(t_meta.cell(0, i), "1B365D")
        set_cell_margins(t_meta.cell(0, i), top=60, bottom=60, left=80, right=80)
    
    meta_vals = [
        ("Soft Computing Lab (26B16CS311)\nCO4: Hybrid Soft Computing", "Odd Sem 2026–27\nNovember 2026", "GitHub: madhavgairola/gridflux\nLocal UI: localhost:5173\nAPI: localhost:8000")
    ]
    for idx, rvals in enumerate(meta_vals):
        row = t_meta.rows[idx + 1]
        for col_idx, val in enumerate(rvals):
            c = row.cells[col_idx]
            format_cell_text(c, val, font_size=8.5, color=DARK)
            set_cell_background(c, "F4F6F9")
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
    set_table_borders(t_meta)

    # =========================================================
    # SECTION 1: HIGH-LEVEL 60-SECOND SUMMARY
    # =========================================================
    add_h1("1. The 60-Second Elevator Pitch (What is GridFlux?)")
    add_p(
        "If an examiner or peer asks: \"In simple terms, what does your project do?\", say this:"
    )
    add_callout(
        doc,
        "\"GridFlux is an intelligent Energy Management System (EMS) for solar-powered microgrids with battery storage.\n\n"
        "1. The Problem: Standard rule-based greedy controllers use solar immediately. When evening comes and solar drops to zero while electricity tariffs spike, the microgrid draws massive, dangerous power spikes (>213 kW) from the city utility grid.\n\n"
        "2. Our Solution: We built a Hybrid Soft-Computing System (CO4) combining two techniques:\n"
        "   - Mamdani Fuzzy Inference System (FIS): Evaluates real-time solar, battery level, and grid stress to give human-readable dispatch recommendations.\n"
        "   - Differential Evolution (DE): Solves the optimal 24-hour battery schedule under physical constraints and inverter ramp-rate limits (<= 45 kW).\n\n"
        "3. The Impact: We shave the peak grid draw from 213.5 kW (Greedy) and 140.6 kW (Plain DE) down to 117.7 kW (-16.3% vs DE, -44.9% vs Greedy), saving hundreds of dollars in commercial peak demand charges and preventing battery/inverter wear.\"",
        title="THE 60-SECOND VIVA ANSWER",
        border_color="2E7D32",
        bg_color="E8F5E9"
    )

    # =========================================================
    # SECTION 2: THE REAL-WORLD MICROGRID PROBLEM
    # =========================================================
    add_h1("2. The Real-World Engineering Problem")
    add_p(
        "A microgrid is an autonomous local power grid containing: (1) Solar PV panels (280 kW peak); (2) Local loads (homes, offices, HVAC); (3) A Battery Energy Storage System (500 kWh, 150 kW max); and (4) A connection to the city power grid."
    )
    add_h2("Why is scheduling this difficult?")
    add_bullet("Solar PV only generates during daylight (10:00 to 16:00). At night, solar is 0 kW.", "1. Intermittent Generation: ")
    add_bullet("Morning peak occurs at 08:30 (residential waking up); evening peak occurs at 19:30 (everyone returns home, HVAC cooling).", "2. Dual Load Peaks: ")
    add_bullet("Power companies charge different rates: Cheap Off-peak ($0.08/kWh at night), Mid-peak ($0.16/kWh), and expensive On-peak ($0.32/kWh from 14:00 to 20:00). In extreme events, it spikes to $0.65/kWh.", "3. Time-of-Use (ToU) Tariffs: ")
    add_bullet("Commercial tariffs charge a monthly penalty for the single highest peak kilowatt drawn. Drawing 213 kW costs vastly more than drawing 117 kW.", "4. Peak Demand Charges: ")
    add_bullet("Rapidly switching a battery between +150 kW and -150 kW in adjacent hours damages the inverter and shortens battery lifespan.", "5. Inverter Fatigue & Degradation: ")

    # =========================================================
    # SECTION 3: HOW OUR HYBRID SOFT-COMPUTING SYSTEM WORKS
    # =========================================================
    add_h1("3. The Soft-Computing Architecture (Why CO4 Hybrid?)")
    add_p(
        "Our course outcome is CO4: Hybrid Systems. We do not use Fuzzy Logic alone, and we do not use Differential Evolution alone. We integrate them synergistically."
    )
    add_bullet("It cannot plan a 24-hour multi-period schedule ahead of time. It only knows the current state and cannot solve high-dimensional numerical optimization.", "Why Fuzzy Logic Alone Fails: ")
    add_bullet("It treats the problem as a cold mathematical formula. Without human guidance, it gets trapped in local minima, ignores localized tariff stress, and causes inverter chattering.", "Why Differential Evolution Alone Fails: ")
    add_bullet("Mamdani FIS analyzes environmental conditions and dynamically alters the DE fitness landscape, adding smart penalties when the grid is stressed. DE then does the heavy numerical lifting.", "The Synergism (CO4 Hybrid): ")

    add_img("figures/fig1_architecture.png", "Figure 3.1: The 4-Layer Architecture of GridFlux.")

    add_h2("The Core Components in Detail")

    add_h3("A. Mamdani Fuzzy Inference System (src/core/fuzzy_controller.py)")
    add_p("The fuzzy controller takes 3 normalized inputs [0, 1]:")
    add_bullet("Solar PV output divided by peak capacity (280 kW). 0 = dark, 1 = blazing sun.", "1. Renewable Ratio (R): ")
    add_bullet("Current battery percentage. 0.20 = empty reserve, 0.90 = fully charged.", "2. Battery State of Charge (SoC): ")
    add_bullet("70% based on microgrid load, 30% based on tariff price. Tells us how stressed the grid is.", "3. Grid Demand Pressure (D): ")

    add_p("It fuzzifies them into Low (L), Medium (M), and High (H) membership functions:")
    add_img("figures/fig2_fuzzy_mfs.png", "Figure 3.2: Triangular and Trapezoidal Membership Functions for R, SoC, and D.")

    add_p("The 27 Mamdani Rules evaluate the combination and output 3 continuous guidance values via Centroid Defuzzification:")
    add_bullet("Penalty multiplier between 0.5 and 3.0. When high, grid imports are heavily penalized.", "• Grid Penalty Weight (W_grid): ")
    add_bullet("Bias between -1.0 (strongly discharge) and +1.0 (strongly charge). Guides battery direction.", "• Battery Dispatch Bias (B_bias): ")
    add_bullet("Peak shaving multiplier between 1.0 and 5.0. Forces DE to prioritize flattening spikes.", "• Peak Shaving Weight (W_peak): ")

    add_h3("B. Vectorized Differential Evolution (src/core/de_optimizer.py)")
    add_p("Differential Evolution is an evolutionary algorithm that optimizes a vector of 24 numbers: the battery power schedule [P_bat(0), P_bat(1), ..., P_bat(23)].")
    add_bullet("30 candidate battery schedules are randomly initialized between -150 kW (discharge) and +150 kW (charge).", "1. Population (N_p = 30): ")
    add_bullet("DE/best/1 mutation creates a mutant vector by adding scaled differences (F = 0.65) to the best schedule found so far.", "2. Mutation: ")
    add_bullet("Binomial crossover (C_r = 0.85) mixes the parent schedule with the mutant vector.", "3. Crossover: ")
    add_bullet("CRITICAL FEATURE: Every trial schedule is clipped so that |P_bat(t) - P_bat(t-1)| <= 45 kW. This ensures no erratic switching!", "4. Ramp-Rate Limiter: ")
    add_bullet("Simulates physical battery equations (efficiency 0.95, SoC limits 20%-90%) and evaluates fitness using our Fuzzy Objective Function.", "5. Fitness Evaluation: ")
    add_bullet("If the new schedule has better or equal fitness, it replaces the parent in the population.", "6. Selection: ")

    add_h3("C. The Hybrid Fitness Function (How Fuzzy connects to DE)")
    add_callout(
        doc,
        "f(u) = Net Energy Cost + Battery Degradation + Fuzzy Peak Penalty + Bias Alignment + SoC Barrier + Ramp Penalty\n\n"
        "1. Net Energy Cost: Sum over 24 hours of [ P_import(t) · (Tariff(t) · W_grid(t)) - P_export(t) · Credit ] · dt\n"
        "   -> Notice W_grid(t) from the Fuzzy FIS! During peak tariff, W_grid goes up to 3.0x, making DE reject grid imports!\n\n"
        "2. Fuzzy Peak Penalty: (max P_import)^2 · 0.004 · mean(W_peak)\n"
        "   -> When fuzzy detects high demand, W_peak rises to 5.0x, mathematically forcing the peak down!\n\n"
        "3. Bias Alignment: 0.02 · Sum max(0, -B_bias(t) · P_bat(t))\n"
        "   -> Penalizes solutions that contradict expert fuzzy guidance (e.g., trying to charge during peak hours).\n\n"
        "4. Battery SoC Barrier: 3000 · Sum [ (violations below 20%)^2 + (violations above 90%)^2 ]\n"
        "   -> Massive penalty ensuring the optimizer never damages the battery.\n\n"
        "5. Inverter Ramp Penalty: 0.0015 · Sum (P_bat(t) - P_bat(t-1))^2\n"
        "   -> Keeps the schedule physically smooth.",
        title="THE HYBRID OBJECTIVE EQUATION (MEMORIZE THIS FOR VIVA)"
    )

    # =========================================================
    # SECTION 4: CODEBASE WALKTHROUGH
    # =========================================================
    add_h1("4. Codebase Organization (Where is everything?)")
    add_p(
        "If the professor asks you to open a file and explain the code, here is where everything lives:"
    )

    t_code = doc.add_table(rows=7, cols=3)
    t_code.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_heads = ["File Path", "Primary Responsibility", "Key Functions / Classes to Show"]
    for i, h in enumerate(c_heads):
        format_cell_text(t_code.cell(0, i), h, bold=True, font_size=9.0, color=(0xFF, 0xFF, 0xFF))
        set_cell_background(t_code.cell(0, i), "1B365D")
        set_cell_margins(t_code.cell(0, i), top=60, bottom=60, left=80, right=80)

    code_files = [
        ("src/core/fuzzy_controller.py", "Mamdani Fuzzy Logic Engine", "FuzzyDispatchController, trimf, trapmf, evaluate_step(), 27 rules"),
        ("src/core/de_optimizer.py", "Vectorized Differential Evolution", "DifferentialEvolutionOptimizer, optimize(), _compute_fitness(), ramp filter"),
        ("src/core/simulation.py", "Microgrid Physics & Scenarios", "generate_microgrid_scenario(), BatteryConfig, 5 scenario presets"),
        ("src/core/baselines.py", "Greedy Rule-Based Baseline", "simulate_rule_based_dispatch() (immediate solar self-consumption)"),
        ("backend/main.py", "FastAPI REST API Server", "POST /api/optimize, GET /api/scenarios, GET /api/export/{id}/csv"),
        ("frontend/src/", "React 19 + Vite Dashboard", "LiveSimulator.jsx (24h playback), DispatchChart.jsx, ConvergenceChart.jsx")
    ]
    for idx, rvals in enumerate(code_files):
        row = t_code.rows[idx + 1]
        for col_idx, val in enumerate(rvals):
            c = row.cells[col_idx]
            format_cell_text(c, val, bold=(col_idx == 0), font_size=8.5, color=DARK)
            bg = "F4F6F9" if idx % 2 == 1 else "FFFFFF"
            set_cell_background(c, bg)
            set_cell_margins(c, top=50, bottom=50, left=80, right=80)
    set_table_borders(t_code)

    # =========================================================
    # SECTION 5: KEY BENCHMARK RESULTS (MEMORIZE THESE NUMBERS)
    # =========================================================
    add_h1("5. Benchmark Results (The Numbers to Quote in Viva)")
    add_p(
        "Here are the exact numbers you should quote when showing the performance of our algorithm:"
    )

    t_nums = doc.add_table(rows=4, cols=5)
    t_nums.alignment = WD_TABLE_ALIGNMENT.CENTER
    num_heads = ["Algorithm", "Peak Grid Draw (kW)", "Peak Shaving", "Net 24h Cost ($)", "Solar Self-Use (%)"]
    for i, h in enumerate(num_heads):
        format_cell_text(t_nums.cell(0, i), h, bold=True, font_size=9.0, color=(0xFF, 0xFF, 0xFF))
        set_cell_background(t_nums.cell(0, i), "1B365D")
        set_cell_margins(t_nums.cell(0, i), top=60, bottom=60, left=70, right=70)

    num_rows = [
        ("Fuzzy + DE (Our Method)", "117.7 kW", "SHAVED -22.9 kW (-16.3% vs DE)\nSHAVED -95.8 kW (-44.9% vs Greedy)", "$233.73", "75.7%"),
        ("Plain DE (Baseline A)", "140.6 kW", "Baseline", "$228.15", "64.3%"),
        ("Greedy Rule-Based (Baseline B)", "213.5 kW (Catastrophic Spike)", "Severe Twilight Spike (+51.8%)", "$211.21", "81.3%")
    ]
    for idx, rvals in enumerate(num_rows):
        row = t_nums.rows[idx + 1]
        for col_idx, val in enumerate(rvals):
            c = row.cells[col_idx]
            is_our = (idx == 0)
            format_cell_text(c, val, bold=is_our, font_size=8.5, color=(NAVY if is_our else DARK))
            bg = "E8F5E9" if is_our else ("F4F6F9" if idx % 2 == 1 else "FFFFFF")
            set_cell_background(c, bg)
            set_cell_margins(c, top=60, bottom=60, left=70, right=70)
    set_table_borders(t_nums)

    add_img("figures/fig4_convergence.png", "Figure 5.1: Convergence Graph: Fuzzy+DE reaches 117.7 kW while Plain DE stagnates at 140.6 kW.")
    add_img("figures/fig3_dispatch_curves.png", "Figure 5.2: 24-Hour Dispatch: Notice how Greedy spikes to 213.5 kW at hour 19:30, while Fuzzy+DE stays flat at 117.7 kW.")

    add_h2("The Golden Viva Question: \"Why is Plain DE cost slightly lower ($228 vs $233)?\"")
    add_callout(
        doc,
        "HOW TO ANSWER:\n"
        "\"That's an important distinction! In standard billing, electricity bills consist of two parts:\n"
        "1. Energy Charge ($/kWh consumed)\n"
        "2. Demand Charge ($/kW peak capacity drawn during the billing month, typically $15 to $25 per kW).\n\n"
        "Plain DE only minimizes the nominal energy charge ($228 vs $233), but it allows a peak spike of 140.6 kW. "
        "Fuzzy + DE shaves 22.9 kW off the peak (down to 117.7 kW). In commercial tariffs, shaving 22.9 kW saves $340 to $570 "
        "every month on utility demand charges! The small nominal $5 daily energy difference is completely dwarfed by the massive demand-charge savings!\"",
        title="CRUCIAL VIVA EXPLANATION: ENERGY COST VS DEMAND CHARGE",
        border_color="E65100",
        bg_color="FFF3E0"
    )

    # =========================================================
    # SECTION 6: FREQUENTLY ASKED VIVA QUESTIONS & ANSWERS
    # =========================================================
    add_h1("6. Top 8 Faculty Viva Questions & Perfect Answers")

    faqs = [
        ("Q1: Why did you choose Mamdani Fuzzy Inference instead of Sugeno (TSK)?",
         "Answer: Mamdani FIS uses intuitive linguistic fuzzy sets for both inputs AND outputs (e.g., 'W_grid is High', 'B_bias is Charge'). "
         "This provides complete linguistic explainability and auditability for power grid operators. Sugeno outputs mathematical polynomials, "
         "which act more like a black-box and lose the human-readable reasoning required for soft computing explainability."),

        ("Q2: Why Differential Evolution (DE) instead of Genetic Algorithms (GA) or Particle Swarm Optimization (PSO)?",
         "Answer: DE is specifically designed for continuous numerical search spaces. It uses vector difference perturbations (best/1 mutation) "
         "which self-adapt their step sizes as the population converges. GAs struggle with binary-encoded discretization errors on continuous power "
         "schedules, and standard PSO is prone to velocity explosion and premature stagnation in constrained battery charging/discharging spaces."),

        ("Q3: How does this satisfy Course Outcome CO4 (Hybrid Systems)?",
         "Answer: CO4 requires combining two or more distinct soft-computing paradigms to solve a complex engineering problem where neither alone succeeds. "
         "We combine Mamdani Fuzzy Logic (knowledge representation & dynamic constraint shaping) with Differential Evolution (global numerical search). "
         "Fuzzy logic continuously reshapes the DE fitness landscape, while DE computes the optimal 24-dimensional dispatch trajectory."),

        ("Q4: How do you enforce battery physics so the optimizer doesn't cheat?",
         "Answer: In src/core/de_optimizer.py, candidate schedules pass through a forward kinematic simulation: internal energy is integrated "
         "using charging/discharging efficiency (eta = 0.95). If a candidate tries to push SoC below 20% or above 90%, a quadratic penalty barrier "
         "of 3000 * (violation)^2 is added to the fitness function, mathematically driving the evolutionary population away from illegal states."),

        ("Q5: What is inverter ramp-rate limiting and why does it matter?",
         "Answer: Bidirectional power inverters suffer severe thermal stress and premature aging if battery power swings wildly between adjacent hours. "
         "We enforce |P_bat(t) - P_bat(t-1)| <= 45 kW using a vectorized ramp filter. This eliminates high-frequency chattering and produces smooth, "
         "physically deployable schedules."),

        ("Q6: How does Greedy Rule-Based dispatch work and why does it fail?",
         "Answer: Greedy dispatch has zero lookahead. Whenever solar PV is generated, it serves the load and dumps any surplus into the battery. "
         "Around 13:00, the battery is full. At 17:00, solar vanishes while evening residential load spikes. The battery empties quickly, leaving the "
         "microgrid defenseless and forcing it to draw a massive 213.5 kW spike from the grid during the most expensive tariff period."),

        ("Q7: What happens on cloudy or rainy days?",
         "Answer: We tested a 'Cloudy & Intermittent' scenario with 65% reduced solar. In that scenario, Fuzzy + DE achieved the lowest net cost ($457.14) "
         "among all algorithms (beating Plain DE at $465.27 and Rule-Based at $490.31), proving that fuzzy guidance is especially resilient under adverse weather."),

        ("Q8: How did you test and verify the software?",
         "Answer: We wrote an automated pytest test suite in tests/test_core.py with 6 comprehensive test modules covering triangular/trapezoidal bounds, "
         "fuzzy controller outputs, scenario generation, rule-based physics, DE convergence, and FastAPI REST endpoints. All 6 tests pass in 4.65 seconds.")
    ]

    for q, a in faqs:
        add_h3(q)
        add_p(a, space_after=6)

    # =========================================================
    # SECTION 7: STEP-BY-STEP GUIDE TO RUN AND DEMO THE APP
    # =========================================================
    add_h1("7. How to Run the Demo for the Presentation")
    add_p(
        "Follow these exact steps to run the application on your laptop during the demo:"
    )

    add_h2("Step 1: Start the FastAPI Backend")
    add_callout(
        doc,
        "cd softcomputing-pbl\n"
        "python -m uvicorn backend.main:app --port 8000 --reload\n\n"
        "-> Backend will start on: http://localhost:8000\n"
        "-> Interactive Swagger API docs available at: http://localhost:8000/docs",
        title="TERMINAL 1 (BACKEND)",
        border_color="1565C0",
        bg_color="E3F2FD"
    )

    add_h2("Step 2: Start the Frontend Workbench")
    add_callout(
        doc,
        "cd softcomputing-pbl/frontend\n"
        "npm run dev\n\n"
        "-> Web dashboard will start on: http://localhost:5173",
        title="TERMINAL 2 (FRONTEND)",
        border_color="2E7D32",
        bg_color="E8F5E9"
    )

    add_h2("Step 3: What to show in the UI during the demo")
    add_bullet("Click 'Play Simulation' or drag the slider. Show how solar peaks at midday, battery charges, and grid import stays flat. Point out the 4 telemetry cards.", "1. Interactive 24h Simulator Tab: ")
    add_bullet("Point out the KPI strip at the top: Peak Grid Import is 117.7 kW (-17% shaved vs Plain DE). Scroll down to the Benchmark Table to show the side-by-side comparison.", "2. Analytics & Benchmarks Tab: ")
    add_bullet("Show the Convergence Profile chart where Fuzzy+DE (green) converges lower than Plain DE (blue). On the right, use the time slider to show live linguistic rules firing in real-time!", "3. Fuzzy & DE Engine Tab: ")

    add_h2("Step 4: Run the Automated Test Suite (To impress the evaluator)")
    add_callout(
        doc,
        "pytest\n\n"
        "-> Output: 6 passed in ~4.6s (100% test pass rate)",
        title="TERMINAL COMMAND FOR UNIT TESTS",
        border_color="7B1FA2",
        bg_color="F3E5F5"
    )

    # Save document
    out_file = "GridFlux_Team_Guide_and_Project_Walkthrough.docx"
    doc.save(out_file)
    print(f"Team guide successfully generated at: {out_file}")

    # Also make a copy as team_guide.docx
    import shutil
    shutil.copyfile(out_file, "team_guide.docx")
    print("Copied to team_guide.docx")

if __name__ == "__main__":
    build_team_guide()
