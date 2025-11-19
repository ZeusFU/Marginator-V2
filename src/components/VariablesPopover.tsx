import React, { useState } from 'react'
import { Settings, DollarSign, Percent, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { useSimulationContext } from '../context/SimulationContext'
import InputField from './InputField'

interface VariablesPopoverProps {
  isOpen: boolean
  onClose: () => void
  onRun: () => void
  position?: { top: number; left: number }
  popoverRef: React.RefObject<HTMLDivElement>
}

export function VariablesPopover({ isOpen, onClose, onRun, position = { top: 70, left: 16 }, popoverRef }: VariablesPopoverProps) {
  const { inputs, updateInput, isLoading } = useSimulationContext()
  const [showCompanyCosts, setShowCompanyCosts] = useState(false)

  if (!isOpen) return null

  return (
    <div
      ref={popoverRef}
      className="absolute z-40 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl"
      style={{ top: position.top, left: position.left }}
    >
      <div className="absolute -top-2 left-12 w-4 h-4 bg-card border-l border-t border-border rotate-45" />
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text_primary">Input Parameters</h3>
            <p className="text-xs text-text_secondary">Adjust key variables to simulate margins</p>
          </div>
        </div>
        <button
          aria-label="Close variables"
          onClick={onClose}
          className="text-text_secondary hover:text-text_primary text-lg"
        >
          &times;
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Eval Price"
            id="evalPrice"
            value={inputs.evalPrice}
            onChange={(v) => updateInput('evalPrice', v)}
            min={1}
            step={1}
            unit="$"
            placeholder="Enter price"
          />
          <InputField
            label="Pass Rate"
            id="evalPassRate"
            value={inputs.evalPassRate}
            onChange={(v) => updateInput('evalPassRate', v)}
            min={0}
            max={100}
            step={0.01}
            unit="%"
            placeholder="10%"
          />
          <InputField
            label="Funded Rate"
            id="simFundedRate"
            value={inputs.simFundedRate}
            onChange={(v) => updateInput('simFundedRate', v)}
            min={0}
            max={100}
            step={0.01}
            unit="%"
            placeholder="5%"
          />
          <InputField
            label="Avg Payout"
            id="avgPayout"
            value={inputs.avgPayout}
            onChange={(v) => updateInput('avgPayout', v)}
            min={0}
            step={10}
            unit="$"
            placeholder="500"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => updateInput('useActivationFee', !inputs.useActivationFee)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border ${inputs.useActivationFee ? 'border-primary text-primary bg-primary/10' : 'border-border text-text_secondary hover:text-text_primary'}`}
          >
            <DollarSign className="w-4 h-4" />
            Activation Fee
          </button>
          <button
            onClick={() => updateInput('includeLive', !inputs.includeLive)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border ${inputs.includeLive ? 'border-primary text-primary bg-primary/10' : 'border-border text-text_secondary hover:text-text_primary'}`}
          >
            <Users className="w-4 h-4" />
            Live Accounts
          </button>
        </div>

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
              <InputField
                label="User Fee"
                id="userFeePerAccount"
                value={inputs.userFeePerAccount}
                onChange={(v) => updateInput('userFeePerAccount', v)}
                min={0}
                step={0.01}
                unit="$"
                placeholder="5.83"
              />
              <InputField
                label="Data Fee"
                id="dataFeePerAccount"
                value={inputs.dataFeePerAccount}
                onChange={(v) => updateInput('dataFeePerAccount', v)}
                min={0}
                step={0.001}
                unit="$"
                placeholder="2.073"
              />
              <InputField
                label="Account Fee"
                id="accountFeePerAccount"
                value={inputs.accountFeePerAccount}
                onChange={(v) => updateInput('accountFeePerAccount', v)}
                min={0}
                step={0.01}
                unit="$"
                placeholder="3.5"
              />
              <InputField
                label="Staffing %"
                id="staffingFeePercent"
                value={inputs.staffingFeePercent}
                onChange={(v) => updateInput('staffingFeePercent', v)}
                min={0}
                max={100}
                step={0.01}
                unit="%"
                placeholder="3.5"
              />
              <InputField
                label="Processor %"
                id="processorFeePercent"
                value={inputs.processorFeePercent}
                onChange={(v) => updateInput('processorFeePercent', v)}
                min={0}
                max={100}
                step={0.01}
                unit="%"
                placeholder="5.25"
              />
              <InputField
                label="Affiliate %"
                id="affiliateFeePercent"
                value={inputs.affiliateFeePercent}
                onChange={(v) => updateInput('affiliateFeePercent', v)}
                min={0}
                max={100}
                step={0.01}
                unit="%"
                placeholder="7.5"
              />
              <InputField
                label="Live Allocation %"
                id="liveAllocationPercent"
                value={inputs.liveAllocationPercent}
                onChange={(v) => updateInput('liveAllocationPercent', v)}
                min={0}
                max={100}
                step={0.01}
                unit="%"
                placeholder="4"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center gap-3 p-4 border-t border-border bg-surface">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-border text-text_primary hover:bg-card/70 text-sm font-medium"
        >
          Close
        </button>
        <button
          onClick={() => {
            onRun()
            onClose()
          }}
          className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Save & Run'}
        </button>
      </div>
    </div>
  )
}

