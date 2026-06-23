import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import NashEquilibrium from "./pages/NashEquilibrium";
import Backtest from "./pages/Backtest";
import RiskAnalytics from "./pages/RiskAnalytics";
import AlertEngine from "./pages/AlertEngine";

function App() {
  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nash" element={<NashEquilibrium />} />
          <Route path="/backtest" element={<Backtest />} />
          <Route path="/risk" element={<RiskAnalytics />} />
          <Route path="/alerts" element={<AlertEngine />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}

export default App;
