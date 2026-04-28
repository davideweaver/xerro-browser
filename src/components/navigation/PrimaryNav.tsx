import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PrimaryNavItem } from "@/lib/navigationConfig";

interface PrimaryNavProps {
  navigationConfig: PrimaryNavItem[];
  activePrimary: string | null;
  onNavigate: (path: string) => void;
  footer?: React.ReactNode;
  indicators?: Record<string, React.ReactNode>;
  leftIndicators?: Record<string, React.ReactNode>;
}

export function PrimaryNav({
  navigationConfig,
  activePrimary,
  onNavigate,
  footer,
  indicators = {},
  leftIndicators = {},
}: PrimaryNavProps) {
  const isMobile = useIsMobile();

  return (
    <nav className="w-[75px] bg-background flex flex-col">
      {/* Header spacer */}
      <div
        className="flex items-center justify-center"
        style={{
          height: "calc(4rem + env(safe-area-inset-top))",
        }}
      >
        {/* Optional logo or title initial */}
      </div>

      {/* Navigation buttons */}
      <div className="flex-1 flex flex-col items-center gap-4 p-2 pt-6">
        <TooltipProvider delayDuration={300}>
          {navigationConfig.map((item) => {
            const isActive = activePrimary === item.key;
            const indicator = indicators[item.key];
            const leftIndicator = leftIndicators[item.key];
            const button = (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-14 w-14 rounded-lg transition-colors",
                    item.iconClassName ?? "[&_svg]:!size-5",
                    isActive ? "bg-muted text-primary" : "hover:bg-accent",
                  )}
                  onClick={() => onNavigate(item.defaultPath)}
                >
                  <item.icon />
                </Button>
                {indicator && (
                  <div className="absolute top-1 right-1">{indicator}</div>
                )}
                {leftIndicator && (
                  <div className="absolute top-1.5 left-1.5">{leftIndicator}</div>
                )}
              </div>
            );

            // Show tooltips only on desktop
            if (isMobile) {
              return <div key={item.key}>{button}</div>;
            }

            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Footer - ProfileMenu */}
      {footer && <div className="p-2 flex justify-center">{footer}</div>}
    </nav>
  );
}
