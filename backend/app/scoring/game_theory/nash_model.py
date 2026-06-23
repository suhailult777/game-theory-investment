import numpy as np
import nashpy as nash
from sqlalchemy.orm import Session
from app.core.log import get_logger

log = get_logger(__name__)

RETAIL_ACTIONS = ["Buy", "Sell", "Hold"]       # 0, 1, 2
INST_ACTIONS = ["Accumulate", "Distribute", "Hedge"]  # 0, 1, 2


def build_retail_inst_payoffs(
    sentiment: float,
    inst_flow: float,
    vix: float,
    inflation: float,
    repo_rate: float,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Build 3x3 payoff matrices for Retail (row) vs Institutional (col).

    Baseline payoffs represent the 'natural' outcome of each strategy pair.
    Current macro context modulates these baselines.

    Returns (retail_payoffs, inst_payoffs) each shape (3, 3).
    """
    retail = np.zeros((3, 3))
    inst = np.zeros((3, 3))

    # Baseline: fair market = both Hold/Neutral → zero payoff
    R = 1.0  # base payoff magnitude

    # ------------------------------------------------------------------
    # Col 0: Inst Accumulates
    # ------------------------------------------------------------------
    retail[0, 0] =  R * (1.0 - sentiment)         # Retail Buy + Inst Accumulate — good for retail if not euphoric
    retail[1, 0] = -R * (1.0 + sentiment)         # Retail Sell + Inst Accumulate — retail sells into accumulation = bad
    retail[2, 0] =  0.0                            # Neutral + Accumulate = no-op for retail

    inst[0, 0] =  R * (1.0 + inst_flow / 2000.0)  # Inst Accumulate + Retail Buy = good (liquidity)
    inst[1, 0] =  R * (1.0 + inst_flow / 2000.0)  # Inst Accumulate + Retail Sell = even better (cheap buys)
    inst[2, 0] =  0.5 * R                          # Inst Accumulate + Neutral = moderate

    # ------------------------------------------------------------------
    # Col 1: Inst Distributes
    # ------------------------------------------------------------------
    retail[0, 1] = -R * (1.0 + sentiment)         # Retail Buy + Inst Distribute = retail buys the top
    retail[1, 1] =  R * (1.0 - sentiment)         # Retail Sell + Inst Distribute = both agree = ok for retail
    retail[2, 1] =  0.0

    inst[0, 1] =  R * (1.0 - inst_flow / 2000.0)  # Distribute + Retail Buy = good (sell into demand)
    inst[1, 1] = -R * (1.0 - inst_flow / 2000.0)  # Distribute + Retail Sell = both selling = bad
    inst[2, 1] =  0.5 * R

    # ------------------------------------------------------------------
    # Col 2: Inst Hedges
    # ------------------------------------------------------------------
    hedge_premium = min(1.0, (vix - 12.0) / 20.0)  # Higher VIX → hedging more valuable
    retail[0, 2] =  -0.3 * R                        # Retail Buy + Hedge = slight negative (inst not committed)
    retail[1, 2] =  -0.3 * R                        # Retail Sell + Hedge = slight negative
    retail[2, 2] =  0.0

    inst[0, 2] =  R * hedge_premium                # Hedge + Buy = moderate
    inst[1, 2] =  R * hedge_premium                # Hedge + Sell = moderate
    inst[2, 2] =  0.0

    # Macro modulation
    if inflation > 6.0 or repo_rate > 6.5:
        retail *= 0.8   # Tight macro hurts retail more
        inst *= 1.1     # Institutions navigate tight macro better

    return retail, inst


def compute_nash_equilibrium(
    retail_payoffs: np.ndarray,
    inst_payoffs: np.ndarray,
) -> list[tuple[np.ndarray, np.ndarray]]:
    """Compute all Nash equilibria for the 2-player game."""
    game = nash.Game(retail_payoffs, inst_payoffs)
    try:
        eqs = list(game.support_enumeration())
        return eqs
    except Exception as e:
        log.warning("Nash equilibrium computation failed: %s", e)
        return []


def nash_equilibrium_signal(
    retail_payoffs: np.ndarray,
    inst_payoffs: np.ndarray,
) -> dict:
    """
    Compute Nash equilibrium and return signals.
    
    Returns:
        equilibrium_found: bool
        num_equilibria: int
        eq_distances: list of floats (distance from uniform random play to each eq)
        l2_distance: float (min L2 distance from uniform to any equilibrium)
        pure_nash_exists: bool
        suggested_retail_action: int or None
        suggested_inst_action: int or None
    """
    eqs = compute_nash_equilibrium(retail_payoffs, inst_payoffs)

    result = {
        "equilibrium_found": len(eqs) > 0,
        "num_equilibria": len(eqs),
        "eq_distances": [],
        "l2_distance": None,
        "pure_nash_exists": False,
        "suggested_retail_action": None,
        "suggested_inst_action": None,
    }

    uniform = np.array([1/3, 1/3, 1/3])

    for eq_retail, eq_inst in eqs:
        dist_r = float(np.linalg.norm(np.array(eq_retail) - uniform))
        dist_i = float(np.linalg.norm(np.array(eq_inst) - uniform))
        result["eq_distances"].append((dist_r + dist_i) / 2)

        # Check for pure strategy Nash (both strategies are pure = one entry is ~1.0)
        if np.any(np.array(eq_retail) > 0.99) and np.any(np.array(eq_inst) > 0.99):
            result["pure_nash_exists"] = True
            result["suggested_retail_action"] = int(np.argmax(eq_retail))
            result["suggested_inst_action"] = int(np.argmax(eq_inst))

    if result["eq_distances"]:
        result["l2_distance"] = min(result["eq_distances"])

    return result
