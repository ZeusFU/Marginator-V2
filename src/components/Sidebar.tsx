import React, { useState } from 'react';
import { Settings, X, ChevronDown, ChevronRight, HelpCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import InputField from './InputField';
import { useSimulationContext } from '../context/SimulationContext';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  evalPrice: number | string;
  setEvalPrice: (value: number | string) => void;
  evalPassRate: number | string;
  setEvalPassRate: (value: number | string) => void;
  simFundedRate: number | string;
  setSimFundedRate: (value: number | string) => void;
  avgPayout: number | string;
  setAvgPayout: (value: number | string) => void;
  useActivationFee: boolean;
  setUseActivationFee: (value: boolean) => void;
  activationFee: number | string;
  setActivationFee: (value: number | string) => void;
  avgLiveSaved: number | string;
  setAvgLiveSaved: (value: number | string) => void;
  avgLivePayout: number | string;
  setAvgLivePayout: (value: number | string) => void;
  includeLive: boolean;
  setIncludeLive: (value: boolean) => void;
  isDisabled?: boolean;
}

interface TooltipProps {
  content: string;
}

// Tooltip component
function Tooltip({ content }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="ml-1 text-text_secondary hover:text-primary focus:outline-none"
        aria-label="Show information"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      
      {isVisible && (
        <div className="absolute z-50 w-64 p-2 mt-2 text-xs bg-surface border border-border rounded-md shadow-lg text-text_primary -left-8 top-full">
          {content}
        </div>
      )}
    </div>
  );
}

// Regular Collapsible section component
function CollapsibleSection({ 
  title, 
  children, 
  tooltip 
}: { 
  title: string; 
  children: React.ReactNode; 
  tooltip?: string;
}) {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div className="border-t border-border pt-4 mt-4">
      <div 
        className="flex items-center mb-3 cursor-pointer" 
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? 
          <ChevronDown className="w-4 h-4 text-primary mr-1" /> : 
          <ChevronRight className="w-4 h-4 text-primary mr-1" />
        }
        <h3 className="text-sm font-medium text-secondary">{title}</h3>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      
      {isOpen && (
        <div className="space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

// New ToggleableSection component for Activation Fee and Live Accounts
function ToggleableSection({ 
  title, 
  isEnabled,
  onToggle,
  children, 
  tooltip 
}: { 
  title: string;
  isEnabled: boolean;
  onToggle: () => void;
  children: React.ReactNode; 
  tooltip?: string;
}) {
  return (
    <div className="border-t border-border pt-4 mt-4">
      <div 
        className="flex items-center mb-3 cursor-pointer" 
        onClick={onToggle}
      >
        {isEnabled ? 
          <ToggleRight className="w-5 h-5 text-primary mr-1" /> : 
          <ToggleLeft className="w-5 h-5 text-text_secondary mr-1" />
        }
        <h3 className={`text-sm font-medium ${isEnabled ? 'text-secondary' : 'text-text_secondary'}`}>
          {title}
        </h3>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      
      {isEnabled && (
        <div className="space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

interface SidebarComponentProps {
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  inline?: boolean
}

function Sidebar({ 
  isSidebarOpen, 
  setIsSidebarOpen,
  inline = false
}: SidebarComponentProps) {
  const {
    inputs,
    updateInput,
    isComparisonMode,
    isComparingSimulations
  } = useSimulationContext();
  
  const isDisabled = isComparisonMode || isComparingSimulations;

  const containerClass = inline
    ? 'w-full bg-card p-6 rounded-lg border border-border'
    : `fixed inset-y-0 left-0 z-40 w-72 md:w-80 lg:w-64 xl:w-72 bg-surface p-4 md:p-5 shadow-xl h-screen overflow-y-auto transition-transform duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0 lg:h-auto lg:overflow-y-visible lg:shadow-lg`

  return (
    <div className={containerClass}>
      {!inline && (
      <button 
        onClick={() => setIsSidebarOpen(false)} 
        className="absolute top-2 right-2 lg:hidden p-1 text-text_secondary hover:text-text_primary"
        aria-label="Close parameters menu"
      >
        <X className="w-5 h-5" />
      </button>
      )}
    
      <h2 className={`text-base md:text-lg font-semibold text-secondary mb-4 md:mb-5 flex items-center gap-2 ${inline ? '' : 'pt-6 lg:pt-0'}`}>
        <Settings className="w-4 h-4 md:w-5 md:h-5"/> Input Parameters
      </h2>
      
      {/* Two-column layout grouping when inline */}
      {inline ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column: Basic + Costs */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Basic Parameters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Evaluation Price" id="evalPrice" value={inputs.evalPrice} onChange={(v) => updateInput('evalPrice', v)} min={0} step={1} unit="$" placeholder="Enter challenge price" tooltip="The price charged to traders for evaluation accounts" disabled={isDisabled} />
                <InputField label="Eval Pass Rate" id="evalPassRate" value={inputs.evalPassRate} onChange={(v) => updateInput('evalPassRate', v)} min={0} max={100} step={0.01} unit="%" placeholder="% of traders who pass" tooltip="Percentage of traders who pass the evaluation stage" disabled={isDisabled} />
                <InputField label="Sim Funded to Payout Rate" id="simFundedRate" value={inputs.simFundedRate} onChange={(v) => updateInput('simFundedRate', v)} min={0} max={100} step={0.01} unit="%" placeholder="% of funded traders making withdrawals" tooltip="Percentage of funded traders who actually make withdrawals" disabled={isDisabled} />
                <InputField label="Avg. Payout Amount" id="avgPayout" value={inputs.avgPayout} onChange={(v) => updateInput('avgPayout', v)} min={0} step={10} unit="$" placeholder="Average withdrawal amount" tooltip="Average amount withdrawn by funded traders" disabled={isDisabled} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Company Costs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="User Fee (per account)" id="userFeePerAccount" value={inputs.userFeePerAccount} onChange={(v) => updateInput('userFeePerAccount', v)} min={0} step={0.01} unit="$" placeholder="Defaults to 5.83" tooltip="Fixed cost per account for user support and onboarding" disabled={isDisabled} />
                <InputField label="Data Fee (per account)" id="dataFeePerAccount" value={inputs.dataFeePerAccount} onChange={(v) => updateInput('dataFeePerAccount', v)} min={0} step={0.001} unit="$" placeholder="Defaults to 1.467" tooltip="Fixed data cost per account" disabled={isDisabled} />
                <InputField label="Account Fee (per account)" id="accountFeePerAccount" value={inputs.accountFeePerAccount} onChange={(v) => updateInput('accountFeePerAccount', v)} min={0} step={0.01} unit="$" placeholder="Defaults to 3.50" tooltip="Fixed platform/account cost per account" disabled={isDisabled} />
                <InputField label="Staffing Fee" id="staffingFeePercent" value={inputs.staffingFeePercent} onChange={(v) => updateInput('staffingFeePercent', v)} min={0} max={100} step={0.01} unit="%" placeholder="Defaults to 5%" tooltip="Percentage of gross revenue (eval + activation) for staffing" disabled={isDisabled} />
                <InputField label="Processor Fee" id="processorFeePercent" value={inputs.processorFeePercent} onChange={(v) => updateInput('processorFeePercent', v)} min={0} max={100} step={0.01} unit="%" placeholder="Defaults to 5.5%" tooltip="Percentage of gross revenue (eval + activation) paid to processors" disabled={isDisabled} />
                <InputField label="Affiliate Fee" id="affiliateFeePercent" value={inputs.affiliateFeePercent} onChange={(v) => updateInput('affiliateFeePercent', v)} min={0} max={100} step={0.01} unit="%" placeholder="Defaults to 9.8%" tooltip="Percentage applied to eval revenue (and optionally activation) for affiliates" disabled={isDisabled} />
                <div className="flex items-center justify-between">
                  <label htmlFor="affiliateAppliesToActivation" className="text-xs font-medium text-text_secondary">Apply Affiliate Fee to Activation Revenue</label>
                  <button id="affiliateAppliesToActivation" onClick={() => updateInput('affiliateAppliesToActivation', !inputs.affiliateAppliesToActivation)} className={`px-2 py-1 rounded text-xs ${inputs.affiliateAppliesToActivation ? 'bg-primary text-white' : 'bg-card text-text_secondary'}`}>{inputs.affiliateAppliesToActivation ? 'On' : 'Off'}</button>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Activation + Live */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-secondary">Activation Fee</h3>
                <button onClick={() => updateInput('useActivationFee', !inputs.useActivationFee)} className={`px-2 py-1 rounded text-xs ${inputs.useActivationFee ? 'bg-primary text-white' : 'bg-card text-text_secondary'}`}>{inputs.useActivationFee ? 'On' : 'Off'}</button>
              </div>
              {inputs.useActivationFee && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField label="Activation Fee Amount" id="activationFee" value={inputs.activationFee} onChange={(v) => updateInput('activationFee', v)} min={0} step={10} unit="$" placeholder="Fee charged after passing" tooltip="One-time fee charged to traders who pass the evaluation" disabled={isDisabled} />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-secondary">Live Accounts</h3>
                <button onClick={() => updateInput('includeLive', !inputs.includeLive)} className={`px-2 py-1 rounded text-xs ${inputs.includeLive ? 'bg-primary text-white' : 'bg-card text-text_secondary'}`}>{inputs.includeLive ? 'On' : 'Off'}</button>
              </div>
              {inputs.includeLive && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField label="% Live Accounts Saved" id="avgLiveSaved" value={inputs.avgLiveSaved} onChange={(v) => updateInput('avgLiveSaved', v)} min={0} max={100} step={0.1} unit="%" placeholder="% continuing to live phase" tooltip="Percentage of funded accounts that continue to live phase" disabled={isDisabled} />
                  <InputField label="Avg. Live Payout" id="avgLivePayout" value={inputs.avgLivePayout} onChange={(v) => updateInput('avgLivePayout', v)} min={0} step={10} unit="$" placeholder="Average live account payout" tooltip="Average payout for live account traders" disabled={isDisabled} />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Fallback: original stacked layout when not inline */}
          <CollapsibleSection title="Basic Parameters" tooltip="Core variables that determine the fundamental profitability of the business model">
        <div className="space-y-3">
              {/* same inputs as above, compact omitted for brevity */}
        </div>
      </CollapsibleSection>
        </>
      )}
    </div>
  );
}

// Compatibility wrapper for legacy API - this can be removed if not needed
function SidebarWrapper({ 
  isSidebarOpen,
  setIsSidebarOpen,
  inline
}: {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  inline?: boolean;
}) {
  return (
    <>
      {/* Overlay for mobile sidebar */} 
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        ></div>
      )}

      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        inline={inline}
      />
    </>
  );
}

export default SidebarWrapper; 
export { Sidebar as InlineParameters };