import numpy as np
from app.core.log import get_logger

log = get_logger(__name__)

# Strategy definitions for replicator dynamics
STRATEGIES = {
    "gold": ["Momentum", "MeanReversion", "InflationHedge", "SafeHaven"],
    "silver": ["Momentum", "MeanReversion", "IndustrialDemand", "MonetaryProxy"],
    "nifty": ["Growth", "Value", "Momentum", "LowVolatility"],
    "real_estate": ["Income", "Appreciation", "InflationHedge", "Demographic"],
}


def replicator_dynamics(
    fitness: np.ndarray,
    population: np.ndarray,
    dt: float = 0.05,
    steps: int = 200,
) -> np.ndarray:
    """
    Replicator dynamics equation:
    x_i' = x_i * (f_i - mean_f)

    Args:
        fitness: Array of fitness values per strategy (n_strategies,)
        population: Current population share per strategy (n_strategies,)
        dt: Time step
        steps: Number of iterations

    Returns:
        New population shares (n_strategies,)
    """
    x = population.copy()
    for _ in range(steps):
        mean_f = np.dot(fitness, x)
        if mean_f == 0:
            break
        x = x + dt * x * (fitness - mean_f)
        x = np.clip(x, 1e-6, 1.0)
        x = x / x.sum()
    return x


def evolve_allocations(
    asset: str,
    current_scores: dict[str, float],
    historical_returns: dict[str, list[float]],
) -> dict[str, float]:
    """
    Evolve strategy allocations using replicator dynamics.

    Args:
        asset: Asset name
        current_scores: Current scoring factor values
        historical_returns: Dict mapping strategy names to lists of recent returns

    Returns:
        Dict mapping strategy names to evolved population shares
    """
    strategies = STRATEGIES.get(asset, STRATEGIES["gold"])

    if not historical_returns:
        return {s: 1.0 / len(strategies) for s in strategies}

    # Compute fitness from recent returns
    fitness = []
    for s in strategies:
        returns = historical_returns.get(s, [0.0])
        avg_return = float(np.mean(returns)) if returns else 0.0
        # Clamp and scale fitness
        fit = max(-1.0, min(1.0, avg_return))
        fitness.append(fit)

    fitness_arr = np.array(fitness)

    # Normalize fitness to [0, 1]
    f_min, f_max = fitness_arr.min(), fitness_arr.max()
    if f_max > f_min:
        fitness_arr = (fitness_arr - f_min) / (f_max - f_min)
    else:
        fitness_arr = np.ones_like(fitness_arr)

    # Start from equal population
    population = np.ones(len(strategies)) / len(strategies)

    # Evolve
    evolved = replicator_dynamics(fitness_arr, population)

    return {s: round(float(evolved[i]), 4) for i, s in enumerate(strategies)}


def compute_evolutionary_signal(
    evolved: dict[str, float],
) -> dict:
    """
    Compute signals from evolutionary strategy distribution.

    Returns:
        dominant_strategy: str
        concentration: float (Herfindahl index, 0-1)
        entropy: float (Shannon entropy)
        num_active: int (strategies with >5% share)
    """
    shares = np.array(list(evolved.values()))
    n = len(shares)

    concentration = float(np.sum(shares ** 2))

    p = np.clip(shares, 1e-10, 1.0)
    entropy = -float(np.sum(p * np.log(p)))

    active = int(np.sum(shares > 0.05))

    strategies_list = list(evolved.keys())

    return {
        "dominant_strategy": strategies_list[int(np.argmax(shares))],
        "concentration": round(concentration, 4),
        "entropy": round(entropy, 4),
        "num_active_strategies": active,
        "shares": evolved,
    }
