import React from "react";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Radio, ChevronRight, Newspaper } from "lucide-react";
import { cn } from "../../lib/utils";

const ASSET_THEMES = {
  gold: { color: "#e2b740", label: "Gold" },
  silver: { color: "#94a3b8", label: "Silver" },
  nifty: { color: "#00f2fe", label: "Nifty 50" },
  real_estate: { color: "#00f5a0", label: "Realty" },
};

function formatRelativeTime(timestamp) {
  try {
    const parsed = new Date(timestamp);
    const diffMs = new Date() - parsed;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
}

export default function NewsFeed({ news = [], loading = false }) {
  return (
    <Card className="flex flex-col h-full border border-terminal-border/30 bg-terminal-card/50 backdrop-blur-md overflow-hidden relative">
      <CardHeader className="py-4 border-b border-terminal-border/20 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={15} className="text-state-avoid animate-pulse" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider font-display">
              News Sentiment Stream
            </CardTitle>
          </div>
          <Badge className="font-mono text-[9px] bg-white/5 border-terminal-border text-fg-secondary">
            FinBERT Active
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-3 border border-terminal-border/10 bg-white/2 rounded-lg animate-pulse space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-white/10 rounded"></div>
                <div className="h-3 w-10 bg-white/10 rounded"></div>
              </div>
              <div className="h-4 w-full bg-white/10 rounded"></div>
              <div className="h-3 w-24 bg-white/10 rounded"></div>
            </div>
          ))
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center text-fg-muted space-y-2">
            <Newspaper size={24} className="stroke-[1.5]" />
            <p className="font-sans text-xs">
              No tactical news signals logged in database.
            </p>
          </div>
        ) : (
          news.map((item, idx) => {
            const assetTheme = ASSET_THEMES[item.asset] || { color: "#fff", label: item.asset };
            const sentiment = item.sentiment;
            const isPos = sentiment > 0.15;
            const isNeg = sentiment < -0.15;
            
            return (
              <div
                key={idx}
                className="group relative border border-terminal-border/20 bg-terminal-bg/50 px-3.5 py-3 rounded-lg overflow-hidden transition-all duration-200 hover:border-terminal-border-hover/60 hover:bg-terminal-card-hover/20 hover:translate-x-0.5"
              >
                {/* Left sentiment border glow */}
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-200",
                    isPos ? "bg-state-buy shadow-[0_0_8px_rgba(0,245,160,0.6)]" : 
                    isNeg ? "bg-state-avoid shadow-[0_0_8px_rgba(255,0,85,0.6)]" : 
                    "bg-brand-silver/30"
                  )}
                />

                <div className="flex items-center justify-between mb-1.5 pl-1.5">
                  <span
                    className="font-mono text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: assetTheme.color }}
                  >
                    {assetTheme.label}
                  </span>
                  
                  <span className="font-mono text-[9px] text-fg-muted">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>

                <p className="font-sans text-xs text-fg-primary/90 font-medium leading-relaxed pl-1.5 pr-2 mb-2 line-clamp-2 group-hover:text-white transition-colors">
                  {item.headline}
                </p>

                <div className="flex items-center justify-between border-t border-terminal-border/10 pt-2 pl-1.5">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[8px] text-fg-muted uppercase tracking-widest">
                      Sentiment:
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[9px] font-black",
                        isPos ? "text-state-buy" : isNeg ? "text-state-avoid" : "text-brand-silver"
                      )}
                    >
                      {isPos ? "POS" : isNeg ? "NEG" : "NEU"} ({sentiment.toFixed(2)})
                    </span>
                  </div>

                  <ChevronRight size={10} className="text-fg-muted group-hover:text-fg-primary translate-x-0 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
