'use client'

import { motion } from 'framer-motion'

const BLUE = '#246BFF'
const CYAN = '#11D8C3'

function Node({ cx, cy, r = 2.5, color = BLUE, delay = 0 }: { cx: number; cy: number; r?: number; color?: string; delay?: number }) {
  return (
    <motion.circle
      cx={cx} cy={cy} r={r} fill={color} opacity={0.7}
      animate={{ opacity: [0.4, 0.9, 0.4], r: [r, r * 1.3, r] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}

function Connection({ x1, y1, x2, y2, color = BLUE, dash = false }: { x1: number; y1: number; x2: number; y2: number; color?: string; dash?: boolean }) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color} strokeWidth={1.2} opacity={0.3}
      strokeDasharray={dash ? '4 4' : undefined}
    />
  )
}

function CICDBox({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <motion.g
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <rect x={x} y={y} width={28} height={28} rx={5} fill={`rgba(36,107,255,0.08)`} stroke={BLUE} strokeWidth={1} />
      <rect x={x + 6} y={y + 6} width={16} height={6} rx={1.5} fill={BLUE} opacity={0.2} />
      <rect x={x + 6} y={y + 15} width={10} height={4} rx={1} fill={CYAN} opacity={0.25} />
    </motion.g>
  )
}

function KubeIcon({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <circle cx={x + 14} cy={y + 14} r={12} stroke={CYAN} strokeWidth={1.2} fill="rgba(17,216,195,0.05)" />
      <line x1={x + 14} y1={y + 6} x2={x + 14} y2={y + 22} stroke={CYAN} strokeWidth={0.8} opacity={0.5} />
      <line x1={x + 6} y1={y + 14} x2={x + 22} y2={y + 14} stroke={CYAN} strokeWidth={0.8} opacity={0.5} />
      <circle cx={x + 14} cy={y + 14} r={3} stroke={CYAN} strokeWidth={0.8} fill="rgba(17,216,195,0.15)" />
    </motion.g>
  )
}

function DockerIcon({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <rect x={x} y={y + 12} width={40} height={16} rx={3} stroke={BLUE} strokeWidth={1} fill="rgba(36,107,255,0.05)" />
      <rect x={x + 4} y={y + 15} width={5} height={4} rx={1} fill={BLUE} opacity={0.4} />
      <rect x={x + 12} y={y + 15} width={5} height={4} rx={1} fill={BLUE} opacity={0.4} />
      <rect x={x + 20} y={y + 15} width={5} height={4} rx={1} fill={BLUE} opacity={0.4} />
      <rect x={x + 28} y={y + 15} width={5} height={4} rx={1} fill={BLUE} opacity={0.4} />
      <rect x={x + 8} y={y + 6} width={6} height={6} rx={1.5} stroke={CYAN} strokeWidth={0.8} fill="rgba(17,216,195,0.1)" />
    </motion.g>
  )
}

function MonitorIcon({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <path d={`M${x} ${y + 8} L${x + 24} ${y + 8} L${x + 24} ${y + 26} L${x} ${y + 26} Z`} stroke={CYAN} strokeWidth={1} fill="rgba(17,216,195,0.04)" />
      <line x1={x + 4} y1={y + 12} x2={x + 20} y2={y + 12} stroke={CYAN} strokeWidth={0.8} opacity={0.4} />
      <line x1={x + 4} y1={y + 16} x2={x + 16} y2={y + 16} stroke={CYAN} strokeWidth={0.8} opacity={0.4} />
      <line x1={x + 4} y1={y + 20} x2={x + 12} y2={y + 20} stroke={CYAN} strokeWidth={0.8} opacity={0.4} />
      <line x1={x + 8} y1={y + 26} x2={x + 16} y2={y + 26} stroke={CYAN} strokeWidth={0.8} opacity={0.4} />
      <line x1={x + 12} y1={y + 26} x2={x + 12} y2={y + 30} stroke={CYAN} strokeWidth={0.8} opacity={0.4} />
    </motion.g>
  )
}

function ShieldIcon({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <path d={`M${x + 12} ${y} L${x + 24} ${y + 6} L${x + 24} ${y + 16} Q${x + 12} ${y + 24} ${x} ${y + 16} L${x} ${y + 6} Z`} stroke={BLUE} strokeWidth={1.2} fill="rgba(36,107,255,0.06)" />
      <line x1={x + 8} y1={y + 9} x2={x + 12} y2={y + 13} stroke={BLUE} strokeWidth={1.5} />
      <line x1={x + 12} y1={y + 13} x2={x + 18} y2={y + 7} stroke={BLUE} strokeWidth={1.5} />
    </motion.g>
  )
}

function AIIcon({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <circle cx={x + 10} cy={y + 10} r={10} stroke={CYAN} strokeWidth={1} fill="rgba(17,216,195,0.04)" />
      <circle cx={x + 10} cy={y + 10} r={3} fill={CYAN} opacity={0.4} />
      <line x1={x + 10} y1={y + 3} x2={x + 10} y2={y + 5} stroke={CYAN} strokeWidth={0.8} opacity={0.5} />
      <line x1={x + 10} y1={y + 15} x2={x + 10} y2={y + 17} stroke={CYAN} strokeWidth={0.8} opacity={0.5} />
      <line x1={x + 3} y1={y + 10} x2={x + 5} y2={y + 10} stroke={CYAN} strokeWidth={0.8} opacity={0.5} />
      <line x1={x + 15} y1={y + 10} x2={x + 17} y2={y + 10} stroke={CYAN} strokeWidth={0.8} opacity={0.5} />
      <line x1={x + 5} y1={y + 5} x2={x + 7} y2={y + 7} stroke={CYAN} strokeWidth={0.8} opacity={0.4} />
      <line x1={x + 13} y1={y + 13} x2={x + 15} y2={y + 15} stroke={CYAN} strokeWidth={0.8} opacity={0.4} />
    </motion.g>
  )
}

export default function LoginIllustration() {
  return (
    <svg viewBox="0 0 520 380" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" style={{ maxWidth: 520 }}>
      {/* Subtle grid */}
      <g opacity={0.06}>
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`h${i}`} x1={20} y1={20 + i * 38} x2={500} y2={20 + i * 38} stroke={BLUE} strokeWidth={0.5} />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`v${i}`} x1={20 + i * 44} y1={20} x2={20 + i * 44} y2={362} stroke={BLUE} strokeWidth={0.5} />
        ))}
      </g>

      {/* Central connected cluster */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {/* Connection web */}
        <Connection x1={220} y1={160} x2={300} y2={120} color={BLUE} />
        <Connection x1={220} y1={160} x2={160} y2={240} color={CYAN} />
        <Connection x1={220} y1={160} x2={340} y2={220} color={BLUE} />
        <Connection x1={300} y1={120} x2={400} y2={170} color={CYAN} dash />
        <Connection x1={160} y1={240} x2={340} y2={220} color={BLUE} dash />
        <Connection x1={300} y1={120} x2={340} y2={220} color={CYAN} />
        <Connection x1={120} y1={170} x2={220} y2={160} color={BLUE} dash />
        <Connection x1={120} y1={170} x2={160} y2={240} color={CYAN} />
        <Connection x1={400} y1={170} x2={460} y2={140} color={BLUE} />
        <Connection x1={340} y1={220} x2={400} y2={170} color={CYAN} />

        {/* Infrastructure nodes */}
        <CICDBox x={204} y={144} delay={0.3} />
        <CICDBox x={284} y={104} delay={0.35} />
        <CICDBox x={324} y={204} delay={0.45} />
        <MonitorIcon x={388} y={158} delay={0.5} />
        <ShieldIcon x={106} y={156} delay={0.55} />
        <AIIcon x={444} y={126} delay={0.6} />
        <DockerIcon x={132} y={208} delay={0.65} />

        {/* Connection nodes */}
        <Node cx={220} cy={160} color={BLUE} delay={0} />
        <Node cx={300} cy={120} color={CYAN} delay={0.3} />
        <Node cx={160} cy={240} color={BLUE} delay={0.6} />
        <Node cx={340} cy={220} color={CYAN} delay={0.9} />
        <Node cx={400} cy={170} color={BLUE} delay={1.2} />
        <Node cx={120} cy={170} color={CYAN} delay={1.5} />
        <Node cx={460} cy={140} color={BLUE} delay={1.8} />
      </motion.g>

      {/* Pipeline flow (bottom) */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.0 }}
      >
        {/* Pipeline boxes */}
        <rect x={60} y={310} width={32} height={24} rx={4} fill="rgba(36,107,255,0.1)" stroke={BLUE} strokeWidth={1} />
        <rect x={60} y={315} width={24} height={4} rx={1} fill={BLUE} opacity={0.25} />
        <rect x={60} y={322} width={16} height={3} rx={1} fill={BLUE} opacity={0.15} />

        <rect x={120} y={310} width={32} height={24} rx={4} fill="rgba(36,107,255,0.1)" stroke={BLUE} strokeWidth={1} />
        <rect x={120} y={315} width={24} height={4} rx={1} fill={BLUE} opacity={0.25} />
        <rect x={120} y={322} width={16} height={3} rx={1} fill={BLUE} opacity={0.15} />

        <rect x={180} y={310} width={32} height={24} rx={4} fill="rgba(36,107,255,0.1)" stroke={BLUE} strokeWidth={1} />
        <rect x={180} y={315} width={24} height={4} rx={1} fill={BLUE} opacity={0.25} />
        <rect x={180} y={322} width={16} height={3} rx={1} fill={BLUE} opacity={0.15} />

        <rect x={240} y={310} width={32} height={24} rx={4} fill="rgba(17,216,195,0.08)" stroke={CYAN} strokeWidth={1} />
        <rect x={240} y={315} width={24} height={4} rx={1} fill={CYAN} opacity={0.25} />
        <rect x={240} y={322} width={16} height={3} rx={1} fill={CYAN} opacity={0.15} />

        {/* Arrows */}
        <motion.g
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <line x1={96} y1={322} x2={116} y2={322} stroke={BLUE} strokeWidth={1} opacity={0.5} />
          <polyline points="112,318 118,322 112,326" fill="none" stroke={BLUE} strokeWidth={1} opacity={0.5} />
        </motion.g>
        <motion.g
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        >
          <line x1={156} y1={322} x2={176} y2={322} stroke={BLUE} strokeWidth={1} opacity={0.5} />
          <polyline points="172,318 178,322 172,326" fill="none" stroke={BLUE} strokeWidth={1} opacity={0.5} />
        </motion.g>
        <motion.g
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        >
          <line x1={216} y1={322} x2={236} y2={322} stroke={BLUE} strokeWidth={1} opacity={0.5} />
          <polyline points="232,318 238,322 232,326" fill="none" stroke={BLUE} strokeWidth={1} opacity={0.5} />
        </motion.g>

        {/* Deploy arrow after pipeline */}
        <motion.g
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 1.0 }}
        >
          <line x1={276} y1={322} x2={310} y2={322} stroke={CYAN} strokeWidth={1.2} opacity={0.6} />
          <polyline points="306,318 312,322 306,326" fill="none" stroke={CYAN} strokeWidth={1.2} opacity={0.6} />
        </motion.g>

        {/* Cloud destination */}
        <path d="M330 308 C330 300 340 296 352 296 C364 296 374 300 374 308 C380 308 386 312 386 318 C386 326 380 330 372 330 L340 330 C332 330 326 324 326 318 C326 312 330 308 330 308Z" fill="rgba(36,107,255,0.06)" stroke={BLUE} strokeWidth={1} />
        <circle cx={350} cy={313} r={2.5} fill={BLUE} opacity={0.3} />
        <circle cx={360} cy={313} r={2.5} fill={CYAN} opacity={0.3} />
        <circle cx={355} cy={320} r={2.5} fill={BLUE} opacity={0.3} />
      </motion.g>

      {/* Animated pulse rings around central node */}
      <motion.circle
        cx={220} cy={160} r={16}
        stroke={BLUE} strokeWidth={0.5}
        fill="none"
        animate={{ r: [16, 32, 16], opacity: [0.25, 0, 0.25] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle
        cx={340} cy={220} r={14}
        stroke={CYAN} strokeWidth={0.5}
        fill="none"
        animate={{ r: [14, 28, 14], opacity: [0.25, 0, 0.25] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
    </svg>
  )
}
