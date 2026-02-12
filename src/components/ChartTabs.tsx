import React from 'react'

interface ChartTabsProps {
  activeTab: number
  setActiveTab: (index: number) => void
}

const tabs = [
  { label: 'Eval Price', index: 0 },
  { label: 'PTR', index: 1 },
  { label: 'Avg Payout', index: 2 },
  { label: 'Payout Combos', index: 3 },
  { label: 'Price/Rate', index: 4 },
]

export function ChartTabs({ activeTab, setActiveTab }: ChartTabsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {tabs.map(({ label, index }) => (
        <button
          key={index}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === index
              ? 'bg-primary text-white'
              : 'bg-surface text-text_secondary hover:text-text_primary'
          }`}
          onClick={() => setActiveTab(index)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
