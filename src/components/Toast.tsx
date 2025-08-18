import React, { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  visible: boolean
  onClose: () => void
  duration?: number
}

export function Toast({ 
  message, 
  type, 
  visible, 
  onClose, 
  duration = 3000 
}: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [visible, onClose, duration])

  if (!visible) return null

  return (
    <div className={`toast toast-${type} fixed z-50 bottom-4 right-4 px-4 py-3 rounded-md shadow-lg max-w-xs`}>
      <div className="toast-content text-sm">
        <div className={`flex items-center ${type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {type === 'success' ? (
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {message}
        </div>
      </div>
      <button 
        className="toast-close absolute top-2 right-2 text-gray-500 hover:text-gray-800" 
        onClick={onClose}
      >
        ×
      </button>
    </div>
  )
} 