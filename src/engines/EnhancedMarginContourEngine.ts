/**
 * Enhanced Margin Contour Engine
 * 
 * This engine provides advanced margin calculation and contour generation capabilities,
 * including support for combined margins and dynamic thresholds.
 */

import type { 
  MarginVariables,
  ContourPoint,
  ContourData,
  ThresholdResult,
  VariableRange
} from '../types/contour' // Adjusted path
import { calculateMargins } from '../utils/marginCalculations' // Adjusted path
import type { MarginCalculationParams } from '../types/calculation' // Adjusted path

// Default ranges for variables when finding thresholds
const DEFAULT_RANGES: Record<string, VariableRange> = {
  evalPrice: { min: 50, max: 500, steps: 50, scale: 'linear' },
  purchaseToPayoutRate: { min: 0.001, max: 1.0, steps: 50, scale: 'linear' },
  avgPayout: { min: 50, max: 1000, steps: 50, scale: 'linear' }
}

interface CacheKey {
  variable: string
  targetMargin: number
  includeCombined: boolean
}

interface ContourCacheKey {
  xVariable: string
  yVariable: string
  marginTargets: string
  includeCombined: boolean
}

export class EnhancedMarginContourEngine {
  private params: MarginCalculationParams
  private ranges: Record<string, VariableRange>
  private thresholdCache = new Map<string, Map<number, number | null>>()
  private contourCache = new Map<string, ContourData>()

  constructor(params: MarginCalculationParams, ranges: Record<string, VariableRange> = DEFAULT_RANGES) {
    this.params = params
    this.ranges = ranges
  }

  private getCacheKey(key: CacheKey): string {
    return `${key.variable}-${key.targetMargin}-${key.includeCombined}`
  }

  private getContourCacheKey(key: ContourCacheKey): string {
    return `${key.xVariable}-${key.yVariable}-${key.marginTargets}-${key.includeCombined}`
  }

  private clearCache(): void {
    this.thresholdCache.clear()
    this.contourCache.clear()
  }

  /**
   * Find the value of a variable that achieves a target margin
   */
  findVariableValue(
    varName: string, // Should ideally be keyof MarginCalculationParams for type safety
    targetMargin: number,
    includeCombined: boolean = false
  ): number | null {
    const cacheKey = this.getCacheKey({ variable: varName, targetMargin, includeCombined })
    const cachedValue = this.thresholdCache.get(cacheKey)?.get(targetMargin)
    
    if (cachedValue !== undefined) return cachedValue

    // Set initial search ranges based on variable type
    let low = 0
    let high = 2000 // Default upper limit

    // Adjust search range based on variable type
    if (varName === 'evalPrice') {
      low = 10
      high = 2000
    } else if (varName === 'purchaseToPayoutRate') {
      low = 0.0001
      high = 1.0
    } else if (varName === 'avgPayout') {
      low = 10
      high = 2000
    } else if (varName === 'companySplit') {
      low = 0
      high = 100
    }

    let iterations = 0
    const MAX_ITERATIONS = 50
    const TOLERANCE = 0.001

    // Determine if increasing the variable increases or decreases the margin
    const paramValue = this.params[varName as keyof MarginCalculationParams];
    // Ensure baseForTest is a number, defaulting to low (0) if the param is not a number (e.g. boolean or undefined)
    const baseForTest = typeof paramValue === 'number' ? paramValue : low;

    // Create test parameters with includeLive set based on includeCombined
    const testParamsPlus = { 
      ...this.params, 
      [varName]: baseForTest + high * 0.02,
      includeLive: includeCombined // Ensure includeLive is set correctly for the calculation
    };
    const testParamsBase = { ...this.params, [varName]: baseForTest + high * 0.01 };
    const marginNear = calculateMargins(testParamsBase);
    const marginFurther = calculateMargins(testParamsPlus);
    
    const currentMarginNear = includeCombined ? marginNear.combinedMargin : marginNear.margins;
    const currentMarginFurther = includeCombined ? marginFurther.combinedMargin : marginFurther.margins;
    const increasingVarIncreasesMargin = currentMarginFurther > currentMarginNear;

    let bestGuess: number | null = null;
    let bestDiff = Infinity;

    while (iterations < MAX_ITERATIONS && (high - low) > TOLERANCE) {
      iterations++;
      const mid = low + (high - low) / 2;
      
      // Create test parameters with includeLive set based on includeCombined
      const testParams = { 
        ...this.params, 
        [varName]: mid,
        includeLive: includeCombined
      };
      
      // Calculate the appropriate margin based on includeCombined
      const currentCalcMargin = includeCombined 
        ? calculateMargins(testParams).combinedMargin
        : calculateMargins(testParams).margins;

      // Track the best guess
      const diff = Math.abs(currentCalcMargin - targetMargin);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestGuess = mid;
      }

      // If we're close enough, return the result
      if (diff < TOLERANCE) {
        if (!this.thresholdCache.has(cacheKey)) {
          this.thresholdCache.set(cacheKey, new Map());
        }
        this.thresholdCache.get(cacheKey)!.set(targetMargin, mid);
        return mid;
      }

      if (currentCalcMargin < targetMargin) {
        if (increasingVarIncreasesMargin) {
            low = mid + TOLERANCE; 
        } else {
            high = mid - TOLERANCE;
        }
      } else { // currentCalcMargin > targetMargin
        if (increasingVarIncreasesMargin) {
            high = mid - TOLERANCE;
        } else {
            low = mid + TOLERANCE;
        }
      }
    }

    // Clean up and return the best guess if we have one
    // If we have a best guess, cache and return it
    if (bestGuess !== null) {
      if (!this.thresholdCache.has(cacheKey)) {
        this.thresholdCache.set(cacheKey, new Map());
      }
      this.thresholdCache.get(cacheKey)!.set(targetMargin, bestGuess);
      return bestGuess;
    }
    
    // If no best guess, return null and log a warning
    console.warn(`Could not find threshold for ${varName} at target margin ${targetMargin}`);

    if (!this.thresholdCache.has(cacheKey)) {
      this.thresholdCache.set(cacheKey, new Map())
    }
    this.thresholdCache.get(cacheKey)?.set(targetMargin, null)
    return null
  }

  /**
   * Get contour data for margin visualization
   */
  getContourData(
    xVariable: string, // keyof MarginCalculationParams
    yVariable: string, // keyof MarginCalculationParams
    marginTargets: number[] = [0.3, 0.5, 0.8],
    includeCombined: boolean = true
  ): ContourData {
    const cacheKey = this.getContourCacheKey({
      xVariable,
      yVariable,
      marginTargets: marginTargets.join(','),
      includeCombined
    })

    const cachedData = this.contourCache.get(cacheKey)
    if (cachedData) return cachedData

    const standardData: ContourPoint[][] = []
    const combinedData: ContourPoint[][] = []
    
    // Determine ranges for x and y variables
    const xRange = this.ranges[xVariable] || DEFAULT_RANGES[xVariable] || {min:0, max:1000, steps: 20, scale: 'linear'};
    const yRange = this.ranges[yVariable] || DEFAULT_RANGES[yVariable] || {min:0, max:1, steps: 20, scale: 'linear'};

    const processContourLine = (targetMargin: number) => {
      const standardPoints: ContourPoint[] = []
      const combinedPoints: ContourPoint[] = []

      for (let i = 0; i < xRange.steps; i++) {
        const xVal = xRange.min + (xRange.max - xRange.min) * i / (xRange.steps -1) ;
        for (let j = 0; j < yRange.steps; j++) {
          const yVal = yRange.min + (yRange.max - yRange.min) * j / (yRange.steps -1);
          const currentParams = { ...this.params, [xVariable]: xVal, [yVariable]: yVal };
          const { margins, combinedMargin } = calculateMargins(currentParams);

          if (Math.abs(margins - targetMargin) < 0.01) { // Tolerance for contour match
            standardPoints.push({ x: xVal, y: yVal, value: targetMargin, type: 'standard' })
          }
          if (includeCombined && Math.abs(combinedMargin - targetMargin) < 0.01) {
            combinedPoints.push({ x: xVal, y: yVal, value: targetMargin, type: 'combined' })
          }
        }
      }
      return { standardPoints, combinedPoints }
    }

    marginTargets.forEach(target => {
      const { standardPoints, combinedPoints } = processContourLine(target)
      if(standardPoints.length > 0) standardData.push(standardPoints)
      if (includeCombined && combinedPoints.length > 0) {
        combinedData.push(combinedPoints)
      }
    })

    const result: ContourData = { standard: standardData, combined: combinedData }
    this.contourCache.set(cacheKey, result)
    return result
  }

  /**
   * Get key threshold values for a variable
   */
  getKeyThresholds(varName: string): ThresholdResult {
    // varName should be keyof MarginCalculationParams that can be solved for
    const currentValue = this.params[varName as keyof MarginCalculationParams] as number ?? 0;
    return {
      name: varName,
      pmValue: this.findVariableValue(varName, 0.5, false),
      dpmValue: this.findVariableValue(varName, 0.5, true),
      currentValue: currentValue 
    }
  }
} 