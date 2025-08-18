import React from 'react'
import { LineChart, Calculator, DollarSign, Percent, TrendingUp, Settings, FileText } from 'lucide-react'

interface TabNavigationProps {
  activeTab: number
  setActiveTab: (index: number) => void
  activeCategory: string
  setActiveCategory: (category: string) => void
}

export function TabNavigation({ 
  activeTab, 
  setActiveTab, 
  activeCategory, 
  setActiveCategory 
}: TabNavigationProps) {
  return (
    <div className="tab-navigation">
      <div className="category-tabs flex border-b">
        <button 
          className={`category-tab flex items-center px-4 py-2 border-b-2 ${
            activeCategory === 'variables' 
              ? 'border-primary text-primary font-medium' 
              : 'border-transparent text-text_secondary hover:text-text_primary'
          }`}
          onClick={() => setActiveCategory('variables')}
        >
          <Calculator className="w-4 h-4 mr-2" />
          <span>Variables</span>
        </button>
        
        <button 
          className={`category-tab flex items-center px-4 py-2 border-b-2 ${
            activeCategory === 'charts' 
              ? 'border-primary text-primary font-medium' 
              : 'border-transparent text-text_secondary hover:text-text_primary'
          }`}
          onClick={() => setActiveCategory('charts')}
        >
          <LineChart className="w-4 h-4 mr-2" />
          <span>Charts</span>
        </button>
        
        {/* Comparison tab removed */}
        <button 
          className={`category-tab flex items-center px-4 py-2 border-b-2 ${
            activeCategory === 'contour' 
              ? 'border-primary text-primary font-medium' 
              : 'border-transparent text-text_secondary hover:text-text_primary'
          }`}
          onClick={() => setActiveCategory('contour')}
        >
          <Percent className="w-4 h-4 mr-2" />
          <span>Contour</span>
        </button>
        
        <button 
          className={`category-tab flex items-center px-4 py-2 border-b-2 ${
            activeCategory === 'settings' 
              ? 'border-primary text-primary font-medium' 
              : 'border-transparent text-text_secondary hover:text-text_primary'
          }`}
          onClick={() => setActiveCategory('settings')}
        >
          <Settings className="w-4 h-4 mr-2" />
          <span>Settings</span>
        </button>
      </div>
      
      {activeCategory === 'charts' && (
        <div className="chart-tabs flex py-2 space-x-2 overflow-x-auto">
          <button 
            className={`chart-tab px-3 py-1 rounded-full text-sm flex items-center ${
              activeTab === 0 
                ? 'bg-primary text-white' 
                : 'bg-surface text-text_secondary hover:bg-surface_hover'
            }`}
            onClick={() => setActiveTab(0)}
          >
            <DollarSign className="w-3 h-3 mr-1" />
            <span>Evaluation Price</span>
          </button>
          
          <button 
            className={`chart-tab px-3 py-1 rounded-full text-sm flex items-center ${
              activeTab === 1 
                ? 'bg-primary text-white' 
                : 'bg-surface text-text_secondary hover:bg-surface_hover'
            }`}
            onClick={() => setActiveTab(1)}
          >
            <Percent className="w-3 h-3 mr-1" />
            <span>Purchase to Payout Rate</span>
          </button>
          
          <button 
            className={`chart-tab px-3 py-1 rounded-full text-sm flex items-center ${
              activeTab === 2 
                ? 'bg-primary text-white' 
                : 'bg-surface text-text_secondary hover:bg-surface_hover'
            }`}
            onClick={() => setActiveTab(2)}
          >
            <DollarSign className="w-3 h-3 mr-1" />
            <span>Average Payout</span>
          </button>
          
          <button 
            className={`chart-tab px-3 py-1 rounded-full text-sm flex items-center ${
              activeTab === 3 
                ? 'bg-primary text-white' 
                : 'bg-surface text-text_secondary hover:bg-surface_hover'
            }`}
            onClick={() => setActiveTab(3)}
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>Payout Rate Combinations</span>
          </button>
          
          <button 
            className={`chart-tab px-3 py-1 rounded-full text-sm flex items-center ${
              activeTab === 4 
                ? 'bg-primary text-white' 
                : 'bg-surface text-text_secondary hover:bg-surface_hover'
            }`}
            onClick={() => setActiveTab(4)}
          >
            <LineChart className="w-3 h-3 mr-1" />
            <span>Eval Price/Rate Combinations</span>
          </button>
        </div>
      )}
    </div>
  )
} 