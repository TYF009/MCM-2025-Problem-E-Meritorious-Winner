%% Adaptive Dynamic System Stability & Sensitivity Analysis
%  Applied Context: Jacobian Linearization & Eigenvalue Stability Analysis
%  Target Domain: Control Systems, Network Stability, Dynamic Equilibrium

clear; clc; close all;

% --- 1. System Parameter Setup ---
% Intrinsic growth rates vector r
r = [0.8; -0.3; -0.15];

% Interaction matrix A (Coupling coefficients)
A = [-0.05, -0.10,  0.00;
      0.08, -0.02, -0.12;
      0.00,  0.06, -0.01];

% --- 2. Equilibrium State & Jacobian Evaluation ---
% Solve for non-zero equilibrium point: X* = -inv(A) * r
X_star = -A \ r;

fprintf('--- Dynamic System Equilibrium Analysis ---\n');
disp('Equilibrium Vector X*:');
disp(X_star);

% Compute Jacobian Matrix J at Equilibrium X*: J_ij = X_i* * A_ij
J = zeros(3, 3);
for i = 1:3
    for j = 1:3
        J(i, j) = X_star(i) * A(i, j);
    end
end

% Compute Eigenvalues for Lyapunov Stability
eigenvalues = eig(J);
disp('System Eigenvalues at Equilibrium:');
disp(eigenvalues);

% --- 3. Plot State Space & Phase Portrait ---
figure('Color', [1 1 1], 'Position', [100, 100, 750, 550]);
tspan = [0 50];
x0 = [10.0; 2.0; 0.5];

% Solve ODE using ode45 (Runge-Kutta 4th/5th Order)
[t, X] = ode45(@(t, x) x .* (r + A * x), tspan, x0);

plot3(X(:,1), X(:,2), X(:,3), 'LineWidth', 2, 'Color', [0.15, 0.45, 0.75]);
grid on; hold on;
plot3(X_star(1), X_star(2), X_star(3), 'r*', 'MarkerSize', 12, 'LineWidth', 2);

xlabel('Producers Density');
ylabel('Pests Density');
zlabel('Beneficial Species');
title('3D Phase Space Trajectory & Lyapunov Stability Point', 'FontSize', 12);
legend('Trajectory', 'Equilibrium Node (X*)', 'Location', 'northeast');
view(45, 30);

% --- 4. Dynamic Path Auto-Save (Fix Path Issue) ---
% Get script root directory and construct absolute path to /figures
script_dir = fileparts(mfilename('fullpath'));
project_root = fullfile(script_dir, '..', '..');
output_dir = fullfile(project_root, 'figures');

if ~exist(output_dir, 'dir')
    mkdir(output_dir);
end

target_file = fullfile(output_dir, 'matlab_phase_portrait.png');
saveas(gcf, target_file);
fprintf('[Success] MATLAB Phase Portrait saved to: %s\n', target_file);