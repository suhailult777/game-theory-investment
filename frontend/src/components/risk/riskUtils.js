import { ASSETS } from "../../lib/constants";

const ASSET_KEYS = [...ASSETS];

function computeDailyReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i].price - prices[i - 1].price) / prices[i - 1].price);
  }
  return returns;
}

function computeVaR(returns, confidence = 0.95) {
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sorted.length);
  return sorted[idx] * 100;
}

function computeCVaR(returns, confidence = 0.95) {
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoff = Math.floor((1 - confidence) * sorted.length);
  const tail = sorted.slice(0, cutoff || 1);
  return (tail.reduce((s, v) => s + v, 0) / tail.length) * 100;
}

function computeSharpe(returns, riskFreeRate = 0.0001) {
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
  const std = Math.sqrt(returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length);
  if (std === 0) return 0;
  return (mean - riskFreeRate) / std;
}

function computeSortino(returns, riskFreeRate = 0.0001) {
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
  const downReturns = returns.filter((r) => r < riskFreeRate);
  const downDev = Math.sqrt(downReturns.reduce((s, v) => s + (v - riskFreeRate) ** 2, 0) / (downReturns.length || 1));
  if (downDev === 0) return 0;
  return (mean - riskFreeRate) / downDev;
}

function computeVolatility(returns, window) {
  const slice = returns.slice(-window);
  const mean = slice.reduce((s, v) => s + v, 0) / slice.length;
  return Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length) * Math.sqrt(252) * 100;
}

function computeDrawdowns(prices) {
  let peak = prices[0].price;
  const drawdowns = [];
  let maxDd = 0;
  let maxDdIdx = 0;

  prices.forEach((p, i) => {
    if (p.price > peak) peak = p.price;
    const dd = ((p.price - peak) / peak) * 100;
    drawdowns.push({ timestamp: p.timestamp, drawdown: dd });
    if (dd < maxDd) {
      maxDd = dd;
      maxDdIdx = i;
    }
  });

  return { drawdowns, maxDrawdown: maxDd, currentDrawdown: drawdowns[drawdowns.length - 1]?.drawdown || 0, maxDrawdownIdx: maxDdIdx };
}

function computeCorrelationMatrix(allReturns) {
  const matrix = {};
  ASSET_KEYS.forEach((a) => {
    matrix[a] = {};
    ASSET_KEYS.forEach((b) => {
      if (a === b) {
        matrix[a][b] = 1;
      } else if (matrix[b]?.[a] !== undefined) {
        matrix[a][b] = matrix[b][a];
      } else {
        const len = Math.min(allReturns[a].length, allReturns[b].length);
        const ra = allReturns[a].slice(-len);
        const rb = allReturns[b].slice(-len);
        const meanA = ra.reduce((s, v) => s + v, 0) / len;
        const meanB = rb.reduce((s, v) => s + v, 0) / len;
        let cov = 0, varA = 0, varB = 0;
        for (let i = 0; i < len; i++) {
          cov += (ra[i] - meanA) * (rb[i] - meanB);
          varA += (ra[i] - meanA) ** 2;
          varB += (rb[i] - meanB) ** 2;
        }
        const denom = Math.sqrt(varA * varB);
        matrix[a][b] = denom === 0 ? 0 : cov / denom;
      }
    });
  });
  return matrix;
}

function computeVolSurface(allReturns) {
  const windows = [5, 10, 20, 60];
  const surface = {};
  windows.forEach((w) => {
    surface[w] = {};
    ASSET_KEYS.forEach((asset) => {
      surface[w][asset] = computeVolatility(allReturns[asset], w);
    });
  });
  return surface;
}

function computeRiskContribution(allReturns) {
  const contributions = {};
  let totalVol = 0;

  ASSET_KEYS.forEach((asset) => {
    const vol = computeVolatility(allReturns[asset], 20);
    contributions[asset] = vol;
    totalVol += vol;
  });

  if (totalVol === 0) {
    ASSET_KEYS.forEach((asset) => { contributions[asset] = 25; });
  } else {
    ASSET_KEYS.forEach((asset) => {
      contributions[asset] = (contributions[asset] / totalVol) * 100;
    });
  }
  return contributions;
}

function getRiskLevel(varPct, sharpe, maxDrawdown) {
  if (varPct < -5 || maxDrawdown < -20 || sharpe < -0.5) return "EXTREME";
  if (varPct < -3 || maxDrawdown < -15 || sharpe < 0) return "HIGH";
  if (varPct < -1.5 || maxDrawdown < -10 || sharpe < 1) return "MEDIUM";
  return "LOW";
}

function getRiskColor(level) {
  switch (level) {
    case "EXTREME": return "#ff0055";
    case "HIGH": return "#ff6b35";
    case "MEDIUM": return "#ffd600";
    case "LOW": return "#00f5a0";
    default: return "#94a3b8";
  }
}

function generateSparklineData(allReturns) {
  const sparklines = {};
  ASSET_KEYS.forEach((asset) => {
    const returns = allReturns[asset];
    const windowSize = 5;
    const rolling = [];
    for (let i = windowSize; i <= returns.length; i++) {
      const slice = returns.slice(i - windowSize, i);
      const mean = slice.reduce((s, v) => s + v, 0) / slice.length;
      const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length);
      rolling.push(std * Math.sqrt(252) * 100);
    }
    sparklines[asset] = rolling;
  });
  return sparklines;
}

export function computeAllRiskMetrics(priceHistories) {
  const allReturns = {};
  ASSET_KEYS.forEach((asset) => {
    allReturns[asset] = computeDailyReturns(priceHistories[asset]);
  });

  const metrics = {};
  ASSET_KEYS.forEach((asset) => {
    const returns = allReturns[asset];
    const var95 = computeVaR(returns, 0.95);
    const var99 = computeVaR(returns, 0.99);
    const cvar = computeCVaR(returns, 0.95);
    const sharpe = computeSharpe(returns);
    const sortino = computeSortino(returns);
    const { drawdowns, maxDrawdown, currentDrawdown, maxDrawdownIdx } = computeDrawdowns(priceHistories[asset]);
    const vol30 = computeVolatility(returns, 30);
    const vol60 = computeVolatility(returns, 60);

    // Beta vs nifty
    const niftyReturns = allReturns.nifty;
    const len = Math.min(returns.length, niftyReturns.length);
    const ra = returns.slice(-len);
    const rb = niftyReturns.slice(-len);
    const meanA = ra.reduce((s, v) => s + v, 0) / len;
    const meanB = rb.reduce((s, v) => s + v, 0) / len;
    let cov = 0, varB = 0;
    for (let i = 0; i < len; i++) {
      cov += (ra[i] - meanA) * (rb[i] - meanB);
      varB += (rb[i] - meanB) ** 2;
    }
    const beta = varB === 0 ? 1 : cov / varB;

    metrics[asset] = {
      var95,
      var99,
      cvar,
      sharpe,
      sortino,
      maxDrawdown,
      currentDrawdown,
      vol30,
      vol60,
      beta,
      drawdowns,
      maxDrawdownIdx,
      riskLevel: getRiskLevel(var95, sharpe, maxDrawdown),
      dailyReturns: returns,
    };
  });

  return {
    metrics,
    correlation: computeCorrelationMatrix(allReturns),
    volSurface: computeVolSurface(allReturns),
    riskContrib: computeRiskContribution(allReturns),
    sparklines: generateSparklineData(allReturns),
    allReturns,
  };
}

export { getRiskColor, ASSET_KEYS };
