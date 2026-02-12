import React, { useMemo, useState } from 'react'
import { useSimulationContext } from '../context/SimulationContext'
import { calculateMargins } from '../utils/calculations'

interface AssistantDrawerProps {
  isOpen: boolean
  onClose: () => void
  // Contour controls
  xVariable: string
  yVariable: string
  setXVariable: (v: string) => void
  setYVariable: (v: string) => void
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  setXMin: (v: number) => void
  setXMax: (v: number) => void
  setYMin: (v: number) => void
  setYMax: (v: number) => void
  targetMargin: number
  setTargetMarginString: (v: string) => void
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

export default function AssistantDrawer(props: AssistantDrawerProps) {
  const { isOpen, onClose } = props
  const { inputs, updateInput } = useSimulationContext()
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [text, setText] = useState('')

  const parsedInputs = useMemo(() => {
    const toNum = (v: any, d: number) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : d
    }
    const evalPassRate = toNum(inputs.evalPassRate, 10) / 100
    const simFundedRate = toNum((inputs as any).simFundedRate, 50) / 100
    const ptr = evalPassRate * simFundedRate
    return {
      evalPrice: toNum(inputs.evalPrice, 100),
      purchaseToPayoutRate: ptr,
      avgPayout: toNum(inputs.avgPayout, 5000),
      useActivationFee: !!inputs.useActivationFee,
      activationFee: toNum(inputs.activationFee, 200),
      evalPassRate,
      userFeePerAccount: toNum(inputs.userFeePerAccount, 5.83),
      dataFeePerAccount: toNum(inputs.dataFeePerAccount, 2.073),
      accountFeePerAccount: toNum(inputs.accountFeePerAccount, 3.5),
      staffingFeePercent: toNum(inputs.staffingFeePercent, 3.5),
      processorFeePercent: toNum(inputs.processorFeePercent, 5.25),
      affiliateFeePercent: toNum(inputs.affiliateFeePercent, 3),
      liveAllocationPercent: toNum(inputs.liveAllocationPercent, 2),
      affiliateAppliesToActivation: !!inputs.affiliateAppliesToActivation
    }
  }, [inputs])

  function formatPercent(dec: number) {
    return `${(dec * 100).toFixed(1)}%`
  }

  function analyze(): string {
    const res = calculateMargins(
      parsedInputs.evalPrice,
      parsedInputs.purchaseToPayoutRate,
      parsedInputs.avgPayout,
      parsedInputs.useActivationFee,
      parsedInputs.activationFee,
      parsedInputs.evalPassRate,
      parsedInputs.userFeePerAccount,
      parsedInputs.dataFeePerAccount,
      parsedInputs.accountFeePerAccount,
      parsedInputs.staffingFeePercent,
      parsedInputs.processorFeePercent,
      parsedInputs.affiliateFeePercent,
      parsedInputs.liveAllocationPercent,
      parsedInputs.affiliateAppliesToActivation
    )
    return `Current margin ${formatPercent(res.priceMargin)} | Gross ${res.grossRevenue.toFixed(2)} | Cost ${res.totalCost.toFixed(2)} | Net ${res.netRevenue.toFixed(2)}`
  }

  async function handleCommand(raw: string) {
    const cmd = raw.trim()
    setMessages(prev => [...prev, { role: 'user', content: raw }])

    // Try LLM first
    try {
      const resp = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: cmd, context: { inputs, x: { var: props.xVariable, min: props.xMin, max: props.xMax }, y: { var: props.yVariable, min: props.yMin, max: props.yMax }, target: props.targetMargin } })
      })
      if (resp.ok) {
        const json = await resp.json()
        const actions = Array.isArray(json.actions) ? json.actions : []
        for (const a of actions) {
          if (a.type === 'set_input') updateInput(a.target as any, a.value)
          if (a.type === 'set_axis' && a.target === 'x') props.setXVariable(String(a.value))
          if (a.type === 'set_axis' && a.target === 'y') props.setYVariable(String(a.value))
          if (a.type === 'set_range' && a.target === 'x' && Array.isArray(a.range)) { props.setXMin(Number(a.range[0])); props.setXMax(Number(a.range[1])) }
          if (a.type === 'set_range' && a.target === 'y' && Array.isArray(a.range)) { props.setYMin(Number(a.range[0])); props.setYMax(Number(a.range[1])) }
          if (a.type === 'set_target') props.setTargetMarginString(String(a.value))
        }
        setMessages(prev => [...prev, { role: 'assistant', content: json.analysis || analyze() }])
        setText('')
        return
      }
    } catch {}

    // Basic intents fallback
    const lower = cmd.toLowerCase()
    let handled = false

    // Set inputs
    const setNum = (field: any, num: number | null) => {
      if (num === null || !Number.isFinite(num)) return
      updateInput(field, String(num))
    }
    const match = (re: RegExp) => lower.match(re)

    // eval price
    const mPrice = match(/(eval|price)[^0-9]*([0-9]+(?:\.[0-9]+)?)/)
    if (mPrice) { setNum('evalPrice', parseFloat(mPrice[2])); handled = true }

    // avg payout
    const mPayout = match(/(avg\s*payout|payout)[^0-9]*([0-9]+(?:\.[0-9]+)?)/)
    if (mPayout) { setNum('avgPayout', parseFloat(mPayout[2])); handled = true }

    // eval pass rate %
    const mPass = match(/(eval\s*pass|pass\s*rate)[^0-9]*([0-9]+(?:\.[0-9]+)?)%?/)
    if (mPass) { setNum('evalPassRate', parseFloat(mPass[2])); handled = true }

    // sim funded rate %
    const mFund = match(/(funded\s*rate|sim\s*funded)[^0-9]*([0-9]+(?:\.[0-9]+)?)%?/)
    if (mFund) { setNum('simFundedRate', parseFloat(mFund[2])); handled = true }

    // activation fee toggle/value
    if (/activate|activation/.test(lower)) {
      if (/off/.test(lower)) updateInput('useActivationFee', false)
      if (/on/.test(lower)) updateInput('useActivationFee', true)
      const mAct = match(/(activation)[^0-9]*([0-9]+(?:\.[0-9]+)?)/)
      if (mAct) setNum('activationFee', parseFloat(mAct[2]))
      handled = true
    }

    // contour axes
    const mX = match(/x\s*[:=\s]+(eval\s*price|avg\s*payout|purchase.*payout|ptr|activation)/)
    if (mX) {
      const key = normalizeVar(mX[1])
      props.setXVariable(key); handled = true
    }
    const mY = match(/y\s*[:=\s]+(eval\s*price|avg\s*payout|purchase.*payout|ptr|activation)/)
    if (mY) {
      const key = normalizeVar(mY[1])
      props.setYVariable(key); handled = true
    }

    // axis ranges
    const mXR = match(/x\s*range[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*[-to]+\s*([0-9]+(?:\.[0-9]+)?)/)
    if (mXR) { props.setXMin(parseFloat(mXR[1])); props.setXMax(parseFloat(mXR[2])); handled = true }
    const mYR = match(/y\s*range[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*[-to]+\s*([0-9]+(?:\.[0-9]+)?)/)
    if (mYR) { props.setYMin(parseFloat(mYR[1])); props.setYMax(parseFloat(mYR[2])); handled = true }

    // target margin
    const mTarget = match(/target[^0-9]*([0-9]+(?:\.[0-9]+)?)%?/)
    if (mTarget) { props.setTargetMarginString(mTarget[1]); handled = true }

    const analysis = analyze()
    setMessages(prev => [...prev, { role: 'assistant', content: handled ? `Applied. ${analysis}` : `I updated nothing. ${analysis}` }])
    setText('')
  }

  function normalizeVar(label: string): string {
    const t = label.toLowerCase()
    if (t.includes('eval')) return 'evalPrice'
    if (t.includes('avg')) return 'avgPayout'
    if (t.includes('activation')) return 'activationFee'
    return 'purchaseToPayoutRate'
  }

  return (
    <div className={`fixed inset-0 z-40 ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
      />
      {/* Drawer */}
      <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-card transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-text_secondary">AI Assistant</h3>
          <button className="text-text_secondary hover:text-primary text-sm transition-colors" onClick={onClose}>Close</button>
        </div>
        <div className="p-4 h-[calc(100%-7rem)] overflow-y-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-text_secondary text-sm">Ask me to change inputs, axes, ranges, or target margin. Example: "set eval price to 120", "target 45", "x range 0-10".</div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`p-3 rounded-xl ${m.role === 'user' ? 'bg-surface' : 'bg-surface/50 border border-border'}`}>
              <div className="text-xs text-text_secondary mb-1">{m.role === 'user' ? 'You' : 'Assistant'}</div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-border flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) handleCommand(text) }}
            className="flex-1 p-2 rounded-lg bg-card text-text_primary border border-border transition-colors"
            placeholder="Type a request and press Enter"
          />
          <button
            onClick={() => text.trim() && handleCommand(text)}
            className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >Send</button>
        </div>
      </div>
    </div>
  )
}


