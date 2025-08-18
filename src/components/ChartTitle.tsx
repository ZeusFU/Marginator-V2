import React from 'react';
import { VisibleMarginsState } from '../utils/types';
import { Info } from 'lucide-react';

interface ChartTitleProps {
  title: string;
  chartKey: keyof VisibleMarginsState;
  toggleMargin: ((chart: keyof VisibleMarginsState, margin: 'priceMargin') => void) | ((margin: 'priceMargin') => void);
  visibleMargins: VisibleMarginsState | { priceMargin: boolean };
  description?: string;
}

function ChartTitle({ 
  title, 
  chartKey, 
  toggleMargin,
  visibleMargins,
  description = "This chart shows how changing variables affects profit margins."
}: ChartTitleProps) {
  const [showDescription, setShowDescription] = React.useState(false);
  
  // Handle toggle margin with proper typing
  const handleToggleMargin = () => {
    if (typeof visibleMargins === 'object' && 'priceMargin' in visibleMargins) {
      // Handle the simple version (from chart components)
      if (toggleMargin.length === 1) {
        (toggleMargin as (margin: 'priceMargin') => void)('priceMargin');
      } else {
        // Handle the context version (from App.tsx)
        (toggleMargin as (chart: keyof VisibleMarginsState, margin: 'priceMargin') => void)(chartKey, 'priceMargin');
      }
    }
  };
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-base md:text-lg font-semibold text-secondary">{title}</h3>
          <button
            onClick={() => setShowDescription(!showDescription)}
            className="p-1 text-text_secondary hover:text-primary focus:outline-none transition-colors"
            aria-label="Show description"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        
        {/* Add back margin toggle button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMargin}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors
              ${
                'priceMargin' in visibleMargins && visibleMargins.priceMargin 
                  ? 'bg-primary text-white' 
                  : 'bg-card text-text_secondary'
              }`}
          >
            Margin
          </button>
        </div>
      </div>
      
      {/* Description panel - animated */}
      {showDescription && (
        <div className="mt-2 p-3 bg-card rounded-md text-sm text-text_secondary border border-border animate-fadeIn">
          {description}
        </div>
      )}
      
      {/* Divider */}
      <div className="h-px bg-border mt-3"></div>
    </div>
  );
}

export default ChartTitle; 