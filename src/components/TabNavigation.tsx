import React from 'react'
import { Calculator, LineChart, Percent, Settings, Layers } from 'lucide-react'

interface TabNavigationProps {
  activeCategory: string
  setActiveCategory: (category: string) => void
}

export function TabNavigation({ activeCategory, setActiveCategory }: TabNavigationProps) {
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
            activeCategory === 'compare' 
              ? 'border-primary text-primary font-medium' 
              : 'border-transparent text-text_secondary hover:text-text_primary'
          }`}
          onClick={() => setActiveCategory('compare')}
        >
          <Layers className="w-4 h-4 mr-2" />
          <span>Compare</span>
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
    </div>
  )
} 