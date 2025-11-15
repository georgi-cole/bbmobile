/**
 * toolbarScroll.js
 * Manages horizontal scrolling behavior for mobile toolbar
 * - Updates fade overlays based on scroll position
 * - Provides keyboard navigation (arrow keys to scroll)
 * - Handles resize events to update fade state
 */

/**
 * Initialize scrollable toolbar behavior
 * @param {string} selector - CSS selector for toolbar element (default: '.toolbar--scroll')
 */
export function initScrollableToolbar(selector = '.toolbar--scroll') {
  const toolbar = document.querySelector(selector);
  
  if (!toolbar) {
    console.warn('[ToolbarScroll] Toolbar element not found:', selector);
    return;
  }
  
  /**
   * Update fade overlay visibility based on scroll position
   */
  const updateFades = () => {
    const { scrollLeft, clientWidth, scrollWidth } = toolbar;
    
    // Check if we're at the start (left edge)
    const atStart = scrollLeft <= 1;
    
    // Check if we're at the end (right edge)
    const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;
    
    // Toggle classes to control fade visibility
    toolbar.classList.toggle('no-left', atStart);
    toolbar.classList.toggle('no-right', atEnd);
  };
  
  /**
   * Scroll toolbar by a specified amount
   * @param {number} amount - Pixels to scroll (positive = right, negative = left)
   */
  const scrollBy = (amount) => {
    toolbar.scrollBy({
      left: amount,
      behavior: 'smooth'
    });
  };
  
  /**
   * Handle keyboard navigation for toolbar scrolling
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleKeyDown = (e) => {
    // Only handle arrow keys when toolbar or its children have focus
    if (!toolbar.contains(document.activeElement)) {
      return;
    }
    
    const scrollAmount = 80; // pixels per arrow key press
    
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        scrollBy(scrollAmount);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        scrollBy(-scrollAmount);
        break;
    }
  };
  
  /**
   * Ensure focused button is visible when tabbing
   * @param {FocusEvent} e - Focus event
   */
  const handleFocus = (e) => {
    if (e.target.classList.contains('btn')) {
      // Give time for focus ring to render, then ensure visibility
      setTimeout(() => {
        e.target.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }, 50);
    }
  };
  
  // Attach scroll listener to update fades
  toolbar.addEventListener('scroll', updateFades, { passive: true });
  
  // Attach resize observer to update fades when toolbar size changes
  const resizeObserver = new ResizeObserver(updateFades);
  resizeObserver.observe(toolbar);
  
  // Attach keyboard navigation
  toolbar.addEventListener('keydown', handleKeyDown);
  
  // Ensure focused buttons are visible
  toolbar.addEventListener('focusin', handleFocus);
  
  // Initial fade state
  updateFades();
  
  // Return cleanup function
  return () => {
    toolbar.removeEventListener('scroll', updateFades);
    toolbar.removeEventListener('keydown', handleKeyDown);
    toolbar.removeEventListener('focusin', handleFocus);
    resizeObserver.disconnect();
  };
}

/**
 * Auto-initialize if toolbar element exists on DOM load
 */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initScrollableToolbar();
    });
  } else {
    // DOM already loaded
    initScrollableToolbar();
  }
}
