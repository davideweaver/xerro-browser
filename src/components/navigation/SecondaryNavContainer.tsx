import type { ReactNode } from "react";
import { useIsStandalone } from "@/hooks/use-is-standalone";
import { StandaloneNavBar } from "@/components/navigation/StandaloneNavBar";

interface SecondaryNavContainerProps {
  title: string;
  mobileTitle?: string;
  tools?: ReactNode;
  children: ReactNode;
}

export function SecondaryNavContainer({
  title,
  mobileTitle,
  tools,
  children,
}: SecondaryNavContainerProps) {
  const isStandalone = useIsStandalone();

  return (
    <nav className="w-full md:w-[380px] bg-card flex flex-col min-w-0 md:pt-[17px]">
      {/* Header */}
      <div
        className="px-6 flex items-center justify-between mb-4"
        style={{
          paddingTop: "calc(1rem + env(safe-area-inset-top))",
        }}
      >
        <h2 className="font-bold" style={{ fontSize: 28 }}>
          <span className="md:hidden">{mobileTitle || title}</span>
          <span className="hidden md:inline">{title}</span>
        </h2>
        {tools && <div className="flex items-center gap-1">{tools}</div>}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto">{children}</div>

      {/* PWA-only browser navigation controls */}
      {isStandalone && <StandaloneNavBar />}
    </nav>
  );
}
