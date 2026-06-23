import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Sliders,
  Bell,
  ChevronLeft,
  ChevronRight,
  Database,
  Target,
  History,
  Shield,
} from "lucide-react";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Target, label: "Nash Equilibrium", path: "/nash" },
  { icon: History, label: "Backtest", path: "/backtest" },
  { icon: Shield, label: "Risk Analytics", path: "/risk" },
  { icon: Bell, label: "Alert Engine", path: "/alerts" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? "68px" : "240px" }}
      transition={{ duration: 0.3, cubicBezier: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col h-screen border-r border-terminal-border bg-terminal-bg/70 backdrop-blur-lg shrink-0 select-none z-40"
    >
      {/* Top Brand Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-terminal-border/30">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 font-display text-base font-extrabold tracking-widest text-fg-primary"
            >
              <Database className="text-brand-nifty w-5 h-5 animate-pulse" />
              <span>GT <span className="text-brand-gold">//</span> MATRIX</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="mx-auto"
            >
              <Database className="text-brand-nifty w-6 h-6 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse Button */}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded bg-white/5 border border-terminal-border text-fg-secondary hover:text-fg-primary hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute -right-3 top-14 p-1 rounded-full bg-terminal-bg border border-terminal-border text-fg-secondary hover:text-fg-primary transition-colors hover:bg-white/5 z-50 shadow-md"
        >
          <ChevronRight size={12} />
        </button>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative",
                  isActive
                    ? "bg-white/5 text-fg-primary font-medium border border-white/10"
                    : "text-fg-secondary hover:text-fg-primary hover:bg-white/5 border border-transparent"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="active-bar"
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-brand-nifty"
                    />
                  )}

                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-brand-nifty" : "text-fg-secondary"
                    )}
                  />

                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-sans font-medium text-xs tracking-wide"
                    >
                      {item.label}
                    </motion.span>
                  )}

                  {collapsed && (
                    <div className="absolute left-14 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 bg-terminal-bg border border-terminal-border text-fg-primary text-xs py-1.5 px-3 rounded shadow-lg whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Engine Status */}
      <div className="p-4 border-t border-terminal-border/30 bg-terminal-bg/30">
        <div className="flex items-center gap-3">
          <div className="relative flex shrink-0">
            <span className="flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-state-buy opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-state-buy"></span>
            </span>
          </div>

          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col min-w-0"
            >
              <span className="font-mono text-[10px] tracking-widest text-state-buy font-bold uppercase leading-none">
                SYS ENGINE ACTIVE
              </span>
              <span className="font-mono text-[9px] text-fg-muted mt-1 leading-none">
                v1.2.4-BETA // NODE_01
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
