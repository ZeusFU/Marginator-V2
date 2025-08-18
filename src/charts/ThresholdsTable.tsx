import React from 'react';
import { ExactThresholdItem } from '../utils/types';
import { formatValue } from '../utils/chartConfig';

interface ThresholdsTableProps {
  thresholds: ExactThresholdItem[];
  evalPrice: number | string;
  purchaseToPayoutRate: number;
  avgPayout: number | string;
  includeLive: boolean;
}

function ThresholdsTable({
  thresholds,
  evalPrice,
  purchaseToPayoutRate,
  avgPayout,
  includeLive
}: ThresholdsTableProps) {
  // Helper to safely convert string or number to number
  const toNumber = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (value === '') return 0;
    return parseFloat(value) || 0;
  };

  return (
    <div className="bg-surface pt-4">
      <h3 className="text-base md:text-lg font-semibold mb-3 text-text_primary">Exact 50% Margin Threshold Values</h3>
      
      {/* Price Margin Table */}
      <h4 className="text-sm font-semibold mb-3 text-secondary">Price Margin Threshold (50%)</h4>
      <p className="text-sm text-gray-400 mb-4">
        Approximate value for each variable (adjusted individually) resulting in a <span className="font-semibold">Price Margin</span> of 50%.
      </p>
      
      <div className="overflow-x-auto mb-8">
        <table className="min-w-full bg-card border border-gray-700 rounded-md">
          <thead>
            <tr className="border-b border-gray-700 text-left text-xs font-medium">
              <th className="px-4 py-2 text-secondary">Variable</th>
              <th className="px-4 py-2 text-secondary">Current Value</th>
              <th className="px-4 py-2 text-secondary">50% Threshold</th>
              <th className="px-4 py-2 text-secondary">Change Needed</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {thresholds.map((item) => {
              const currentVal = 
                item.name === "Eval Price" ? toNumber(evalPrice) :
                item.name === "Purchase to Payout Rate" ? purchaseToPayoutRate :
                item.name === "Avg Payout" ? toNumber(avgPayout) : 0;
              
              let changeText = "N/A";
              if (item.pmValue !== null && currentVal !== 0) {
                const diff = item.pmValue - currentVal;
                const pctChange = (diff / currentVal) * 100;
                const pctText = pctChange > 0 ? 
                  `+${pctChange.toFixed(1)}%` : 
                  `${pctChange.toFixed(1)}%`;
                
                changeText = Math.abs(pctChange) > 50 ? 
                  `${pctText} (significant change)` : 
                  pctText;
              }
              
              return (
                <tr key={item.name} className="border-b border-gray-700 hover:bg-gray-800/50">
                  <td className="px-4 py-2 font-medium">{item.name}</td>
                  <td className="px-4 py-2">{
                    item.name === "Eval Price" ? `$${toNumber(evalPrice).toFixed(2)}` :
                    item.name === "Purchase to Payout Rate" ? `${(purchaseToPayoutRate * 100).toFixed(2)}%` :
                    item.name === "Avg Payout" ? `$${toNumber(avgPayout).toFixed(2)}` : ""
                  }</td>
                  <td className="px-4 py-2">{formatValue(item.name, item.pmValue)}</td>
                  <td className={`px-4 py-2 ${item.pmValue === null ? 'text-gray-400' : Math.abs(currentVal !== 0 ? ((item.pmValue - currentVal) / currentVal) * 100 : 0) > 50 ? 'text-red-400' : 'text-green-400'}`}>
                    {changeText}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ThresholdsTable; 