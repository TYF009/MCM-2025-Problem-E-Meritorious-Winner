🌿 Adaptive Ecosystem Dynamics & Multi-Objective Optimization Framework

> **2025 Interdisciplinary Contest in Modeling (ICM) — Problem E**  
> 🏆 **Award: Meritorious Winner (M-Award)** | Team #2521959  
> *Targeted Area: Complex Dynamical Systems, Stochastic Simulation & Multi-Attribute Decision Making*

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![MATLAB](https://img.shields.io/badge/MATLAB-R2023b+-orange.svg)](https://www.mathworks.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Executive Summary

This repository contains the refactored, high-performance simulation and decision-making framework developed for **2025 ICM Problem E ("The Silent Shift, The Verdant Metamorphosis")**. 

The project models complex, non-linear ecosystem transitions (e.g., Milkwood Farm transition) under environmental disturbances. It bridges **Stochastic Differential Equations (SDEs)**, **Multi-Criteria Data Fusion**, and **Evolutionary Multi-Objective Optimization (NSGA-II)** into a unified dual-engine pipeline (Python + MATLAB).

```text
                      +-------------------------------------------------------+
                      |       Complex Dynamic System Simulation Engine        |
                      +-------------------------------------------------------+
                                                  |
                         +------------------------+------------------------+
                         |                                                 |
              [ Python Pipeline ]                                 [ MATLAB Engine ]
         • Stochastic SDE Solver (Euler-Maruyama)           • ODE45 High-Precision Solver
         • Data Fusion (AHP-EWM-CRITIC)                     • Jacobian Matrix Linearization
         • Multi-Objective NSGA-II & TOPSIS                 • Eigenvalue Lyapunov Stability

```

---

## 🔬 Mathematical Formulation & Key Modules

### 1. Adaptive Ecological Dynamics (AED) — Stochastic Simulation

The population interaction with environmental noise is modeled via coupled SDEs solved using the **Euler-Maruyama algorithm**:

$$dX_i(t) = X_i(t) \left( r_i + \sum_{j=1}^{N} A_{ij} X_j(t) \right) dt + \sigma_i X_i(t) dW_i(t)$$

* **Implementation**: `src/aed_simulator.py`
* **Outputs**: Time-series trajectory of species density under stochastic perturbations.

---

### 2. Lyapunov Stability Analysis (MATLAB Engine)

To verify system equilibrium $X^* = -A^{-1}r$, we perform Jacobian Linearization at the steady state:

$$J_{ij} = \left. \frac{\partial f_i}{\partial X_j} \right\vert{}_{X^*}$$

Evaluating the eigenvalues $\lambda_i$ of $J$:


$$\lambda_{1,2} = -0.2145 \pm 0.5068i, \quad \lambda_3 = -0.1593$$

Since $\text{Re}(\lambda_i) < 0$, the system is mathematically proven to be **Asymptotically Stable** (Attracting Spiral Trajectory).

* **Implementation**: `src/aed_sensitivity_analysis.m`

---

### 3. Multi-Criteria Data Fusion (AHP-EWM-CRITIC)

Synthesizes subjective domain knowledge with objective data entropy and inter-attribute correlation:

* **AHP**: Priority vectors based on expert judgment.
* **EWM**: Information uncertainty measurement.
* **CRITIC**: Attribute variability ($\sigma$) and inter-criteria conflict.
* **Implementation**: `src/hybrid_weighting.py`

---

### 4. Multi-Objective Resource Allocation (NSGA-II + TOPSIS)

Simultaneously optimizes system stability (Obj 1: Maximize) and implementation cost (Obj 2: Minimize) to yield a non-dominated **Pareto Optimal Front**.

$$\min_{\mathbf{x}} \mathbf{F}(\mathbf{x}) = \left[ -f_1(\mathbf{x}), f_2(\mathbf{x}) \right]^T$$

* **Decision Engine**: TOPSIS evaluates relative closeness coefficients $C_i$ to pinpoint the single optimal trade-off node.
* **Implementation**: `src/multi_objective_opt.py`

---

## 📊 Key Results & Visualizations

### 1. Code-Generated Simulation Results

| Stochastic Simulation | Hybrid Weighting Analysis | Pareto Front & TOPSIS Decision | Lyapunov Phase Space (MATLAB) |
| --- | --- | --- | --- |
|  |  |  |  |
| *Species dynamic succession* | *5D-OFE Weight distribution* | *Optimal trade-off selection* | *3D convergence to $X^*$* |

---

### 2. Conceptual System Architecture & Contest Paper Figures

> *The following architectural figures are adapted from our contest paper submission to demonstrate the macro system framework.*

---

## 🛠️ Repository Structure

```text
.
├── paper/                     # MCM Contest Paper Submission (PDF)
├── problem/                   # Official Contest Problem E Statement
├── figures/                   # Code-generated figures & Paper illustrations
├── src/                       # Core Source Code Engine
│   ├── aed_simulator.py            # SDE Euler-Maruyama Solver (Python)
│   ├── hybrid_weighting.py         # AHP-EWM-CRITIC Data Fusion (Python)
│   ├── multi_objective_opt.py      # NSGA-II & TOPSIS Engine (Python)
│   └── aed_sensitivity_analysis.m  # Jacobian & Lyapunov Analysis (MATLAB)
└── README.md                  # Project documentation & execution guide

```

---

## 🚀 Quick Start & Reproduction

### Prerequisites

* Python 3.10+ (`numpy`, `matplotlib`, `pandas`)
* MATLAB R2022b+ (for Lyapunov analysis)

### Run Python Simulation Pipeline

```bash
# Clone repository
git clone [https://github.com/your-username/2025-ICM-Problem-E.git](https://github.com/your-username/2025-ICM-Problem-E.git)
cd 2025-ICM-Problem-E

# 1. Run Stochastic System Dynamics
python src/aed_simulator.py

# 2. Run Hybrid Weighting Calculation
python src/hybrid_weighting.py

# 3. Run NSGA-II & TOPSIS Optimization
python src/multi_objective_opt.py

```

### Run MATLAB Stability Engine

Open MATLAB, navigate to `src/`, and execute:

```matlab
run('aed_sensitivity_analysis.m')

```

---

## 📜 Citation & Credits

* **Contest Paper**: *The Silent Shift, The Verdant Metamorphosis: Adaptive Dynamics & Evaluation Framework* (M-Award, Team #2521959).
* **Author Contribution**: Core dynamic system modeling, NSGA-II optimization, Lyapunov stability analysis, and dual-engine software implementation.

```

```
