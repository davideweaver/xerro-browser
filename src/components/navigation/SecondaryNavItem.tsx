import { useRef } from "react";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SecondaryNavItemProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive: boolean;
  children: ReactNode;
}

/**
 * Standardized secondary navigation item button.
 *
 * Styling standards:
 * - Padding: py-3 px-3
 * - Active state: bg-accent (light) / bg-accent/60 (dark) with accent foreground text
 * - Hover state: bg-accent/50
 *
 * Touch behavior:
 * - Swipe detection built-in: if the touch moves > 8px vertically, the click is cancelled
 *   and e.preventDefault() blocks the synthetic click so navigation never fires.
 * - Active/hover CSS states are suppressed on coarse-pointer (touch) devices to prevent
 *   rows from lighting up as the finger scrolls over them.
 */
export function SecondaryNavItem({
  isActive,
  children,
  className,
  onClick,
  ...props
}: SecondaryNavItemProps): ReactNode {
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  return (
    <Button
      variant="ghost"
      className={cn(
        // Base layout
        "w-full justify-start h-auto py-3 px-3 rounded-lg whitespace-normal select-none transition-none",
        // Kill iOS tap highlight
        "[-webkit-tap-highlight-color:transparent]",
        // Suppress active/hover visual flash on touch devices (coarse pointer = finger)
        "[@media(pointer:coarse)]:active:bg-transparent [@media(pointer:coarse)]:hover:bg-transparent",
        isActive
          ? "bg-accent dark:bg-accent/60 text-accent-foreground"
          : "hover:bg-accent/50",
        className
      )}
      onTouchStart={(e) => {
        touchStartY.current = e.touches[0].clientY;
        isSwiping.current = false;
      }}
      onTouchMove={(e) => {
        if (Math.abs(e.touches[0].clientY - touchStartY.current) > 8) {
          isSwiping.current = true;
        }
      }}
      onTouchEnd={(e) => {
        if (isSwiping.current) {
          // Prevent the browser from synthesising a click event after a scroll
          e.preventDefault();
        }
      }}
      onClick={(e) => {
        // Guard for non-touch devices (keyboard, mouse) — touch is handled above
        if (onClick) onClick(e);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
