"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Users, Monitor, Smartphone, TrendingUp, Activity, Ticket, Loader2 } from "lucide-react"

import { TrendDataPoint } from "@/lib/api"

interface LineGraphStatisticsProps {
  trendData: TrendDataPoint[]
  selectedPeriod: string
  onPeriodChange: (period: string) => void
  isLoading?: boolean
}

export function LineGraphStatistics({ 
  trendData = [], 
  selectedPeriod, 
  onPeriodChange,
  isLoading = false 
}: LineGraphStatisticsProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [animationPhase, setAnimationPhase] = useState(0)

  const mobileData = trendData.map(d => d.mobileQueries);
  const desktopData = trendData.map(d => d.desktopQueries);
  const dates = trendData.length > 0 ? trendData.map(d => {
    const dObj = new Date(d.date)
    return dObj.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }) : ["-"]

  const summary = {
    peak: Math.max(...mobileData, 0),
    average: Math.round(mobileData.reduce((a, b) => a + b, 0) / Math.max(mobileData.length, 1)),
    growth: trendData.length >= 2 
      ? `${Math.round(((trendData[trendData.length - 1].mobileQueries - trendData[0].mobileQueries) / Math.max(trendData[0].mobileQueries, 1)) * 100)}%`
      : "0%",
  }

  const maxValue = Math.max(...mobileData, ...desktopData, 10) * 1.1

  // Generate path for smooth curves
  const generateSmoothPath = (values: number[], height = 400, isArea = false) => {
    const width = 800
    const padding = 60
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const points = values.map((value, index) => ({
      x: padding + (index / (Math.max(values.length - 1, 1))) * chartWidth,
      y: padding + (1 - value / maxValue) * chartHeight,
    }))

    if (points.length < 2) return isArea ? `M ${padding},${height - padding} L ${width - padding},${height - padding} Z` : ""

    let path = `M ${points[0].x},${points[0].y}`

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cp1x = prev.x + (curr.x - prev.x) * 0.5
      const pathSegment = ` C ${cp1x},${prev.y} ${cp1x},${curr.y} ${curr.x},${curr.y}`
      path += pathSegment
    }

    if (isArea) {
      path += ` L ${points[points.length - 1].x},${height - padding} L ${padding},${height - padding} Z`
    }

    return path
  }

  useEffect(() => {
    setAnimationPhase(0)
    const timers = [
      setTimeout(() => setAnimationPhase(1), 100),
      setTimeout(() => setAnimationPhase(2), 500),
      setTimeout(() => setAnimationPhase(3), 1000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [selectedPeriod])

  const periods = [
    { label: "Last 3 months", val: "3m" },
    { label: "Last 30 days", val: "30d" },
    { label: "Last 7 days", val: "7d" },
  ]

  return (
    <div className={`bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden h-full ${isLoading ? 'opacity-60 transition-opacity' : ''}`}>
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-[1px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
        </div>
      )}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-gray-400" />
              <h2 className="text-2xl font-black text-gray-900">Historical Footprint</h2>
            </div>
            <p className="text-sm font-medium text-gray-500">Multimodal visitor traffic analysis</p>
          </div>

          <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
            {periods.map((period) => (
              <button
                key={period.label}
                onClick={() => onPeriodChange(period.label)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  selectedPeriod === period.label
                    ? "bg-white shadow-md text-gray-900 border border-gray-100"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
              >
                {period.label.split(" ").slice(1).join(" ")}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-6 mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-lg bg-indigo-500/10 border-2 border-indigo-500 flex items-center justify-center">
              <Activity className="w-2.5 h-2.5 text-indigo-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-0.5">Mobile Traffic</p>
              <p className="text-sm font-black text-gray-900">{mobileData[mobileData.length -1] || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-lg bg-gray-100 border-2 border-gray-400 flex items-center justify-center">
              <Ticket className="w-2.5 h-2.5 text-gray-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-0.5">Desktop Traffic</p>
              <p className="text-sm font-black text-gray-900">{desktopData[desktopData.length - 1] || 0}</p>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="h-72 relative group">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 800 400">
            <defs>
              <pattern id="dotGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#f1f5f9" />
              </pattern>
            </defs>
            <rect width="800" height="400" fill="url(#dotGrid)" />

            <AnimatePresence mode="wait">
              <motion.g
                key={selectedPeriod}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                {/* Support Requests Area (Inverted from Desktop) */}
                <path
                  d={generateSmoothPath(desktopData, 400, true)}
                  fill="url(#desktopGrad)"
                  className="opacity-20"
                />
                <linearGradient id="desktopGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
                </linearGradient>
                
                {/* Total Queries Area (Inverted from Mobile) */}
                <path
                  d={generateSmoothPath(mobileData, 400, true)}
                  fill="url(#mobileGrad)"
                  className="opacity-30"
                />
                <linearGradient id="mobileGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
                
                {/* Lines */}
                <path
                  d={generateSmoothPath(desktopData, 400)}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d={generateSmoothPath(mobileData, 400)}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="4"
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 4px 12px rgba(99, 102, 241, 0.4))" }}
                />

                {/* Interactive Points */}
                {mobileData.map((_, i) => {
                  const padding = 60
                  const chartWidth = 800 - padding * 2
                  const chartHeight = 400 - padding * 2
                  const x = padding + (i / (Math.max(mobileData.length - 1, 1))) * chartWidth
                  const mobY = padding + (1 - mobileData[i] / maxValue) * chartHeight
                  
                  return (
                    <g key={i}>
                      <rect
                        x={x - 20}
                        y={0}
                        width={40}
                        height={400}
                        fill="transparent"
                        className="cursor-crosshair"
                        onMouseEnter={() => setHoveredPoint(i)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                      {hoveredPoint === i && (
                        <>
                          <line x1={x} y1={0} x2={x} y2={400} stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" className="opacity-40" />
                          <circle cx={x} cy={mobY} r={6} fill="#6366f1" />
                        </>
                      )}
                    </g>
                  )
                })}
              </motion.g>
            </AnimatePresence>
          </svg>

          {/* Tooltip */}
          {hoveredPoint !== null && (
            <div 
              style={{ left: `${(60 + (hoveredPoint / (Math.max(mobileData.length - 1, 1))) * 680) / 8}%` }}
              className="absolute top-0 -translate-x-1/2 pointer-events-none z-20"
            >
              <div className="bg-gray-900 text-white rounded-xl px-4 py-3 shadow-2xl border border-white/10 min-w-[120px]">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">{dates[hoveredPoint]}</p>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-xs font-bold text-indigo-400">Mobile</span>
                  <span className="text-xs font-black">{mobileData[hoveredPoint]}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-xs font-bold text-gray-400">Desktop</span>
                  <span className="text-xs font-black">{desktopData[hoveredPoint]}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Metrics */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Peak Vol", value: summary.peak, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Daily Avg", value: summary.average, color: "text-gray-900", bg: "bg-gray-50" },
            { label: "Trend", value: summary.growth, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Stability", value: "99.9%", color: "text-blue-600", bg: "bg-blue-50" },
          ].map((metric) => (
            <div key={metric.label} className={`${metric.bg} rounded-2xl p-4 transition-all hover:scale-[1.02]`}>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{metric.label}</p>
              <p className={`text-xl font-black ${metric.color}`}>{metric.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
