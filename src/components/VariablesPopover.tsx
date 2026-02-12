import React, { useState } from 'react'
import { DollarSign, Percent, ChevronDown, ChevronUp, X, Sun, Moon } from 'lucide-react'
import { useSimulationContext } from '../context/SimulationContext'
import { useTheme } from '../context/ThemeContext'
import InputField from './InputField'

interface VariablesPopoverProps {
  isOpen: boolean
  onClose: () => void
  onRun: () => void
  position?: { top: number; left: number; caret?: number }
  popoverRef: React.RefObject<HTMLDivElement>
}

export function VariablesPopover({ isOpen, onClose, onRun, position = { top: 70, left: 16, caret: 32 }, popoverRef }: VariablesPopoverProps) {
  const { inputs, updateInput, isLoading } = useSimulationContext()
  const { isDark, toggleTheme } = useTheme()
  const [showCompanyCosts, setShowCompanyCosts] = useState(false)

  if (!isOpen) return null

  // Shared form content used in both mobile drawer and desktop popover
  const formContent = (
    <>
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Eval Price" id="evalPrice" value={inputs.evalPrice} onChange={(v) => updateInput('evalPrice', v)} min={1} step={1} unit="$" placeholder="Enter price" />
        <InputField label="Pass Rate" id="evalPassRate" value={inputs.evalPassRate} onChange={(v) => updateInput('evalPassRate', v)} min={0} max={100} step={0.01} unit="%" placeholder="10%" />
        <InputField label="Funded Rate" id="simFundedRate" value={inputs.simFundedRate} onChange={(v) => updateInput('simFundedRate', v)} min={0} max={100} step={0.01} unit="%" placeholder="5%" />
        <InputField label="Avg Payout" id="avgPayout" value={inputs.avgPayout} onChange={(v) => updateInput('avgPayout', v)} min={0} step={10} unit="$" placeholder="500" />
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => updateInput('useActivationFee', !inputs.useActivationFee)}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border ${inputs.useActivationFee ? 'border-primary text-primary bg-primary/10' : 'border-border text-text_secondary hover:text-text_primary'}`}
        >
          <DollarSign className="w-4 h-4" />
          Activation Fee
        </button>
      </div>

      {inputs.useActivationFee && (
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Activation Fee Amount" id="activationFee" value={inputs.activationFee} onChange={(v) => updateInput('activationFee', v)} min={0} step={10} unit="$" placeholder="200" />
        </div>
      )}

      <div>
        <button
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface border border-border text-sm font-medium"
          onClick={() => setShowCompanyCosts(!showCompanyCosts)}
        >
          <span className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Company Costs
          </span>
          {showCompanyCosts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showCompanyCosts && (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <InputField label="User Fee" id="userFeePerAccount" value={inputs.userFeePerAccount} onChange={(v) => updateInput('userFeePerAccount', v)} min={0} step={0.01} unit="$" placeholder="5.83" />
            <InputField label="Data Fee" id="dataFeePerAccount" value={inputs.dataFeePerAccount} onChange={(v) => updateInput('dataFeePerAccount', v)} min={0} step={0.001} unit="$" placeholder="2.073" />
            <InputField label="Account Fee" id="accountFeePerAccount" value={inputs.accountFeePerAccount} onChange={(v) => updateInput('accountFeePerAccount', v)} min={0} step={0.01} unit="$" placeholder="3.5" />
            <InputField label="Staffing %" id="staffingFeePercent" value={inputs.staffingFeePercent} onChange={(v) => updateInput('staffingFeePercent', v)} min={0} max={100} step={0.01} unit="%" placeholder="3.5" />
            <InputField label="Processor %" id="processorFeePercent" value={inputs.processorFeePercent} onChange={(v) => updateInput('processorFeePercent', v)} min={0} max={100} step={0.01} unit="%" placeholder="5.25" />
            <InputField label="Affiliate %" id="affiliateFeePercent" value={inputs.affiliateFeePercent} onChange={(v) => updateInput('affiliateFeePercent', v)} min={0} max={100} step={0.01} unit="%" placeholder="3" />
            <InputField label="Live Allocation %" id="liveAllocationPercent" value={inputs.liveAllocationPercent} onChange={(v) => updateInput('liveAllocationPercent', v)} min={0} max={100} step={0.01} unit="%" placeholder="2" />
          </div>
        )}
      </div>
    </>
  )

  const actionBar = (
    <div className="flex justify-between items-center gap-3 p-4 border-t border-border bg-surface">
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-lg border border-border text-text_primary hover:bg-surface_hover text-sm font-medium transition-colors"
      >
        Close
      </button>
      <button
        onClick={() => { onRun(); onClose() }}
        className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60 hover:bg-primary/90 transition-colors"
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Save & Run'}
      </button>
    </div>
  )

  return (
    <div ref={popoverRef}>
      {/* ── Mobile: full-screen drawer ── */}
      <div className="md:hidden fixed inset-0 z-50">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        {/* Drawer */}
        <div className="absolute inset-y-0 left-0 w-full max-w-sm bg-card shadow-xl flex flex-col animate-slide-in-left">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text_primary">Variables</h2>
            <div className="flex items-center gap-2">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => toggleTheme()}
                className="p-2 rounded-lg text-text_secondary hover:text-text_primary hover:bg-surface transition-colors"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg text-text_secondary hover:text-text_primary hover:bg-surface transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {formContent}
          </div>
          {/* Sticky footer */}
          {actionBar}
        </div>
      </div>

      {/* ── Desktop: positioned popover ── */}
      <div
        className="hidden md:block absolute z-50 w-full max-w-sm bg-card border border-border rounded-2xl shadow-card"
        style={{ top: position.top, left: position.left }}
      >
        <div
          className="absolute -top-2 w-4 h-4 bg-card border-l border-t border-border rotate-45"
          style={{ left: Math.max(16, Math.min((position.caret ?? 32), 320)) }}
        />
        <button
          aria-label="Close variables"
          onClick={onClose}
          className="absolute top-3 right-3 text-text_secondary hover:text-text_primary text-lg"
        >
          &times;
        </button>
        <div className="p-4 pt-6 space-y-4">
          {formContent}
        </div>
        <div className="rounded-b-2xl overflow-hidden">
          {actionBar}
        </div>
      </div>
    </div>
  )
}
