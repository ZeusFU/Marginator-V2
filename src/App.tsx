import React, { useState, useEffect, useRef } from 'react'
import { Settings, X, Copy } from 'lucide-react'
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
import Sidebar from './components/Sidebar'
import { TabNavigation } from './components/TabNavigation'
import { SidebarControl } from './components/SidebarControl'
import { Toast } from './components/Toast'
import { Modal } from './components/Modal'
import SimulationDashboard from './components/SimulationDashboard'
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
    updateInput,
    resetInputs,
    isLoading,
    error,
    results,
    runSimulation,
    visibleMargins,
    toggleMargin,
    isComparisonMode,
    comparisonPlans,
    selectedComparisonPlans,
    comparisonSimulations,
    isComparingSimulations,
    comparisonError,
    toggleComparisonMode,
    addComparisonPlan,
    removeComparisonPlan,
    togglePlanSelection,
    updateComparisonPlan,
    calculateComparisonSimulations,
    duplicatePlan
  } = useSimulationContext()

  // Local UI state
  const [activeTab, setActiveTab] = useState(0)
  const [activeCategory, setActiveCategory] = useState('variables')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false)
  const [showToast, setShowToast] = useState<{visible: boolean, message: string, type: 'success' | 'error'}>({
    visible: false, 
    message: '', 
    type: 'success'
  })

  // Helper functions
  const displayToast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ visible: true, message, type })
  }

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
            isComparisonMode={isComparisonMode}
            comparisonData={comparisonSimulations.map(sim => ({
              id: sim.id,
              name: sim.name,
              data: sim.evaluationPriceData
            }))}
          />
        )
      case 1:
        return (
          <PtrChart 
            data={results.purchaseToPayoutRateData} 
            thresholds={results.purchaseToPayoutRateThresholds}
            visibleMargins={visibleMargins.ptrRate}
            toggleMargin={(margin) => toggleMargin('ptrRate', margin)}
            isComparisonMode={isComparisonMode}
            comparisonData={comparisonSimulations.map(sim => ({
              id: sim.id,
              name: sim.name,
              data: sim.purchaseToPayoutRateData
            }))}
          />
        )
      case 2:
        return (
          <AvgPayoutChart 
            data={results.averagePayoutData} 
            thresholds={results.averagePayoutThresholds}
            visibleMargins={visibleMargins.avgPayout}
            toggleMargin={(margin) => toggleMargin('avgPayout', margin)}
            isComparisonMode={isComparisonMode}
            comparisonData={comparisonSimulations.map(sim => ({
              id: sim.id,
              name: sim.name,
              data: sim.averagePayoutData
            }))}
          />
        )
      case 3:
        return (
          <PayoutRateChart 
            data={results.payoutRateData}
            visibleMargins={visibleMargins.payoutRate}
            toggleMargin={(margin) => toggleMargin('payoutRate', margin)}
            isComparisonMode={isComparisonMode}
            comparisonData={comparisonSimulations.map(sim => ({
              id: sim.id,
              name: sim.name,
              data: sim.payoutRateData
            }))}
          />
        )
      case 4:
        return (
          <EvalPriceRateChart 
            data={results.evalPriceRateData}
            visibleMargins={visibleMargins.evalPriceRate}
            toggleMargin={(margin) => toggleMargin('evalPriceRate', margin)}
            isComparisonMode={isComparisonMode}
            comparisonData={comparisonSimulations.map(sim => ({
              id: sim.id,
              name: sim.name,
              data: sim.evalPriceRateData
            }))}
          />
        )
      default:
        return null
    }
  }

  // Render content based on the current activeCategory
  const renderCategoryContent = () => {
    console.log('Rendering category:', activeCategory);
    console.log('Results available:', !!results);
    
    if (results) {
      console.log('baseMargins:', results.baseMargins);
    }
    
    switch (activeCategory) {
      case 'variables':
        return (
          <div className="input-container">
            <button
              onClick={handleRunSimulation}
              className="run-simulation-button w-full p-3 bg-primary text-white rounded-md font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Run Simulation'}
            </button>
          </div>
        )
      case 'charts':
        return (
          <div className="chart-container p-4 bg-card rounded-lg shadow-sm">
            {error ? (
              <div className="error-message p-4 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            ) : isLoading ? (
              <div className="loading-indicator flex items-center justify-center h-96">
                <div className="spinner"></div>
                <span className="ml-2">Processing simulation...</span>
              </div>
            ) : (
              <>
                {results && <SimulationDashboard />}
                {renderActiveChart()}
              </>
            )}
          </div>
        )
      case 'thresholds':
        return (
          <div className="thresholds-container p-4 bg-card rounded-lg shadow-sm">
            {results ? (
              <>
                <SimulationDashboard />
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
      case 'comparison':
        return (
          <div className="comparison-container p-4 bg-card rounded-lg shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                onClick={toggleComparisonMode}
                className={`px-4 py-2 rounded-md ${
                  isComparisonMode ? 'bg-accent text-white' : 'bg-background text-text_primary border border-border'
                }`}
              >
                {isComparisonMode ? 'Exit Comparison Mode' : 'Enter Comparison Mode'}
              </button>
              
              {isComparisonMode && (
                <>
                  <button
                    onClick={() => setIsComparisonModalOpen(true)}
                    className="px-4 py-2 bg-primary text-white rounded-md"
                  >
                    Manage Plans
                  </button>
                  
                  <button
                    onClick={calculateComparisonSimulations}
                    className="px-4 py-2 bg-primary text-white rounded-md"
                    disabled={isComparingSimulations || selectedComparisonPlans.length === 0}
                  >
                    {isComparingSimulations ? 'Processing...' : 'Compare Selected Plans'}
                  </button>
                </>
              )}
            </div>
            
            {comparisonError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {comparisonError}
              </div>
            )}
            
            {isComparisonMode && (
              <div className="selected-plans-container">
                <h3 className="text-lg font-semibold mb-2">Selected Plans</h3>
                {selectedComparisonPlans.length === 0 ? (
                  <p className="text-text_secondary">No plans selected</p>
                ) : (
                  <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {selectedComparisonPlans.map(planId => {
                      const plan = comparisonPlans.find(p => p.id === planId)
                      return plan ? (
                        <li key={planId} className="p-2 bg-background rounded border border-border">
                          {plan.name}
                        </li>
                      ) : null
                    })}
                  </ul>
                )}
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
    <div className="app-container flex min-h-screen bg-background text-text_primary">
      <SidebarControl 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />
      
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen}
      />
      
      <div className={`main-content flex-1 transition-all duration-300 
                       ${isSidebarOpen ? 'lg:ml-64 xl:ml-72' : 'ml-0'}`}>
        <main className="p-4">
          <TabNavigation 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
          
          {renderCategoryContent()}
        </main>
      </div>

      {/* Mobile floating action button - only visible when sidebar is closed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center"
          aria-label="Open parameters"
        >
          <Settings className="w-6 h-6" />
        </button>
      )}

      {/* Toast notifications */}
      <Toast
        visible={showToast.visible}
        message={showToast.message}
        type={showToast.type}
        onClose={handleCloseToast}
      />

      {/* Comparison Mode Modal */}
      {isComparisonModalOpen && (
        <Modal
          title="Comparison Mode"
          onClose={() => setIsComparisonModalOpen(false)}
        >
          <div className="max-h-[70vh] overflow-y-auto">
            <p className="text-sm text-text_secondary mb-4">
              Compare up to 5 different scenarios by adjusting the parameters below.
            </p>
            
            <div className="mb-4">
              <button
                onClick={addComparisonPlan}
                className="px-4 py-2 bg-primary text-white rounded-md"
                disabled={comparisonPlans.length >= 5}
              >
                Add New Plan
              </button>
            </div>
            
            {comparisonPlans.map((plan, index) => (
              <div 
                key={plan.id} 
                className="mb-6 p-4 bg-card rounded-lg border border-border"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`select-${plan.id}`}
                      checked={selectedComparisonPlans.includes(plan.id)}
                      onChange={() => togglePlanSelection(plan.id)}
                      className="h-4 w-4 rounded border-border bg-background"
                    />
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => updateComparisonPlan(plan.id, 'name', e.target.value)}
                      className="text-sm font-medium bg-transparent border-b border-border px-1"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => duplicatePlan(plan.id)}
                      className="text-text_secondary hover:text-text_primary"
                      title="Duplicate plan"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    
                    {index > 0 && (
                      <button
                        onClick={() => removeComparisonPlan(plan.id)}
                        className="text-text_secondary hover:text-text_primary"
                        title="Remove plan"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Eval Price */}
                  <div>
                    <label htmlFor={`evalPrice-${plan.id}`} className="block text-xs font-medium text-text_secondary mb-1">
                      Evaluation Price ($)
                    </label>
                    <input
                      id={`evalPrice-${plan.id}`}
                      type="number"
                      value={plan.evalPrice}
                      onChange={(e) => updateComparisonPlan(plan.id, 'evalPrice', e.target.value)}
                      className="w-full p-2 rounded bg-background border border-border text-sm"
                    />
                  </div>
                  
                  {/* Eval Pass Rate */}
                  <div>
                    <label htmlFor={`evalPassRate-${plan.id}`} className="block text-xs font-medium text-text_secondary mb-1">
                      Evaluation Pass Rate (%)
                    </label>
                    <input
                      id={`evalPassRate-${plan.id}`}
                      type="number"
                      value={plan.evalPassRate}
                      onChange={(e) => updateComparisonPlan(plan.id, 'evalPassRate', e.target.value)}
                      className="w-full p-2 rounded bg-background border border-border text-sm"
                    />
                  </div>
                  
                  {/* Sim Funded Rate */}
                  <div>
                    <label htmlFor={`simFundedRate-${plan.id}`} className="block text-xs font-medium text-text_secondary mb-1">
                      Sim Funded Rate (%)
                    </label>
                    <input
                      id={`simFundedRate-${plan.id}`}
                      type="number"
                      value={plan.simFundedRate}
                      onChange={(e) => updateComparisonPlan(plan.id, 'simFundedRate', e.target.value)}
                      className="w-full p-2 rounded bg-background border border-border text-sm"
                    />
                  </div>
                  
                  {/* Avg Payout */}
                  <div>
                    <label htmlFor={`avgPayout-${plan.id}`} className="block text-xs font-medium text-text_secondary mb-1">
                      Average Payout ($)
                    </label>
                    <input
                      id={`avgPayout-${plan.id}`}
                      type="number"
                      value={plan.avgPayout}
                      onChange={(e) => updateComparisonPlan(plan.id, 'avgPayout', e.target.value)}
                      className="w-full p-2 rounded bg-background border border-border text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
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