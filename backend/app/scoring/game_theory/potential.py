import numpy as np
from app.core.log import get_logger
from app.core.config import ASSETS_SCORED

log = get_logger(__name__)


def optimize_potential_game_allocation(
    scores: dict[str, float],
    correlations: dict[tuple[str, str], float] | None = None,
    risk_aversion: float = 2.0,
) -> dict[str, float]:
    """
    Express portfolio allocation as a potential game.
    
    A potential game has a single global utility function that all
    'players' (assets) jointly optimize. This guarantees convergence
    of best-response dynamics to a Nash equilibrium.

    Utility = expected_return - risk_aversion * variance + diversification_bonus

    Args:
        scores: dict mapping asset -> score (0-100)
        correlations: dict mapping (asset1, asset2) -> correlation
        risk_aversion: Risk aversion parameter (higher = more conservative)

    Returns:
        dict mapping asset -> optimal weight (sums to 1.0)
    """
    assets = ASSETS_SCORED
    n = len(assets)

    if n == 0:
        return {}

    # Convert scores to expected returns (normalized)
    returns = np.array([scores.get(a, 50.0) for a in assets])
    returns = returns / 100.0  # Scale to [0, 1]

    # Build covariance matrix
    if correlations and len(correlations) > 0:
        cov = np.ones((n, n)) * 0.02  # Base variance
        for i, a1 in enumerate(assets):
            for j, a2 in enumerate(assets):
                if i != j:
                    corr = correlations.get((a1, a2), correlations.get((a2, a1), 0.3))
                    # Variance from score volatility
                    std_i = 0.15 * (1.0 - returns[i] * 0.5)  # Higher score = lower vol
                    std_j = 0.15 * (1.0 - returns[j] * 0.5)
                    cov[i, j] = corr * std_i * std_j
                else:
                    cov[i, i] = (0.15 * (1.0 - returns[i] * 0.5)) ** 2
    else:
        # Default: moderate correlation, score-based variance
        cov = np.eye(n) * 0.02
        for i in range(n):
            cov[i, i] = (0.15 * (1.0 - returns[i] * 0.5)) ** 2
        for i in range(n):
            for j in range(n):
                if i != j:
                    cov[i, j] = 0.3 * np.sqrt(cov[i, i] * cov[j, j])

    # Optimization: maximize mean-variance utility
    # U(w) = w·μ - 0.5 * risk_aversion * w'Σw + diversification_bonus
    # where diversification_bonus = 0.1 * sum(w * (1-w))
    # subject to sum(w) = 1, w >= 0

    from scipy.optimize import minimize

    def neg_utility(w):
        exp_return = np.dot(w, returns)
        variance = w @ cov @ w
        div_bonus = 0.1 * np.sum(w * (1.0 - w))
        utility = exp_return - 0.5 * risk_aversion * variance + div_bonus
        return -utility

    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}]
    bounds = [(0.0, 1.0)] * n
    x0 = np.ones(n) / n

    result = minimize(neg_utility, x0, method="SLSQP", bounds=bounds, constraints=constraints)

    if result.success:
        weights = result.x
        weights = np.clip(weights, 0, 1)
        weights = weights / weights.sum()
        return {a: round(float(w), 4) for a, w in zip(assets, weights)}
    else:
        log.warning("Potential game optimization failed: %s. Using equal weights.", result.message)
        return {a: round(1.0 / n, 4) for a in assets}
