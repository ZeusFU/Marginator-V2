import React from 'react';

interface DetailsRowProps {
  summaryLabel: string;
  summaryValue: string | number;
  children?: React.ReactNode; // Content to show when expanded
  isTopLevel?: boolean; // Optional flag for different styling
  valueClass?: string; // Optional class for the value
}

function DetailsRow({ 
  summaryLabel, 
  summaryValue, 
  children, 
  isTopLevel = false, 
  valueClass = '' 
}: DetailsRowProps) {
  return (
    // Use group state for arrow rotation
    <details className="group border-b border-card last:border-b-0 text-text_primary">
      <summary className={`flex justify-between items-center list-none cursor-pointer hover:bg-card px-1 py-1.5 rounded ${isTopLevel ? 'font-semibold text-base' : 'text-sm'}`}>
        <span className={`${isTopLevel ? 'text-secondary' : 'text-text_secondary'}`}>{summaryLabel}</span>
        <div className="flex items-center">
          <span className={`ml-2 font-medium ${isTopLevel ? 'text-lg' : 'text-sm'} ${valueClass}`}>{summaryValue}</span>
          {/* Simple SVG Chevron for dropdown indicator */}
          {children && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 ml-1 text-gray-500 group-open:rotate-90 transition-transform duration-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          )}
        </div>
      </summary>
      {children && (
        <div className="pl-3 pr-1 pt-1.5 pb-2 text-xs space-y-1.5 bg-card rounded-b border-l-2 border-primary/50">
          {children}
        </div>
      )}
    </details>
  );
}

export default DetailsRow; 