import React from 'react'
import { LineChart, Percent, Layers, Calculator, Sun, Moon, SlidersHorizontal } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

interface TabNavigationProps {
  activeCategory: string
  setActiveCategory: (category: string) => void
  gearButton?: React.ReactNode
  onOpenVariables?: () => void
  isVariablesOpen?: boolean
}

const tabs = [
  { id: 'margins', label: 'Margins', icon: Calculator },
  { id: 'charts', label: 'Charts', icon: LineChart },
  { id: 'contour', label: 'Contour', icon: Percent },
  { id: 'compare', label: 'Compare', icon: Layers },
]

export function TabNavigation({ activeCategory, setActiveCategory, gearButton, onOpenVariables, isVariablesOpen }: TabNavigationProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <>
      {/* ── Desktop: top tab bar ── */}
      <div className="tab-navigation hidden md:block">
        <div className="category-tabs flex items-center gap-1 border-b border-border">
          {gearButton}
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`category-tab flex items-center px-4 py-2.5 border-b-2 text-sm transition-colors ${
                activeCategory === id
                  ? 'border-secondary text-primary font-medium'
                  : 'border-transparent text-text_secondary hover:text-text_primary'
              }`}
              onClick={() => setActiveCategory(id)}
            >
              <Icon className="w-4 h-4 mr-2" />
              <span>{label}</span>
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-text_secondary hover:text-text_primary hover:bg-surface transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Mobile: floating bottom nav bar ── */}
      <nav className="md:hidden fixed bottom-4 left-3 right-3 z-40 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-card safe-area-bottom">
        <div className="flex items-stretch justify-around px-1">
          {/* Variables button */}
          <button
            onClick={onOpenVariables}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] transition-colors ${
              isVariablesOpen ? 'text-primary' : 'text-text_secondary active:text-text_primary'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Variables</span>
          </button>

          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] transition-colors ${
                activeCategory === id
                  ? 'text-primary font-medium'
                  : 'text-text_secondary active:text-text_primary'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
