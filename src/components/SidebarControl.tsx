import React, { useRef, useCallback, useEffect } from 'react'
import { Menu } from 'lucide-react'

interface SidebarControlProps {
  isSidebarOpen: boolean
  setIsSidebarOpen: (isOpen: boolean) => void
}

export function SidebarControl({ isSidebarOpen, setIsSidebarOpen }: SidebarControlProps) {
  const startX = useRef(0)
  const currentX = useRef(0)
  const touchActive = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX
    touchActive.current = true
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchActive.current) return
    currentX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchActive.current) return
    
    const diff = currentX.current - startX.current
    
    // If swipe from left edge to right
    if (startX.current < 50 && diff > 100) {
      setIsSidebarOpen(true)
    }
    
    // If swipe from right to left when sidebar is open
    if (isSidebarOpen && diff < -100) {
      setIsSidebarOpen(false)
    }
    
    touchActive.current = false
  }, [isSidebarOpen, setIsSidebarOpen])

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return (
    <div className="sidebar-control lg:hidden fixed top-4 left-4 z-10">
      <button 
        className="p-2 bg-primary text-white rounded-lg shadow-md hover:bg-primary/90 focus:outline-none"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <Menu size={24} />
      </button>
    </div>
  )
} 