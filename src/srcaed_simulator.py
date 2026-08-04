"""
Adaptive Ecosystem Dynamics (AED) Simulator
--------------------------------------------------
This module simulates non-linear species interactions and ecological succession 
using coupled stochastic differential equations (SDEs) via Euler-Maruyama integration.

Applied Context: Dynamical System Modeling & Stochastic Signal Simulation.
"""

import os
import numpy as np
import matplotlib.pyplot as plt


class AEDSimulator:
    """
    Simulate multi-species non-linear interaction with stochastic environmental fluctuations.
    Coupled Lotka-Volterra model with Euler-Markov perturbation.
    """
    def __init__(self, growth_rates: np.ndarray, interaction_matrix: np.ndarray):
        """
        :param growth_rates: 1D array of intrinsic growth/decay rates [r1, r2, ...]
        :param interaction_matrix: 2D array of interaction coefficients (A_ij)
        """
        self.r = np.array(growth_rates)
        self.A = np.array(interaction_matrix)
        self.num_species = len(growth_rates)

    def simulate(self, x0: np.ndarray, T: float, dt: float, noise_std: float = 0.02) -> tuple:
        """
        Solve SDE using Euler-Maruyama method:
        dX_i = X_i * (r_i + sum_j(A_ij * X_j)) * dt + sigma * X_i * dW_i
        
        :param x0: Initial population density array
        :param T: Total simulation time
        :param dt: Time step size
        :param noise_std: Environmental noise intensity (sigma)
        :return: (time_steps, trajectory_matrix)
        """
        N = int(T / dt)
        t = np.linspace(0, T, N)
        x = np.zeros((N, self.num_species))
        x[0] = x0

        # Precompute random Wiener increments for efficiency
        dW = np.random.normal(0, np.sqrt(dt), size=(N - 1, self.num_species))

        for k in range(N - 1):
            # Deterministic drift: f(x) = x * (r + A @ x)
            drift = x[k] * (self.r + np.dot(self.A, x[k]))
            # Stochastic diffusion: g(x) = sigma * x
            diffusion = noise_std * x[k]
            
            # Euler-Maruyama Step
            x[k + 1] = x[k] + drift * dt + diffusion * dW[k]
            # Ensure non-negative biological populations
            x[k + 1] = np.maximum(x[k + 1], 0.0)

        return t, x


def plot_and_save_trajectories(t, trajectory, species_names, save_path="figures/aed_simulation_result.png"):
    """
    Plot and save species population trajectories over time.
    """
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    plt.figure(figsize=(9, 5), dpi=300)
    
    colors = ['#2ca02c', '#d62728', '#1f77b4', '#ff7f0e']
    for i in range(trajectory.shape[1]):
        plt.plot(t, trajectory[:, i], label=species_names[i], linewidth=2, color=colors[i % len(colors)])
        
    plt.title("Adaptive Ecosystem Dynamics (AED) Stochastic Simulation", fontsize=12, fontweight='bold')
    plt.xlabel("Time (Cycles / Seasons)", fontsize=10)
    plt.ylabel("Population Density / Biomass Index", fontsize=10)
    plt.legend(loc='upper right', frameon=True)
    plt.tight_layout()
    
    # 自动创建 figures 文件夹（如果不存在的话）
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    plt.savefig(save_path)
    print(f"[Success] Simulation chart saved to: {save_path}")
    plt.close()


if __name__ == "__main__":
    # --- Example Configuration for 3-Species Ecological Network ---
    species = ["Producers (Crops)", "Herbivores (Pests)", "Beneficial Species (Bats/Bees)"]
    r = [0.8, -0.3, -0.15]  
    A = [
        [-0.05, -0.10,  0.00],  # Producer competition & pest consumption
        [ 0.08, -0.02, -0.12],  # Pest growth from plants & predation
        [ 0.00,  0.06, -0.01]   # Predator/Beneficial species dynamics
    ]
    
    x0 = [10.0, 2.0, 0.5]  # Initial state
    
    simulator = AEDSimulator(growth_rates=r, interaction_matrix=A)
    t, trajectory = simulator.simulate(x0=x0, T=50.0, dt=0.01, noise_std=0.03)

    print("Simulation complete.")
    print(f"Final State after T=50: {trajectory[-1]}")
    
    # 生成并保存趋势图
    plot_and_save_trajectories(t, trajectory, species_names=species)