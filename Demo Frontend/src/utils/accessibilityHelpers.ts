// Accessibility helper utilities for the Project Portal

/**
 * Announces content to screen readers
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
};

/**
 * Manages focus for modal dialogs and overlays
 */
export class FocusManager {
  private previousFocus: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.updateFocusableElements();
  }

  private updateFocusableElements() {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]'
    ].join(', ');

    this.focusableElements = Array.from(
      this.container.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];
  }

  trapFocus() {
    this.previousFocus = document.activeElement as HTMLElement;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      this.updateFocusableElements();
      
      if (this.focusableElements.length === 0) return;

      const firstElement = this.focusableElements[0];
      const lastElement = this.focusableElements[this.focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }

  restoreFocus() {
    if (this.previousFocus) {
      this.previousFocus.focus();
    }
  }
}

/**
 * Checks if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Checks if user is using high contrast mode
 */
export const prefersHighContrast = (): boolean => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

/**
 * Generates unique IDs for form elements
 */
export const generateId = (prefix: string = 'element'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validates form accessibility
 */
export const validateFormAccessibility = (form: HTMLFormElement): string[] => {
  const issues: string[] = [];
  
  // Check for form labels
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    const element = input as HTMLInputElement;
    const hasLabel = element.labels && element.labels.length > 0;
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
    
    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push(`Input element missing label: ${element.name || element.id || 'unnamed'}`);
    }
  });

  // Check for fieldsets with legends
  const fieldsets = form.querySelectorAll('fieldset');
  fieldsets.forEach((fieldset) => {
    const legend = fieldset.querySelector('legend');
    if (!legend) {
      issues.push('Fieldset missing legend element');
    }
  });

  // Check for error messages
  const errorElements = form.querySelectorAll('[aria-invalid="true"]');
  errorElements.forEach((element) => {
    const hasErrorMessage = element.hasAttribute('aria-describedby');
    if (!hasErrorMessage) {
      issues.push(`Invalid element missing error message: ${(element as HTMLElement).id || 'unnamed'}`);
    }
  });

  return issues;
};

/**
 * Keyboard navigation helper
 */
export const handleArrowKeyNavigation = (
  event: KeyboardEvent,
  elements: HTMLElement[],
  currentIndex: number,
  options: {
    horizontal?: boolean;
    vertical?: boolean;
    wrap?: boolean;
  } = {}
): number => {
  const { horizontal = true, vertical = true, wrap = true } = options;
  
  let newIndex = currentIndex;
  
  switch (event.key) {
    case 'ArrowUp':
      if (vertical) {
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : (wrap ? elements.length - 1 : 0);
      }
      break;
    case 'ArrowDown':
      if (vertical) {
        event.preventDefault();
        newIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : (wrap ? 0 : elements.length - 1);
      }
      break;
    case 'ArrowLeft':
      if (horizontal) {
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : (wrap ? elements.length - 1 : 0);
      }
      break;
    case 'ArrowRight':
      if (horizontal) {
        event.preventDefault();
        newIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : (wrap ? 0 : elements.length - 1);
      }
      break;
    case 'Home':
      event.preventDefault();
      newIndex = 0;
      break;
    case 'End':
      event.preventDefault();
      newIndex = elements.length - 1;
      break;
  }
  
  if (newIndex !== currentIndex && elements[newIndex]) {
    elements[newIndex].focus();
  }
  
  return newIndex;
};

/**
 * Color contrast checker (basic implementation)
 */
export const checkColorContrast = (foreground: string, background: string): {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
} => {
  // This is a simplified implementation
  // In a real application, you'd use a proper color contrast library
  
  const getLuminance = (_color: string): number => {
    // Convert hex to RGB and calculate relative luminance
    // This is a placeholder implementation
    return 0.5; // Placeholder
  };

  const foregroundLuminance = getLuminance(foreground);
  const backgroundLuminance = getLuminance(background);
  
  const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / 
                (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);

  return {
    ratio,
    wcagAA: ratio >= 4.5,
    wcagAAA: ratio >= 7
  };
};

/**
 * Screen reader detection
 */
export const detectScreenReader = (): boolean => {
  // Check for common screen reader indicators
  const indicators = [
    'speechSynthesis' in window,
    navigator.userAgent.includes('NVDA'),
    navigator.userAgent.includes('JAWS'),
    navigator.userAgent.includes('VoiceOver'),
    'onvoiceschanged' in speechSynthesis
  ];
  
  return indicators.some(indicator => indicator);
};

/**
 * Mobile device detection for touch-friendly interfaces
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         ('ontouchstart' in window) ||
         (navigator.maxTouchPoints > 0);
};

/**
 * Accessibility testing helper
 */
export const runAccessibilityChecks = (): {
  issues: string[];
  recommendations: string[];
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for missing alt text on images
  const images = document.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.alt && !img.hasAttribute('aria-hidden')) {
      issues.push(`Image ${index + 1} missing alt text`);
    }
  });

  // Check for proper heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let previousLevel = 0;
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    if (index === 0 && level !== 1) {
      issues.push('Page should start with h1 heading');
    }
    if (level > previousLevel + 1) {
      issues.push(`Heading level skipped: h${previousLevel} to h${level}`);
    }
    previousLevel = level;
  });

  // Check for keyboard accessibility
  const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"]');
  interactiveElements.forEach((element, index) => {
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex && parseInt(tabIndex) > 0) {
      recommendations.push(`Element ${index + 1} uses positive tabindex, consider using 0 or -1`);
    }
  });

  // Check for ARIA labels
  const elementsNeedingLabels = document.querySelectorAll('[role="button"], [role="link"], [role="tab"], [role="menuitem"]');
  elementsNeedingLabels.forEach((element, index) => {
    const hasLabel = element.hasAttribute('aria-label') || 
                    element.hasAttribute('aria-labelledby') ||
                    element.textContent?.trim();
    if (!hasLabel) {
      issues.push(`Interactive element ${index + 1} missing accessible name`);
    }
  });

  return { issues, recommendations };
};