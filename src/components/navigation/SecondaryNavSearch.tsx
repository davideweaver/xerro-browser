import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SecondaryNavSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SecondaryNavSearch({ value, onChange, placeholder = "Search..." }: SecondaryNavSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={placeholder}
        className="pl-9 pr-8 border-0 bg-accent/40 focus-visible:ring-0 focus-visible:ring-offset-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
