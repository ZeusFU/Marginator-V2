import React, { useState } from 'react'
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
import { Toast } from './components/Toast'
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
  const [activeCategory, setActiveCategory] = useState('variables')
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
      case 'variables':
        return (
          <div className="input-container">
            <Sidebar isSidebarOpen={true} setIsSidebarOpen={() => {}} />
            <button
              onClick={handleRunSimulation}
              className="run-simulation-button w-full mt-4 p-3 bg-primary text-white rounded-md font-medium"
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
    <div className="app-container min-h-screen bg-background text-text_primary">
      <main className="p-4 max-w-7xl mx-auto">
        <TabNavigation 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
        />
        <div className="mt-4">
          {renderCategoryContent()}
        </div>
      </main>
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