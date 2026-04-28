import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { PrimaryNav } from "./PrimaryNav";
import { SecondaryNav } from "./SecondaryNav";
import type { PrimaryNavItem } from "@/lib/navigationConfig";

// Animation duration for snap transitions (in ms)
const SNAP_ANIMATION_DURATION = 200;

interface DraggableMobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  activePrimary: string | null;
  pathname: string;
  navigationConfig: PrimaryNavItem[];
  onNavigate: (path: string) => void;
  footer?: React.ReactNode;
  secondaryNav?: React.ReactNode;
  indicators?: Record<string, React.ReactNode>;
  leftIndicators?: Record<string, React.ReactNode>;
}

export function DraggableMobileNav({
  isOpen,
  onClose,
  activePrimary,
  pathname,
  navigationConfig,
  onNavigate,
  footer,
  secondaryNav,
  indicators = {},
  leftIndicators = {},
}: DraggableMobileNavProps) {
  const [translateX, setTranslateX] = useState(-100);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const currentTranslateX = useRef(-100);
  const hasCheckedDirection = useRef(false);
  const lastTranslateX = useRef(-100); // Track last position during drag
  const shouldCloseAfterTransition = useRef(false);

  // Animate open/close when isOpen changes
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTranslateX(0);
      currentTranslateX.current = 0;
      shouldCloseAfterTransition.current = false;
      // Prevent body scroll when nav is open
      document.body.style.overflow = "hidden";
    } else if (!shouldCloseAfterTransition.current) {
      // Parent closed it (not from our drag animation)
      setTranslateX(-100);
      currentTranslateX.current = -100;
      // Restore body scroll when nav is closed
      document.body.style.overflow = "";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    hasCheckedDirection.current = false;
    // Don't set isDragging yet - wait to see if it's horizontal or vertical movement
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check direction on first significant movement (10px threshold)
    // This prevents accidental horizontal drags when trying to scroll vertically
    if (!hasCheckedDirection.current && (absDeltaX > 10 || absDeltaY > 10)) {
      hasCheckedDirection.current = true;

      if (absDeltaY > absDeltaX) {
        // More vertical than horizontal - treat as scroll, not drag
        setIsDragging(false);
        return;
      }

      // More horizontal than vertical - this is a drag
      setIsDragging(true);
      e.stopPropagation();
    }

    // Only process drag if we've determined it's horizontal
    if (!isDragging || !hasCheckedDirection.current) return;

    const width = window.innerWidth;

    // Calculate position as percentage: start position + pixel delta converted to percentage
    let newTranslateX = currentTranslateX.current + (deltaX / width) * 100;

    // Clamp between -100 (fully closed) and 0 (fully open)
    newTranslateX = Math.max(-100, Math.min(0, newTranslateX));

    setTranslateX(newTranslateX);
    lastTranslateX.current = newTranslateX; // Store for snap decision in touchend

    // Prevent child elements from scrolling during horizontal drag
    e.stopPropagation();
  };

  const handleTouchEnd = () => {
    if (!isDragging) {
      // Never started dragging (was a vertical scroll or tap)
      hasCheckedDirection.current = false;
      return;
    }

    const finalPosition = lastTranslateX.current;

    // Disable dragging mode to enable CSS transition
    setIsDragging(false);
    hasCheckedDirection.current = false;

    // Use requestAnimationFrame to ensure state update processes before setting position
    requestAnimationFrame(() => {
      // Snap threshold: 40% of the way across
      // If less than 40% closed, snap back open; if more, snap fully closed
      if (finalPosition > -40) {
        // Snap back to open position
        setTranslateX(0);
        currentTranslateX.current = 0;
        shouldCloseAfterTransition.current = false;
      } else {
        // Snap to closed position
        shouldCloseAfterTransition.current = true;
        setTranslateX(-100);
        currentTranslateX.current = -100;
        // onClose() will be called in handleTransitionEnd after animation completes
      }
    });
  };

  // Handle transition end - close after snap-to-closed animation completes
  const handleTransitionEnd = () => {
    if (shouldCloseAfterTransition.current && translateX === -100) {
      shouldCloseAfterTransition.current = false;
      document.body.style.overflow = "";
      onClose();
    }
  };

  // Primary nav: navigate but keep sidebar open
  const handlePrimaryNavigate = (path: string) => {
    onNavigate(path);
  };

  // Secondary nav: navigate and close sidebar
  const handleSecondaryNavigate = (path: string) => {
    onNavigate(path);
    onClose();
  };

  if (!isOpen && translateX === -100) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/80 md:hidden"
        style={{
          opacity: (translateX + 100) / 100,
          pointerEvents: translateX === -100 ? "none" : "auto",
          transition: isDragging ? "none" : "opacity 300ms ease-in-out",
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 left-0 z-50 w-full bg-background shadow-lg md:hidden overflow-hidden"
        style={{
          transform: `translateX(${translateX}%)`,
          transition: isDragging ? "none" : `transform ${SNAP_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
        onTouchStartCapture={handleTouchStart}
        onTouchMoveCapture={handleTouchMove}
        onTouchEndCapture={handleTouchEnd}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute left-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          style={{
            top: "calc(1rem + 6px + env(safe-area-inset-top))",
          }}
        >
          <X className="h-8 w-8" />
          <span className="sr-only">Close</span>
        </button>

        {/* Content - flex container with no scroll */}
        <div className="flex h-full">
          <PrimaryNav
            navigationConfig={navigationConfig}
            activePrimary={activePrimary}
            onNavigate={handlePrimaryNavigate}
            footer={footer}
            indicators={indicators}
            leftIndicators={leftIndicators}
          />
          {secondaryNav || (
            <SecondaryNav
              activePrimary={activePrimary}
              pathname={pathname}
              onNavigate={handleSecondaryNavigate}
            />
          )}
        </div>
      </div>
    </>
  );
}
