import { useState } from "react";

/**
 * Detects whether the device has a touchscreen. Unlike CSS media queries
 * (`pointer: coarse`, `hover: none`), this works on iPad even when Safari
 * is in "Request Desktop Site" mode, because it inspects the actual touch
 * API surface rather than the emulated pointer profile.
 */
export function useIsTouchDevice(): boolean {
  const [isTouch] = useState(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  });
  return isTouch;
}
