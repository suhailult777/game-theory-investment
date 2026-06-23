import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Existing endpoints ───────────────────────────────────────────────
export const getLatestScores = async () => {
  const response = await api.get('/scores/latest');
  return response.data;
};

export const getScoreHistory = async (asset, limit = 30) => {
  const response = await api.get(`/scores/history`, {
    params: { asset, limit },
  });
  return response.data;
};

export const getLatestMarketData = async () => {
  const response = await api.get('/market/latest');
  return response.data;
};

export const getLatestNews = async (limit = 10) => {
  const response = await api.get('/sentiment/news', {
    params: { limit },
  });
  return response.data;
};

// ── Phase 2: Game Theory endpoints ───────────────────────────────────
export const getGameTheoryLatest = async () => {
  const response = await api.get('/game-theory/latest');
  return response.data;
};

export const getRegime = async () => {
  const response = await api.get('/game-theory/regime');
  return response.data;
};

export const getNashEquilibria = async (limit = 10) => {
  const response = await api.get('/game-theory/nash', {
    params: { limit },
  });
  return response.data;
};

export const getEnsembleScores = async (limit = 10) => {
  const response = await api.get('/ensemble/latest', {
    params: { limit },
  });
  return response.data;
};

export const getFictitiousPlay = async (limit = 10) => {
  const response = await api.get('/fictitious-play/latest', {
    params: { limit },
  });
  return response.data;
};

export const getFTPLResults = async (limit = 10) => {
  const response = await api.get('/ftpl/latest', {
    params: { limit },
  });
  return response.data;
};

export const getMeanFieldResults = async (limit = 10) => {
  const response = await api.get('/mean-field/latest', {
    params: { limit },
  });
  return response.data;
};

export const getMLSignals = async (asset) => {
  const response = await api.get('/ml/latest', {
    params: { asset },
  });
  return response.data;
};

export default {
  getLatestScores,
  getScoreHistory,
  getLatestMarketData,
  getLatestNews,
  getGameTheoryLatest,
  getRegime,
  getNashEquilibria,
  getEnsembleScores,
  getFictitiousPlay,
  getFTPLResults,
  getMeanFieldResults,
  getMLSignals,
};
