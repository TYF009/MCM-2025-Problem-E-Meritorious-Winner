"""
Multi-Objective Optimization & Decision Analysis Framework (NSGA-II + TOPSIS)
-------------------------------------------------------------------------------
This module implements a complete workflow for multi-objective ecosystem/resource management:
1. NSGA-II (Non-dominated Sorting Genetic Algorithm II) to generate Pareto Optimal Front.
2. TOPSIS (Technique for Order Preference by Similarity to Ideal Solution) for optimal node selection.

Applied Context: IoT Network Resource Trade-offs (e.g., Latency vs Energy), 
                 System-Level Multi-Objective Optimization.
"""

import os
import numpy as np
import matplotlib.pyplot as plt


class NSGA2Optimizer:
    """
    NSGA-II Multi-Objective Optimization Engine implemented in vectorized NumPy.
    Optimizes a 2-Objective Trade-off System:
      - Objective 1 (F1): Maximize Ecosystem Stability Index / Network QoS (Transformed to Minimize -F1)
      - Objective 2 (F2): Minimize Total Implementation Cost / Energy Consumption
    """
    def __init__(self, pop_size: int = 80, num_generations: int = 50, mutation_rate: float = 0.1):
        self.pop_size = pop_size
        self.generations = num_generations
        self.mutation_rate = mutation_rate
        # Decision Variable Bounds (e.g., Resource Allocation Vector between 0 and 1)
        self.var_dim = 3  

    def _evaluate_objectives(self, pop: np.ndarray) -> np.ndarray:
        """
        Evaluates Objective Functions for given Decision Variables X (pop):
        F1 = -(x1^2 + x2^2 + x3^2) -> Maximize Performance/Stability
        F2 = (x1-1)^2 + (x2-1)^2 + (x3-0.5)^2 -> Minimize Resource/Cost
        """
        f1 = -(pop[:, 0]**2 + pop[:, 1]**2 + pop[:, 2]**2)  # Negated for minimization
        f2 = (pop[:, 0] - 1.0)**2 + (pop[:, 1] - 1.0)**2 + (pop[:, 2] - 0.5)**2
        return np.column_stack((f1, f2))

    def _fast_non_dominated_sort(self, objs: np.ndarray) -> list:
        """ Performs Fast Non-Dominated Sorting to assign Rank Fronts """
        num_pop = objs.shape[0]
        domination_counts = np.zeros(num_pop, dtype=int)
        dominated_solutions = [[] for _ in range(num_pop)]
        fronts = [[]]

        for i in range(num_pop):
            for j in range(i + 1, num_pop):
                # Domination Check (Minimize both Objectives)
                if np.all(objs[i] <= objs[j]) and np.any(objs[i] < objs[j]):
                    dominated_solutions[i].append(j)
                    domination_counts[j] += 1
                elif np.all(objs[j] <= objs[i]) and np.any(objs[j] < objs[i]):
                    dominated_solutions[j].append(i)
                    domination_counts[i] += 1

            if domination_counts[i] == 0:
                fronts[0].append(i)

        i = 0
        while len(fronts[i]) > 0:
            next_front = []
            for p in fronts[i]:
                for q in dominated_solutions[p]:
                    domination_counts[q] -= 1
                    if domination_counts[q] == 0:
                        next_front.append(q)
            i += 1
            fronts.append(next_front)

        return fronts[:-1]

    def run(self) -> tuple:
        """ Executes Optimization Loop across Generations """
        np.random.seed(2025)
        # Initialize Population in [0, 1.5] search space
        pop = np.random.uniform(0.0, 1.5, size=(self.pop_size, self.var_dim))

        for gen in range(self.generations):
            objs = self._evaluate_objectives(pop)
            
            # Simulated Offspring Creation (Crossover + Mutation)
            offspring = pop + np.random.normal(0, self.mutation_rate, size=pop.shape)
            offspring = np.clip(offspring, 0.0, 1.5)
            
            # Combine Parent and Offspring Population
            combined_pop = np.vstack((pop, offspring))
            combined_objs = self._evaluate_objectives(combined_pop)
            
            # Fast Non-dominated Sorting
            fronts = self._fast_non_dominated_sort(combined_objs)
            
            # Select Next Generation Population
            new_pop_indices = []
            for front in fronts:
                if len(new_pop_indices) + len(front) <= self.pop_size:
                    new_pop_indices.extend(front)
                else:
                    needed = self.pop_size - len(new_pop_indices)
                    new_pop_indices.extend(front[:needed])
                    break
            
            pop = combined_pop[new_pop_indices]

        final_objs = self._evaluate_objectives(pop)
        pareto_fronts = self._fast_non_dominated_sort(final_objs)
        first_front = pareto_fronts[0]
        
        # Return Pareto Optimal Variables and Objective Values
        return pop[first_front], final_objs[first_front]


class TOPSISDecisionMaker:
    """ TOPSIS Engine to select the Best Trade-Off Solution from Pareto Solutions """
    def __init__(self, pareto_objs: np.ndarray, weights: np.ndarray = None):
        self.objs = pareto_objs
        # Default balanced weights for 2 objectives
        self.weights = np.array([0.5, 0.5]) if weights is None else weights

    def evaluate_best_node(self) -> tuple:
        """ Calculates Closeness Coefficient C_i and selects Best Index """
        # Vector Normalization
        norm_matrix = self.objs / np.sqrt(np.sum(self.objs**2, axis=0) + 1e-9)
        weighted_matrix = norm_matrix * self.weights

        # Define Ideal Positive (Best) and Ideal Negative (Worst) Solutions
        ideal_best = np.min(weighted_matrix, axis=0)   # Lower is better (Minimization)
        ideal_worst = np.max(weighted_matrix, axis=0)

        # Calculate Euclidean Distances
        d_pos = np.sqrt(np.sum((weighted_matrix - ideal_best)**2, axis=1))
        d_neg = np.sqrt(np.sum((weighted_matrix - ideal_worst)**2, axis=1))

        # Relative Closeness Score
        score = d_neg / (d_pos + d_neg + 1e-9)
        best_idx = np.argmax(score)
        
        return best_idx, score


def plot_pareto_with_topsis(pareto_objs, best_idx, save_path="figures/pareto_topsis_result.png"):
    """ Plots Pareto Front and Highlights the TOPSIS Optimal Trade-off Node """
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    plt.figure(figsize=(8, 5), dpi=300)

    # Plot All Pareto Optimal Solutions
    # Obj1 (-F1) is converted back to Positive Stability Index
    stability_scores = -pareto_objs[:, 0]
    cost_scores = pareto_objs[:, 1]

    plt.scatter(cost_scores, stability_scores, color='#1f77b4', s=60, alpha=0.8, label="NSGA-II Pareto Solutions")
    
    # Highlight TOPSIS Best Selection
    plt.scatter(cost_scores[best_idx], stability_scores[best_idx], color='#d62728', s=150, marker='*', 
                edgecolor='black', linewidth=1.5, zorder=5, label="TOPSIS Optimal Choice")

    plt.title("Multi-Objective Optimization: Pareto Front & TOPSIS Choice", fontsize=12, fontweight='bold')
    plt.xlabel("Implementation Cost / Energy Consumption (Obj 2: Min)", fontsize=10)
    plt.ylabel("Ecosystem Stability / System Performance (Obj 1: Max)", fontsize=10)
    plt.legend(loc="lower right", frameon=True)
    plt.tight_layout()

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    plt.savefig(save_path)
    print(f"[Success] Pareto Chart saved to: {save_path}")
    plt.close()


if __name__ == "__main__":
    print("=== Running NSGA-II Multi-Objective Optimization ===")
    optimizer = NSGA2Optimizer(pop_size=100, num_generations=60)
    pareto_vars, pareto_objs = optimizer.run()

    print(f"Pareto Front Found: {len(pareto_objs)} Non-dominated Solutions.")

    print("\n=== Running TOPSIS Best Node Selection ===")
    decision_maker = TOPSISDecisionMaker(pareto_objs, weights=np.array([0.6, 0.4]))
    best_idx, scores = decision_maker.evaluate_best_node()

    print(f"TOPSIS Selected Node Index: {best_idx}")
    print(f"Optimal Trade-off Value -> Stability: {-pareto_objs[best_idx, 0]:.4f} | Cost: {pareto_objs[best_idx, 1]:.4f}")

    # Generate Visualization
    plot_pareto_with_topsis(pareto_objs, best_idx)