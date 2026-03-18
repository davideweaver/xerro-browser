import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SlashCommandPickerProps {
  commands: string[];
  selectedIndex: number;
  onSelect: (cmd: string) => void;
}

export function SlashCommandPicker({ commands, selectedIndex, onSelect }: SlashCommandPickerProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector(`[data-selected="true"]`) as HTMLElement | null;
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (commands.length === 0) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-md border bg-popover text-popover-foreground shadow-md overflow-hidden"
      ref={listRef}
    >
      <div className="max-h-48 overflow-y-auto">
        {commands.map((cmd, i) => (
          <div
            key={cmd}
            data-selected={i === selectedIndex ? 'true' : 'false'}
            className={cn(
              'flex items-center px-3 py-1.5 text-sm cursor-pointer select-none',
              i === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            )}
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent textarea blur
              onSelect(cmd);
            }}
          >
            <span className="font-mono">{cmd}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
