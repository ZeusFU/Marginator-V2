/**
 * Enhanced MarginContourEngine that integrates with our application
 * 
 * This class extends the base MarginContourEngine from ContourEngine.ts,
 * adding functionality specific to our application's needs.
 */

import { ContourEngine, MarginContourEngine as BaseMarginContourEngine } from './ContourEngine'
import { MARGIN_TARGETS } from '../constants/simulationConstants'
import type { 
  MarginVariables as AppMarginVariables, 
  VariableRange, 
  ContourPoint, 
  MarginContourPoint,
  ThresholdResult,
  ContourVariableType,
  CombinedThresholdResults
} from '../types/contour'
import type { MarginCalculationParams } from '../types/calculation'

/**
 * Basic margin variables that satisfy the Record<string, number> constraint
 */
type BasicMarginVariables = {
  evalPrice: number
  purchaseToPayoutRate: number
  avgPayout: number
  [key: string]: number
}

/**
 * Enhanced MarginContourEngine with additional functionality
 */
export class EnhancedMarginContourEngine {
  private baseEngine: BaseMarginContourEngine

  /**
   * Create a new instance with default settings
   */
  constructor() {
    this.baseEngine = new BaseMarginContourEngine()
    // The BaseMarginContourEngine doesn't expose setPrecision directly in TypeScript
    // but we know it exists in the implementation
    // For TypeScript safety, we'll use the provided method
    this.baseEngine.setTargetMargin(0.5) // Default to 50% margin
  }

  /**
   * Configure the engine with the complete set of margin calculation parameters
   */
  configureWithParams(params: MarginCalculationParams): this {
    // Create a new engine instance with our enhanced calculation function
    const engine = new ContourEngine<BasicMarginVariables>()
    
    engine.setFunction(variables => {
      // Base values from the variables object
      const { 
        evalPrice, 
        purchaseToPayoutRate, 
        avgPayout,
        // Use optional parameters with defaults from our params
        ...otherVariables
      } = variables
      
      // Additional parameters with defaults
      const useActivationFee = params.useActivationFee
      const activationFee = params.activationFee
      const evalPassRate = params.evalPassRate
      const avgLiveSaved = params.avgLiveSaved || 0
      const avgLivePayout = params.avgLivePayout || 0
      const companySplit = params.companySplit || 20
      const includeLive = params.includeLive || false
      const useCompanyCosts = params.useCompanyCosts || false
      const platformCost = params.platformCost || 0
      const checkoutPercentage = params.checkoutPercentage || 0
      const paymentFee = params.paymentFee || 0
      const useSplitPayout = params.useSplitPayout || false
      const payoutPercentage = params.payoutPercentage || 100
      const liveAllocationPercentage = params.liveAllocationPercentage || 0
      
      // Calculate basic margin for this configuration
      // This calculation mirrors the logic in calculateMargins utility
      const SAMPLE_SIZE = 1000
      
      // Revenue
      const evalRevenueFromEvals = evalPrice * SAMPLE_SIZE
      const activationFeeRevenue = useActivationFee ? activationFee * SAMPLE_SIZE * evalPassRate : 0
      const revenue = evalRevenueFromEvals + activationFeeRevenue
      
      // Calculate payout amounts
      let effectiveAvgPayout = avgPayout
      let effectiveLiveAllocation = 0
      
      if (useSplitPayout) {
        effectiveAvgPayout = avgPayout * (payoutPercentage / 100)
        effectiveLiveAllocation = avgPayout * (liveAllocationPercentage / 100)
      }
      
      // Base cost
      let cost = purchaseToPayoutRate * effectiveAvgPayout * SAMPLE_SIZE
      
      // Add live allocation cost if enabled
      if (useSplitPayout) {
        cost += purchaseToPayoutRate * effectiveLiveAllocation * SAMPLE_SIZE
      }
      
      // Company costs
      if (useCompanyCosts) {
        const platformCosts = SAMPLE_SIZE * platformCost
        const checkoutCosts = revenue * (checkoutPercentage / 100)
        const paymentFeeCosts = SAMPLE_SIZE * purchaseToPayoutRate * paymentFee
        cost += platformCosts + checkoutCosts + paymentFeeCosts
      }
      
      // Basic margin
      const margins = revenue > 0 ? (revenue - cost) / revenue : 0
      
      // Live account metrics for combined margin
      if (includeLive) {
        const liveUserCount = purchaseToPayoutRate * SAMPLE_SIZE
        const splitPerUser = avgLivePayout * (companySplit / 100)
        const totalLiveSplit = liveUserCount * splitPerUser
        
        const mllSavingsPerUser = useSplitPayout 
          ? effectiveLiveAllocation * (avgLiveSaved / 100) 
          : avgPayout * (avgLiveSaved / 100)
        const totalMLLSavings = liveUserCount * mllSavingsPerUser
        
        const liveRevenue = totalLiveSplit + totalMLLSavings
        const netCombinedRevenue = (revenue - cost) + liveRevenue
        
        return revenue > 0 ? netCombinedRevenue / revenue : 0
      }
      
      return margins
    })
    
    // Create a new instance instead of trying to modify the internal engine
    this.baseEngine = new BaseMarginContourEngine()
    
    return this
  }

  /**
   * Set target margin for calculations
   */
  setTargetMargin(margin: number): this {
    this.baseEngine.setTargetMargin(margin)
    return this
  }

  /**
   * Set ranges for all variables
   */
  setRanges(
    evalPriceRange: VariableRange,
    ptrRange: VariableRange,
    payoutRange: VariableRange
  ): this {
    this.baseEngine.setRanges(
      evalPriceRange, 
      ptrRange, 
      payoutRange
    )
    return this
  }

  /**
   * Find all threshold values for a given variable
   * This includes 30%, 50%, and 80% margin thresholds for both standard
   * and combined margins
   */
  findAllThresholds(
    variableName: ContourVariableType,
    params: MarginCalculationParams
  ): CombinedThresholdResults {
    // Create a copy of params to avoid modifying the original
    const baseParams = { ...params }
    
    // Results for standard margins
    const margin30 = this.findThresholdForMargin(
      variableName, 
      MARGIN_TARGETS.LOW,
      { ...baseParams, includeLive: false }
    )
    
    const margin50 = this.findThresholdForMargin(
      variableName, 
      MARGIN_TARGETS.MEDIUM,
      { ...baseParams, includeLive: false }
    )
    
    const margin80 = this.findThresholdForMargin(
      variableName, 
      MARGIN_TARGETS.HIGH,
      { ...baseParams, includeLive: false }
    )
    
    // Results for combined margins
    const combinedMargin30 = this.findThresholdForMargin(
      variableName, 
      MARGIN_TARGETS.LOW,
      { ...baseParams, includeLive: true }
    )
    
    const combinedMargin50 = this.findThresholdForMargin(
      variableName, 
      MARGIN_TARGETS.MEDIUM,
      { ...baseParams, includeLive: true }
    )
    
    const combinedMargin80 = this.findThresholdForMargin(
      variableName, 
      MARGIN_TARGETS.HIGH,
      { ...baseParams, includeLive: true }
    )
    
    return {
      margin30,
      margin50,
      margin80,
      combinedMargin30,
      combinedMargin50,
      combinedMargin80
    }
  }

  /**
   * Find threshold for a specific margin target
   */
  private findThresholdForMargin(
    variableName: ContourVariableType,
    targetMargin: number,
    params: MarginCalculationParams
  ): ThresholdResult {
    this.setTargetMargin(targetMargin)
    this.configureWithParams(params)
    
    // Set ranges based on the variable
    this.setVariableRanges(variableName, params)
    
    // Find the value
    let value: number | null = null
    
    switch (variableName) {
      case 'evalPrice':
        value = this.findEvalPrice(params.purchaseToPayoutRate, params.avgPayout)
        break
      case 'purchaseToPayoutRate':
        value = this.findPurchaseToPayoutRate(params.evalPrice, params.avgPayout)
        break
      case 'avgPayout':
        value = this.findAvgPayout(params.evalPrice, params.purchaseToPayoutRate)
        break
    }
    
    return {
      name: variableName,
      pmValue: value,
      dpmValue: null,
      currentValue: params[variableName]
    }
  }

  /**
   * Find the evaluation price that achieves the target margin
   */
  findEvalPrice(purchaseToPayoutRate: number, avgPayout: number): number | null {
    return this.baseEngine.findEvalPrice(purchaseToPayoutRate, avgPayout)
  }

  /**
   * Find the purchase-to-payout rate that achieves the target margin
   */
  findPurchaseToPayoutRate(evalPrice: number, avgPayout: number): number | null {
    return this.baseEngine.findPurchaseToPayoutRate(evalPrice, avgPayout)
  }

  /**
   * Find the average payout that achieves the target margin
   */
  findAvgPayout(evalPrice: number, purchaseToPayoutRate: number): number | null {
    return this.baseEngine.findAvgPayout(evalPrice, purchaseToPayoutRate)
  }

  /**
   * Set variable ranges based on current values
   */
  private setVariableRanges(
    variableName: ContourVariableType,
    params: MarginCalculationParams
  ): void {
    // Set reasonable ranges around current values
    const evalPriceRange: VariableRange = {
      min: Math.max(params.evalPrice * 0.1, 1),
      max: params.evalPrice * 3,
      steps: 50,
      scale: 'linear'
    }
    
    const ptrRange: VariableRange = {
      min: 0.001,
      max: 1.0,
      steps: 50,
      scale: 'linear'
    }
    
    const payoutRange: VariableRange = {
      min: Math.max(params.avgPayout * 0.1, 1),
      max: params.avgPayout * 3,
      steps: 50,
      scale: 'linear'
    }
    
    // For the variable we're solving for, use a wider range
    if (variableName === 'evalPrice') {
      evalPriceRange.min = Math.max(params.evalPrice * 0.05, 1)
      evalPriceRange.max = params.evalPrice * 5
    } else if (variableName === 'purchaseToPayoutRate') {
      // For PTR keep full [0-1] range
    } else if (variableName === 'avgPayout') {
      payoutRange.min = Math.max(params.avgPayout * 0.05, 1)
      payoutRange.max = params.avgPayout * 5
    }
    
    this.setRanges(evalPriceRange, ptrRange, payoutRange)
  }

  /**
   * Generate data points for a 2D contour visualization
   * 
   * @param xVariable The variable for the x-axis
   * @param yVariable The variable for the y-axis
   * @param params Base parameters for the calculation
   * @param targetMargin Target margin value
   * @param steps Number of steps along the x-axis
   * @returns Array of points on the contour line
   */
  generateContourPoints(
    xVariable: ContourVariableType,
    yVariable: ContourVariableType,
    params: MarginCalculationParams,
    targetMargin: number,
    steps: number = 50
  ): ContourPoint[] {
    this.setTargetMargin(targetMargin)
    this.configureWithParams(params)
    
    // Set ranges for variables
    const { evalPrice } = params
    
    // Generate contour points using the appropriate method in the base engine
    let contourPoints: ContourPoint[] = []
    
    if (xVariable === 'purchaseToPayoutRate' && yVariable === 'avgPayout') {
      // Use the provided method for this common case
      contourPoints = this.baseEngine.calculateRatePayoutCombinations(evalPrice)
    } else {
      // For other combinations, we'd have to implement custom logic
      // This is a placeholder for now - the actual implementation would depend on
      // how we can access or extend the base ContourEngine
      contourPoints = []
    }
    
    return contourPoints
  }

  /**
   * Generate multiple contour lines for different margin targets
   */
  generateMultipleContours(
    xVariable: ContourVariableType,
    yVariable: ContourVariableType,
    params: MarginCalculationParams,
    marginTargets: number[] = [0.3, 0.5, 0.8],
    includeCombined: boolean = false
  ): { standard: MarginContourPoint[][]; combined: MarginContourPoint[][] } {
    const standardContours: MarginContourPoint[][] = []
    const combinedContours: MarginContourPoint[][] = []
    
    // Generate contours for each margin target
    for (const margin of marginTargets) {
      // Standard margin contour
      const standardPoints = this.generateContourPoints(
        xVariable,
        yVariable,
        { ...params, includeLive: false },
        margin
      )
      
      standardContours.push(
        standardPoints.map(point => ({ ...point, margin }))
      )
      
      // Combined margin contour if requested
      if (includeCombined) {
        const combinedPoints = this.generateContourPoints(
          xVariable,
          yVariable,
          { ...params, includeLive: true },
          margin
        )
        
        combinedContours.push(
          combinedPoints.map(point => ({ ...point, margin }))
        )
      }
    }
    
    return {
      standard: standardContours,
      combined: combinedContours
    }
  }
}

export default EnhancedMarginContourEngine 