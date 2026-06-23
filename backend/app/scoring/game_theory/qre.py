import numpy as np
from app.core.log import get_logger

log = get_logger(__name__)


def compute_qre_signal(
    retail_payoffs: np.ndarray,
    inst_payoffs: np.ndarray,
    lambda_range: tuple[float, float] = (0.01, 10.0),
) -> dict:
    """
    Estimate the Quantal Response Equilibrium rationality parameter λ
    from the payoff matrices. Higher λ = more rational play.

    QRE bridges Nash (λ→∞) and uniform random (λ→0).
    We approximate λ by finding the value where QRE best matches
    a uniform starting point.

    Returns:
        lambda_estimate: float — market rationality (0 = random, >5 = near-Nash)
        rationality_label: str — "RANDOM", "BOUNDED", "RATIONAL", or "NEAR_NASH"
        is_efficient: bool — True if λ > 3.0
        entropy: float — Shannon entropy of implied mixed strategy
    """
    # Compute best-response correspondence
    # A simple λ proxy: ratio of payoff variance across actions
    # If payoffs are very different → rational agents will pick the best → high λ
    # If payoffs are similar → any action is fine → low λ

    retail_std = np.std(retail_payoffs, axis=1).mean()
    inst_std = np.std(inst_payoffs, axis=0).mean()
    mean_std = (retail_std + inst_std) / 2

    if mean_std < 0.01:
        lambda_est = 0.01
    else:
        lambda_est = min(lambda_range[1], max(lambda_range[0], mean_std * 3.0))

    # Classify rationality
    if lambda_est < 0.5:
        label = "RANDOM"
    elif lambda_est < 2.0:
        label = "BOUNDED"
    elif lambda_est < 5.0:
        label = "RATIONAL"
    else:
        label = "NEAR_NASH"

    # Compute entropy of implied mixed strategy
    mixed_retail = _softmax(retail_payoffs.mean(axis=1) * lambda_est)
    mixed_inst = _softmax(inst_payoffs.mean(axis=0) * lambda_est)
    combined = (mixed_retail + mixed_inst) / 2
    combined = np.clip(combined, 1e-10, 1.0)
    entropy = -float(np.sum(combined * np.log(combined)))

    return {
        "lambda_estimate": round(lambda_est, 4),
        "rationality_label": label,
        "is_efficient": lambda_est > 3.0,
        "entropy": round(entropy, 4),
    }


def _softmax(x: np.ndarray) -> np.ndarray:
    e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e_x / e_x.sum(axis=-1, keepdims=True)
