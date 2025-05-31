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

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculateLayout = () => {
    if (!containerRef.current || !mounted) return;

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const newColumnCount = Math.max(1, Math.floor(containerWidth / columnMinWidth));
    
    setColumnCount(newColumnCount);

    // Wait for next frame to ensure DOM is updated
    requestAnimationFrame(() => {
      const columns: number[] = new Array(newColumnCount).fill(0);
      const items = Array.from(container.children) as HTMLElement[];

      items.forEach((item, index) => {
        // For left-to-right ordering, we need to place items in order
        // but in the shortest column available at each step
        const columnIndex = columns.indexOf(Math.min(...columns));
        
        item.style.position = 'absolute';
        item.style.left = `${columnIndex * (containerWidth / newColumnCount)}px`;
        item.style.top = `${columns[columnIndex]}px`;
        item.style.width = `${containerWidth / newColumnCount - gap}px`;

        // Update column height
        columns[columnIndex] += item.offsetHeight + gap;
      });

      // Set container height to tallest column
      container.style.height = `${Math.max(...columns)}px`;
    });
  };

  useEffect(() => {
    if (!mounted) return;

    calculateLayout();

    const resizeObserver = new ResizeObserver(() => {
      calculateLayout();
    });

    const mutationObserver = new MutationObserver(() => {
      // Small delay to ensure content is rendered
      setTimeout(calculateLayout, 10);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      mutationObserver.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [mounted, children.length, columnMinWidth, gap]);

  if (!mounted) {
    // Server-side fallback to CSS Grid
    return (
      <div 
        className={`grid gap-6 ${className}`}
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gridAutoRows: 'min-content'
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ position: 'relative' }}
    >
      {children}
    </div>
  );
}

export default MasonryLayout; 