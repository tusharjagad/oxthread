'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

const BLUE = '#246BFF'
const CYAN = '#11D8C3'

const stages = [
  { x: 42, label: 'Git Commit', icon: 'git' },
  { x: 118, label: 'CI Build', icon: 'ci' },
  { x: 192, label: 'Docker', icon: 'docker' },
  { x: 268, label: 'K8s Deploy', icon: 'k8s' },
  { x: 342, label: 'Cloud', icon: 'cloud' },
  { x: 418, label: 'Monitor', icon: 'monitor' },
]

function StageIcon({ name, x, y }: { name: string; x: number; y: number }) {
  const icon = (
    <g transform={`translate(${x}, ${y})`}>
      {name === 'git' && (
        <>
          <circle cx={8} cy={8} r={3.5} stroke={BLUE} strokeWidth={1} fill="none" />
          <path d="M8 4v4l3 2" stroke={BLUE} strokeWidth={1} fill="none" />
        </>
      )}
      {name === 'ci' && (
        <path d="M5 4l7 4-7 4z" fill="none" stroke={CYAN} strokeWidth={1.2} />
      )}
      {name === 'docker' && (
        <>
          <rect x={3} y={7} width={10} height={6} rx={1.5} stroke={BLUE} strokeWidth={1} fill="none" />
          <rect x={5} y={5} width={4} height={3} rx={1} stroke={CYAN} strokeWidth={0.8} fill="none" />
        </>
      )}
      {name === 'k8s' && (
        <>
          <circle cx={8} cy={8} r={5} stroke={CYAN} strokeWidth={1} fill="none" />
          <line x1={8} y1={3} x2={8} y2={13} stroke={CYAN} strokeWidth={0.8} opacity={0.6} />
          <line x1={3} y1={8} x2={13} y2={8} stroke={CYAN} strokeWidth={0.8} opacity={0.6} />
          <circle cx={8} cy={8} r={1.5} fill={CYAN} opacity={0.3} />
        </>
      )}
      {name === 'cloud' && (
        <path d="M5 11c-2 0-3-1.5-2-3s1.5-2 3-2c0-2 2-3 4-2s2 2 2 3c1 0 2 1 2 2s-1 2-2 2z" stroke={BLUE} strokeWidth={1} fill="none" />
      )}
      {name === 'monitor' && (
        <>
          <rect x={2} y={5} width={12} height={8} rx={1} stroke={CYAN} strokeWidth={1} fill="none" />
          <path d="M2 8h12" stroke={CYAN} strokeWidth={0.8} opacity={0.4} />
          <path d="M6 13l2 2 2-2" stroke={CYAN} strokeWidth={0.8} fill="none" />
        </>
      )}
    </g>
  )
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.15 + stages.findIndex(s => s.x === x) * 0.08 }}
    >
      {icon}
    </motion.g>
  )
}

function PipelineBox({ x, index }: { x: number; index: number }) {
  return (
    <motion.g
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
    >
      <rect x={x - 26} y={139} width={52} height={42} rx={8} fill="rgba(15, 23, 40, 0.4)" stroke={BLUE} strokeWidth={0.8} strokeOpacity={0.25} />
      <rect x={x - 22} y={143} width={44} height={34} rx={5} fill="rgba(36,107,255,0.04)" />
    </motion.g>
  )
}

function Arrow({ x1, x2, y, index }: { x1: number; x2: number; y: number; index: number }) {
  const midX = (x1 + x2) / 2
  return (
    <g>
      <motion.line
        x1={x1 + 28} y1={y} x2={x2 - 28} y2={y} stroke={BLUE} strokeWidth={0.8}
        animate={{ opacity: [0.12, 0.25, 0.12] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
      />
      <motion.polyline
        points={`${(x1 + x2) / 2 - 4},${y - 4} ${(x1 + x2) / 2 + 2},${y} ${(x1 + x2) / 2 - 4},${y + 4}`}
        fill="none"
        stroke={CYAN}
        strokeWidth={1}
        opacity={0.5}
        animate={{ x: [0, 3, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.25 }}
      />
    </g>
  )
}

function PulseDot() {
  const cxValues = stages.map(s => s.x)
  return (
    <>
      {/* Pulse glow trail */}
      <motion.circle
        r={10}
        fill={CYAN}
        opacity={0.15}
        cx={cxValues[0]}
        cy={160}
        animate={{
          cx: [...cxValues, ...cxValues.slice().reverse().slice(1, -1)],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.circle
        r={4}
        fill={CYAN}
        opacity={0.9}
        cx={cxValues[0]}
        cy={160}
        animate={{
          cx: [...cxValues, ...cxValues.slice().reverse().slice(1, -1)],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </>
  )
}

function PipelineGlow() {
  return (
    <>
      {stages.map((s, i) => (
        <motion.circle
          key={`glow-${i}`}
          cx={s.x}
          cy={160}
          r={12}
          fill={BLUE}
          opacity={0.03}
          animate={{ r: [12, 20, 12], opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        />
      ))}
    </>
  )
}

function PipelineTitle() {
  return (
    <motion.text
      x={260}
      y={78}
      textAnchor="middle"
      fill="rgba(255,255,255,0.12)"
      fontSize={10}
      fontFamily="ui-monospace, SFMono-Regular, monospace"
      letterSpacing={4}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.5 }}
    >
      CI/CD PIPELINE
    </motion.text>
  )
}

function GridBackground() {
  return (
    <g opacity={0.04}>
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={`h${i}`} x1={10} y1={i * 27} x2={510} y2={i * 27} stroke={BLUE} strokeWidth={0.5} />
      ))}
      {Array.from({ length: 20 }).map((_, i) => (
        <line key={`v${i}`} x1={10 + i * 26} y1={0} x2={10 + i * 26} y2={320} stroke={BLUE} strokeWidth={0.5} />
      ))}
    </g>
  )
}

function ConnectionNodes() {
  return (
    <>
      {stages.map((s, i) => (
        <motion.circle
          key={`node-${i}`}
          cx={s.x}
          cy={160}
          r={2}
          fill={BLUE}
          opacity={0.5}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        />
      ))}
    </>
  )
}

export default function LoginIllustration() {
  const randomSeed = useMemo(() => Math.random(), [])
  return (
    <svg viewBox="0 0 520 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" style={{ maxWidth: 520 }}>
      <GridBackground />

      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <PipelineTitle />

        {/* Pipeline boxes */}
        {stages.map((s, i) => (
          <PipelineBox key={`box-${i}`} x={s.x} index={i} />
        ))}

        {/* Icons */}
        {stages.map((s, i) => (
          <StageIcon key={`icon-${i}`} name={s.icon} x={s.x - 8} y={148} />
        ))}

        {/* Labels */}
        {stages.map((s, i) => (
          <motion.text
            key={`label-${i}`}
            x={s.x}
            y={195}
            textAnchor="middle"
            fill="rgba(255,255,255,0.28)"
            fontSize={8.5}
            fontFamily="system-ui, sans-serif"
            fontWeight={500}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
          >
            {s.label}
          </motion.text>
        ))}

        {/* Arrows between stages */}
        {stages.slice(0, -1).map((s, i) => (
          <Arrow key={`arrow-${i}`} x1={s.x} x2={stages[i + 1].x} y={160} index={i} />
        ))}

        {/* Pipeline connection line */}
        <line x1={stages[0].x + 28} y1={160} x2={stages[stages.length - 1].x - 28} y2={160} stroke={BLUE} strokeWidth={0.6} opacity={0.12} />

        {/* Background glow on each stage */}
        <PipelineGlow />

        {/* Connection nodes */}
        <ConnectionNodes />

        {/* Animated pulse traveling through pipeline */}
        <PulseDot />
      </motion.g>

      {/* Deployment destination tag */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <rect x={384} y={76} width={116} height={28} rx={8} fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.2)" strokeWidth={0.8} />
        <motion.circle cx={398} cy={90} r={3} fill="#10B981" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
        <text x={410} y={94} fill="#10B981" fontSize={9} fontFamily="system-ui, sans-serif" fontWeight={600} opacity={0.85}>
          Production
        </text>
        <text x={482} y={94} textAnchor="end" fill="rgba(255,255,255,0.22)" fontSize={7.5} fontFamily="system-ui, sans-serif" fontWeight={500}>
          Healthy
        </text>
      </motion.g>
    </svg>
  )
}
