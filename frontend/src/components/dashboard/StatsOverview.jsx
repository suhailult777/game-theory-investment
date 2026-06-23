import React from "react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { ShieldCheck, Compass, RotateCw } from "lucide-react";

export default function StatsOverview({ scores = {}, marketData = {}, allocations = {} }) {
  // Compute overall tactical phase based on asset weights
  const stocksWeight = allocations.nifty || 0;
  const goldWeight = allocations.gold || 0;
  const cashWeight = 100 - (stocksWeight + goldWeight + (allocations.silver || 0) + (allocations.real_estate || 0));

  let currentPhase = "Balanced Portfolio";
  let phaseColor = "accumulate";
  let phaseDesc = "Allocations distributed evenly across growth and hedge positions";

  if (stocksWeight >= 50) {
    currentPhase = "Risk-On Accel";
    phaseColor = "strong-buy";
    phaseDesc = "High equity scoring overrides cash reserves. Focus on market momentum.";
  } else if (goldWeight >= 40) {
    currentPhase = "Risk-Off Hedge";
    phaseColor = "hold";
    phaseDesc = "Commodities accumulate premium on inflation metrics. Hedge-first allocation.";
  } else if (cashWeight >= 40) {
    currentPhase = "Capital Preservation";
    phaseColor = "avoid";
    phaseDesc = "Extreme market warnings triggered. Heavy allocation held in liquid reserves.";
  }

  // Calculate average confidence score (skip metadata keys like _staleness)
  const assets = Object.keys(scores).filter(key => !key.startsWith('_'));
  const avgConfidence = assets.length 
    ? Math.round(assets.reduce((sum, key) => sum + (scores[key]?.score || 0), 0) / assets.length)
    : 50;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Dynamic Portfolio Mode Card */}
      <Card className="p-4 border border-terminal-border/30 bg-terminal-card/80 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[92px]">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <span className="font-mono text-[9px] text-fg-secondary/80 uppercase tracking-widest block">
              Optimal Strategy Phase
            </span>
            <Badge variant={phaseColor} className="mt-1 block w-fit text-[10px] font-black py-0.5 px-2">
              {currentPhase}
            </Badge>
          </div>
          <Compass size={16} className="text-brand-nifty opacity-60" />
        </div>
        <p className="font-sans text-[10px] text-fg-muted mt-2 leading-relaxed">
          {phaseDesc}
        </p>
      </Card>

      {/* Decision Engine Confidence score */}
      <Card className="p-4 border border-terminal-border/30 bg-terminal-card/80 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[92px]">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <span className="font-mono text-[9px] text-fg-secondary/80 uppercase tracking-widest block">
              Mean Matrix Confidence
            </span>
            <span className="font-display font-black text-2xl tracking-tight text-fg-primary block">
              {avgConfidence}%
            </span>
          </div>
          <ShieldCheck size={16} className="text-brand-realty opacity-60" />
        </div>
        <p className="font-sans text-[10px] text-fg-muted mt-2 leading-relaxed">
          Aggregate signal confidence based on macro factors, exchange rates, and news sentiment.
        </p>
      </Card>

      {/* Active System Uptime / Check */}
      <Card className="p-4 border border-terminal-border/30 bg-terminal-card/80 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[92px]">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <span className="font-mono text-[9px] text-fg-secondary/80 uppercase tracking-widest block">
              Matrix Sync Interval
            </span>
            <span className="font-display font-black text-2xl tracking-tight text-fg-primary block">
              30 MINS
            </span>
          </div>
          <RotateCw size={16} className="text-brand-gold opacity-60 animate-spin-slow" />
        </div>
        <p className="font-sans text-[10px] text-fg-muted mt-2 leading-relaxed">
          The scoring model queries TimescaleDB hypertable feeds periodically to refresh matrix states.
        </p>
      </Card>
    </div>
  );
}
