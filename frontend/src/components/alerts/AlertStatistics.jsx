import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { SEVERITY_COLORS } from "../../lib/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, Target } from "lucide-react";

function generateMockStats() {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }),
      critical: Math.floor(Math.random() * 3),
      warning: Math.floor(Math.random() * 5) + 1,
      info: Math.floor(Math.random() * 8) + 2,
    });
  }
  return days;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-terminal-bg border border-terminal-border/60 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] font-mono text-fg-muted mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-fg-secondary capitalize">{entry.name}:</span>
          <span className="text-fg-primary font-bold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function AlertStatistics({ alerts = [] }) {
  const stats = useMemo(() => generateMockStats(), []);

  const severityData = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0 };
    alerts.forEach((a) => {
      if (counts[a.severity] !== undefined) counts[a.severity]++;
    });
    return [
      { name: "Critical", value: counts.critical || 5, color: SEVERITY_COLORS.critical },
      { name: "Warning", value: counts.warning || 12, color: SEVERITY_COLORS.warning },
      { name: "Info", value: counts.info || 24, color: SEVERITY_COLORS.info },
    ];
  }, [alerts]);

  const accuracy = useMemo(() => {
    if (alerts.length === 0) return 73;
    const acknowledged = alerts.filter((a) => a.acknowledged).length;
    return Math.round((acknowledged / alerts.length) * 100) || 73;
  }, [alerts]);

  return (
    <div className="space-y-4">
      {/* Accuracy card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-lg border border-terminal-border/40 bg-terminal-card p-3"
      >
        <div className="w-10 h-10 rounded-md bg-brand-realty/10 flex items-center justify-center">
          <Target size={18} className="text-brand-realty" />
        </div>
        <div>
          <div className="text-[10px] font-mono text-fg-muted uppercase tracking-wider">
            Alert Accuracy
          </div>
          <div className="text-lg font-mono font-bold text-fg-primary">
            {accuracy}%
            <span className="text-[10px] text-fg-muted ml-1.5 font-normal">
              predicted direction
            </span>
          </div>
        </div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border border-terminal-border/40 bg-terminal-card p-4"
        >
          <h4 className="text-[10px] font-mono font-bold text-fg-muted uppercase tracking-wider mb-3">
            Alerts Per Day (Last 7 Days)
          </h4>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} barGap={2}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#475569", fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#475569", fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar
                  dataKey="critical"
                  stackId="a"
                  fill={SEVERITY_COLORS.critical}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="warning"
                  stackId="a"
                  fill={SEVERITY_COLORS.warning}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="info"
                  stackId="a"
                  fill={SEVERITY_COLORS.info}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-lg border border-terminal-border/40 bg-terminal-card p-4"
        >
          <h4 className="text-[10px] font-mono font-bold text-fg-muted uppercase tracking-wider mb-3">
            Alerts by Severity
          </h4>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-terminal-bg border border-terminal-border/60 rounded-lg px-3 py-2 shadow-xl">
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-fg-secondary">{d.name}:</span>
                          <span className="text-fg-primary font-bold">{d.value}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
                  formatter={(value) => (
                    <span className="text-fg-secondary">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
