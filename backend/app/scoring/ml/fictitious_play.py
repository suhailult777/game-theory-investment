import numpy as np
import warnings
from typing import Optional
from app.core.log import get_logger

warnings.filterwarnings("ignore", category=UserWarning)
log = get_logger(__name__)

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim

    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class BestResponseNetwork(nn.Module):
    def __init__(self, state_dim: int, action_dim: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 64),
            nn.ReLU(),
            nn.Linear(64, action_dim),
        )

    def forward(self, state):
        return self.net(state)


AGENT_TYPES = [
    "retail_momentum", "retail_value", "institutional_hedge",
    "institutional_arb", "market_maker", "trend_follower",
    "mean_reverter", "volatility_arb", "sentiment_trader", "liquidity_provider",
    "pension_fund", "sovereign_wealth", "hedge_fund_long_short",
    "hedge_fund_macro", "cta_fund", "etf_rebalancer",
    "dividend_aristocrat", "growth_investor", "deep_value", "quant_market_neutral",
    "retail_noise", "retail_fomo", "retail_panic", "retail_dca",
    "institutional_momentum", "institutional_quality", "institutional_low_vol",
    "high_frequency", "statistical_arb", "event_driven",
    "activist", "index_fund", "small_cap_specialist", "large_cap_blend",
    "yield_seeker", "commodity_trader", "currency_speculator",
    "options_writer", "volatility_seller", "tail_risk_hedger",
    "sector_rotator", "pair_trader", "merger_arb", "banking_desk",
    "fund_of_funds", "endowment", "family_office", "retail_swing",
    "retail_position", "crypto_cross_market", "em_specialist",
]

N_AGENT_TYPES = len(AGENT_TYPES)
STATE_DIM = 16
ACTION_DIM = 3


def _get_state(macro_features: dict) -> torch.Tensor:
    vec = [
        macro_features.get("vix", 16.0) / 50.0,
        macro_features.get("inflation", 5.0) / 10.0,
        macro_features.get("repo_rate", 6.5) / 10.0,
        macro_features.get("sentiment", 0.0),
        macro_features.get("fii_flow", 0.0) / 5000.0,
        macro_features.get("dii_flow", 0.0) / 5000.0,
        macro_features.get("usd_inr", 83.0) / 100.0,
        macro_features.get("gold_return_1d", 0.0),
        macro_features.get("nifty_return_1d", 0.0),
        macro_features.get("nash_distance", 0.5),
        macro_features.get("qre_lambda", 0.0),
        macro_features.get("regime", 0.0) / 3.0,
        macro_features.get("evolution_conc", 0.5),
        macro_features.get("trend_change", 0.0) / 100.0,
        macro_features.get("inst_flow_signal", 0.0),
        macro_features.get("carry", 0.0),
    ]
    return torch.FloatTensor([vec])


class DeepFictitiousPlay:
    def __init__(self, n_agents: int = 50):
        self.n_agents = n_agents
        self.n_types = min(N_AGENT_TYPES, n_agents)
        self.agent_types = AGENT_TYPES[:self.n_types]
        self.networks = {}

        if TORCH_AVAILABLE:
            for i in range(self.n_types):
                self.networks[i] = BestResponseNetwork(STATE_DIM, ACTION_DIM)

        self.beliefs = np.ones((self.n_types, ACTION_DIM)) / ACTION_DIM
        self.action_counts = np.zeros((self.n_types, ACTION_DIM))

    def compute_best_response(self, state: torch.Tensor, agent_idx: int) -> int:
        if not TORCH_AVAILABLE:
            payoffs = np.dot(self.beliefs[agent_idx], np.array([
                [0.5, -0.3, 0.1],
                [-0.2, 0.4, -0.1],
                [0.0, 0.0, 0.0],
            ]))
            return int(np.argmax(payoffs))

        net = self.networks.get(agent_idx)
        if net is None:
            return 0

        net.eval()
        with torch.no_grad():
            q_values = net(state)
        return int(torch.argmax(q_values).item())

    def update_beliefs(self, action: int, agent_idx: int):
        self.action_counts[agent_idx, action] += 1
        total = self.action_counts[agent_idx].sum()
        self.beliefs[agent_idx] = self.action_counts[agent_idx] / total

    def train_step(self, state: torch.Tensor, best_action: int, agent_idx: int,
                   lr: float = 0.01):
        if not TORCH_AVAILABLE:
            return

        net = self.networks.get(agent_idx)
        if net is None:
            return

        net.train()
        optimizer = optim.Adam(net.parameters(), lr=lr)
        q_values = net(state)
        target = q_values.clone().detach()
        target[0, best_action] += 0.1

        loss = nn.MSELoss()(q_values, target)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    def run(self, state: torch.Tensor, n_iterations: int = 20) -> dict:
        actions = []
        for agent_idx in range(self.n_types):
            action = self.compute_best_response(state, agent_idx)
            self.update_beliefs(action, agent_idx)
            actions.append(action)

            if TORCH_AVAILABLE:
                self.train_step(state, action, agent_idx)

        action_distribution = np.zeros(ACTION_DIM)
        for a in actions:
            action_distribution[a] += 1
        action_distribution = action_distribution / self.n_types

        entropy = -np.sum(action_distribution * np.log(action_distribution + 1e-10))
        max_entropy = np.log(ACTION_DIM)
        concentration = 1.0 - (entropy / max_entropy) if max_entropy > 0 else 0.0

        dominant_action_idx = int(np.argmax(action_distribution))
        action_labels = {0: "BUY", 1: "SELL", 2: "HOLD"}
        dominant_strategy = action_labels.get(dominant_action_idx, "HOLD")

        equilibrium_distance = 1.0 - concentration

        return {
            "dominant_strategy": dominant_strategy,
            "action_distribution": {
                "BUY": float(action_distribution[0]),
                "SELL": float(action_distribution[1]),
                "HOLD": float(action_distribution[2]),
            },
            "concentration": float(concentration),
            "equilibrium_distance": float(equilibrium_distance),
            "n_agents": self.n_agents,
            "n_types": self.n_types,
            "actions": [int(a) for a in actions],
        }

    def get_strategy_distribution(self) -> dict:
        dist = {}
        for i, agent_type in enumerate(self.agent_types):
            dist[agent_type] = {
                "buy_belief": float(self.beliefs[i][0]),
                "sell_belief": float(self.beliefs[i][1]),
                "hold_belief": float(self.beliefs[i][2]),
            }
        return dist


def fictitious_play_signal(macro_features: dict, n_agents: int = 50) -> dict:
    try:
        fp = DeepFictitiousPlay(n_agents=n_agents)
        state = _get_state(macro_features)
        result = fp.run(state, n_iterations=15)

        buy_frac = result["action_distribution"]["BUY"]
        sell_frac = result["action_distribution"]["SELL"]
        hold_frac = result["action_distribution"]["HOLD"]

        net_signal = buy_frac - sell_frac
        score_contribution = net_signal * 20.0

        return {
            "score_contribution": score_contribution,
            "buy_fraction": buy_frac,
            "sell_fraction": sell_frac,
            "hold_fraction": hold_frac,
            "concentration": result["concentration"],
            "equilibrium_distance": result["equilibrium_distance"],
            "dominant_strategy": result["dominant_strategy"],
            "n_agents": result["n_agents"],
        }
    except Exception as e:
        log.warning("Fictitious play signal failed: %s", e)
        return {
            "score_contribution": 0.0,
            "buy_fraction": 1.0 / 3,
            "sell_fraction": 1.0 / 3,
            "hold_fraction": 1.0 / 3,
            "concentration": 0.0,
            "equilibrium_distance": 0.5,
            "dominant_strategy": "HOLD",
            "n_agents": n_agents,
        }
