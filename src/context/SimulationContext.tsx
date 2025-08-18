import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import { 
  calculateMargins, 
  find50PercentMarginValue, 
  findThresholdValue,
  findMarginThresholds,
  generateSimulationData
} from '../utils/calculations'
import { SAMPLE_SIZE, SIMULATION_STEPS, VisibleMarginsState } from '../utils/types'

// Types
interface SimulationInputs {
  evalPrice: number | string
  evalPassRate: number | string
  simFundedRate: number | string
  avgPayout: number | string
  useActivationFee: boolean
  activationFee: number | string
  includeLive: boolean
  avgLiveSaved: number | string
  avgLivePayout: number | string
  // Company costs
  userFeePerAccount: number | string
  dataFeePerAccount: number | string
  accountFeePerAccount: number | string
  staffingCostPerAccount: number | string
  processorFeePercent: number | string
  affiliateFeePercent: number | string
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
  avgLiveSaved: number | string
  avgLivePayout: number | string
  includeLive: boolean
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
  // Inputs and simulation state
  inputs: SimulationInputs
  updateInput: (field: keyof SimulationInputs, value: any) => void
  resetInputs: () => void
  isLoading: boolean
  error: string | null
  results: SimulationResults | null
  runSimulation: () => SimulationResults | null
  
  // Chart visibility
  visibleMargins: VisibleMarginsState
  toggleMargin: (chart: keyof VisibleMarginsState, margin: 'priceMargin') => void
  
  // Comparison mode
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
}

// Create the context
const SimulationContext = createContext<SimulationContextType | null>(null)

// Default input values
const defaultInputs: SimulationInputs = {
  evalPrice: '',
  evalPassRate: '',
  simFundedRate: '',
  avgPayout: '',
  useActivationFee: false,
  activationFee: '',
  includeLive: false,
  avgLiveSaved: '',
  avgLivePayout: '',
  userFeePerAccount: '',
  dataFeePerAccount: '',
  accountFeePerAccount: '',
  staffingCostPerAccount: '',
  processorFeePercent: '',
  affiliateFeePercent: '',
  affiliateAppliesToActivation: false
}

// Helper function to generate a unique ID
const generateId = () => `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

// Provider component
export function SimulationProvider({ children }: { children: ReactNode }) {
  // Simulation state
  const [inputs, setInputs] = useState<SimulationInputs>(defaultInputs)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SimulationResults | null>(null)
  
  // Chart visibility state
  const [visibleMargins, setVisibleMargins] = useState<VisibleMarginsState>({
    evalPrice: { priceMargin: true },
    ptrRate: { priceMargin: true },
    avgPayout: { priceMargin: true },
    payoutRate: { priceMargin: true },
    evalPriceRate: { priceMargin: true },
    avgLivePayout: { priceMargin: true }
  })
  
  // Comparison mode state
  const [isComparisonMode, setIsComparisonMode] = useState(false)
  const [comparisonPlans, setComparisonPlans] = useState<ComparisonPlan[]>([])
  const [selectedComparisonPlans, setSelectedComparisonPlans] = useState<string[]>([])
  const [comparisonSimulations, setComparisonSimulations] = useState<ComparisonPlanSimulation[]>([])
  const [isComparingSimulations, setIsComparingSimulations] = useState(false)
  const [comparisonError, setComparisonError] = useState<string | null>(null)
  
  // Input update function
  const updateInput = (field: keyof SimulationInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }))
  }
  
  // Reset inputs function
  const resetInputs = () => {
    setInputs(defaultInputs)
    setResults(null)
  }
  
  // Toggle margin visibility
  const toggleMargin = (chart: keyof VisibleMarginsState, margin: 'priceMargin') => {
    setVisibleMargins(prev => ({
      ...prev,
      [chart]: {
        ...prev[chart],
        [margin]: !prev[chart][margin]
      }
    }))
  }
  
  // Helper function to convert string or number to number
  const toNumber = (value: string | number): number => {
    if (typeof value === 'string') {
      // Return a small positive value instead of 0 for empty strings
      // This avoids validation errors while still providing a sensible default
      return value === '' ? 0.01 : Number(value) || 0.01
    }
    return value || 0.01 // Ensure we don't return 0 or NaN
  }
  
  // Simulation run function
  const runSimulation = () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Parse inputs to numbers
      const evalPriceNum = toNumber(inputs.evalPrice)
      const evalPassRateNum = toNumber(inputs.evalPassRate) / 100 // Convert percentage to decimal
      const simFundedRateNum = toNumber(inputs.simFundedRate) / 100 // Convert percentage to decimal
      const avgPayoutNum = toNumber(inputs.avgPayout)
      const activationFeeNum = inputs.useActivationFee ? toNumber(inputs.activationFee) : 0
      const avgLiveSavedNum = toNumber(inputs.avgLiveSaved)
      const avgLivePayoutNum = toNumber(inputs.avgLivePayout)
      const userFeePerAccount = inputs.userFeePerAccount === '' ? 5.83 : toNumber(inputs.userFeePerAccount)
      const dataFeePerAccount = inputs.dataFeePerAccount === '' ? 1.467 : toNumber(inputs.dataFeePerAccount)
      const accountFeePerAccount = inputs.accountFeePerAccount === '' ? 3.5 : toNumber(inputs.accountFeePerAccount)
      const staffingCostPerAccount = inputs.staffingCostPerAccount === '' ? 3 : toNumber(inputs.staffingCostPerAccount)
      const processorFeePercent = inputs.processorFeePercent === '' ? 5.5 : toNumber(inputs.processorFeePercent)
      const affiliateFeePercent = inputs.affiliateFeePercent === '' ? 9.8 : toNumber(inputs.affiliateFeePercent)
      const affiliateAppliesToActivation = !!inputs.affiliateAppliesToActivation
      
      // Ensure key inputs are valid
      if (isNaN(evalPriceNum) || evalPriceNum <= 0) throw new Error('Evaluation price must be a positive number')
      if (isNaN(evalPassRateNum) || evalPassRateNum < 0 || evalPassRateNum > 1) throw new Error('Evaluation pass rate must be between 0% and 100%')
      if (isNaN(simFundedRateNum) || simFundedRateNum < 0 || simFundedRateNum > 1) throw new Error('Sim to funded rate must be between 0% and 100%')
      if (isNaN(avgPayoutNum) || avgPayoutNum < 0) throw new Error('Average payout must be a non-negative number')
      if (inputs.useActivationFee && (isNaN(activationFeeNum) || activationFeeNum < 0)) throw new Error('Activation fee must be a non-negative number when enabled')
      if (inputs.includeLive) {
        if (isNaN(avgLiveSavedNum) || avgLiveSavedNum < 0 || avgLiveSavedNum > 100) throw new Error('Average live saved must be between 0% and 100%')
        if (isNaN(avgLivePayoutNum) || avgLivePayoutNum < 0) throw new Error('Average live payout must be a non-negative number')
      }
      
      // Derive purchase to payout rate (ptr = evalPassRate × simFundedRate)
      const purchaseToPayoutRate = evalPassRateNum * simFundedRateNum
      
      // Calculate base margins using the input values
      const baseMargins = calculateMargins(
        evalPriceNum,
        purchaseToPayoutRate,
        avgPayoutNum,
        inputs.useActivationFee, // Use activation fee toggle
        activationFeeNum,
        evalPassRateNum,
        avgLiveSavedNum,
        avgLivePayoutNum,
        inputs.includeLive, // Use include live toggle
        userFeePerAccount,
        dataFeePerAccount,
        accountFeePerAccount,
        staffingCostPerAccount,
        processorFeePercent,
        affiliateFeePercent,
        affiliateAppliesToActivation
      )
      
      // Create objects to store simulation data
      const evaluationPriceData: {
        values: number[];
        priceMargins: number[];
        revenue: number[];
        cost: number[];
        netRevenue: number[];
        totalRevenue: number[];
        totalNetRevenue: number[];
      } = {
        values: [],
        priceMargins: [],
        revenue: [],
        cost: [],
        netRevenue: [],
        totalRevenue: [],
        totalNetRevenue: []
      }
      
      const purchaseToPayoutRateData: {
        values: number[];
        priceMargins: number[];
        revenue: number[];
        cost: number[];
        netRevenue: number[];
        totalRevenue: number[];
        totalNetRevenue: number[];
      } = {
        values: [],
        priceMargins: [],
        revenue: [],
        cost: [],
        netRevenue: [],
        totalRevenue: [],
        totalNetRevenue: []
      }
      
      const averagePayoutData: {
        values: number[];
        priceMargins: number[];
        revenue: number[];
        cost: number[];
        netRevenue: number[];
        totalRevenue: number[];
        totalNetRevenue: number[];
      } = {
        values: [],
        priceMargins: [],
        revenue: [],
        cost: [],
        netRevenue: [],
        totalRevenue: [],
        totalNetRevenue: []
      }
      
      const payoutRateData = {
        combinationsPM: [] as Array<{x: number, y: number}>
      }
      
      const evalPriceRateData = {
        results: [] as Array<{
          evalPrice: number,
          dataPoints: Array<{x: number, y: number}>
        }>
      }
      
      // Generate data for evaluation price chart
      try {
        // Generate evaluation price values (70% to 270% of base value)
        const values = generateSimulationData(evalPriceNum, 1.5, SIMULATION_STEPS)
        
        for (const evalPrice of values) {
          const margins = calculateMargins(
            evalPrice,
            purchaseToPayoutRate,
            avgPayoutNum,
            inputs.useActivationFee, // Use activation fee toggle
            activationFeeNum,
            evalPassRateNum,
            avgLiveSavedNum,
            avgLivePayoutNum,
            inputs.includeLive, // Use include live toggle
            userFeePerAccount,
            dataFeePerAccount,
            accountFeePerAccount,
            staffingCostPerAccount,
            processorFeePercent,
            affiliateFeePercent,
            affiliateAppliesToActivation
          )
          
          evaluationPriceData.values.push(evalPrice)
          evaluationPriceData.priceMargins.push(margins.priceMargin * 100) // Convert to percentage
          evaluationPriceData.revenue.push(margins.revenueEval)
          evaluationPriceData.cost.push(margins.cost)
          evaluationPriceData.netRevenue.push(margins.netRevenue)
          evaluationPriceData.totalRevenue.push(margins.grossRevenue)
          evaluationPriceData.totalNetRevenue.push(margins.netRevenue)
        }
      } catch (err) {
        console.error('Error generating evaluation price data:', err)
      }
      
      // Generate data for purchase to payout rate chart (0% to 100%)
      try {
        const values = Array.from({length: SIMULATION_STEPS}, (_, i) => i / (SIMULATION_STEPS - 1))
        
        for (const rate of values) {
          const margins = calculateMargins(
            evalPriceNum,
            rate,
            avgPayoutNum,
            inputs.useActivationFee, // Use activation fee toggle
            activationFeeNum,
            evalPassRateNum,
            avgLiveSavedNum,
            avgLivePayoutNum,
            inputs.includeLive, // Use include live toggle
            userFeePerAccount,
            dataFeePerAccount,
            accountFeePerAccount,
            staffingCostPerAccount,
            processorFeePercent,
            affiliateFeePercent,
            affiliateAppliesToActivation
          )
          
          purchaseToPayoutRateData.values.push(rate)
          purchaseToPayoutRateData.priceMargins.push(margins.priceMargin * 100) // Convert to percentage
          purchaseToPayoutRateData.revenue.push(margins.revenueEval)
          purchaseToPayoutRateData.cost.push(margins.cost)
          purchaseToPayoutRateData.netRevenue.push(margins.netRevenue)
          purchaseToPayoutRateData.totalRevenue.push(margins.grossRevenue)
          purchaseToPayoutRateData.totalNetRevenue.push(margins.netRevenue)
        }
      } catch (err) {
        console.error('Error generating purchase to payout rate data:', err)
      }
      
      // Generate data for average payout chart (0% to 300% of base value)
      try {
        const values = generateSimulationData(avgPayoutNum, 2.5, SIMULATION_STEPS)
        
        for (const payout of values) {
          const margins = calculateMargins(
            evalPriceNum,
            purchaseToPayoutRate,
            payout,
            inputs.useActivationFee, // Use activation fee toggle
            activationFeeNum,
            evalPassRateNum,
            avgLiveSavedNum,
            avgLivePayoutNum,
            inputs.includeLive, // Use include live toggle
            userFeePerAccount,
            dataFeePerAccount,
            accountFeePerAccount,
            staffingCostPerAccount,
            processorFeePercent,
            affiliateFeePercent,
            affiliateAppliesToActivation
          )
          
          averagePayoutData.values.push(payout)
          averagePayoutData.priceMargins.push(margins.priceMargin * 100) // Convert to percentage
          averagePayoutData.revenue.push(margins.revenueEval)
          averagePayoutData.cost.push(margins.cost)
          averagePayoutData.netRevenue.push(margins.netRevenue)
          averagePayoutData.totalRevenue.push(margins.grossRevenue)
          averagePayoutData.totalNetRevenue.push(margins.netRevenue)
        }
      } catch (err) {
        console.error('Error generating average payout data:', err)
      }
      
      // Generate data for the payout rate chart
      try {
        // Generate rate values from 0.01 to 0.3 (1% to 30%)
        const rateValues = Array.from({ length: 30 }, (_, i) => 0.01 + i * 0.01)
        const combinations = []
        
        // For each rate, find the avg payout that gives 50% margin
        for (const rate of rateValues) {
                      const payout = findThresholdValue(
              "Avg Payout for 50% Margin",
              (payout) => calculateMargins(
                evalPriceNum,
                rate,
                payout,
                inputs.useActivationFee, // Use activation fee toggle
                activationFeeNum,
                evalPassRateNum, // Use actual eval pass rate
                avgLiveSavedNum,
                avgLivePayoutNum,
                inputs.includeLive, // Use include live toggle
                userFeePerAccount,
                dataFeePerAccount,
                accountFeePerAccount,
                staffingCostPerAccount,
                processorFeePercent,
                affiliateFeePercent,
                affiliateAppliesToActivation
              ).priceMargin - 0.5, // Find where margin = 0.5
            0,
            evalPriceNum,
            purchaseToPayoutRate,
            avgPayoutNum,
            inputs.useActivationFee,
            activationFeeNum,
            evalPassRateNum
          );
          
          if (payout !== null) {
            combinations.push({ x: rate, y: payout });
          }
        }
        
        payoutRateData.combinationsPM = combinations;
      } catch (err) {
        console.error('Error generating payout rate data:', err);
      }
      
      // Generate data for the eval price rate chart
      try {
        // Generate evaluation price values from 50 to 200 in steps of 25
        const evalPrices = Array.from({ length: 7 }, (_, i) => 50 + i * 25);
        
        const evalPriceResults = [];
        
        // For each eval price, generate combinations that give 50% margin
        for (const evalPrice of evalPrices) {
          const dataPoints = [];
          // Generate rate values from 0.01 to 0.3 (1% to 30%)
          const rateValues = Array.from({ length: 30 }, (_, i) => 0.01 + i * 0.01);
          
          for (const rate of rateValues) {
            const payout = findThresholdValue(
              `Avg Payout for 50% Margin at Price ${evalPrice}`,
              (payout) => calculateMargins(
                evalPrice,
                rate,
                payout,
                inputs.useActivationFee, // Use activation fee toggle
                activationFeeNum,
                evalPassRateNum, // Use actual eval pass rate
                avgLiveSavedNum,
                avgLivePayoutNum,
                inputs.includeLive, // Use include live toggle
                userFeePerAccount,
                dataFeePerAccount,
                accountFeePerAccount,
                staffingCostPerAccount,
                processorFeePercent,
                affiliateFeePercent,
                affiliateAppliesToActivation
              ).priceMargin - 0.5, // Find where margin = 0.5
              0,
              evalPriceNum,
              purchaseToPayoutRate,
              avgPayoutNum,
              inputs.useActivationFee,
              activationFeeNum,
              evalPassRateNum
            );
            
            if (payout !== null) {
              dataPoints.push({ x: evalPrice, y: rate });
            }
          }
          
          evalPriceResults.push({
            evalPrice,
            dataPoints
          });
        }
        
        evalPriceRateData.results = evalPriceResults;
      } catch (err) {
        console.error('Error generating eval price rate data:', err);
      }
      
      // Calculate thresholds
      const evaluationPriceThresholds = findMarginThresholds(
        evaluationPriceData.values,
        evaluationPriceData.priceMargins.map(margin => margin / 100) // Convert percentage to decimal
      )
      
      const purchaseToPayoutRateThresholds = findMarginThresholds(
        purchaseToPayoutRateData.values,
        purchaseToPayoutRateData.priceMargins.map(margin => margin / 100) // Convert percentage to decimal
      )
      
      const averagePayoutThresholds = findMarginThresholds(
        averagePayoutData.values,
        averagePayoutData.priceMargins.map(margin => margin / 100) // Convert percentage to decimal
      )
      
      // Calculate exact thresholds
      const exactThresholds = {
        // Find threshold where price margin is exactly 0
        breakEvenEvalPrice: findThresholdValue(
          "Eval Price",
          (value) => calculateMargins(
            value,
            purchaseToPayoutRate,
            avgPayoutNum,
            inputs.useActivationFee, // Use activation fee toggle
            activationFeeNum,
            evalPassRateNum,
            avgLiveSavedNum,
            avgLivePayoutNum,
            inputs.includeLive, // Use include live toggle
            userFeePerAccount,
            dataFeePerAccount,
            accountFeePerAccount,
            staffingCostPerAccount,
            processorFeePercent,
            affiliateFeePercent,
            affiliateAppliesToActivation
          ).priceMargin,
          0,
          evalPriceNum,
          purchaseToPayoutRate,
          avgPayoutNum,
          inputs.useActivationFee,
          activationFeeNum,
          evalPassRateNum
        ),
        // Find threshold where price margin is exactly 50%
        fiftyPercentMarginEvalPrice: find50PercentMarginValue(
          "Eval Price",
          evalPriceNum,
          purchaseToPayoutRate,
          avgPayoutNum,
          inputs.useActivationFee, // Use activation fee toggle
          activationFeeNum,
          evalPassRateNum,
          avgLiveSavedNum,
          avgLivePayoutNum,
          inputs.includeLive // Use include live toggle
        ),
        // Find threshold where purchase to payout rate gives 0 margin
        breakEvenPtrRate: findThresholdValue(
          "Purchase to Payout Rate",
          (value) => calculateMargins(
            evalPriceNum,
            value,
            avgPayoutNum,
            inputs.useActivationFee, // Use activation fee toggle
            activationFeeNum,
            evalPassRateNum,
            avgLiveSavedNum,
            avgLivePayoutNum,
            inputs.includeLive, // Use include live toggle
            userFeePerAccount,
            dataFeePerAccount,
            accountFeePerAccount,
            staffingCostPerAccount,
            processorFeePercent,
            affiliateFeePercent,
            affiliateAppliesToActivation
          ).priceMargin,
          0,
          evalPriceNum,
          purchaseToPayoutRate,
          avgPayoutNum,
          inputs.useActivationFee,
          activationFeeNum,
          evalPassRateNum
        ),
        // Find threshold where avg payout gives 0 margin
        breakEvenAvgPayout: findThresholdValue(
          "Avg Payout",
          (value) => calculateMargins(
            evalPriceNum,
            purchaseToPayoutRate,
            value,
            inputs.useActivationFee, // Use activation fee toggle
            activationFeeNum,
            evalPassRateNum,
            avgLiveSavedNum,
            avgLivePayoutNum,
            inputs.includeLive, // Use include live toggle
            userFeePerAccount,
            dataFeePerAccount,
            accountFeePerAccount,
            staffingCostPerAccount,
            processorFeePercent,
            affiliateFeePercent,
            affiliateAppliesToActivation
          ).priceMargin,
          0,
          evalPriceNum,
          purchaseToPayoutRate,
          avgPayoutNum,
          inputs.useActivationFee,
          activationFeeNum,
          evalPassRateNum
        )
      }
      
      // Create results object
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
  
  // Comparison mode functions
  const toggleComparisonMode = () => {
    setIsComparisonMode(prev => !prev)
    if (!isComparisonMode && comparisonPlans.length === 0) {
      // Add current simulation as first plan
      const currentPlan: ComparisonPlan = {
        id: generateId(),
        name: 'Current Plan',
        evalPrice: inputs.evalPrice,
        evalPassRate: inputs.evalPassRate,
        simFundedRate: inputs.simFundedRate,
        avgPayout: inputs.avgPayout,
        useActivationFee: inputs.useActivationFee,
        activationFee: inputs.activationFee,
        avgLiveSaved: inputs.avgLiveSaved,
        avgLivePayout: inputs.avgLivePayout,
        includeLive: inputs.includeLive
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
      avgLiveSaved: '',
      avgLivePayout: '',
      includeLive: false
    }
    
    setComparisonPlans(prev => [...prev, newPlan])
  }
  
  const removeComparisonPlan = (id: string) => {
    setComparisonPlans(prev => prev.filter(plan => plan.id !== id))
    setSelectedComparisonPlans(prev => prev.filter(planId => planId !== id))
  }
  
  const duplicatePlan = (id: string) => {
    // Find the plan to duplicate
    const planToDuplicate = comparisonPlans.find(plan => plan.id === id)
    if (!planToDuplicate) return
    
    // Create new plan with duplicated values but new ID
    const newPlan: ComparisonPlan = {
      ...planToDuplicate,
      id: generateId(),
      name: `${planToDuplicate.name} (Copy)`
    }
    
    // Add to comparison plans
    setComparisonPlans(prev => [...prev, newPlan])
    
    // Auto-select the new plan
    setSelectedComparisonPlans(prev => [...prev, newPlan.id])
  }
  
  const togglePlanSelection = (id: string) => {
    setSelectedComparisonPlans(prev => 
      prev.includes(id) 
        ? prev.filter(planId => planId !== id) 
        : [...prev, id]
    )
  }
  
  const updateComparisonPlan = (id: string, field: keyof ComparisonPlan, value: any) => {
    setComparisonPlans(prev => 
      prev.map(plan => plan.id === id ? { ...plan, [field]: value } : plan)
    )
  }
  
  const calculateComparisonSimulations = () => {
    setIsComparingSimulations(true);
    setComparisonError(null);
    
    try {
      // Create a copy of current inputs to restore later
      const originalInputs = { ...inputs };
      const simulations: ComparisonPlanSimulation[] = [];
      
      // Calculate simulations one by one for each selected plan
      for (const planId of selectedComparisonPlans) {
        const plan = comparisonPlans.find(p => p.id === planId);
        if (!plan) continue;
        
        // Set inputs to the current plan values
        const planInputs = {
          evalPrice: plan.evalPrice,
          evalPassRate: plan.evalPassRate,
          simFundedRate: plan.simFundedRate,
          avgPayout: plan.avgPayout,
          useActivationFee: plan.useActivationFee,
          activationFee: plan.activationFee,
          includeLive: plan.includeLive,
          avgLiveSaved: plan.avgLiveSaved,
          avgLivePayout: plan.avgLivePayout
        };
        
        // Update inputs state with plan values
        setInputs(planInputs);
        
        // Run simulation for this plan
        const results = runSimulation();
        
        if (results) {
          // Create a simulation object for this plan
          simulations.push({
            id: plan.id,
            name: plan.name,
            ...results
          });
        }
      }
      
      // Restore original inputs
      setInputs(originalInputs);
      
      // Store the simulation results
      setComparisonSimulations(simulations);
      
      // Re-run simulation with original inputs to restore main results
      runSimulation();
      
      setIsComparingSimulations(false);
    } catch (err) {
      console.error('Comparison simulation error:', err);
      setComparisonError(err instanceof Error ? err.message : 'An error occurred during comparison');
      setIsComparingSimulations(false);
    }
  }
  
  // Context value (memoized to prevent unnecessary re-renders)
  const contextValue = useMemo(() => ({
    // Inputs and simulation
    inputs,
    updateInput,
    resetInputs,
    isLoading,
    error,
    results,
    runSimulation,
    
    // Chart visibility
    visibleMargins,
    toggleMargin,
    
    // Comparison mode
    isComparisonMode,
    comparisonPlans,
    selectedComparisonPlans,
    comparisonSimulations,
    isComparingSimulations,
    comparisonError,
    toggleComparisonMode,
    addComparisonPlan,
    removeComparisonPlan,
    duplicatePlan,
    togglePlanSelection,
    updateComparisonPlan,
    calculateComparisonSimulations
  }), [
    inputs, isLoading, error, results, 
    visibleMargins, 
    isComparisonMode, comparisonPlans, selectedComparisonPlans, 
    comparisonSimulations, isComparingSimulations, comparisonError
  ])
  
  return (
    <SimulationContext.Provider value={contextValue}>
      {children}
    </SimulationContext.Provider>
  )
}

// Custom hook to use the simulation context
export function useSimulationContext() {
  const context = useContext(SimulationContext)
  if (!context) {
    throw new Error('useSimulationContext must be used within SimulationProvider')
  }
  return context
} 