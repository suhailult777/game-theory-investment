import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { Send, CheckCircle, AlertCircle, Wifi, WifiOff } from "lucide-react";

const channels = [
  {
    id: "telegram",
    name: "Telegram",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.504-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    connected: true,
    color: "#0088cc",
    lastSent: "2 min ago",
    todayCount: 12,
    configured: true,
  },
  {
    id: "email",
    name: "Email",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2"/>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
      </svg>
    ),
    connected: true,
    color: "#e2b740",
    lastSent: "15 min ago",
    todayCount: 8,
    configured: true,
  },
];

export default function NotificationChannels() {
  const [testStates, setTestStates] = useState({});

  const handleTest = (channelId) => {
    setTestStates((prev) => ({ ...prev, [channelId]: "sending" }));
    setTimeout(() => {
      setTestStates((prev) => ({ ...prev, [channelId]: "sent" }));
      setTimeout(() => {
        setTestStates((prev) => ({ ...prev, [channelId]: null }));
      }, 2000);
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {channels.map((ch) => {
        const testState = testStates[ch.id];
        return (
          <motion.div
            key={ch.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-lg border bg-terminal-card p-4 space-y-3 transition-all",
              ch.connected
                ? "border-terminal-border/40"
                : "border-state-avoid/20"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ color: ch.color, backgroundColor: `${ch.color}15` }}
                >
                  {ch.icon}
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-fg-primary">
                    {ch.name}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {ch.connected ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-state-buy animate-pulse" />
                        <span className="text-[10px] font-mono text-state-buy">
                          Connected
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-state-avoid" />
                        <span className="text-[10px] font-mono text-state-avoid">
                          Disconnected
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {ch.configured ? (
                <CheckCircle size={14} className="text-state-buy/60" />
              ) : (
                <AlertCircle size={14} className="text-fg-muted" />
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-terminal-bg/60 px-2.5 py-1.5">
                <div className="text-[9px] font-mono text-fg-muted uppercase tracking-wider">
                  Last Sent
                </div>
                <div className="text-[11px] font-mono font-bold text-fg-secondary mt-0.5">
                  {ch.lastSent}
                </div>
              </div>
              <div className="rounded-md bg-terminal-bg/60 px-2.5 py-1.5">
                <div className="text-[9px] font-mono text-fg-muted uppercase tracking-wider">
                  Today
                </div>
                <div className="text-[11px] font-mono font-bold text-fg-secondary mt-0.5">
                  {ch.todayCount} msgs
                </div>
              </div>
            </div>

            {/* Test button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTest(ch.id)}
              disabled={testState === "sending" || !ch.connected}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider transition-all border",
                testState === "sent"
                  ? "border-state-buy/30 bg-state-buy/10 text-state-buy"
                  : testState === "sending"
                  ? "border-brand-nifty/30 bg-brand-nifty/10 text-brand-nifty"
                  : ch.connected
                  ? "border-terminal-border/40 bg-terminal-bg/60 text-fg-muted hover:text-fg-secondary hover:border-terminal-border/60"
                  : "border-terminal-border/20 bg-terminal-bg/30 text-fg-muted/30 cursor-not-allowed"
              )}
            >
              {testState === "sending" ? (
                <>
                  <div className="w-3 h-3 rounded-full border-[1.5px] border-brand-nifty/40 border-t-brand-nifty animate-spin" />
                  Sending...
                </>
              ) : testState === "sent" ? (
                <>
                  <CheckCircle size={12} />
                  Test Sent!
                </>
              ) : (
                <>
                  <Send size={11} />
                  Send Test
                </>
              )}
            </motion.button>
          </motion.div>
        );
      })}
    </div>
  );
}
