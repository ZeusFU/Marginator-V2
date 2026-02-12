import jsPDF from 'jspdf';
import { formatCurrency } from './chartConfig';
import { MarginCalculationResult } from './types';

/**
 * Helper function to sample evenly spaced points from an array for tables
 */
export function getSamplePoints(array: number[], count: number): number[] {
  if (!array || array.length === 0) return [];
  if (array.length <= count) return array;
  const result: number[] = [];
  const step = (array.length - 1) / (count - 1);
  for (let i = 0; i < count; i++) {
    const index = Math.min(Math.round(i * step), array.length - 1);
    result.push(array[index]);
  }
  return result;
}

/**
 * Generate a PDF report with simulation data
 */
export function generatePDFReport(params: {
  baseMargins: any;
  evalPrice: number;
  evalPassRate: number;
  simFundedRate: number;
  avgPayout: number;
  useActivationFee: boolean;
  activationFee: number;
  purchaseToPayoutRate: number;
  evaluationPriceData: any;
  purchaseToPayoutRateData: any;
  averagePayoutData: any;
  payoutRateData: any;
  evalPriceRateData: any;
  evaluationPriceThresholds: any;
  purchaseToPayoutRateThresholds: any;
  averagePayoutThresholds: any;
  exactThresholds: any;
}) {
  const {
    baseMargins,
    evalPrice,
    evalPassRate,
    simFundedRate,
    avgPayout,
    useActivationFee,
    activationFee,
    purchaseToPayoutRate,
    evaluationPriceData,
    purchaseToPayoutRateData,
    averagePayoutData,
    evaluationPriceThresholds,
    purchaseToPayoutRateThresholds,
    averagePayoutThresholds,
    exactThresholds
  } = params;

  const activationFeeDiscountPct = 0;
  const currentEvalPassRate = evalPassRate;

  try {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', putOnlyUsedFonts: true, compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    const reportTitle = `Margin Simulation Report`;
    pdf.setProperties({ title: reportTitle, subject: 'Margin Simulation Analysis', author: 'Marginator V2', creator: 'Marginator V2' });
    
    const addPageHeader = (pageNum: number, totalPages: number) => {
      pdf.setFillColor(242, 242, 242);
      pdf.rect(0, 0, pageWidth, 15, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Margin Simulation Report`, margin, 10);
      pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 20, 10, { align: 'right' });
    };
    
    // Cover Page
    pdf.setFillColor(66, 133, 244, 0.1);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.setFontSize(24);
    pdf.setTextColor(66, 133, 244);
    pdf.text(reportTitle, pageWidth/2, 25, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth/2, 35, { align: 'center' });
    
    // Summary Section
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Simulation Summary", margin, 100);
    const summaryY = 110;
    pdf.setFillColor(245, 245, 245);
    pdf.setDrawColor(200, 200, 200);
    pdf.roundedRect(margin, summaryY, contentWidth/2 - 5, 30, 2, 2, 'FD');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text("Price Margin", margin + 5, summaryY + 8);
    pdf.setFontSize(18);
    pdf.setTextColor(baseMargins.priceMargin < 0.5 ? 200 : 0, baseMargins.priceMargin < 0.5 ? 0 : 150, 0);
    pdf.text(`${(baseMargins.priceMargin * 100).toFixed(1)}%`, margin + 5, summaryY + 22);
    
    // Financial Summary Table
    const tableY = summaryY + 40;
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Financial Summary (Per Account)", margin, tableY);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, tableY + 5, contentWidth, 8, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Category", margin + 5, tableY + 10);
    pdf.text("Value", margin + contentWidth - 25, tableY + 10, { align: 'right' });
    
    const rows = [
      ["Gross Revenue", `$${formatCurrency(baseMargins.grossRevenue)}`],
      ["Total Cost", `$${formatCurrency(baseMargins.totalCost)}`],
      ["Net Revenue", `$${formatCurrency(baseMargins.netRevenue)}`]
    ];
    
    let rowY = tableY + 13;
    rows.forEach((row, i) => {
      const isHighlight = i === rows.length - 1;
      if (i % 2 === 0) {
        pdf.setFillColor(248, 248, 248);
        pdf.rect(margin, rowY, contentWidth, 7, 'F');
      }
      pdf.setFontSize(isHighlight ? 10 : 9);
      pdf.setTextColor(isHighlight ? 0 : 80, isHighlight ? 0 : 80, isHighlight ? 0 : 80);
      pdf.text(row[0], margin + 5, rowY + 5);
      pdf.text(row[1], margin + contentWidth - 5, rowY + 5, { align: 'right' });
      rowY += 7;
    });
    
    // Input Parameters Table
    const paramsY = rowY + 15;
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Input Parameters", margin, paramsY);
    
    const parameterData = [
      ["Eval Price", `$${evalPrice.toFixed(2)}`],
      ["Eval Pass Rate", `${(currentEvalPassRate * 100).toFixed(2)}%`],
      ["Sim Funded Rate", `${simFundedRate.toFixed(2)}%`],
      ["Purchase to Payout", `${(purchaseToPayoutRate * 100).toFixed(2)}%`],
      ["Avg Payout", `$${avgPayout.toFixed(2)}`],
    ];
    
    if (useActivationFee) {
      parameterData.push(
        ["Activation Fee", `$${activationFee.toFixed(2)}`],
      );
    }
    
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, paramsY + 5, contentWidth, 8, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Parameter", margin + 5, paramsY + 10);
    pdf.text("Value", margin + contentWidth/2, paramsY + 10);
    
    let paramRowY = paramsY + 13;
    parameterData.forEach((row, i) => {
      if (i % 2 === 0) {
        pdf.setFillColor(248, 248, 248);
        pdf.rect(margin, paramRowY, contentWidth, 7, 'F');
      }
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text(row[0], margin + 5, paramRowY + 5);
      pdf.text(row[1], margin + contentWidth/2, paramRowY + 5);
      paramRowY += 7;
    });
    
    // Thresholds Analysis Page
    pdf.addPage();
    addPageHeader(2, 5);
    const thresholdPageTop = 25;
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Critical Threshold Values", margin, thresholdPageTop);
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text("The exact values at which each variable results in exactly 50% profit margin.", margin, thresholdPageTop + 8);
    
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, thresholdPageTop + 15, contentWidth, 8, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Variable", margin + 5, thresholdPageTop + 20);
    pdf.text("Current Value", margin + 60, thresholdPageTop + 20);
    pdf.text("50% Threshold", margin + 110, thresholdPageTop + 20);
    pdf.text("Change Needed", margin + 160, thresholdPageTop + 20);
    
    let thresholdY = thresholdPageTop + 25;
    if (Array.isArray(exactThresholds)) {
      exactThresholds.forEach((item: any, i: number) => {
        const currentVal = item.name === "Eval Price" ? evalPrice : item.name === "Purchase to Payout Rate" ? purchaseToPayoutRate : item.name === "Avg Payout" ? avgPayout : 0;
        let changeText = "N/A";
        let changePercent = 0;
        if (item.pmValue !== null && currentVal !== 0) {
          const diff = item.pmValue - currentVal;
          changePercent = (diff / currentVal) * 100;
          changeText = changePercent > 0 ? `+${changePercent.toFixed(1)}%` : `${changePercent.toFixed(1)}%`;
        }
        
        if (i % 2 === 0) {
          pdf.setFillColor(248, 248, 248);
          pdf.rect(margin, thresholdY, contentWidth, 7, 'F');
        }
        
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(item.name, margin + 5, thresholdY + 5);
        
        if (item.name === "Eval Price" || item.name === "Avg Payout") {
          pdf.text(`$${currentVal.toFixed(2)}`, margin + 60, thresholdY + 5);
          pdf.text(item.pmValue !== null ? `$${item.pmValue.toFixed(2)}` : 'N/A', margin + 110, thresholdY + 5);
        } else {
          pdf.text(`${(currentVal * 100).toFixed(2)}%`, margin + 60, thresholdY + 5);
          pdf.text(item.pmValue !== null ? `${(item.pmValue * 100).toFixed(2)}%` : 'N/A', margin + 110, thresholdY + 5);
        }
        
        if (item.pmValue !== null) {
          if (Math.abs(changePercent) > 50) {
            pdf.setTextColor(200, 0, 0);
          } else if (Math.abs(changePercent) > 20) {
            pdf.setTextColor(200, 150, 0);
          } else {
            pdf.setTextColor(0, 150, 0);
          }
        }
        
        pdf.text(changeText, margin + 160, thresholdY + 5);
        pdf.setTextColor(80, 80, 80);
        thresholdY += 7;
      });
    }
    
    // Evaluation Price Simulation Data
    pdf.addPage();
    addPageHeader(3, 5);
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Evaluation Price Simulation Data", margin, 25);
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text("How changing Evaluation Price affects margins and profitability", margin, 33);
    
    pdf.setFontSize(10);
    pdf.setTextColor(200, 0, 0);
    if (evaluationPriceThresholds.priceThreshold) {
      pdf.text(`Price Margin falls below 50% at: $${evaluationPriceThresholds.priceThreshold.toFixed(2)}`, margin, 40);
    }
    
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, 54, contentWidth, 8, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Eval Price ($)", margin + 5, 59);
    pdf.text("Price Margin", margin + 45, 59);
    pdf.text("Revenue ($)", margin + 85, 59);
    pdf.text("Cost ($)", margin + 125, 59);
    pdf.text("Net Revenue ($)", margin + 165, 59);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `margin-simulation-data-${dateStr}.pdf`;
    pdf.save(filename);
    
    return filename;
  } catch (err) {
    console.error("Error in PDF generation:", err);
    throw new Error("PDF generation failed: " + (err instanceof Error ? err.message : "Unknown error"));
  }
}
