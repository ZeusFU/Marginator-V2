import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import { 
  calculateMargins, 
  find50PercentMarginValue,
  findTargetMarginValue,
  findThresholdValue,
  findMarginThresholds,
  generateSimulationData,
  adaptiveSampleRange
} from '../utils/calculations'
import { SIMULATION_STEPS, VisibleMarginsState } from '../utils/types'

// Types
interface SimulationInputs {
  evalPrice: number | string
  evalPassRate: number | string
  simFundedRate: number | string
  avgPayout: number | string
  useActivationFee: boolean
  activationFee: number | string
  // Company costs
  userFeePerAccount: number | string
  dataFeePerAccount: number | string
  accountFeePerAccount: number | string
  staffingFeePercent: number | string
  processorFeePercent: number | string
  affiliateFeePercent: number | string
  liveAllocationPercent: number | string
  affiliateAppliesToActivation: boolean
}

interface SimulationResults {
  evaluationPriceData: {
    values: number[]
    priceMargins: number[]
    revenue: number[]
    cost: number[]
    netRevenue: number[]
    totalRevenue: number[]
    totalNetRevenue: number[]
  }
  purchaseToPayoutRateData: {
    values: number[]
    priceMargins: number[]
    revenue: number[]
    cost: number[]
    netRevenue: number[]
    totalRevenue: number[]
    totalNetRevenue: number[]
  }
  averagePayoutData: {
    values: number[]
    priceMargins: number[]
    revenue: number[]
    cost: number[]
    netRevenue: number[]
    totalRevenue: number[]
    totalNetRevenue: number[]
  }
  payoutRateData: {
    combinationsPM: Array<{x: number, y: number}>
  }
  evalPriceRateData: {
    results: Array<{
      evalPrice: number
      dataPoints: Array<{x: number, y: number}>
    }>
  }
  baseMargins: any
  purchaseToPayoutRate: number
  evaluationPriceThresholds: any
  purchaseToPayoutRateThresholds: any
  averagePayoutThresholds: any
  exactThresholds: any
}

// Comparison plan types
interface ComparisonPlan {
  id: string
  name: string
  evalPrice: number | string
  evalPassRate: number | string
  simFundedRate: number | string
  avgPayout: number | string
  useActivationFee: boolean
  activationFee: number | string
}

interface ComparisonPlanSimulation {
  id: string
  name: string
  evaluationPriceData: {
    values: number[]
    priceMargins: number[]
    revenue: number[]
    cost: number[]
    netRevenue: number[]
    totalRevenue: number[]
    totalNetRevenue: number[]
  }
  purchaseToPayoutRateData: {
    values: number[]
    priceMargins: number[]
    revenue: number[]
    cost: number[]
    netRevenue: number[]
    totalRevenue: number[]
    totalNetRevenue: number[]
  }
  averagePayoutData: {
    values: number[]
    priceMargins: number[]
    revenue: number[]
    cost: number[]
    netRevenue: number[]
    totalRevenue: number[]
    totalNetRevenue: number[]
  }
  payoutRateData: {
    combinationsPM: Array<{x: number, y: number}>
  }
  evalPriceRateData: {
    results: Array<{
      evalPrice: number
      dataPoints: Array<{x: number, y: number}>
    }>
  }
  evaluationPriceThresholds: any
  purchaseToPayoutRateThresholds: any
  averagePayoutThresholds: any
  exactThresholds: any
  baseMargins: any
  purchaseToPayoutRate: number
}

// Context type definition
interface SimulationContextType {
  inputs: SimulationInputs
  updateInput: (field: keyof SimulationInputs, value: any) => void
  resetInputs: () => void
  isLoading: boolean
  error: string | null
  results: SimulationResults | null
  runSimulation: () => SimulationResults | null
  visibleMargins: VisibleMarginsState
  toggleMargin: (chart: keyof VisibleMarginsState, margin: 'priceMargin') => void
  isComparisonMode: boolean
  comparisonPlans: ComparisonPlan[]
  selectedComparisonPlans: string[]
  comparisonSimulations: ComparisonPlanSimulation[]
  isComparingSimulations: boolean
  comparisonError: string | null
  toggleComparisonMode: () => void
  addComparisonPlan: () => void
  removeComparisonPlan: (id: string) => void
  duplicatePlan: (id: string) => void
  togglePlanSelection: (id: string) => void
  updateComparisonPlan: (id: string, field: keyof ComparisonPlan, value: any) => void
  calculateComparisonSimulations: () => void
  chartMarginTarget: number
  setChartMarginTarget: (percent: number) => void
}

const SimulationContext = createContext<SimulationContextType | null>(null)

const defaultInputs: SimulationInputs = {
  evalPrice: '',
  evalPassRate: '',
  simFundedRate: '',
  avgPayout: '',
  useActivationFee: false,
  activationFee: '',
  userFeePerAccount: '',
  dataFeePerAccount: '',
  accountFeePerAccount: '',
  staffingFeePercent: '',
  processorFeePercent: '',
  affiliateFeePercent: '',
  liveAllocationPercent: '',
  affiliateAppliesToActivation: false
}

const generateId = () => `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputs] = useState<SimulationInputs>(defaultInputs)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SimulationResults | null>(null)
  
  const [visibleMargins, setVisibleMargins] = useState<VisibleMarginsState>({
    evalPrice: { priceMargin: true },
    ptrRate: { priceMargin: true },
    avgPayout: { priceMargin: true },
    payoutRate: { priceMargin: true },
    evalPriceRate: { priceMargin: true },
  })
  
  const [isComparisonMode, setIsComparisonMode] = useState(false)
  const [comparisonPlans, setComparisonPlans] = useState<ComparisonPlan[]>([])
  const [selectedComparisonPlans, setSelectedComparisonPlans] = useState<string[]>([])
  const [comparisonSimulations, setComparisonSimulations] = useState<ComparisonPlanSimulation[]>([])
  const [isComparingSimulations, setIsComparingSimulations] = useState(false)
  const [comparisonError, setComparisonError] = useState<string | null>(null)
  const [chartMarginTarget, setChartMarginTarget] = useState<number>(50)
  
  const updateInput = (field: keyof SimulationInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }))
  }
  
  const resetInputs = () => {
    setInputs(defaultInputs)
    setResults(null)
  }
  
  const toggleMargin = (chart: keyof VisibleMarginsState, margin: 'priceMargin') => {
    setVisibleMargins(prev => ({
      ...prev,
      [chart]: { ...prev[chart], [margin]: !prev[chart][margin] }
    }))
  }
  
  const toNumber = (value: string | number): number => {
    if (typeof value === 'string') {
      return value === '' ? 0.01 : Number(value) || 0.01
    }
    return value || 0.01
  }

  // Helper: build the common company-cost args array
  const companyCosts = () => {
    const userFee = inputs.userFeePerAccount === '' ? 5.83 : toNumber(inputs.userFeePerAccount)
    const dataFee = inputs.dataFeePerAccount === '' ? 2.073 : toNumber(inputs.dataFeePerAccount)
    const accountFee = inputs.accountFeePerAccount === '' ? 3.5 : toNumber(inputs.accountFeePerAccount)
    const staffing = inputs.staffingFeePercent === '' ? 3.5 : toNumber(inputs.staffingFeePercent)
    const processor = inputs.processorFeePercent === '' ? 5.25 : toNumber(inputs.processorFeePercent)
    const affiliate = inputs.affiliateFeePercent === '' ? 3 : toNumber(inputs.affiliateFeePercent)
    const liveAlloc = inputs.liveAllocationPercent === '' ? 2 : toNumber(inputs.liveAllocationPercent)
    const affApplies = !!inputs.affiliateAppliesToActivation
    return { userFee, dataFee, accountFee, staffing, processor, affiliate, liveAlloc, affApplies }
  }

  // Shorthand: call calculateMargins with full params
  const calc = (
    ep: number, ptr: number, ap: number,
    useAct: boolean, actFee: number, epr: number,
    cc: ReturnType<typeof companyCosts>
  ) => calculateMargins(
    ep, ptr, ap, useAct, actFee, epr,
    cc.userFee, cc.dataFee, cc.accountFee,
    cc.staffing, cc.processor, cc.affiliate, cc.liveAlloc, cc.affApplies
  )
  
  const runSimulation = () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const evalPriceNum = toNumber(inputs.evalPrice)
      const evalPassRateNum = toNumber(inputs.evalPassRate) / 100
      const simFundedRateNum = toNumber(inputs.simFundedRate) / 100
      const avgPayoutNum = toNumber(inputs.avgPayout)
      const activationFeeNum = inputs.useActivationFee ? toNumber(inputs.activationFee) : 0
      const cc = companyCosts()
      
      if (isNaN(evalPriceNum) || evalPriceNum <= 0) throw new Error('Evaluation price must be a positive number')
      if (isNaN(evalPassRateNum) || evalPassRateNum < 0 || evalPassRateNum > 1) throw new Error('Evaluation pass rate must be between 0% and 100%')
      if (isNaN(simFundedRateNum) || simFundedRateNum < 0 || simFundedRateNum > 1) throw new Error('Sim to funded rate must be between 0% and 100%')
      if (isNaN(avgPayoutNum) || avgPayoutNum < 0) throw new Error('Average payout must be a non-negative number')
      if (inputs.useActivationFee && (isNaN(activationFeeNum) || activationFeeNum < 0)) throw new Error('Activation fee must be a non-negative number when enabled')
      
      const purchaseToPayoutRate = evalPassRateNum * simFundedRateNum
      const useAct = inputs.useActivationFee
      
      const baseMargins = calc(evalPriceNum, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum, cc)
      
      // ── Eval Price data ──
      const evaluationPriceData = { values: [] as number[], priceMargins: [] as number[], revenue: [] as number[], cost: [] as number[], netRevenue: [] as number[], totalRevenue: [] as number[], totalNetRevenue: [] as number[] }
      try {
        const center = findThresholdValue(
          "Eval Price",
          (v) => calc(v, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum, cc).priceMargin,
          chartMarginTarget / 100, evalPriceNum, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum
        ) || evalPriceNum
        const epMin = Math.max(10, center * 0.1)
        const epMax = Math.max(center * 2, epMin + 1)
        const values = adaptiveSampleRange(epMin, epMax,
          (x) => calc(x, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum, cc).priceMargin,
          chartMarginTarget / 100, 60, 3, 0.5)
        for (const ep of values) {
          const m = calc(ep, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum, cc)
          evaluationPriceData.values.push(ep)
          evaluationPriceData.priceMargins.push(m.priceMargin * 100)
          evaluationPriceData.revenue.push(m.grossRevenue)
          evaluationPriceData.cost.push(m.totalCost)
          evaluationPriceData.netRevenue.push(m.netRevenue)
          evaluationPriceData.totalRevenue.push(m.grossRevenue)
          evaluationPriceData.totalNetRevenue.push(m.netRevenue)
        }
      } catch (err) { console.error('Error generating evaluation price data:', err) }
      
      // ── PTR data ──
      const purchaseToPayoutRateData = { values: [] as number[], priceMargins: [] as number[], revenue: [] as number[], cost: [] as number[], netRevenue: [] as number[], totalRevenue: [] as number[], totalNetRevenue: [] as number[] }
      try {
        const values = adaptiveSampleRange(0, 1,
          (v) => calc(evalPriceNum, v, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum, cc).priceMargin,
          chartMarginTarget / 100, 60, 3, 0.5)
        for (const rate of values) {
          const m = calc(evalPriceNum, rate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum, cc)
          purchaseToPayoutRateData.values.push(rate)
          purchaseToPayoutRateData.priceMargins.push(m.priceMargin * 100)
          purchaseToPayoutRateData.revenue.push(m.grossRevenue)
          purchaseToPayoutRateData.cost.push(m.totalCost)
          purchaseToPayoutRateData.netRevenue.push(m.netRevenue)
          purchaseToPayoutRateData.totalRevenue.push(m.grossRevenue)
          purchaseToPayoutRateData.totalNetRevenue.push(m.netRevenue)
        }
      } catch (err) { console.error('Error generating PTR data:', err) }
      
      // ── Avg Payout data ──
      const averagePayoutData = { values: [] as number[], priceMargins: [] as number[], revenue: [] as number[], cost: [] as number[], netRevenue: [] as number[], totalRevenue: [] as number[], totalNetRevenue: [] as number[] }
      try {
        const payoutCenter = findThresholdValue(
          "Avg Payout",
          (v) => calc(evalPriceNum, purchaseToPayoutRate, v, useAct, activationFeeNum, evalPassRateNum, cc).priceMargin,
          chartMarginTarget / 100, evalPriceNum, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum
        ) || Math.max(500, avgPayoutNum)
        const apMin = 500
        const apMax = Math.max(5000, payoutCenter * 10)
        const values = adaptiveSampleRange(apMin, apMax,
          (p) => calc(evalPriceNum, purchaseToPayoutRate, p, useAct, activationFeeNum, evalPassRateNum, cc).priceMargin,
          chartMarginTarget / 100, 60, 3, 0.5)
        for (const payout of values) {
          const m = calc(evalPriceNum, purchaseToPayoutRate, payout, useAct, activationFeeNum, evalPassRateNum, cc)
          averagePayoutData.values.push(payout)
          averagePayoutData.priceMargins.push(m.priceMargin * 100)
          averagePayoutData.revenue.push(m.grossRevenue)
          averagePayoutData.cost.push(m.totalCost)
          averagePayoutData.netRevenue.push(m.netRevenue)
          averagePayoutData.totalRevenue.push(m.grossRevenue)
          averagePayoutData.totalNetRevenue.push(m.netRevenue)
        }
      } catch (err) { console.error('Error generating average payout data:', err) }
      
      // ── Payout rate combination data ──
      const targetFrac = chartMarginTarget / 100
      const payoutRateData = { combinationsPM: [] as Array<{x: number, y: number}> }
      try {
        const rateValues = Array.from({ length: 30 }, (_, i) => 0.01 + i * 0.01)
        for (const rate of rateValues) {
          const payout = findThresholdValue(
            "Avg Payout",
            (p) => calc(evalPriceNum, rate, p, useAct, activationFeeNum, evalPassRateNum, cc).priceMargin,
            targetFrac, evalPriceNum, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum
          )
          if (payout !== null && payout > 0) payoutRateData.combinationsPM.push({ x: rate, y: payout })
        }
      } catch (err) { console.error('Error generating payout rate data:', err) }
      
      // ── Eval price × rate data ──
      // For different eval prices, find the max purchase-to-payout rate that achieves target margin
      // Each curve holds avg payout constant at the current value
      const evalPriceRateData = { results: [] as Array<{ evalPrice: number, dataPoints: Array<{x: number, y: number}> }> }
      try {
        const step = Math.max(10, Math.round(evalPriceNum * 0.15))
        const epStart = Math.max(10, Math.round(evalPriceNum * 0.3))
        const epEnd = Math.round(evalPriceNum * 2)
        const evalPrices = Array.from({ length: 30 }, (_, i) => epStart + (epEnd - epStart) * (i / 29))

        // Generate curves for a few avg-payout levels
        const payoutLevels = [
          Math.round(avgPayoutNum * 0.5),
          Math.round(avgPayoutNum * 0.75),
          avgPayoutNum,
          Math.round(avgPayoutNum * 1.25),
          Math.round(avgPayoutNum * 1.5),
        ].filter((v, i, a) => v > 0 && a.indexOf(v) === i)

        for (const payout of payoutLevels) {
          const dataPoints: Array<{x: number, y: number}> = []
          for (const ep of evalPrices) {
            const rate = findThresholdValue(
              "Purchase to Payout Rate",
              (r) => calc(ep, r, payout, useAct, activationFeeNum, evalPassRateNum, cc).priceMargin,
              targetFrac, evalPriceNum, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum
            )
            if (rate !== null && rate > 0 && rate <= 1) dataPoints.push({ x: ep, y: rate })
          }
          if (dataPoints.length > 1) {
            evalPriceRateData.results.push({ evalPrice: payout, dataPoints })
          }
        }
      } catch (err) { console.error('Error generating eval price rate data:', err) }
      
      // ── Thresholds ──
      const evaluationPriceThresholds = findMarginThresholds(
        evaluationPriceData.values, evaluationPriceData.priceMargins.map(m => m / 100), targetFrac)
      const purchaseToPayoutRateThresholds = findMarginThresholds(
        purchaseToPayoutRateData.values, purchaseToPayoutRateData.priceMargins.map(m => m / 100), targetFrac)
      const averagePayoutThresholds = findMarginThresholds(
        averagePayoutData.values, averagePayoutData.priceMargins.map(m => m / 100), targetFrac)
      
      const exactThresholds = {
        breakEvenEvalPrice: findThresholdValue(
          "Eval Price",
          (v) => calc(v, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum, cc).priceMargin,
          0, evalPriceNum, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum),
        targetMarginEvalPrice: findTargetMarginValue(
          "Eval Price", evalPriceNum, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum,
          targetFrac, cc.userFee, cc.dataFee, cc.accountFee, cc.staffing, cc.processor, cc.affiliate, cc.liveAlloc, cc.affApplies),
        breakEvenPtrRate: findThresholdValue(
          "Purchase to Payout Rate",
          (v) => calc(evalPriceNum, v, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum, cc).priceMargin,
          0, evalPriceNum, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum),
        breakEvenAvgPayout: findThresholdValue(
          "Avg Payout",
          (v) => calc(evalPriceNum, purchaseToPayoutRate, v, useAct, activationFeeNum, evalPassRateNum, cc).priceMargin,
          0, evalPriceNum, purchaseToPayoutRate, avgPayoutNum, useAct, activationFeeNum, evalPassRateNum)
      }
      
      const results: SimulationResults = {
        baseMargins,
        purchaseToPayoutRate,
        evaluationPriceData,
        purchaseToPayoutRateData,
        averagePayoutData,
        payoutRateData,
        evalPriceRateData,
        evaluationPriceThresholds,
        purchaseToPayoutRateThresholds,
        averagePayoutThresholds,
        exactThresholds
      }
      
      setResults(results)
      setIsLoading(false)
      return results
    } catch (err) {
      console.error('Simulation error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during simulation')
      setIsLoading(false)
      return null
    }
  }
  
  // ── Comparison mode ──
  const toggleComparisonMode = () => {
    setIsComparisonMode(prev => !prev)
    if (!isComparisonMode && comparisonPlans.length === 0) {
      const currentPlan: ComparisonPlan = {
        id: generateId(),
        name: 'Current Plan',
        evalPrice: inputs.evalPrice,
        evalPassRate: inputs.evalPassRate,
        simFundedRate: inputs.simFundedRate,
        avgPayout: inputs.avgPayout,
        useActivationFee: inputs.useActivationFee,
        activationFee: inputs.activationFee,
      }
      setComparisonPlans([currentPlan])
      setSelectedComparisonPlans([currentPlan.id])
    }
  }
  
  const addComparisonPlan = () => {
    const newPlan: ComparisonPlan = {
      id: generateId(),
      name: `Plan ${comparisonPlans.length + 1}`,
      evalPrice: '',
      evalPassRate: '',
      simFundedRate: '',
      avgPayout: '',
      useActivationFee: false,
      activationFee: '',
    }
    setComparisonPlans(prev => [...prev, newPlan])
  }
  
  const removeComparisonPlan = (id: string) => {
    setComparisonPlans(prev => prev.filter(plan => plan.id !== id))
    setSelectedComparisonPlans(prev => prev.filter(planId => planId !== id))
  }
  
  const duplicatePlan = (id: string) => {
    const planToDuplicate = comparisonPlans.find(plan => plan.id === id)
    if (!planToDuplicate) return
    const newPlan: ComparisonPlan = { ...planToDuplicate, id: generateId(), name: `${planToDuplicate.name} (Copy)` }
    setComparisonPlans(prev => [...prev, newPlan])
    setSelectedComparisonPlans(prev => [...prev, newPlan.id])
  }
  
  const togglePlanSelection = (id: string) => {
    setSelectedComparisonPlans(prev => prev.includes(id) ? prev.filter(planId => planId !== id) : [...prev, id])
  }
  
  const updateComparisonPlan = (id: string, field: keyof ComparisonPlan, value: any) => {
    setComparisonPlans(prev => prev.map(plan => plan.id === id ? { ...plan, [field]: value } : plan))
  }
  
  const calculateComparisonSimulations = () => {
    setIsComparingSimulations(true)
    setComparisonError(null)
    try {
      const originalInputs = { ...inputs }
      const simulations: ComparisonPlanSimulation[] = []
      for (const planId of selectedComparisonPlans) {
        const plan = comparisonPlans.find(p => p.id === planId)
        if (!plan) continue
        const planInputs: any = {
          evalPrice: plan.evalPrice,
          evalPassRate: plan.evalPassRate,
          simFundedRate: plan.simFundedRate,
          avgPayout: plan.avgPayout,
          useActivationFee: plan.useActivationFee,
          activationFee: plan.activationFee,
        }
        setInputs(prev => ({ ...prev, ...planInputs }))
        const results = runSimulation()
        if (results) simulations.push({ id: plan.id, name: plan.name, ...results })
      }
      setInputs(originalInputs)
      setComparisonSimulations(simulations)
      runSimulation()
      setIsComparingSimulations(false)
    } catch (err) {
      console.error('Comparison simulation error:', err)
      setComparisonError(err instanceof Error ? err.message : 'An error occurred during comparison')
      setIsComparingSimulations(false)
    }
  }
  
  const contextValue = useMemo(() => ({
    inputs, updateInput, resetInputs,
    isLoading, error, results, runSimulation,
    visibleMargins, toggleMargin,
    isComparisonMode, comparisonPlans, selectedComparisonPlans,
    comparisonSimulations, isComparingSimulations, comparisonError,
    toggleComparisonMode, addComparisonPlan, removeComparisonPlan,
    duplicatePlan, togglePlanSelection, updateComparisonPlan,
    calculateComparisonSimulations,
    chartMarginTarget, setChartMarginTarget
  }), [
    inputs, isLoading, error, results,
    visibleMargins,
    isComparisonMode, comparisonPlans, selectedComparisonPlans,
    comparisonSimulations, isComparingSimulations, comparisonError,
    chartMarginTarget
  ])
  
  return (
    <SimulationContext.Provider value={contextValue}>
      {children}
    </SimulationContext.Provider>
  )
}

export function useSimulationContext() {
  const context = useContext(SimulationContext)
  if (!context) throw new Error('useSimulationContext must be used within SimulationProvider')
  return context
}

export function useSimulation() {
  return useSimulationContext()
}
