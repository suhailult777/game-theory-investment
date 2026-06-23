import numpy as np
import warnings
from app.core.log import get_logger

warnings.filterwarnings("ignore", category=UserWarning)
log = get_logger(__name__)

ACTIONS = ["BUY", "SELL", "HOLD"]
N_ACTIONS = len(ACTIONS)


class FTPLStrategy:
    def __init__(self, n_actions: int = N_ACTIONS, eta: float = 0.1, perturbation_scale: float = 0.5):
        self.n_actions = n_actions
        self.eta = eta
        self.perturbation_scale = perturbation_scale
        self.cumulative_payoffs = np.zeros(n_actions)
        self.round = 0

    def get_perturbed_payoffs(self) -> np.ndarray:
        perturbation = np.random.gumbel(scale=self.perturbation_scale, size=self.n_actions)
        return self.cumulative_payoffs + perturbation

    def choose_action(self) -> int:
        perturbed = self.get_perturbed_payoffs()
        return int(np.argmax(perturbed))

    def observe_payoff(self, action: int, payoff: float):
        self.cumulative_payoffs[action] += payoff
        self.round += 1

    def get_action_probabilities(self) -> np.ndarray:
        n_samples = 1000
        counts = np.zeros(self.n_actions)
        for _ in range(n_samples):
            a = self.choose_action()
            counts[a] += 1
        return counts / n_samples

    def get_regret(self, optimal_payoff: float) -> float:
        avg_payoff = self.cumulative_payoffs.sum() / max(1, self.round)
        return optimal_payoff - avg_payoff

    def reset(self):
        self.cumulative_payoffs = np.zeros(self.n_actions)
        self.round = 0


def _compute_action_payoff(action: int, macro_features: dict) -> float:
    sentiment = macro_features.get("sentiment", 0.0)
    vix = macro_features.get("vix", 16.0)
    inst_flow = macro_features.get("fii_flow", 0.0) + macro_features.get("dii_flow", 0.0)
    inflation = macro_features.get("inflation", 5.0)
    repo_rate = macro_features.get("repo_rate", 6.5)
    nash_dist = macro_features.get("nash_distance", 0.5)
    qre_lambda = macro_features.get("qre_lambda", 0.0)
    regime = macro_features.get("regime", 0)

    buy_score = 0.0
    sell_score = 0.0
    hold_score = 0.0

    if sentiment < -0.3:
        buy_score += 2.0
    elif sentiment > 0.5:
        sell_score += 2.0

    if vix > 22:
        buy_score += 1.5
        sell_score -= 0.5
    elif vix < 12:
        sell_score += 1.0

    if inst_flow > 1500:
        buy_score += 2.0
    elif inst_flow < -1500:
        sell_score += 2.0

    if inflation > 5.0:
        buy_score -= 0.5
        sell_score += 0.5

    if repo_rate > 6.0:
        sell_score += 0.5

    if nash_dist > 0.2:
        buy_score += 1.0

    if qre_lambda > 1.0:
        buy_score += 0.5

    if regime == 1:
        sell_score += 1.5
    elif regime == 2:
        sell_score += 3.0
        buy_score -= 1.0

    payoffs = [buy_score, sell_score, hold_score]
    return payoffs[action]


def ftpl_signal(macro_features: dict, n_rounds: int = 50) -> dict:
    try:
        ftpl = FTPLStrategy(n_actions=N_ACTIONS, eta=0.1, perturbation_scale=0.5)

        for _ in range(n_rounds):
            action = ftpl.choose_action()
            payoff = _compute_action_payoff(action, macro_features)
            ftpl.observe_payoff(action, payoff)

        probs = ftpl.get_action_probabilities()

        optimal_payoff = max(_compute_action_payoff(a, macro_features) for a in range(N_ACTIONS))
        regret = ftpl.get_regret(optimal_payoff)

        recommended_idx = int(np.argmax(probs))
        recommended_action = ACTIONS[recommended_idx]

        buy_score = (probs[0] - probs[1]) * 20.0

        return {
            "score_contribution": buy_score,
            "recommended_action": recommended_action,
            "regret": float(regret),
            "action_probabilities": {
                "BUY": float(probs[0]),
                "SELL": float(probs[1]),
                "HOLD": float(probs[2]),
            },
            "rounds_played": n_rounds,
        }
    except Exception as e:
        log.warning("FTPL signal failed: %s", e)
        return {
            "score_contribution": 0.0,
            "recommended_action": "HOLD",
            "regret": 0.0,
            "action_probabilities": {"BUY": 1/3, "SELL": 1/3, "HOLD": 1/3},
            "rounds_played": 0,
        }
