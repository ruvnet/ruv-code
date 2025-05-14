import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook to manage sidebar state including minimization behavior
 * 
 * Provides functionality to:
 * - Toggle sidebar visibility
 * - Auto-minimize when clicking outside the sidebar
 * - Persist sidebar state
 */
export function useSidebarState() {
  // State for sidebar visibility
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Reference to the sidebar element
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  
  // Toggle sidebar visibility
  const toggleSidebar = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);
  
  // Handle clicks outside the sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Skip if sidebar is already minimized
      if (isMinimized) return;
      
      // Check if the click is outside the sidebar
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsMinimized(true);
      }
    };
    
    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMinimized]);
  
  return {
    isMinimized,
    setIsMinimized,
    toggleSidebar,
    sidebarRef
  };
}