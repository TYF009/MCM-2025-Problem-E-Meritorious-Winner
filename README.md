🏆 2025 MCM/ICM Problem E: The Silent Shift, The Verdant Metamorphosis
> **Award**: Meritorious Winner (M Award) | **Control #: 2521959**

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/)
[![Award](https://img.shields.io/badge/MCM%2FICM-Meritorious%20Winner-gold.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Executive Summary
This repository contains the numerical implementation, mathematical modeling pipeline, and the original paper for **Problem E (2025 MCM/ICM)**. 

Our work introduces two primary dynamic and evaluation frameworks:
1. **AED Model (Adaptive Ecological Dynamics)**: Incorporates Lotka-Volterra dynamics with impulse functions, stochastic delay differential equations, and Euler-Maruyama numerical solving to simulate ecosystem transition.
2. **5D-OFE Model (Five-Dimensional Optimal Farm Evaluation)**: Combines AHP, Entropy Weight Method (EWM), and CRITIC for subjective-objective dynamic weighting, solved via NSGA-II multi-objective optimization and forecasted through ARIMA models.

---

## 📊 Modeling Framework & Key Results

### 1. Overall Workflow
![Task Process](figures/task_process.png)  
*Figure 1: Quantification of Task Processes and Solving Pipeline.*

### 2. Ecological Dynamics Simulation (AED Model)
![AED Simulation](figures/aed_simulation_demo.png)  
*Figure 2: Time-series dynamics of native organisms under stochastic noise and impulse restoration.*

### 3. Long-Term Trend Forecasting
![ARIMA Forecast](figures/arima_forecast.png)  
*Figure 3: 5D-OFE composite index forecast from 2025 to 2037.*

---

## 🚀 Quick Start & Reproduction

### Prerequisites
Clone the repository and install required dependencies:
```bash
git clone [https://github.com/your-username/MCM-2025-Problem-E.git](https://github.com/your-username/MCM-2025-Problem-E.git)
cd MCM-2025-Problem-E
pip install -r requirements.txt
