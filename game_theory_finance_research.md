# Advanced Game Theory for Investment/Financial Systems — Research Compendium

## 1. Evolutionarily Stable Strategies (ESS) in Financial Markets

**Concept:** ESS is a refinement of Nash equilibrium where a strategy, once adopted by a population, cannot be invaded by any alternative rare mutant strategy. Formally: `E(s,s) ≥ E(m,s)` and if equality holds, `E(s,m) > E(m,m)`.

**Financial applications:**
- **Market strategy persistence:** Models why certain trading strategies persist (e.g., trend-following, mean-reversion) despite new entrants trying different approaches — the population of traders converges to ESS
- **Replicator dynamics in strategy populations:** The share of traders using strategy `i` evolves as `dx_i/dt = x_i * (f_i - φ)` where `f_i` is fitness (returns) and `φ` average fitness
- **Hawk-Dove in market competition:** Models aggressive vs. passive trading strategies; used to explain coexistence of different market-making behaviors
- **Asymmetric ESS for institutional vs. retail investors:** Generalized ESS for multiple subpopulations (see arXiv:2409.19320v3)

**Key paper:** Maynard Smith & Price (1973), *The Logic of Animal Conflict*; recent work on asymmetric ESS in arXiv:2409.19320v3

---

## 2. Reinforcement Learning + Game Theory (Multi-Agent RL)

### Nash Q-Learning (Hu & Wellman, 2003)
- Agents maintain Q-tables over joint actions; update rule uses Nash equilibrium of the stage game formed by Q-values
- Update: `Q_i^{t+1}(s, a) = (1-α)Q_i^t(s,a) + α[r_i + γ·Nash_i(Q^t(s'))]`
- Solves general-sum stochastic games
- **Implementations:** `github.com/jtonglet/Nash-Q-Learning`, `github.com/MultiagentSystemsProject-Polimi2024/LearningNashQLearning`

### Deep Fictitious Play (Han & Hu, 2020)
- Combines fictitious play with deep BSDE (backward stochastic differential equation) methods
- Decomposes N-player game into N decoupled decision problems solved iteratively
- Uses neural networks to approximate Markovian Nash equilibrium
- Handles 50+ player games with common noise
- **Paper:** PMLR 107:221-245

### Policy Space Response Oracles (PSRO)
- Double Oracle / PSRO meta-algorithm: maintains population of policies, computes best responses via deep RL, uses empirical game-theoretic analysis for meta-strategy
- Joint-policy correlation metric for evaluating convergence
- **Implementation:** `github.com/pathu007/PSRO-DCH---Multi-Agent-RL-with-Game-Theory`

### Self-Play Methods
- AlphaZero-style: agent plays against copies of itself
- Fictitious self-play, neural fictitious self-play (NFSP)
- **Survey:** arXiv:2408.01072 (comprehensive self-play survey)

### Mean-Field MARL (Anand & Karmarkar, 2026)
- `ALTERNATING-MARL`: subsampled mean-field Q-learning with theoretical convergence to `Õ(1/√k)`-approximate Nash
- **Paper:** arXiv:2603.03759

---

## 3. Bayesian Games & Incomplete Information Models

**Framework (Harsanyi, 1967-68):** Games with incomplete information transformed into imperfect-information games via "nature's move" assigning types. Defined by `(N, A, T, u, p)`.

### Key financial applications:
- **Kyle Model (1985):** Informed trader + noise traders + market makers; optimal strategic trading under asymmetric information. Price impact `λ = σ_F / (2·σ_U)`. Continuous-time version yields constant λ.
- **Signaling games in IPOs:** Firms signal quality through underpricing; investors update beliefs about firm type
- **Adverse selection in credit markets:** Borrowers have private information about default risk; lenders design screening contracts
- **Bayesian Persuasion in asset management:** Fund managers strategically disclose information to influence investor beliefs
- **Bayesian Action-Graph Games (BAGGs):** Compact representation for Bayesian games exploiting symmetry and independence structures (NeurIPS 2010)

### Bayesian Nash Equilibrium (BNE)
- Each player maximizes expected payoff given type `θ_i`: `E[ u_i(a_i, a_{-i}, θ_i) | θ_i ]`
- Solution via iterated elimination of dominated strategies in type-agent representation

---

## 4. Mechanism Design in Financial Systems

**Definition:** "Reverse game theory" — design rules/institutions so that self-interested agents' strategic behavior yields socially desirable outcomes.

### Financial applications:
- **DeFi mechanism design:** Automated market makers (AMMs), liquidation mechanisms, interest rate curves as mechanisms. Key concepts: incentive compatibility, revenue equivalence
- **Trading mechanism design:** Order book design, fee schedules, priority rules in exchanges
- **Vickrey-Clarke-Groves (VCG) mechanisms** in combinatorial auctions for financial assets
- **Myerson's optimal auction design** applied to Treasury auctions and primary market issuance
- **Market design for prediction markets:** Proper scoring rules, LMSR (logarithmic market scoring rule)
- **Revelation principle:** Any outcome implementable via some mechanism is implementable via a direct revelation mechanism
- **2025 survey (JCMS):** Identifies DeFi governance gaps, proposes adaptive mechanism design

### Key design criteria:
- Individual rationality (voluntary participation)
- Incentive compatibility (truthfulness is equilibrium)
- Budget balance / revenue maximization
- Social welfare maximization

---

## 5. Potential Games & Applications

**Definition:** A game is a potential game if there exists a function `Φ: A → R` such that for all players `i` and action pairs `(a_i, a'_i)`:
`u_i(a'_i, a_{-i}) - u_i(a_i, a_{-i}) = Φ(a'_i, a_{-i}) - Φ(a_i, a_{-i})`

### Key properties:
- Best-response dynamics converge to Nash equilibrium (pure-strategy NE exists)
- Potential function serves as Lyapunov function
- Includes congestion games, coordination games, Cournot competition

### Financial applications:
- **Temporary market impact games** (Kearns & Shi, 2025): Pure temporary impact setting yields a potential game, guaranteeing convergence of best-response dynamics
- **Portfolio congestion games:** Multiple funds trading similar assets create congestion effects
- **Market impact as potential:** Each trader's cost depends on aggregate order flow
- **Wardrop equilibrium in financial networks:** Traffic routing analog for liquidity flows

### Recent work:
- Kearns & Shi (2025), *Algorithmic Aspects of Strategic Trading*: Only temporary impact → potential game; general setting → no convergence, use Coarse Correlated Equilibria instead (arXiv:2502.07606)

---

## 6. Correlated Equilibrium vs. Nash Equilibrium in Market Contexts

### Nash Equilibrium (NE)
- Players choose independently; no player can benefit by unilateral deviation given others' strategies
- Computationally hard (PPAD-complete) for general games
- May not exist in pure strategies; requires coordination device for equilibrium selection

### Correlated Equilibrium (CE) / Coarse Correlated Equilibrium (CCE)
- **Aumann (1974):** Players observe a common random signal before choosing actions; CE allows any correlation structure in play
- **CCE:** Players cannot benefit by **pre-committing** to a fixed strategy independent of the signal (weaker than CE)
- **CE ⊆ CCE ⊆ NE (in terms of set sizes, opposite direction)**
- CCE is **computationally tractable** — can be computed efficiently via no-regret learning (FTPL, regret matching)

### Market significance:
- **Strategic trading (Kearns & Shi, 2025):** CCE is efficiently computable via Follow-the-Perturbed-Leader (FTPL) when equilibrium computation is intractable
- **Market impact games:** FTPL converges to CCE even when best-response dynamics diverge
- **Median voter / market consensus:** Correlated signals model herding behavior and information cascades
- **Regret-based trading strategies:** Minimizing swap regret ensures convergence to CE

---

## 7. Mean Field Game (MFG) Theory

**Core idea (Lasry & Lions, 2007; Huang, Caines & Malhamé, 2006):** Study strategic interactions among infinitely many "small" agents. Each agent's impact on others is negligible, but the aggregate distribution matters.

### Mathematical structure:
- **Hamilton-Jacobi-Bellman (HJB) equation:** `-∂_t u - H(x, ∇u, m) = 0` — optimal control of representative agent
- **Fokker-Planck (FP) / Kolmogorov equation:** `∂_t m - Δ(m · σ²/2) + ∇(m · ∂_p H) = 0` — evolution of agent distribution
- Coupled forward-backward system: solve HJB forward, FP backward

### Financial applications:
- **Oil production (Giraud, Guéant, Lasry, Lions):** MFG model of competing oil producers with alternative energy
- **Optimal execution:** Large number of traders with temporary/permanent market impact; closed-form solutions for linear-quadratic MFG
- **Portfolio choice:** Many small investors with heterogeneous risk preferences; equilibrium distribution of wealth
- **Systemic risk modeling:** Banks interact through interbank lending; MFG captures contagion dynamics
- **HFT market making:** Many competing market makers, each optimizing inventory risk

### Key variants:
- **Major-Minor MFG (Şen & Caines, 2016):** One major agent + many minor agents; mean field becomes stochastic due to major agent's state
- **McKean-Vlasov dynamics:** Each agent's drift depends on distribution of states
- **MFG with common noise:** Aggregate shocks affect all agents

### Software: Deep-MacroFin (deep-macrofin.github.io) — deep learning framework for continuous-time equilibrium models

---

## 8. Bounded Rationality in Investor Modeling

### Herbert Simon's Framework
- **Satisficing:** Investors accept "good enough" outcomes instead of optimizing
- **Cognitive limits:** Information processing constraints, time constraints
- **Procedural rationality:** Focus on decision processes, not just outcomes

### Behavioral Models Integrated with Game Theory:
- **Prospect Theory (Kahneman & Tversky, 1979):** Value function `v(x)` is concave for gains, convex for losses, steeper for losses (loss aversion). Probability weighting overweights small probabilities
- **Quantal Response Equilibrium (QRE):** Agents play noisy best responses; probability of choosing action `i` is `∝ exp(λ·u_i)`. λ = rationality parameter
- **Level-k reasoning:** Traders use `k` levels of strategic reasoning (level-0 naive, level-1 best responds to level-0, etc.)
- **Cognitive hierarchy (Camerer, Ho & Chong):** Distribution of levels of reasoning across population

### JPMorgan Unified Framework (2024):
- RL model incorporating bounded rationality, myopia, prospect bias, optimism, pessimism
- Multi-agent market simulator with SHAP value analysis
- Key finding: Bounded-rational & prospect-biased behavior improves liquidity but reduces price efficiency; myopia/optimism/pessimism reduces liquidity
- **Paper:** *Limited or Biased: Modeling Subrational Human Investors in Financial Markets*, J. Behavioral Finance (2024)

### Implementation approach:
- **Cognitive bias injection:** Modify utility functions with framing effects
- **Quantal response:** Replace argmax with softmax over expected payoffs
- **Finite memory:** Restrict state space to recent observations only

---

## 9. Calibration & Validation Methodologies

### Calibration approaches:
- **Structural estimation:** Estimate game-theoretic parameters (payoffs, types, rationality) from market data via maximum likelihood or GMM
- **Indirect inference:** Simulate model, match moments to empirical moments
- **Simulated method of moments (SMM):** Minimize distance between simulated and empirical moments
- **QRE estimation (Gambit):** Fit Quantal Response Equilibrium models to observed play using maximum likelihood

### Validation techniques:
- **Out-of-sample testing:** Reserve period of market data, compare predicted vs. actual distributions
- **Counterfactual analysis:** Change model parameters, test whether predictions change as expected
- **Agent-based model validation:** Compare emergent macro properties (volatility, liquidity, price efficiency) with empirical facts
- **Backtesting game-theoretic strategies:** Historical simulation with multiple agent types
- **Sensitivity analysis:** Tornado plots, Sobol indices for parameter uncertainty

### Market microstructure validation (Kyle model):
- Estimate Kyle's λ (price impact coefficient) from order flow data
- Regress price changes on order flow imbalance
- Validate model predictions of price impact linearity

### Modern approaches:
- **Bayesian calibration:** MCMC for posterior distribution over game parameters
- **Adversarial validation:** Discriminator trained to distinguish simulated from real market data
- **Kalman-Jacobi hybrid models (Azarberahman, 2025):** Kalman filtering + fuzzy logic for dynamic game parameter estimation

---

## 10. Recent Papers (2022-2026) on Game Theory in Quantitative Finance

| Year | Paper | Key Contribution |
|------|-------|-----------------|
| 2025 | *Game theory applications in finance: a review of literature* (JCMS, 9:106-131) | Systematic review of 78 articles; taxonomizes game theory by strategic orientation and information structure |
| 2025 | *Algorithmic Aspects of Strategic Trading* (Kearns & Shi, arXiv:2502.07606) | Efficient best-response computation; FTPL for CCE in general market impact models |
| 2026 | *Learning Approximate NE in Cooperative MARL via Mean-Field Subsampling* (Anand & Karmarkar, arXiv:2603.03759) | ALTERNATING-MARL with Õ(1/√k) convergence |
| 2025 | *Kalman-Jacobi Hybrid Model for Game Theory: Fuzzy Logic Approach* (Azarberahman, JBSED) | Differential game model for financial competition; Tehran Stock Exchange application |
| 2024 | *Limited or Biased: Modeling Subrational Human Investors* (JPMorgan, J. Behavioral Finance) | RL + behavioral biases unified framework; SHAP analysis |
| 2024 | *Dynamical stability of ESS in asymmetric games* (arXiv:2409.19320) | Information-theoretic insights into ESS; replicator dynamics connections |
| 2024 | *Self-play Methods in RL Survey* (arXiv:2408.01072) | Unifies MARL self-play algorithms under common framework |
| 2023 | *Using Cooperative Game Theory to Prune Neural Networks* (arXiv:2311.10468) | GTAP: Shapley/Banzhaf-based pruning for financial neural nets |
| 2022 | *Applications of Game Theory in Deep Learning: A Survey* (PMC) | GANs as two-player zero-sum games; Stackelberg learning |

---

## Python Libraries & Tools

### Nashpy — `pip install nashpy`
- **Purpose:** Compute Nash equilibria in 2-player strategic-form games
- **Algorithms:** Support enumeration, vertex enumeration, Lemke-Howson, fictitious play, stochastic fictitious play, replicator dynamics
- **Dependencies:** Only numpy + scipy
- **Docs:** nashpy.readthedocs.io
- **Strengths:** Educational focus, well-documented textbook integration

### Axelrod — `pip install axelrod`
- **Purpose:** Iterated Prisoner's Dilemma research library
- **Features:** 230+ strategies, tournaments, Moran processes, spatial tournaments, noisy environments
- **Use case:** Evolution of cooperation in financial networks, reputation systems
- **Docs:** axelrod.readthedocs.io

### Gambit / PyGambit — `pip install pygambit`
- **Purpose:** Comprehensive game theory computation (extensive & strategic form games)
- **Features:** Nash equilibrium enumeration, QRE estimation, sequence form, graphical interface
- **C++ core + Python API** (actively maintained, v16.6.0, March 2026)
- **Project:** gambit-project.org, developed at Alan Turing Institute
- **Best for:** Production-grade game analysis; supports econometric estimation

### gameTheory (PyPI) — `pip install gameTheory`
- **Purpose:** General game theory algorithms
- **Features:** Bankruptcy (CEA, CEL), stable matching (Gale-Shapley), voting, fair division
- **Status:** Under active development (v0.1.4, April 2025)

### OpenSpiel (DeepMind) — `github.com/google-deepmind/open_spiel`
- **Purpose:** MARL research framework with game-theoretic algorithms
- **Features:** 50+ game environments, CFR, PSRO, Nash equilibrium computation, extensive-form games
- **Best for:** Deep RL + game theory research; Python + C++

### QuantEcon — `pip install quantecon`
- **Purpose:** Quantitative economics toolkits
- **Features:** Game theory tools, dynamic programming, optimal growth models
- **Strengths:** Broader economic modeling; complements Nashpy/Gambit

### ABED (Agent-Based Evolutionary Dynamics)
- **Purpose:** Simulate evolution of populations playing symmetric 2-player games
- **Features:** Replicator dynamics, adaptive dynamics, strategy revision protocols
- **Site:** luis-r-izquierdo.github.io/abed/

### Mesa
- **Purpose:** Agent-based modeling framework in Python
- **Use case:** Build custom financial market simulations with game-theoretic agents

### Deep-MacroFin
- **Purpose:** Deep learning framework for continuous-time equilibrium economic models
- **Use case:** Solves high-dimensional MFG models via neural networks
- **Site:** deep-macrofin.github.io

### EvoDyn-3s
- **Purpose:** Phase portrait generation for evolutionary game dynamics
- **Use case:** Visualize replicator dynamics, best-response dynamics in 3-strategy games

### FinRL
- **Purpose:** Financial reinforcement learning framework
- **Integration:** Can be combined with Nash Q-learning and MARL extensions for multi-agent trading

---

## Summary of Core Mathematical Concepts

| Concept | Equation / Definition | Key Property |
|---------|----------------------|--------------|
| Nash Equilibrium | `u_i(s_i, s_{-i}) ≥ u_i(s'_i, s_{-i}) ∀s'_i` | Unilateral deviation never beneficial |
| ESS | `E(s,s) ≥ E(m,s)` and `E(s,m) > E(m,m)` if equality | Invasion-proof |
| Bayesian NE | `E[u_i(a_i,a_{-i},θ_i) | θ_i] ≥ E[u_i(a'_i,a_{-i},θ_i) | θ_i]` | Type-contingent optimality |
| Correlated Eq. | `E[u_i(s_i, s_{-i}) | γ] ≥ E[u_i(s_i', s_{-i}) | γ]` for all γ | Correlation device |
| Potential Game | `u_i(a'_i,a_{-i}) - u_i(a_i,a_{-i}) = Φ(a'_i,a_{-i}) - Φ(a_i,a_{-i})` | Pure NE existence |
| Mean Field Eq. | HJB: `-∂_t u - H(x,∇u,m)=0`, FP: `∂_t m - Δ(m·σ²/2) + ∇(m·∂_p H)=0` | Infinite-agent limit |
| Quantal Response | `P(a_i) = exp(λ·u_i(a_i)) / Σ_j exp(λ·u_i(a_j))` | Noisy best response |
| Potential Function Φ | Any scalar function satisfying difference condition | Best-response convergence |
