import { useState, useEffect, useRef } from 'react';

/**
 * Represents the calculated position of a tooltip relative to its trigger element
 */
interface TooltipPosition {
  position: 'top' | 'bottom';          // Vertical position relative to trigger
  alignment: 'left' | 'center' | 'right'; // Horizontal alignment
}

/**
 * Configuration options for the tooltip positioning hook
 */
interface UseTooltipPositionOptions {
  isVisible: boolean;    // Whether the tooltip should be shown
  tooltipWidth?: number; // Expected width of tooltip in pixels (default: 320px for w-80)
  offset?: number;       // Minimum distance from viewport edges in pixels
}

/**
 * Custom hook for intelligent tooltip positioning that prevents cutoffs at screen edges
 * 
 * APPROACH:
 * 1. Initially renders tooltip invisibly to measure actual dimensions
 * 2. Calculates optimal position based on available viewport space
 * 3. Applies positioning classes and reveals tooltip with smooth transition
 * 4. Handles edge cases like small screens and dynamic content
 * 
 * POSITIONING LOGIC:
 * - Vertical: Prefers above trigger, falls back to below if insufficient space
 * - Horizontal: Centers when possible, left/right aligns when near edges
 * - Safety margins: Maintains specified offset from viewport boundaries
 */
export function useTooltipPosition({
  isVisible,
  tooltipWidth = 320, // w-80 Tailwind class = 320px
  offset = 10         // 10px safety margin from screen edges
}: UseTooltipPositionOptions) {
  // Stores the calculated optimal position for the tooltip
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ 
    position: 'top',     // Default to showing above trigger
    alignment: 'center'  // Default to center alignment
  });
  
  // Tracks whether positioning calculation has completed successfully
  // Used to control opacity and prevent flash of incorrectly positioned tooltip
  const [isPositioned, setIsPositioned] = useState(false);
  
  // References to DOM elements for measurement and positioning
  const triggerRef = useRef<HTMLDivElement>(null);  // The element that triggers the tooltip
  const tooltipRef = useRef<HTMLDivElement>(null);  // The tooltip element itself

  /**
   * Calculates the optimal tooltip position based on available viewport space
   * 
   * ALGORITHM:
   * 1. Measure trigger element position and tooltip dimensions
   * 2. Calculate available space in all directions
   * 3. Choose vertical position (top/bottom) based on available space
   * 4. Choose horizontal alignment (left/center/right) to prevent cutoffs
   * 
   * @returns {boolean} - True if calculation succeeded, false if retry needed
   */
  const calculatePosition = () => {
    // Ensure both elements are available for measurement
    if (!triggerRef.current || !tooltipRef.current) return false;

    // Get current positions and dimensions
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    // CRITICAL: Check if tooltip has been properly rendered and measured
    // On initial render, tooltip may be invisible or not yet laid out by browser
    // If dimensions are 0, we need to retry after browser has finished rendering
    if (tooltipRect.width === 0 || tooltipRect.height === 0) return false;
    
    // Get current viewport dimensions for boundary calculations
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Initialize with default preferences
    let position: 'top' | 'bottom' = 'top';        // Prefer showing above
    let alignment: 'left' | 'center' | 'right' = 'center'; // Prefer center alignment

    // === VERTICAL POSITIONING LOGIC ===
    // Calculate available space above and below the trigger element
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewport.height - triggerRect.bottom;
    const tooltipHeight = tooltipRect.height;

    // Determine best vertical position based on available space
    if (spaceAbove >= tooltipHeight + offset) {
      // Plenty of space above - use preferred position
      position = 'top';
    } else if (spaceBelow >= tooltipHeight + offset) {
      // Not enough space above, but sufficient space below
      position = 'bottom';
    } else {
      // Insufficient space in both directions - choose the side with more room
      // This handles edge cases like very tall tooltips or small viewports
      position = spaceAbove > spaceBelow ? 'top' : 'bottom';
    }

    // === HORIZONTAL POSITIONING LOGIC ===
    // Calculate the center point of the trigger element
    const centerX = triggerRect.left + triggerRect.width / 2;

    // Check if centered tooltip would extend beyond viewport boundaries
    if (centerX - tooltipWidth / 2 < offset) {
      // Tooltip would extend past left edge - align to left of trigger
      alignment = 'left';
    } else if (centerX + tooltipWidth / 2 > viewport.width - offset) {
      // Tooltip would extend past right edge - align to right of trigger
      alignment = 'right';
    } else {
      // Sufficient space on both sides - use preferred center alignment
      alignment = 'center';
    }

    // Apply calculated position and mark as successfully positioned
    setTooltipPosition({ position, alignment });
    setIsPositioned(true);
    return true; // Signal successful calculation
  };

  /**
   * Effect to handle positioning when tooltip visibility changes
   * 
   * TIMING STRATEGY:
   * - Uses requestAnimationFrame for optimal DOM timing
   * - Implements retry logic for cases where initial measurement fails
   * - Adds event listeners for dynamic repositioning on scroll/resize
   */
  useEffect(() => {
    if (isVisible) {
      // Reset positioning state when tooltip becomes visible
      setIsPositioned(false);
      
      /**
       * Attempts to calculate position with retry logic
       * 
       * WHY RETRY IS NEEDED:
       * - Browser may not have finished laying out the tooltip on first attempt
       * - Tooltip content might be loading asynchronously (images, etc.)
       * - CSS transitions/animations might affect initial measurements
       * 
       * @param {number} attempts - Current attempt number (for limiting retries)
       */
      const attemptCalculation = (attempts = 0) => {
        const maxAttempts = 5; // Prevent infinite retry loops
        
        // Use requestAnimationFrame to ensure calculation happens after DOM updates
        requestAnimationFrame(() => {
          const success = calculatePosition();
          
          // If calculation failed and we haven't exceeded retry limit, try again
          if (!success && attempts < maxAttempts) {
            // Exponential backoff: wait longer between retries
            setTimeout(() => attemptCalculation(attempts + 1), 20 * (attempts + 1));
          }
        });
      };
      
      // Start the positioning attempt chain
      attemptCalculation();
      
      /**
       * Handler for dynamic repositioning when viewport changes
       * Only recalculates if tooltip is currently visible to avoid unnecessary work
       */
      const handleReposition = () => {
        if (isVisible) {
          calculatePosition();
        }
      };
      
      // Listen for events that might require repositioning
      window.addEventListener('resize', handleReposition); // Viewport size changes
      window.addEventListener('scroll', handleReposition); // Page scroll changes trigger position
      
      // Cleanup event listeners when tooltip is hidden or component unmounts
      return () => {
        window.removeEventListener('resize', handleReposition);
        window.removeEventListener('scroll', handleReposition);
      };
    } else {
      // Reset positioning state when tooltip is hidden
      setIsPositioned(false);
    }
  }, [isVisible]); // Re-run effect when visibility changes

  /**
   * Generates CSS classes for tooltip positioning
   * 
   * OPACITY STRATEGY:
   * - Initially renders tooltip as invisible (opacity-0) to prevent flash
   * - Only reveals tooltip (opacity-100) after positioning is calculated
   * - Includes smooth transition for professional appearance
   * 
   * @param {string} baseClasses - Additional CSS classes to include
   * @returns {string} - Complete CSS class string for tooltip
   */
  const getTooltipClasses = (baseClasses: string = '') => {
    // Base styling classes for all tooltips
    let classes = `absolute z-[9999] w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl overflow-hidden ${baseClasses}`;
    
    // VISIBILITY CONTROL: Prevent flash of incorrectly positioned tooltip
    if (!isPositioned) {
      classes += " opacity-0"; // Hide until positioning is calculated
    } else {
      classes += " opacity-100 transition-opacity duration-150"; // Smooth fade-in
    }
    
    // VERTICAL POSITIONING: Add classes based on calculated position
    if (tooltipPosition.position === 'top') {
      classes += " bottom-full mb-2"; // Position above trigger with margin
    } else {
      classes += " top-full mt-2";    // Position below trigger with margin
    }
    
    // HORIZONTAL ALIGNMENT: Add classes based on calculated alignment
    switch (tooltipPosition.alignment) {
      case 'left':
        classes += " left-0"; // Align left edge of tooltip with left edge of trigger
        break;
      case 'right':
        classes += " right-0"; // Align right edge of tooltip with right edge of trigger
        break;
      default: // center
        classes += " left-1/2 transform -translate-x-1/2"; // Center tooltip on trigger
    }
    
    return classes;
  };

  /**
   * Generates CSS classes for the tooltip arrow/pointer
   * 
   * ARROW POSITIONING:
   * - Points toward the trigger element from the tooltip
   * - Adjusts direction based on whether tooltip is above or below
   * - Aligns horizontally to maintain visual connection with trigger
   * 
   * @returns {string} - Complete CSS class string for arrow element
   */
  const getArrowClasses = () => {
    let arrowClasses = "absolute transform";
    let borderClass = "border-transparent";
    
    // VERTICAL ARROW DIRECTION: Point toward trigger based on tooltip position
    if (tooltipPosition.position === 'top') {
      // Tooltip is above trigger - arrow points down
      arrowClasses += " top-full"; // Position arrow at bottom of tooltip
      borderClass += " border-t-4 border-t-gray-200 dark:border-t-gray-800"; // Down-pointing triangle
    } else {
      // Tooltip is below trigger - arrow points up
      arrowClasses += " bottom-full"; // Position arrow at top of tooltip
      borderClass += " border-b-4 border-b-gray-200 dark:border-b-gray-800"; // Up-pointing triangle
    }
    
    // HORIZONTAL ARROW ALIGNMENT: Match tooltip alignment for visual connection
    switch (tooltipPosition.alignment) {
      case 'left':
        arrowClasses += " left-4"; // Arrow near left edge (with small offset for aesthetics)
        break;
      case 'right':
        arrowClasses += " right-4"; // Arrow near right edge (with small offset for aesthetics)
        break;
      default: // center
        arrowClasses += " left-1/2 -translate-x-1/2"; // Arrow centered under trigger
    }
    
    // Combine positioning classes with triangle shape classes
    return `${arrowClasses} w-0 h-0 border-l-4 border-r-4 ${borderClass}`;
  };

  // Return all necessary tools for implementing positioned tooltip
  return {
    triggerRef,        // Ref for the element that triggers the tooltip
    tooltipRef,        // Ref for the tooltip element itself
    tooltipPosition,   // Current calculated position (for debugging/advanced usage)
    getTooltipClasses, // Function to generate tooltip CSS classes
    getArrowClasses,   // Function to generate arrow CSS classes
    isPositioned       // Boolean indicating if positioning calculation is complete
  };
} 