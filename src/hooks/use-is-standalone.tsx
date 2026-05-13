import { useEffect, useState } from "react";

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as NavigatorWithStandalone).standalone === true;
  return mq || iosStandalone;
}

export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState<boolean>(() => detectStandalone());

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setIsStandalone(detectStandalone());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isStandalone;
}
