import React, { useEffect, useRef, useState } from 'react';

interface CSSMasonryLayoutProps {
  children: React.ReactNode[];
  className?: string;
  columnMinWidth?: number;
  gap?: number;
  resetKey?: string; // Add prop to force reset when content changes dramatically
}

export function CSSMasonryLayout({ 
  children, 
  className = '', 
  columnMinWidth = 280, 
  gap = 24,
  resetKey 
}: CSSMasonryLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState<number>(0);
  const prevChildrenLength = useRef<number>(children.length);
  const prevResetKey = useRef<string | undefined>(resetKey);

  // Reset min-height when resetKey changes (filter/search applied)
  useEffect(() => {
    if (resetKey !== prevResetKey.current) {
      setMinHeight(0);
      prevResetKey.current = resetKey;
    }
  }, [resetKey]);

  // Track container height to prevent jumping during normal scrolling
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const currentHeight = entry.contentRect.height;
        
        // If this is a dramatic content change (filter/search), reset immediately
        const childrenCountChange = Math.abs(children.length - prevChildrenLength.current);
        const isLargeChange = childrenCountChange > children.length * 0.3; // 30% change
        
        if (isLargeChange || resetKey !== prevResetKey.current) {
          setMinHeight(currentHeight);
        } else {
          // Normal incremental loading - only increase min-height
          setMinHeight(prev => Math.max(prev, currentHeight));
        }
      }
    });

    observer.observe(containerRef.current);
    prevChildrenLength.current = children.length;

    return () => {
      observer.disconnect();
    };
  }, [children.length, resetKey]);

  // Smooth height transitions when content changes
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const currentHeight = container.getBoundingClientRect().height;
    
    // More aggressive reduction when content is significantly smaller
    if (currentHeight < minHeight * 0.5) {
      // Immediate reset for dramatic changes
      setMinHeight(currentHeight);
    } else if (currentHeight < minHeight * 0.8) {
      // Gradual reduction for smaller changes
      setTimeout(() => {
        setMinHeight(currentHeight);
      }, 300);
    }
  }, [children.length, minHeight]);

  return (
    <div
      ref={containerRef}
      className={`css-masonry-container ${className}`}
      style={{
        columnWidth: `${columnMinWidth}px`,
        columnGap: `${gap}px`,
        columnFill: 'balance',
        minHeight: `${minHeight}px`,
        transition: 'min-height 0.3s ease-out',
      }}
    >
      {children.map((child, index) => (
        <div
          key={index}
          className="css-masonry-item"
          style={{
            breakInside: 'avoid',
            pageBreakInside: 'avoid',
            marginBottom: `${gap}px`,
            display: 'inline-block',
            width: '100%'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

export default CSSMasonryLayout;