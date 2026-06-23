import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PLAYERS = [
  {
    id: "retail",
    label: "Retail Traders",
    color: "#00f2fe",
    glowRgb: "0, 242, 254",
    strategy: "Buy",
    payoff: 12.4,
    position: { x: 120, y: 200 },
  },
  {
    id: "institutional",
    label: "Institutional",
    color: "#e2b740",
    glowRgb: "226, 183, 64",
    strategy: "Accumulate",
    payoff: 18.7,
    position: { x: 420, y: 200 },
  },
  {
    id: "government",
    label: "Government / CB",
    color: "#a78bfa",
    glowRgb: "167, 139, 250",
    strategy: "Hold",
    payoff: 8.2,
    position: { x: 270, y: 60 },
  },
];

const EDGES = [
  { from: "retail", to: "institutional", strength: 0.8, label: "Momentum follow" },
  { from: "retail", to: "government", strength: 0.5, label: "Policy sensitivity" },
  { from: "institutional", to: "government", strength: 0.9, label: "Regulation hedge" },
];

const ORBITING_STRATEGIES = {
  retail: [
    { label: "Buy", color: "#00f5a0", angle: -30 },
    { label: "Hold", color: "#ffd600", angle: 90 },
    { label: "Sell", color: "#ff0055", angle: 210 },
  ],
  institutional: [
    { label: "Accumulate", color: "#00b0ff", angle: -20 },
    { label: "Distribute", color: "#ff0055", angle: 100 },
    { label: "Hedge", color: "#ffd600", angle: 220 },
  ],
  government: [
    { label: "Ease", color: "#00f5a0", angle: 0 },
    { label: "Hold", color: "#ffd600", angle: 120 },
    { label: "Tighten", color: "#ff0055", angle: 240 },
  ],
};

function PlayerNode({ player, isActive, onHover, onLeave }) {
  const orbiting = ORBITING_STRATEGIES[player.id] || [];
  const nodeR = 36;

  return (
    <g
      onMouseEnter={() => onHover(player.id)}
      onMouseLeave={onLeave}
      className="cursor-pointer"
    >
      {/* Pulse ring for dominant strategy */}
      <motion.circle
        cx={player.position.x}
        cy={player.position.y}
        r={nodeR + 12}
        fill="none"
        stroke={player.color}
        strokeWidth={1}
        opacity={0.3}
        animate={{
          r: [nodeR + 8, nodeR + 18, nodeR + 8],
          opacity: [0.15, 0.35, 0.15],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Glow */}
      <circle
        cx={player.position.x}
        cy={player.position.y}
        r={nodeR + 4}
        fill={`${player.color}08`}
        stroke={`${player.color}20`}
        strokeWidth={1}
      />

      {/* Main node */}
      <motion.circle
        cx={player.position.x}
        cy={player.position.y}
        r={nodeR}
        fill="#0a0e17"
        stroke={player.color}
        strokeWidth={isActive ? 2.5 : 1.5}
        animate={{
          cy: [player.position.y - 2, player.position.y + 2, player.position.y - 2],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: `drop-shadow(0 0 8px ${player.color}40)` }}
      />

      {/* Player icon */}
      <text
        x={player.position.x}
        y={player.position.y - 4}
        textAnchor="middle"
        fill={player.color}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fontWeight="700"
      >
        {player.id === "retail" ? "R" : player.id === "institutional" ? "I" : "G"}
      </text>
      <text
        x={player.position.x}
        y={player.position.y + 9}
        textAnchor="middle"
        fill={player.color}
        fontSize="7"
        fontFamily="var(--font-mono)"
        fontWeight="500"
        opacity={0.8}
      >
        {player.strategy.toUpperCase()}
      </text>

      {/* Label below */}
      <text
        x={player.position.x}
        y={player.position.y + nodeR + 16}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="9"
        fontFamily="var(--font-sans)"
        fontWeight="600"
      >
        {player.label}
      </text>

      {/* Orbiting strategy dots */}
      {orbiting.map((s, i) => {
        const orbitR = nodeR + 28;
        const rad = (s.angle * Math.PI) / 180;
        const ox = player.position.x + Math.cos(rad) * orbitR;
        const oy = player.position.y + Math.sin(rad) * orbitR;
        const isDominant = s.label === player.strategy;
        return (
          <g key={i}>
            <motion.circle
              cx={ox}
              cy={oy}
              r={isDominant ? 5 : 3.5}
              fill={s.color}
              opacity={isDominant ? 1 : 0.45}
              animate={{
                cy: [oy - 1.5, oy + 1.5, oy - 1.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.4,
              }}
              style={
                isDominant
                  ? { filter: `drop-shadow(0 0 5px ${s.color}80)` }
                  : undefined
              }
            />
            {isDominant && (
              <text
                x={ox}
                y={oy - 9}
                textAnchor="middle"
                fill={s.color}
                fontSize="7"
                fontFamily="var(--font-mono)"
                fontWeight="700"
              >
                {s.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export default function NetworkVisualization({ players = PLAYERS, edges = EDGES }) {
  const [hoveredPlayer, setHoveredPlayer] = useState(null);

  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  return (
    <div className="relative w-full h-full min-h-[320px]">
      <svg
        viewBox="0 0 540 320"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {players.map((p) => (
            <radialGradient key={p.id} id={`glow-${p.id}`}>
              <stop offset="0%" stopColor={p.color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={p.color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = playerMap[edge.from];
          const to = playerMap[edge.to];
          if (!from || !to) return null;
          const midX = (from.position.x + to.position.x) / 2;
          const midY = (from.position.y + to.position.y) / 2 - 15;
          const thickness = 1 + edge.strength * 3;
          const isHighlighted =
            hoveredPlayer === edge.from || hoveredPlayer === edge.to;

          return (
            <g key={i}>
              <motion.line
                x1={from.position.x}
                y1={from.position.y}
                x2={to.position.x}
                y2={to.position.y}
                stroke={isHighlighted ? "#a78bfa" : "rgba(255,255,255,0.08)"}
                strokeWidth={thickness}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.3 + i * 0.15 }}
              />
              {isHighlighted && (
                <motion.text
                  x={midX}
                  y={midY}
                  textAnchor="middle"
                  fill="#a78bfa"
                  fontSize="8"
                  fontFamily="var(--font-mono)"
                  fontWeight="600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {edge.label}
                </motion.text>
              )}
              {/* Animated dot traveling along edge */}
              <motion.circle
                r={2}
                fill="#a78bfa"
                opacity={0.6}
                animate={{
                  cx: [from.position.x, to.position.x],
                  cy: [from.position.y, to.position.y],
                }}
                transition={{
                  duration: 3 + i,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.7,
                }}
              />
            </g>
          );
        })}

        {/* Player nodes */}
        {PLAYERS.map((player) => (
          <PlayerNode
            key={player.id}
            player={player}
            isActive={hoveredPlayer === player.id}
            onHover={setHoveredPlayer}
            onLeave={() => setHoveredPlayer(null)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredPlayer && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-3 left-3 right-3 bg-[#0a0e17]/95 border border-terminal-border rounded-lg px-4 py-3 backdrop-blur-md"
          >
            {(() => {
              const p = playerMap[hoveredPlayer];
              return (
                <div className="flex items-center justify-between">
                  <div>
                    <span
                      className="font-mono text-xs font-bold"
                      style={{ color: p.color }}
                    >
                      {p.label}
                    </span>
                    <span className="text-fg-muted text-[10px] font-mono ml-2">
                      STRATEGY: {p.strategy.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-fg-primary tabular-nums">
                    +{p.payoff.toFixed(1)}%
                  </span>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
