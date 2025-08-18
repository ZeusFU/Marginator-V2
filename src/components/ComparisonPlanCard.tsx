import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { MarginCalculationResult } from '../utils/types'

interface ComparisonPlanCardProps {
  id: string
  name: string
  priceMargin: number
  baseMargins: MarginCalculationResult
  thresholds?: any
}

function ComparisonPlanCard({ id, name, priceMargin, baseMargins, thresholds }: ComparisonPlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Format helpers
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '$0.00'
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }
  
  const formatPercent = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '0.0%'
    return `${(value * 100).toFixed(1)}%`
  }
  
  // Get margin color (using shades of saturated dark blue)
  const getMarginColor = (margin: number | undefined) => {
    if (!margin || isNaN(margin)) return 'bg-[#5356b8]' // Default light blue
    if (margin >= 0.5) return 'bg-[#0a2472]' // Dark blue
    if (margin >= 0.4) return 'bg-[#1e3799]' // Medium dark blue
    if (margin >= 0.3) return 'bg-[#3742a8]' // Medium blue
    return 'bg-[#5356b8]' // Lighter blue
  }
  
  return (
    <div className="comparison-plan-card border border-border rounded-lg overflow-hidden transition-all duration-300">
      {/* Header - Always visible and clickable */}
      <div 
        className={`p-4 ${getMarginColor(priceMargin)} text-white cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">{name}</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{formatPercent(priceMargin)}</span>
              <span className="text-xs opacity-70">Margin</span>
            </div>
          </div>
          <div>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>
      
      {/* Expandable content */}
      <div 
        className={`bg-background transition-all duration-300 overflow-hidden ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4">
          {/* Financial breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-text_secondary">Gross Revenue</span>
              <span className="font-medium">{formatCurrency(baseMargins?.grossRevenue)}</span>
            </div>
            <div className="pl-4 text-xs text-text_secondary space-y-1">
              <div className="flex justify-between">
                <span>Eval Revenue</span>
                <span>{formatCurrency(baseMargins?.evalRevenueFromEvals)}</span>
              </div>
              <div className="flex justify-between">
                <span>Activation Fee</span>
                <span>{formatCurrency(baseMargins?.activationFeeRevenue)}</span>
              </div>
              {baseMargins?.totalLiveRevenue > 0 && (
                <div className="flex justify-between">
                  <span>Live Revenue</span>
                  <span>{formatCurrency(baseMargins?.totalLiveRevenue)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-xs text-text_secondary">Payout Cost</span>
              <span className="font-medium text-red-500">{formatCurrency(baseMargins?.cost)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-xs text-text_secondary">Net Revenue</span>
              <span className="font-medium text-green-500">{formatCurrency(baseMargins?.netRevenue)}</span>
            </div>
          </div>
          
          {/* 50% Margin Thresholds Section */}
          {thresholds && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-2">50% Margin Thresholds</h4>
              <div className="space-y-2 text-xs">
                {thresholds.fiftyPercentMarginEvalPrice !== null && (
                  <div className="flex justify-between">
                    <span className="text-text_secondary">Evaluation Price</span>
                    <span>{formatCurrency(thresholds.fiftyPercentMarginEvalPrice)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ComparisonPlanCard 