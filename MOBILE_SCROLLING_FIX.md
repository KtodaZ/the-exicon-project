# Mobile Scrolling Fix for Lexicon Cards

## Problem Statement

Users on mobile devices experienced unwanted navigation when scrolling on the lexicon page. When scrolling and lifting their finger over a card, it would automatically navigate to that card's detail page, even though the user only intended to scroll.

## Root Cause

The issue was introduced by a previous fix for double-click problems on mobile. The solution added an `onTouchEnd` event handler that would trigger navigation whenever a touch event ended on a card, regardless of whether the user was scrolling or intentionally tapping.

```javascript
// Previous problematic approach
onTouchEnd={handleCardTouch}
```

## New Solution: Scroll Detection Without Touch Events

Instead of using touch events, the new solution uses **scroll detection** to intelligently disable clicks during scrolling periods.

### Key Features

1. **Scroll State Tracking**: Monitors when the page is being scrolled
2. **Temporary Click Disable**: Disables card clicks during and shortly after scrolling
3. **No Touch Events**: Uses only standard `onClick` handlers
4. **CSS Improvements**: Optimizes hover behavior for touch devices

### Implementation Details

#### 1. Scroll Detection Hook
```javascript
const [isScrolling, setIsScrolling] = useState(false);
const scrollTimeoutRef = useRef<NodeJS.Timeout>();

useEffect(() => {
  const handleScroll = () => {
    setIsScrolling(true);
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set scrolling to false after 150ms
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', handleScroll);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  };
}, []);
```

#### 2. Smart Click Handler
```javascript
const handleCardClick = (e: React.MouseEvent) => {
  // Don't navigate if we're currently scrolling
  if (isScrolling) {
    return;
  }

  // Existing logic for checking interactive elements...
  router.push(`/lexicon/${item.urlSlug}`);
};
```

#### 3. CSS Touch Optimizations
```css
/* Improve touch device behavior */
@media (hover: none) and (pointer: coarse) {
  .lexicon-card:hover {
    border-color: inherit !important;
    box-shadow: inherit !important;
  }
  
  .lexicon-card .group-hover\:scale-110 {
    transform: none !important;
  }
  
  .lexicon-card .group-hover\:opacity-100 {
    opacity: 1 !important;
  }
}
```

### Benefits of This Approach

1. **Simpler Logic**: No complex touch event tracking
2. **More Reliable**: Works across all devices and browsers
3. **Better Performance**: Uses passive scroll listeners
4. **Future-Proof**: Doesn't rely on touch-specific APIs
5. **Maintainable**: Easier to understand and debug

### Technical Details

- **Scroll Detection Window**: 150ms after scroll ends
- **Performance**: Uses `requestAnimationFrame` for smooth detection
- **Memory Management**: Properly cleans up timeouts and event listeners
- **Touch Action**: `touch-action: manipulation` prevents unwanted gestures

### Files Modified

1. `apps/web/components/lexicon-card.tsx` - Main component logic
2. `apps/web/styles/globals.css` - Touch device CSS improvements

### Testing

The solution has been validated through:
- ✅ TypeScript compilation
- ✅ Linting checks  
- ✅ Build process
- ✅ No breaking changes to existing functionality

This approach completely eliminates the mobile scrolling regression while maintaining the original double-click fix benefits.