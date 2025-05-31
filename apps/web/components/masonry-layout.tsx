import React, { useEffect, useRef, useState } from 'react';

interface MasonryLayoutProps {
  children: React.ReactNode[];
  className?: string;
  columnMinWidth?: number;
  gap?: number;
}

export function MasonryLayout({ 
  children, 
  className = '', 
  columnMinWidth = 280, 
  gap = 24 
}: MasonryLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [layoutComplete, setLayoutComplete] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculateLayout = () => {
    if (!containerRef.current || !mounted) return;

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    
    if (containerWidth === 0) {
      // Container not ready, try again later
      setTimeout(calculateLayout, 50);
      return;
    }

    const newColumnCount = Math.max(1, Math.floor(containerWidth / columnMinWidth));
    setColumnCount(newColumnCount);

    // Wait for images and content to load, then perform layout
    const waitForContentAndLayout = () => {
      const items = Array.from(container.children) as HTMLElement[];
      
      // Check if all content is loaded
      const images = container.querySelectorAll('img');
      const imagePromises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve; // Resolve even on error to not block layout
          // Timeout after 2 seconds
          setTimeout(resolve, 2000);
        });
      });

      Promise.all(imagePromises).then(() => {
        // Additional delay to ensure content is rendered
        setTimeout(() => {
          performActualLayout(items, containerWidth, newColumnCount);
        }, 100);
      });
    };

    const performActualLayout = (items: HTMLElement[], containerWidth: number, columnCount: number) => {
      const columns: number[] = new Array(columnCount).fill(0);
      const columnWidth = (containerWidth - (gap * (columnCount - 1))) / columnCount;

      items.forEach((item) => {
        // Ensure item is visible and measurable
        item.style.visibility = 'visible';
        item.style.position = 'static';
        item.style.width = `${columnWidth}px`;
        
        // Force reflow to get accurate dimensions
        const itemHeight = item.getBoundingClientRect().height;
        
        // Find shortest column
        const columnIndex = columns.indexOf(Math.min(...columns));
        const leftPosition = columnIndex * (columnWidth + gap);
        
        // Set final position
        item.style.position = 'absolute';
        item.style.left = `${leftPosition}px`;
        item.style.top = `${columns[columnIndex]}px`;
        item.style.transform = 'translateZ(0)'; // Force hardware acceleration
        
        // Update column height with extra spacing
        columns[columnIndex] += itemHeight + gap;
      });

      // Set container height with buffer
      const maxHeight = Math.max(...columns);
      container.style.height = `${maxHeight}px`;
      
      setLayoutComplete(true);
    };

    // Start the layout process
    waitForContentAndLayout();
  };

  useEffect(() => {
    if (!mounted) return;

    // Reset layout state
    setLayoutComplete(false);

    // Initial layout - wait for DOM to be ready
    const initialLayout = () => {
      if (document.readyState === 'complete') {
        setTimeout(calculateLayout, 100);
      } else {
        window.addEventListener('load', () => {
          setTimeout(calculateLayout, 100);
        }, { once: true });
      }
    };

    initialLayout();

    const resizeObserver = new ResizeObserver(() => {
      setLayoutComplete(false);
      setTimeout(calculateLayout, 50);
    });

    const mutationObserver = new MutationObserver(() => {
      setLayoutComplete(false);
      setTimeout(calculateLayout, 200);
    });

    // Add scroll end detection to fix layout issues
    let scrollTimeout: NodeJS.Timeout;
    const handleScrollEnd = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!layoutComplete) {
          calculateLayout();
        }
      }, 150);
    };

    // Add window resize handler for better responsiveness
    const handleResize = () => {
      setLayoutComplete(false);
      setTimeout(calculateLayout, 100);
    };

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      mutationObserver.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
      window.addEventListener('scroll', handleScrollEnd, { passive: true });
      window.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('scroll', handleScrollEnd);
      window.removeEventListener('resize', handleResize);
      clearTimeout(scrollTimeout);
    };
  }, [mounted, children.length, columnMinWidth, gap]);

  if (!mounted) {
    // Server-side fallback to CSS Grid with proper spacing
    return (
      <div 
        className={`grid ${className}`}
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gridAutoRows: 'min-content',
          gap: `${gap}px`
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`masonry-container relative ${className}`}
      style={{ 
        position: 'relative',
        minHeight: layoutComplete ? 'auto' : '400px'
      }}
    >
      {children}
    </div>
  );
}

export default MasonryLayout; 