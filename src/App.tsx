import React, { useState, useLayoutEffect, useRef } from 'react'
import 'react-tabs/style/react-tabs.css'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'

// Import context provider
import { SimulationProvider, useSimulationContext } from './context/SimulationContext'

// Import components
import { TabNavigation } from './components/TabNavigation'
import { ChartTabs } from './components/ChartTabs'
import { Toast } from './components/Toast'
import SimulationDashboard, { ScenarioSnapshot } from './components/SimulationDashboard'
import { VariablesPopover } from './components/VariablesPopover'
import { Settings as SettingsIcon } from 'lucide-react'
import EvalPriceChart from './charts/EvalPriceChart'
import PtrChart from './charts/PtrChart'
import AvgPayoutChart from './charts/AvgPayoutChart'
import PayoutRateChart from './charts/PayoutRateChart'
import EvalPriceRateChart from './charts/EvalPriceRateChart'
import ThresholdsTable from './charts/ThresholdsTable'
import ContourTab from './components/ContourTab'

// Import utilities
import { generatePDFReport } from './utils/pdfGenerator'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
)

// Main application content that uses the context
function AppContent() {
  // Get everything from the simulation context
  const {
    inputs,
    // updateInput,
    resetInputs,
    isLoading,
    error,
    results,
    runSimulation,
    visibleMargins,
    toggleMargin
  } = useSimulationContext()

  // Local UI state
  const [activeTab, setActiveTab] = useState(0)
  const [activeCategory, setActiveCategory] = useState('charts')
  const [showToast, setShowToast] = useState<{visible: boolean, message: string, type: 'success' | 'error'}>({
    visible: false, 
    message: '', 
    type: 'success'
  })
  const [savedScenarios, setSavedScenarios] = useState<Array<ScenarioSnapshot & { id: string; createdAt: number }>>([])
  const [isVariablesOpen, setIsVariablesOpen] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState({ top: 70, left: 16 })
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const variablesButtonRef = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    if (!isVariablesOpen || !variablesButtonRef.current) return
    const updatePosition = () => {
      const buttonRect = variablesButtonRef.current!.getBoundingClientRect()
      const maxLeft = Math.max(16, Math.min(window.innerWidth - 360, buttonRect.left - 16))
      setPopoverPosition({
        top: buttonRect.bottom + 12,
        left: maxLeft
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [isVariablesOpen])

  // Helper functions
  const displayToast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ visible: true, message, type })
  }
  const handleScenarioSave = (snapshot: ScenarioSnapshot) => {
    setSavedScenarios(prev => [
      ...prev,
      { ...snapshot, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() }
    ])
    displayToast('Scenario saved for comparison')
  }

  const handleRemoveScenario = (id: string) => {
    setSavedScenarios(prev => prev.filter(item => item.id !== id))
  }

  const formatCurrencyDisplay = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  const formatPercentDisplay = (value: number) => `${value.toFixed(2)}%`


  const handleCloseToast = () => {
    setShowToast(prev => ({ ...prev, visible: false }))
  }

  const handleGeneratePDFReport = () => {
    if (!results) return

    generatePDFReport({
      baseMargins: results.baseMargins,
      evalPrice: Number(inputs.evalPrice),
      evalPassRate: Number(inputs.evalPassRate),
      simFundedRate: Number(inputs.simFundedRate),
      avgPayout: Number(inputs.avgPayout),
      useActivationFee: inputs.useActivationFee,
      activationFee: Number(inputs.activationFee),
      purchaseToPayoutRate: results.purchaseToPayoutRate,
      includeLive: inputs.includeLive,
      avgLiveSaved: Number(inputs.avgLiveSaved),
      avgLivePayout: Number(inputs.avgLivePayout),
      evaluationPriceData: results.evaluationPriceData,
      purchaseToPayoutRateData: results.purchaseToPayoutRateData,
      averagePayoutData: results.averagePayoutData,
      payoutRateData: results.payoutRateData,
      evalPriceRateData: results.evalPriceRateData,
      evaluationPriceThresholds: results.evaluationPriceThresholds,
      purchaseToPayoutRateThresholds: results.purchaseToPayoutRateThresholds,
      averagePayoutThresholds: results.averagePayoutThresholds,
      exactThresholds: results.exactThresholds
    })

    displayToast('PDF report generated successfully')
  }

  // Run simulation when in variables tab
  const handleRunSimulation = () => {
    try {
      const simulationResults = runSimulation()
      if (simulationResults) {
        displayToast('Simulation completed successfully')
        // Switch to charts tab
        setActiveCategory('charts')
      } else if (error) {
        // Display the error from context if there is one
        displayToast(error, 'error')
      }
    } catch (err) {
      console.error('Error running simulation:', err)
      displayToast('An unexpected error occurred while running the simulation', 'error')
    }
  }

  // Render the active chart based on current tab
  const renderActiveChart = () => {
    if (!results) return (
      <div className="flex flex-col items-center justify-center h-96 text-text_secondary">
        <p>Enter values and run simulation to see charts</p>
        <button 
          onClick={handleRunSimulation}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
        >
          Run Simulation
        </button>
      </div>
    )

    switch (activeTab) {
      case 0:
        return (
          <EvalPriceChart 
            data={results.evaluationPriceData} 
            thresholds={results.evaluationPriceThresholds}
            visibleMargins={visibleMargins.evalPrice}
            toggleMargin={(margin) => toggleMargin('evalPrice', margin)}
          />
        )
      case 1:
        return (
          <PtrChart 
            data={results.purchaseToPayoutRateData} 
            thresholds={results.purchaseToPayoutRateThresholds}
            visibleMargins={visibleMargins.ptrRate}
            toggleMargin={(margin) => toggleMargin('ptrRate', margin)}
          />
        )
      case 2:
        return (
          <AvgPayoutChart 
            data={results.averagePayoutData} 
            thresholds={results.averagePayoutThresholds}
            visibleMargins={visibleMargins.avgPayout}
            toggleMargin={(margin) => toggleMargin('avgPayout', margin)}
          />
        )
      case 3:
        return (
          <PayoutRateChart 
            data={results.payoutRateData}
            visibleMargins={visibleMargins.payoutRate}
            toggleMargin={(margin) => toggleMargin('payoutRate', margin)}
          />
        )
      case 4:
        return (
          <EvalPriceRateChart 
            data={results.evalPriceRateData}
            visibleMargins={visibleMargins.evalPriceRate}
            toggleMargin={(margin) => toggleMargin('evalPriceRate', margin)}
          />
        )
      default:
        return null
    }
  }

  // Render content based on the current activeCategory
  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'charts':
        return (
          <div ref={chartContainerRef} className="chart-container relative p-4 bg-card rounded-lg shadow-sm overflow-visible">
            {error ? (
              <div className="error-message p-4 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            ) : isLoading ? (
              <div className="loading-indicator flex items-center justify-center h-96">
                <div className="spinner"></div>
                <span className="ml-2">Processing simulation...</span>
              </div>
            ) : results ? (
              <>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <button
                    ref={variablesButtonRef}
                    onClick={() => setIsVariablesOpen(!isVariablesOpen)}
                    aria-label="Adjust variables"
                    className={`w-11 h-11 rounded-2xl border shadow-sm flex items-center justify-center ${isVariablesOpen ? 'bg-primary text-white border-primary' : 'bg-surface text-primary border-border hover:bg-surface/80'}`}
                  >
                    <SettingsIcon className="w-5 h-5" />
                  </button>
                  <ChartTabs activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>
                <SimulationDashboard onSaveScenario={handleScenarioSave} />
                <div className="mt-6">
                  {renderActiveChart()}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <button
                    ref={variablesButtonRef}
                    onClick={() => setIsVariablesOpen(!isVariablesOpen)}
                    aria-label="Adjust variables"
                    className={`w-11 h-11 rounded-2xl border shadow-sm flex items-center justify-center ${isVariablesOpen ? 'bg-primary text-white border-primary' : 'bg-surface text-primary border-border hover:bg-surface/80'}`}
                  >
                    <SettingsIcon className="w-5 h-5" />
                  </button>
                  <ChartTabs activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>
                {renderActiveChart()}
              </>
            )}
            {isVariablesOpen && (
              <>
                <div className="fixed inset-0 z-30 bg-black/60" onClick={() => setIsVariablesOpen(false)} />
                <VariablesPopover
                  isOpen={isVariablesOpen}
                  onClose={() => setIsVariablesOpen(false)}
                  onRun={handleRunSimulation}
                  position={popoverPosition}
                />
              </>
            )}
          </div>
        )
      case 'thresholds':
        return (
          <div className="thresholds-container p-4 bg-card rounded-lg shadow-sm">
            {results ? (
              <>
                <SimulationDashboard onSaveScenario={handleScenarioSave} />
                <ThresholdsTable 
                  thresholds={results.exactThresholds}
                  evalPrice={inputs.evalPrice}
                  purchaseToPayoutRate={results.purchaseToPayoutRate}
                  avgPayout={inputs.avgPayout}
                  includeLive={inputs.includeLive}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-text_secondary">
                Run simulation to see threshold values
              </div>
            )}
          </div>
        )
      case 'contour':
        return (
          <div className="p-4 bg-card rounded-lg shadow-sm">
            <ContourTab />
          </div>
        )
      case 'compare':
        return (
          <div className="p-4 bg-card rounded-lg shadow-sm">
            {savedScenarios.length === 0 ? (
              <div className="text-center text-text_secondary py-10">
                Save scenarios from the Charts tab to compare them here.
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {savedScenarios.map(scenario => (
                  <div
                    key={scenario.id}
                    className="flex-1 min-w-[260px] rounded-lg border border-border bg-background/80 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-text_primary">{scenario.name}</h3>
                        <p className="text-xs text-text_secondary">
                          Saved {new Date(scenario.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveScenario(scenario.id)}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mb-4">
                      <span className="text-xs uppercase tracking-wide text-text_secondary">Margin</span>
                      <div className="text-3xl font-bold text-primary">
                        {formatPercentDisplay(scenario.margin * 100)}
                      </div>
                    </div>
                    <div className="mb-4">
                      <span className="text-xs uppercase tracking-wide text-text_secondary">Price</span>
                      <div className="text-xl font-semibold">{formatCurrencyDisplay(scenario.price)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-text_secondary block">Pass Rate</span>
                        <span className="font-medium">{formatPercentDisplay(scenario.passRate)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-text_secondary block">Payout Rate</span>
                        <span className="font-medium">{formatPercentDisplay(scenario.payoutRate)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-text_secondary block">Avg. Payout</span>
                        <span className="font-medium">{formatCurrencyDisplay(scenario.avgPayout)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      case 'export':
        return (
          <div className="export-container p-4 bg-card rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Export Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleGeneratePDFReport}
                className="px-4 py-2 bg-primary text-white rounded-md"
                disabled={!results}
              >
                Generate PDF Report
              </button>
            </div>
          </div>
        )
      case 'settings':
        return (
          <div className="settings-container p-4 bg-card rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <button
              onClick={resetInputs}
              className="px-4 py-2 bg-red-600 text-white rounded-md"
            >
              Reset All Inputs
            </button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="app-container min-h-screen bg-background text-text_primary">
      <main className="p-4 max-w-7xl mx-auto">
        <TabNavigation 
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
        />
        <div className="mt-4">
          {renderCategoryContent()}
        </div>
      </main>
      {isVariablesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold">Input Parameters</h2>
                <p className="text-xs text-text_secondary">Adjust variables and re-run the simulation</p>
              </div>
              <button
                aria-label="Close variables"
                onClick={() => setIsVariablesOpen(false)}
                className="text-text_secondary hover:text-text_primary text-lg"
              >
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <Sidebar isSidebarOpen={true} setIsSidebarOpen={() => {}} inline />
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-border">
              <button
                onClick={() => setIsVariablesOpen(false)}
                className="px-4 py-2 rounded-md border border-border text-text_primary hover:bg-surface/70"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleRunSimulation()
                  setIsVariablesOpen(false)
                }}
                className="px-4 py-2 rounded-md bg-primary text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Run & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast
        visible={showToast.visible}
        message={showToast.message}
        type={showToast.type}
        onClose={handleCloseToast}
      />
    </div>
  )
}

// Wrap the AppContent with the SimulationProvider
function App() {
  return (
    <SimulationProvider>
      <AppContent />
    </SimulationProvider>
  )
}

export default App 