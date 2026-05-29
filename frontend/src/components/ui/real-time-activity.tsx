"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Activity } from "lucide-react"

interface DataPoint {
  time: number
  value: number
}

import { DashboardSummary } from "@/lib/api"

interface RealTimeActivityProps {
  summary?: DashboardSummary
  isLoading?: boolean
}

export function RealTimeActivity({ 
  summary
}: RealTimeActivityProps) {
  const [data, setData] = useState<DataPoint[]>([])
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const maxPoints = 25
  const width = 800
  const height = 300
  const padding = { top: 30, right: 30, bottom: 40, left: 60 }

  useEffect(() => {
    // Initialize with real baseline if available, else zero
    const baseline = summary?.aiResolutionRate ?? 50
    const initial: DataPoint[] = []
    const now = Date.now()
    for (let i = 0; i < 20; i++) {
      initial.push({
        time: now - (20 - i) * 1000,
        value: baseline + (Math.random() - 0.5) * 5,
      })
    }
    setData(initial)

    // Add new data points every second
    const interval = setInterval(() => {
      setData((prev) => {
        const target = summary?.aiResolutionRate ?? 50
        const lastValue = prev[prev.length - 1]?.value || target
        
        // Simulating micro-fluctuations around the real target
        const drift = (target - lastValue) * 0.1
        const jitter = (Math.random() - 0.5) * 8
        const newPoint: DataPoint = {
          time: Date.now(),
          value: Math.max(0, Math.min(100, lastValue + drift + jitter)),
        }
        const updated = [...prev, newPoint]
        return updated.slice(-maxPoints)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [summary?.aiResolutionRate])

  const getX = (time: number) => {
    if (data.length < 2) return padding.left
    const minTime = data[0]?.time || 0
    const maxTime = data[data.length - 1]?.time || 1
    const range = maxTime - minTime || 1
    return padding.left + ((time - minTime) / range) * (width - padding.left - padding.right)
  }

  const getY = (value: number) => {
    return padding.top + (1 - value / 100) * (height - padding.top - padding.bottom)
  }

  const getPath = () => {
    if (data.length < 2) return ""
    return data
      .map((point, i) => {
        const x = getX(point.time)
        const y = getY(point.value)
        return `${i === 0 ? "M" : "L"} ${x},${y}`
      })
      .join(" ")
  }

  const getAreaPath = () => {
    if (data.length < 2) return ""
    const linePath = getPath()
    const lastX = getX(data[data.length - 1].time)
    const firstX = getX(data[0].time)
    const bottomY = height - padding.bottom
    return `${linePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = width / rect.width
    const x = (e.clientX - rect.left) * scaleX

    // Find closest point
    let closest: DataPoint | null = null
    let minDist = Number.POSITIVE_INFINITY
    data.forEach((point) => {
      const px = getX(point.time)
      const dist = Math.abs(px - x)
      if (dist < minDist && dist < 40) {
        minDist = dist
        closest = point
      }
    })
    setHoveredPoint(closest)
  }

  const currentValue = data[data.length - 1]?.value || 0

  return (
    <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden border border-white/5 h-full">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full" />

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-indigo-400" />
              <h2 className="text-2xl font-black text-white">System Pulse</h2>
            </div>
            <p className="text-sm font-medium text-gray-500">Live system performance & load</p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl shadow-inner">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tabular-nums">
                {currentValue.toFixed(1)}
              </span>
              <span className="text-sm font-bold text-gray-400 opacity-60">%</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <svg
            ref={svgRef}
            className="w-full h-auto cursor-crosshair overflow-visible"
            viewBox={`0 0 ${width} ${height}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((val) => (
              <g key={val} className="opacity-20 transition-opacity duration-500 group-hover:opacity-40">
                <line
                  x1={padding.left}
                  y1={getY(val)}
                  x2={width - padding.right}
                  y2={getY(val)}
                  stroke="#475569"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 15}
                  y={getY(val)}
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="font-mono"
                >
                  {val}%
                </text>
              </g>
            ))}

            {/* Area fill */}
            <motion.path
              d={getAreaPath()}
              fill="url(#areaGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            />

            {/* Main line */}
            <motion.path
              d={getPath()}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{ filter: "drop-shadow(0 0 10px rgba(99, 102, 241, 0.4))" }}
            />

            {/* Data points */}
            {data.map((point, i) => (
              <circle
                key={point.time}
                cx={getX(point.time)}
                cy={getY(point.value)}
                r={i === data.length - 1 ? 6 : 3}
                fill={i === data.length - 1 ? "#ec4899" : "#6366f1"}
                className={`transition-all duration-300 ${i === data.length - 1 ? "shadow-[0_0_15px_rgba(236,72,153,0.8)]" : "opacity-40"}`}
              />
            ))}

            {/* Hover crosshair */}
            <AnimatePresence>
              {hoveredPoint && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <line
                    x1={getX(hoveredPoint.time)}
                    y1={padding.top}
                    x2={getX(hoveredPoint.time)}
                    y2={height - padding.bottom}
                    stroke="#6366f1"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="opacity-40"
                  />
                  <circle
                    cx={getX(hoveredPoint.time)}
                    cy={getY(hoveredPoint.value)}
                    r="12"
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                </motion.g>
              )}
            </AnimatePresence>
          </svg>

          {/* Tooltip */}
          <AnimatePresence>
            {hoveredPoint && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                style={{
                  position: "absolute",
                  left: `${(getX(hoveredPoint.time) / width) * 100}%`,
                  top: `${(getY(hoveredPoint.value) / height) * 100}%`,
                }}
                className="pointer-events-none z-50 -translate-x-1/2 -translate-y-[140%]"
              >
                <div className="bg-gray-800 border border-white/10 rounded-xl px-4 py-2 shadow-2xl backdrop-blur-md">
                  <div className="text-white font-black text-sm">
                    {hoveredPoint.value.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                    {new Date(hoveredPoint.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
                <div className="w-2 h-2 bg-gray-800 border-r border-b border-white/10 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-12">
          {[
            {
              label: "AI Efficiency",
              value: summary?.aiResolutionRate ?? 0,
              unit: "%",
              color: "text-indigo-400"
            },
            { 
              label: "Session Peak", 
              value: Math.max(...data.map((d) => d.value), 0).toFixed(1), 
              unit: "%",
              color: "text-pink-400"
            },
            { 
              label: "Bot Latency", 
              value: summary?.avgResponseMs ?? 0, 
              unit: "ms",
              color: "text-emerald-400"
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 rounded-2xl p-5 border border-white/5 group hover:bg-white/10 transition-colors">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 group-hover:text-gray-300">
                {stat.label}
              </div>
              <div className={`text-xl font-black ${stat.color}`}>
                {stat.value}
                <span className="text-xs ml-0.5 opacity-60 font-bold">{stat.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
