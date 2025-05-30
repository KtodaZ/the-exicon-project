import React, { useState, useEffect, useRef } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startTouchY = useRef<number>(0);
  const currentTouchY = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPortalRoot(document.body);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsAnimating(true), 10);
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      document.body.style.overflow = 'unset';
      setTimeout(() => setShouldRender(false), 300);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Use direct DOM manipulation instead of createPortal to avoid type issues
  useEffect(() => {
    if (shouldRender && portalRoot) {
      const div = document.createElement('div');
      portalRoot.appendChild(div);
      
      // We'll render the sheet here manually
      return () => {
        if (portalRoot.contains(div)) {
          portalRoot.removeChild(div);
        }
      };
    }
  }, [shouldRender, portalRoot]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startTouchY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentTouchY.current = e.touches[0].clientY;
    const diff = currentTouchY.current - startTouchY.current;
    
    if (diff > 0 && sheetRef.current) {
      // Only allow downward movement
      sheetRef.current.style.transform = `translateY(${Math.min(diff, 100)}px)`;
    }
  };

  const handleTouchEnd = () => {
    const diff = currentTouchY.current - startTouchY.current;
    
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
      
      // Close if dragged down more than 100px
      if (diff > 100) {
        onClose();
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!shouldRender || !portalRoot) return null;

  const sheet = (
    <div
      className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${
        isAnimating ? 'bg-black/50' : 'bg-transparent'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={`w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl transform transition-transform duration-300 max-h-[80vh] flex flex-col ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-6 pb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  // For now, let's render inline and use fixed positioning
  return sheet;
} 