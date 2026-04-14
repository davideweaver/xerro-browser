import * as ReactDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type BaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  footer?: React.ReactNode;
  footerHeight?: number;
  children: React.ReactNode;
  /**
   * "fullscreen" — always fills the screen (default, original behaviour).
   * "floating"   — fullscreen on mobile, centered floating window on desktop (md+).
   */
  variant?: "fullscreen" | "floating";
  /**
   * Extra Tailwind classes applied to the dialog panel in floating mode.
   * Use this to control width/min-height, e.g. "md:max-w-md md:min-h-[500px]".
   * Only takes effect when variant="floating".
   */
  floatingClassName?: string;
};

export function BaseDialog({
  open,
  onOpenChange,
  title,
  footer,
  footerHeight = 64,
  children,
  variant = "fullscreen",
  floatingClassName,
}: BaseDialogProps) {
  const headerHeight = 64;
  const isFloating = variant === "floating";
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const prevBodyStyle = useRef<{
    overflow?: string;
    position?: string;
    top?: string;
  } | null>(null);
  const savedScrollY = useRef<number>(0);

  // Pin the dialog to the visual viewport.
  //
  // On iOS, position:fixed elements are anchored to the layout viewport, not the
  // visual viewport. When the keyboard appears and iOS pans the visual viewport to
  // keep a focused input visible, fixed elements shift visually off-screen.
  //
  // The fix: directly set the dialog content's `top` and `height` to match the
  // visual viewport on every resize/scroll event. The inner layout is a simple
  // flex column — header and footer are flex children that naturally stay at the
  // visible edges; the scroll area fills whatever space remains.
  //
  // In floating mode on desktop (md+), CSS handles positioning so we skip JS
  // pinning and clear any previously-set inline styles instead.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;

    function layout() {
      const el = contentRef.current;
      if (!el) return;

      const isDesktop = window.matchMedia("(min-width: 768px)").matches;

      if (isFloating && isDesktop) {
        // Let CSS position the floating dialog; clear any JS-set styles.
        el.style.top = "";
        el.style.height = "";
        if (footerRef.current) footerRef.current.style.marginBottom = "";
        return;
      }

      const top = vv ? Math.round(vv.offsetTop) : 0;
      const height = vv ? Math.round(vv.height) : window.innerHeight;
      el.style.top = `${top}px`;
      el.style.height = `${height}px`;

      // Apply negative margin only when the keyboard is visible (visual viewport
      // is meaningfully shorter than the layout viewport).
      const keyboardVisible = vv ? window.innerHeight - vv.height > 150 : false;
      if (footerRef.current) {
        footerRef.current.style.marginBottom = keyboardVisible ? "-40px" : "0px";
      }
    }

    vv?.addEventListener("resize", layout);
    vv?.addEventListener("scroll", layout);
    window.addEventListener("orientationchange", layout);
    // Also re-run when the viewport width crosses the md breakpoint
    const mq = window.matchMedia("(min-width: 768px)");
    mq.addEventListener("change", layout);
    layout();

    return () => {
      vv?.removeEventListener("resize", layout);
      vv?.removeEventListener("scroll", layout);
      window.removeEventListener("orientationchange", layout);
      mq.removeEventListener("change", layout);
    };
  }, [open, isFloating]);

  // lock background scroll while dialog is open (and restore on close)
  useEffect(() => {
    if (!open) {
      // restore
      if (prevBodyStyle.current) {
        document.body.style.overflow = prevBodyStyle.current.overflow ?? "";
        document.body.style.position = prevBodyStyle.current.position ?? "";
        document.body.style.top = prevBodyStyle.current.top ?? "";
        const y = savedScrollY.current;
        if (typeof y === "number") window.scrollTo(0, y);
      }
      prevBodyStyle.current = null;
      return;
    }

    // save and lock
    prevBodyStyle.current = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
    };
    savedScrollY.current = window.scrollY;
    // freeze page behind dialog (prevents iOS from moving the page)
    document.body.style.overflow = "hidden";
    // use fixed positioning to freeze the scroll location
    document.body.style.position = "fixed";
    document.body.style.top = `-${window.scrollY}px`;

    return () => {
      // cleanup will be handled by the open=false branch above
    };
  }, [open]);

  // ensure focused inputs scroll into the dialog's scroll container (not the page)
  useEffect(() => {
    function onFocusIn(e: FocusEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (
        !(
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          (target as HTMLElement).isContentEditable
        )
      )
        return;

      // nearest scrollable ancestor should be our scrollRef; ensure it scrolls if needed
      const scroller = scrollRef.current;
      if (!scroller) return;

      // wait for keyboard to fully settle before adjusting scroll
      setTimeout(() => {
        try {
          const rect = target.getBoundingClientRect();
          const scRect = scroller.getBoundingClientRect();
          if (rect.bottom > scRect.bottom) {
            scroller.scrollTop += rect.bottom - scRect.bottom + 8;
          } else if (rect.top < scRect.top) {
            scroller.scrollTop -= scRect.top - rect.top + 8;
          }
        } catch {
          /* ignore */
        }
      }, 150);
    }

    window.addEventListener("focusin", onFocusIn, true);
    return () => window.removeEventListener("focusin", onFocusIn, true);
  }, []);

  if (!open) return null;

  return (
    <ReactDialog.Root open={open} onOpenChange={onOpenChange}>
      <ReactDialog.Portal>
        <ReactDialog.Overlay className="fixed inset-0 z-[1000] bg-black/50" />

        {/*
         * Fullscreen: ReactDialog.Content covers the full screen so its bg-background
         * fills the gap behind the keyboard. The inner wrapper is sized to the visual
         * viewport via JS (top/height) so the flex layout stays within the visible area.
         *
         * Floating (desktop): ReactDialog.Content is centered via CSS translate. The
         * inner wrapper uses max-h so it auto-sizes to content and scrolls when tall.
         * The JS viewport-pinning is skipped; CSS handles everything.
         */}
        <ReactDialog.Content
          aria-label="dialog-content"
          className={cn(
            "fixed z-[1001] bg-background overflow-hidden",
            isFloating
              ? cn(
                  // Mobile: fullscreen (same as fullscreen variant)
                  "inset-0",
                  // Desktop: floating centered window
                  "md:inset-auto md:left-1/2 md:top-1/2 md:translate-x-[-50%] md:translate-y-[-50%]",
                  "md:w-full md:max-w-lg md:rounded-xl md:shadow-2xl md:border",
                  floatingClassName
                )
              : "inset-0 max-w-4xl mx-auto"
          )}
        >
          <div
            ref={contentRef}
            className={cn(
              "flex flex-col overflow-hidden",
              isFloating
                // Mobile: absolute fill (JS will set top/height)
                // Desktop: static, sized by content up to max-h
                ? "absolute inset-x-0 md:static md:max-h-[85vh]"
                : "absolute inset-x-0"
            )}
            style={isFloating ? undefined : { top: 0, height: "100dvh" }}
          >
            {/* header */}
            <div
              aria-label="dialog-header"
              className="bg-background shrink-0"
              style={{
                height: `calc(${headerHeight}px + env(safe-area-inset-top))`,
                paddingTop: `calc(12px + env(safe-area-inset-top))`,
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingBottom: "24px",
                zIndex: 1002,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <ReactDialog.Title className="text-2xl font-bold">
                    {title}
                  </ReactDialog.Title>
                </div>
                <ReactDialog.Close className="rounded hover:bg-muted-foreground/30">
                  <X className="h-8 w-8" />
                </ReactDialog.Close>
              </div>
            </div>

            {/* scroll area: fills remaining space between header and footer */}
            <div
              ref={scrollRef}
              aria-label="dialog-scroll"
              className="flex-1 overflow-y-auto min-h-0"
              style={{
                WebkitOverflowScrolling: "touch",
                padding: "12px 16px",
              }}
            >
              {children}
            </div>

            {/* footer */}
            <div
              ref={footerRef}
              aria-label="dialog-footer"
              className="bg-background shrink-0"
              style={{
                height: `calc(${footerHeight}px + env(safe-area-inset-bottom))`,
                padding: `12px 16px env(safe-area-inset-bottom)`,
                zIndex: 1003,
              }}
            >
              {footer}
            </div>
          </div>
        </ReactDialog.Content>
      </ReactDialog.Portal>
    </ReactDialog.Root>
  );
}
