import React from 'react'
import { DollarSign, Percent, TrendingUp, LineChart } from 'lucide-react'

interface ChartTabsProps {
  activeTab: number
  setActiveTab: (index: number) => void
}

const tabs = [
  { label: 'Evaluation Price', icon: DollarSign, index: 0 },
  { label: 'Purchase to Payout Rate', icon: Percent, index: 1 },
  { label: 'Average Payout', icon: DollarSign, index: 2 },
  { label: 'Payout Rate Combinations', icon: TrendingUp, index: 3 },
  { label: 'Eval Price/Rate Combinations', icon: LineChart, index: 4 }
]

export function ChartTabs({ activeTab, setActiveTab }: ChartTabsProps) {
  return (
    <div className="chart-tabs flex flex-wrap gap-2 pb-4 border-b border-border mb-4 overflow-x-auto">
      {tabs.map(({ label, icon: Icon, index }) => (
        <button
          key={label}
          className={`chart-tab px-3 py-1.5 rounded-full text-sm flex items-center whitespace-nowrap ${
            activeTab === index
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface text-text_secondary hover:bg-surface_hover'
          }`}
          onClick={() => setActiveTab(index)}
        >
          <Icon className="w-3 h-3 mr-1" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}


