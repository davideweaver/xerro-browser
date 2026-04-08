/**
 * TerminalPanel
 *
 * Renders a full xterm.js terminal connected to a xerro-service PTY session.
 *
 * Key behaviors:
 * - Mounts xterm once; wires output/input via terminalService socket
 * - Serializes buffer to sessionStorage on unmount for cross-restart scrollback restore
 * - Uses ResizeObserver + FitAddon to keep terminal dimensions in sync with container
 */

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SerializeAddon } from '@xterm/addon-serialize';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { terminalService } from '@/api/terminalService';
import { X } from 'lucide-react';

interface TerminalPanelProps {
  sessionId: string;
  cwd: string;
  isOpen: boolean;
  onClose: () => void;
  onSessionEnded?: () => void;
}

const SERIALIZE_KEY = (id: string) => `terminal-scroll-${id}`;

const XTERM_THEME = {
  background: '#0d0d0d',
  foreground: '#e8e8e8',
  cursor: '#e8e8e8',
  cursorAccent: '#0d0d0d',
  black: '#1a1a1a',
  red: '#e05c5c',
  green: '#7ec47e',
  yellow: '#e8c873',
  blue: '#7eaae8',
  magenta: '#c47ee8',
  cyan: '#7ee8d4',
  white: '#d4d4d4',
  brightBlack: '#4a4a4a',
  brightRed: '#ff7070',
  brightGreen: '#96e896',
  brightYellow: '#ffe08a',
  brightBlue: '#96c6ff',
  brightMagenta: '#d896ff',
  brightCyan: '#96ffec',
  brightWhite: '#ffffff',
  selectionBackground: '#ffffff33',
};

export function TerminalPanel({ sessionId, cwd, isOpen, onClose, onSessionEnded }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const serializeAddonRef = useRef<SerializeAddon | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);

  // Re-focus terminal when panel becomes visible (after CSS slide-in transition)
  useEffect(() => {
    if (isOpen && termRef.current) {
      const t = setTimeout(() => termRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: XTERM_THEME,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const serializeAddon = new SerializeAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(serializeAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    fitAddon.fit();
    term.focus();

    termRef.current = term;
    fitAddonRef.current = fitAddon;
    serializeAddonRef.current = serializeAddon;

    // Restore serialized scrollback if available (service restart case)
    const savedBuffer = sessionStorage.getItem(SERIALIZE_KEY(sessionId));
    if (savedBuffer) {
      term.write(savedBuffer);
      sessionStorage.removeItem(SERIALIZE_KEY(sessionId));
    }

    // Wire output from socket to terminal
    const offOutput = terminalService.onOutput(sessionId, (data) => {
      term.write(data);
    });

    const offExit = terminalService.onExit(sessionId, () => {
      term.write('\r\n\x1b[90m[session ended]\x1b[0m\r\n');
      serializeAndSave(term, serializeAddon, sessionId);
      onSessionEnded?.();
    });

    // Wire keyboard input to socket
    const onKey = term.onData((data) => {
      terminalService.sendInput(sessionId, data);
    });

    // Join the room to receive output for this session
    terminalService.joinRoom(sessionId);

    // Prevent wheel events from bubbling to the page (avoids macOS history-swipe).
    // Tmux mouse mode handles the actual scroll within the terminal.
    const onWheel = (e: WheelEvent) => e.stopPropagation();
    containerRef.current.addEventListener('wheel', onWheel, { passive: true });

    // ResizeObserver to keep terminal sized to container
    const ro = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        terminalService.sendResize(sessionId, term.cols, term.rows);
      } catch {
        // container may have been removed
      }
    });
    ro.observe(containerRef.current);

    const containerEl = containerRef.current;
    cleanupRef.current = [
      offOutput,
      offExit,
      () => onKey.dispose(),
      () => ro.disconnect(),
      () => containerEl?.removeEventListener('wheel', onWheel),
      () => terminalService.leaveRoom(sessionId),
    ];

    return () => {
      // Serialize buffer for potential restore after service restart
      serializeAndSave(term, serializeAddon, sessionId);
      cleanupRef.current.forEach(fn => fn());
      term.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#111] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
          <span className="text-xs text-white/50 font-mono truncate">{cwd}</span>
        </div>
        <button
          className="h-7 w-7 flex items-center justify-center rounded text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors shrink-0 ml-2"
          onClick={onClose}
          title="Close terminal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Terminal container — overflow:hidden traps scroll events inside xterm */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 p-1 overflow-hidden"
        style={{ background: '#0d0d0d' }}
      />
    </div>
  );
}

function serializeAndSave(_term: Terminal, serializeAddon: SerializeAddon, sessionId: string) {
  try {
    const serialized = serializeAddon.serialize();
    if (serialized) {
      sessionStorage.setItem(SERIALIZE_KEY(sessionId), serialized);
    }
  } catch {
    // SerializeAddon may fail if terminal was disposed
  }
}
