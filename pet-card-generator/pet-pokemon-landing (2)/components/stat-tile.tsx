"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface StatTileProps {
  label: string
  value: number | string
  maxValue?: number
  icon?: React.ReactNode
  gradient?: string
  showProgress?: boolean
  className?: string
}

export function StatTile({
  label,
  value,
  maxValue = 100,
  icon,
  gradient = "from-gray-400 to-gray-500",
  showProgress = false,
  className = "",
}: StatTileProps) {
  const numericValue = typeof value === "number" ? value : Number.parseInt(value.toString()) || 0
  const progressValue = maxValue > 0 ? (numericValue / maxValue) * 100 : 0

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${gradient} flex items-center justify-center`}>
              {icon}
            </div>
          )}
          <span className="font-medium text-sm">{label}</span>
        </div>

        <div className="text-2xl font-bold">{value}</div>

        {showProgress && <Progress value={progressValue} className="h-2" />}
      </div>
    </Card>
  )
}
