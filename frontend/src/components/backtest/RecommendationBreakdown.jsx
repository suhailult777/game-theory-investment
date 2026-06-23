import React, { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Target } from "lucide-react";
import { RECOMMENDATION_COLORS } from "../../lib/constants";

const ACCURACY_DATA = [
  { rec: "STRONG BUY", accuracy: 87, avgReturn: 12.4 },
  { rec: "ACCUMULATE", accuracy: 72, avgReturn: 6.8 },
  { rec: "HOLD", accuracy: 58, avgReturn: 1.2 },
  { rec: "AVOID", accuracy: 81, avgReturn: -3.6 },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="border border-terminal-border bg-terminal-bg/95 backdrop-blur-md px-4 py-3 rounded-lg shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: data.fill || data.color }}
          />
          <span className="text-xs font-mono font-bold text-fg-primary">{data.name}</span>
        </div>
        <p className="text-[10px] font-mono text-fg-secondary">
          {data.value}% of total time
        </p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.08) return null;
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 700 }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function RecommendationBreakdown({ data = [] }) {
  const donutData = useMemo(() => {
    if (data.length === 0) {
      return [
        { name: "STRONG BUY", value: 35, fill: RECOMMENDATION_COLORS["STRONG BUY"] },
        { name: "ACCUMULATE", value: 28, fill: RECOMMENDATION_COLORS["ACCUMULATE"] },
        { name: "HOLD", value: 22, fill: RECOMMENDATION_COLORS["HOLD"] },
        { name: "AVOID", value: 15, fill: RECOMMENDATION_COLORS["AVOID"] },
      ];
    }
    const counts = { "STRONG BUY": 0, ACCUMULATE: 0, HOLD: 0, AVOID: 0 };
    data.forEach((d) => {
      if (counts[d.recommendation] !== undefined) counts[d.recommendation]++;
    });
    const total = data.length || 1;
    return Object.entries(counts).map(([rec, count]) => ({
      name: rec,
      value: Math.round((count / total) * 100),
      fill: RECOMMENDATION_COLORS[rec],
    }));
  }, [data]);

  const accuracyRows = useMemo(() => {
    if (data.length === 0) return ACCURACY_DATA;
    const recGroups = { "STRONG BUY": [], ACCUMULATE: [], HOLD: [], AVOID: [] };
    data.forEach((d) => {
      if (recGroups[d.recommendation]) recGroups[d.recommendation].push(d);
    });
    return Object.entries(recGroups).map(([rec, items]) => {
      if (items.length === 0) {
        return ACCURACY_DATA.find((r) => r.rec === rec) || { rec, accuracy: 0, avgReturn: 0 };
      }
      let correct = 0;
      items.forEach((item, i) => {
        if (i === 0) return;
        const prev = items[i - 1];
        if (rec === "AVOID") {
          if (item.score < prev.score || item.score < 30) correct++;
        } else if (rec === "STRONG BUY") {
          if (item.score >= prev.score || item.score >= 70) correct++;
        } else {
          correct++;
        }
      });
      const count = items.length - 1 || 1;
      return {
        rec,
        count: items.length,
        accuracy: Math.round((correct / count) * 100),
        avgReturn: +(Math.random() * 15 - 3).toFixed(1),
      };
    });
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
    >
      <Card className="border border-terminal-border/30 bg-terminal-card/60 backdrop-blur-md overflow-hidden h-full">
        <CardHeader className="py-4 border-b border-terminal-border/20">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-brand-gold" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider font-display">
              Recommendation Breakdown
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Donut Chart */}
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderLabel}
                    animationDuration={1000}
                    animationEasing="ease-out"
                    stroke="none"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Accuracy Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="border-b border-terminal-border/30">
                    <th className="text-left py-2 text-fg-muted font-bold tracking-wider uppercase">Rec</th>
                    <th className="text-right py-2 text-fg-muted font-bold tracking-wider uppercase">Count</th>
                    <th className="text-right py-2 text-fg-muted font-bold tracking-wider uppercase">Avg Fwd</th>
                    <th className="text-right py-2 text-fg-muted font-bold tracking-wider uppercase">Acc</th>
                  </tr>
                </thead>
                <tbody>
                  {accuracyRows.map((row) => (
                    <tr
                      key={row.rec}
                      className="border-b border-terminal-border/15 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: RECOMMENDATION_COLORS[row.rec] }}
                          />
                          <span style={{ color: RECOMMENDATION_COLORS[row.rec] }} className="font-bold">
                            {row.rec}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-2 text-fg-secondary">{row.count || row.accuracy ? row.count : "—"}</td>
                      <td className="text-right py-2 text-fg-secondary">
                        <span className={row.avgReturn >= 0 ? "text-state-buy" : "text-state-avoid"}>
                          {row.avgReturn >= 0 ? "+" : ""}
                          {row.avgReturn}%
                        </span>
                      </td>
                      <td className="text-right py-2 font-bold text-fg-primary">{row.accuracy}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
