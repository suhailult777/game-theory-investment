import numpy as np
import warnings
from typing import Optional
from scipy.optimize import minimize_scalar
from app.core.log import get_logger

warnings.filterwarnings("ignore", category=UserWarning)
log = get_logger(__name__)

N_GRID = 50
TIME_STEPS = 100
RHO_MAX = 2.0


def _sigmoid(x: float, alpha: float = 1.0) -> float:
    return 1.0 / (1.0 + np.exp(-alpha * x))


def _hjb_solver(action_value: callable, T: float = 1.0) -> np.ndarray:
    V = np.zeros((TIME_STEPS + 1, N_GRID + 1))
    x_grid = np.linspace(-RHO_MAX, RHO_MAX, N_GRID + 1)
    dt = T / TIME_STEPS
    dx = 2 * RHO_MAX / N_GRID

    for t in range(TIME_STEPS - 1, -1, -1):
        V[t, :] = V[t + 1, :]
        for i in range(1, N_GRID):
            action_val = action_value(x_grid[i])
            V_xx = (V[t + 1, i + 1] - 2 * V[t + 1, i] + V[t + 1, i - 1]) / (dx * dx)
            grad = (V[t + 1, i + 1] - V[t + 1, i - 1]) / (2 * dx)
            H = action_val * grad + 0.5 * V_xx
            V[t, i] += dt * H

    return V


def _fp_solver(strategy: callable, T: float = 1.0, initial_dist: Optional[np.ndarray] = None) -> np.ndarray:
    rho = np.zeros((TIME_STEPS + 1, N_GRID + 1))
    x_grid = np.linspace(-RHO_MAX, RHO_MAX, N_GRID + 1)
    dt = T / TIME_STEPS
    dx = 2 * RHO_MAX / N_GRID

    if initial_dist is not None:
        rho[0, :] = initial_dist
    else:
        mu, sigma = 0.0, 0.3
        rho[0, :] = np.exp(-0.5 * ((x_grid - mu) / sigma) ** 2) / (sigma * np.sqrt(2 * np.pi))
        rho[0, :] /= np.sum(rho[0, :] * dx)

    for t in range(TIME_STEPS):
        for i in range(N_GRID + 1):
            drift = strategy(x_grid[i])
            if i == 0:
                rho[t + 1, i] = rho[t, i] + dt * (rho[t, i + 1] - rho[t, i]) / dx * abs(drift)
            elif i == N_GRID:
                rho[t + 1, i] = rho[t, i] - dt * (rho[t, i] - rho[t, i - 1]) / dx * abs(drift)
            else:
                rho[t + 1, i] = rho[t, i] - dt * drift * (rho[t, i + 1] - rho[t, i - 1]) / (2 * dx)

        rho[t + 1, :] = np.maximum(rho[t + 1, :], 0)
        total = np.sum(rho[t + 1, :] * dx)
        if total > 0:
            rho[t + 1, :] /= total

    return rho


class MeanFieldGame:
    def __init__(self, macro_features: dict):
        self.macro = macro_features

    def optimal_action(self, x: float) -> float:
        sentiment = self.macro.get("sentiment", 0.0)
        vix = self.macro.get("vix", 16.0)
        inst_flow = self.macro.get("fii_flow", 0.0) + self.macro.get("dii_flow", 0.0)
        regime = self.macro.get("regime", 0)

        base = 0.0
        if regime == 2:
            base = -0.3
        elif regime == 0:
            base = 0.2

        sentiment_signal = -sentiment * 0.3 if abs(sentiment) > 0.3 else 0.0
        vix_signal = 0.02 * (vix - 16)
        flow_signal = inst_flow / 10000.0

        total = base + sentiment_signal + vix_signal + flow_signal
        action = _sigmoid(total - 0.5 * x, alpha=2.0)
        return 2.0 * action - 1.0

    def solve(self, T: float = 1.0, n_iterations: int = 10) -> dict:
        x_grid = np.linspace(-RHO_MAX, RHO_MAX, N_GRID + 1)
        mu, sigma = 0.0, 0.3
        initial_dist = np.exp(-0.5 * ((x_grid - mu) / sigma) ** 2) / (sigma * np.sqrt(2 * np.pi))
        initial_dist /= np.sum(initial_dist * (2 * RHO_MAX / N_GRID))

        rho = initial_dist.copy()
        convergence_history = []

        for iteration in range(n_iterations):
            V = _hjb_solver(self.optimal_action, T)
            rho_new = _fp_solver(self.optimal_action, T, initial_dist)

            diff = np.sum(np.abs(rho_new[-1, :] - rho))
            convergence_history.append(float(diff))

            rho = rho_new[-1, :]
            if diff < 0.001:
                break

        final_dist = rho
        x_grid_full = np.linspace(-RHO_MAX, RHO_MAX, N_GRID + 1)
        mean_exposure = float(np.sum(x_grid_full * final_dist) / max(1, np.sum(final_dist)))
        var_exposure = float(np.sum((x_grid_full - mean_exposure) ** 2 * final_dist) / max(1, np.sum(final_dist)))

        if mean_exposure > 0.1:
            optimal_strategy = "BUY"
        elif mean_exposure < -0.1:
            optimal_strategy = "SELL"
        else:
            optimal_strategy = "HOLD"

        convergence = float(convergence_history[-1]) if convergence_history else 1.0

        return {
            "retail_exposure_mean": mean_exposure,
            "retail_exposure_variance": var_exposure,
            "optimal_strategy": optimal_strategy,
            "convergence": convergence,
            "n_iterations": iteration + 1,
            "exposure_grid": {
                "positions": x_grid_full.tolist(),
                "density": final_dist.tolist(),
            },
        }


def mean_field_signal(macro_features: dict) -> dict:
    try:
        mfg = MeanFieldGame(macro_features)
        result = mfg.solve(T=1.0, n_iterations=8)

        mean_exposure = result["retail_exposure_mean"]
        score_contribution = mean_exposure * 15.0

        return {
            "score_contribution": score_contribution,
            "retail_exposure_mean": result["retail_exposure_mean"],
            "retail_exposure_variance": result["retail_exposure_variance"],
            "optimal_strategy": result["optimal_strategy"],
            "convergence": result["convergence"],
            "n_iterations": result["n_iterations"],
        }
    except Exception as e:
        log.warning("Mean field signal failed: %s", e)
        return {
            "score_contribution": 0.0,
            "retail_exposure_mean": 0.0,
            "retail_exposure_variance": 0.5,
            "optimal_strategy": "HOLD",
            "convergence": 1.0,
            "n_iterations": 0,
        }
