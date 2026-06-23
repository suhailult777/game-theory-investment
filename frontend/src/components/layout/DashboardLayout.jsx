import React from "react";
import Sidebar from "./Sidebar";
import { Bell, ShieldAlert, Cpu, Layers } from "lucide-react";
import { Button } from "../ui/button";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-terminal-bg font-sans antialiased text-fg-primary">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Workspace */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden relative">
        {/* Top Operational Status Header */}
        <header className="flex items-center justify-between h-16 px-6 border-b border-terminal-border/30 bg-terminal-bg/40 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-6">
            {/* System Status Indicators */}
            <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-fg-secondary">
              <div className="flex items-center gap-1.5 border border-terminal-border bg-white/2 px-2.5 py-1 rounded">
                <Cpu size={12} className="text-brand-nifty" />
                <span>DB Latency: <strong className="text-fg-primary">12ms</strong></span>
              </div>
              <div className="flex items-center gap-1.5 border border-terminal-border bg-white/2 px-2.5 py-1 rounded">
                <Layers size={12} className="text-brand-gold" />
                <span>TimescaleDB: <strong className="text-fg-primary">Synced</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative text-fg-secondary hover:text-fg-primary">
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-state-avoid shadow-[0_0_8px_#ff0055]"></span>
            </Button>
            
            <div className="h-6 w-[1px] bg-terminal-border/40"></div>

            {/* Profile badge (mock user) */}
            <div className="flex items-center gap-2 border border-terminal-border bg-white/5 pl-2 pr-3 py-1 rounded-lg">
              <div className="w-5 h-5 rounded bg-brand-nifty/20 border border-brand-nifty/30 flex items-center justify-center text-[10px] font-bold text-brand-nifty">
                Q
              </div>
              <span className="text-xs font-mono font-semibold text-fg-primary">QUANTS-USER</span>
            </div>
          </div>
        </header>

        {/* Scrollable Main Board */}
        <main className="flex-1 overflow-y-auto px-6 py-5 lg:px-10 lg:py-7 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
