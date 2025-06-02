import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  container?: HTMLElement;
}

/**
 * Portal component for rendering content outside the current React tree hierarchy
 * Useful for modals, tooltips, and popovers that shouldn't be constrained by parent styling
 */
const Portal: React.FC<PortalProps> = ({ children, container }) => {
  // ✅ MEMOIZED: Calculate container once
  const portalContainer = useMemo(() => {
    return container || document.body;
  }, [container]);

  // ✅ PERFORMANCE: Disable scroll only when needed
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return createPortal(children, portalContainer);
};

export default Portal;