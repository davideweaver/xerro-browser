import { ArrowLeft, ArrowRight, RotateCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SecondaryNavToolButton } from "@/components/navigation/SecondaryNavToolButton";

export function StandaloneNavBar() {
  const navigate = useNavigate();

  return (
    <div
      className="flex items-center justify-around gap-1 px-4 py-2 border-t border-border"
      style={{
        paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
      }}
    >
      <SecondaryNavToolButton
        aria-label="Back"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-5 w-5" />
      </SecondaryNavToolButton>
      <SecondaryNavToolButton
        aria-label="Forward"
        onClick={() => navigate(1)}
      >
        <ArrowRight className="h-5 w-5" />
      </SecondaryNavToolButton>
      <SecondaryNavToolButton
        aria-label="Refresh"
        onClick={() => window.location.reload()}
      >
        <RotateCw className="h-5 w-5" />
      </SecondaryNavToolButton>
    </div>
  );
}
