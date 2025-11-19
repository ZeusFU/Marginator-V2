import { ContourEngine, VariableRange, ContourPoint } from './ContourEngine'
import { calculateMargins } from '../utils/calculations'

export interface EngineParams {
  evalPrice: number
  evalPassRate: number // decimal 0..1
  simFundedRate: number // decimal 0..1
  avgPayout: number
  useActivationFee: boolean
  activationFee: number
  avgLiveSaved: number
  avgLivePayout: number
  includeLive: boolean
  userFeePerAccount: number
  dataFeePerAccount: number
  accountFeePerAccount: number
  staffingFeePercent: number
  processorFeePercent: number
  affiliateFeePercent: number
  liveAllocationPercent: number
  affiliateAppliesToActivation: boolean
}

export type VarKey = 'evalPrice' | 'purchaseToPayoutRate' | 'avgPayout'

export function buildEngine(params: EngineParams) {
  const engine = new ContourEngine<Record<VarKey, number>>()
    .setFunction(vars => {
      const purchaseToPayoutRate = vars.purchaseToPayoutRate
      return calculateMargins(
        vars.evalPrice,
        purchaseToPayoutRate,
        vars.avgPayout,
        params.useActivationFee,
        params.activationFee,
        params.evalPassRate,
        params.avgLiveSaved,
        params.avgLivePayout,
        params.includeLive,
        params.userFeePerAccount,
        params.dataFeePerAccount,
        params.accountFeePerAccount,
        params.staffingFeePercent,
        params.processorFeePercent,
        params.affiliateFeePercent,
        params.liveAllocationPercent,
        params.affiliateAppliesToActivation
      ).priceMargin
    })
    .setPrecision(0.0005)
    .setVariableRanges({
      evalPrice: { min: Math.max(params.evalPrice * 0.1, 1), max: Math.max(params.evalPrice * 3, 5), steps: 50 },
      purchaseToPayoutRate: { min: 0.001, max: 1.0, steps: 50 },
      avgPayout: { min: Math.max(params.avgPayout * 0.1, 1), max: Math.max(params.avgPayout * 3, 5), steps: 50 }
    })
  return engine
}

export function gridContour(
  engine: ReturnType<typeof buildEngine>,
  xVar: VarKey,
  yVar: VarKey,
  fixed: Partial<Record<VarKey, number>>,
  targetMargin: number,
  xRange?: VariableRange,
  yRange?: VariableRange
): ContourPoint[] {
  const er: any = engine as any
  const xr = xRange || er.variableRanges?.[xVar] || { min: fixed[xVar] ?? 0, max: (fixed[xVar] ?? 1) * 2, steps: 40 }
  const yr = yRange || er.variableRanges?.[yVar] || { min: fixed[yVar] ?? 0, max: (fixed[yVar] ?? 1) * 2, steps: 40 }
  const xs = xr.steps || 40
  const ys = yr.steps || 40
  const xStep = (xr.max - xr.min) / xs
  const yStep = (yr.max - yr.min) / ys
  const points: ContourPoint[] = []
  for (let i = 0; i <= xs; i++) {
    const xv = xr.min + i * xStep
    for (let j = 0; j <= ys; j++) {
      const yv = yr.min + j * yStep
      const value = (engine as any).calculationFunction({ ...fixed, [xVar]: xv, [yVar]: yv })
      if (typeof value === 'number' && Math.abs(value - targetMargin) < 0.01) {
        points.push({ x: xv, y: yv, value: targetMargin, type: 'standard' })
      }
    }
  }
  return points
}


