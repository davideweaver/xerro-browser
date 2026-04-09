/**
 * TerminalSidePanel
 *
 * A right-side panel that houses the terminal. The panel slides in/out via
 * CSS transform rather than unmounting, preserving the xterm instance and
 * its full in-memory scrollback buffer across open/close toggles.
 *
 * Session lifecycle:
 * 1. Terminal session ID is always derived from chatSessionId — no storage needed.
 * 2. On first open: try attachSession (handles service restarts). If 404 → createSession
 *    with the same deterministic ID.
 * 3. Navigate away / come back → re-attaches to same session (tmux keeps it alive).
 * 4. Page refresh → same as above.
 * 5. Sessions are NOT deleted on unmount (tmux persists). They are only deleted
 *    when the user explicitly closes the chat session.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TerminalPanel } from './TerminalPanel';
import { terminalService } from '@/api/terminalService';
import { addActiveTerminalSession, removeActiveTerminalSession } from '@/lib/terminalSessions';
import { Loader2 } from 'lucide-react';

interface TerminalSidePanelProps {
  isOpen: boolean;
  chatSessionId: string;
  cwd: string;
  onClose: () => void;
}

type PanelState = 'idle' | 'loading' | 'ready' | 'error';

export function TerminalSidePanel({ isOpen, chatSessionId, cwd, onClose }: TerminalSidePanelProps) {
  // Terminal session ID is always the chat session ID — deterministic, no storage needed
  const terminalSessionId = chatSessionId;

  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [mountKey, setMountKey] = useState(0);
  const activeCwd = useRef(cwd);
  const hasInitialized = useRef(false);

  // Keep cwd ref current (may change if session settings update)
  activeCwd.current = cwd;

  const initSession = useCallback(async () => {
    setPanelState('loading');
    setErrorMsg('');

    // Always try to attach first — works whether session was just created,
    // service restarted, or user navigated away and came back.
    try {
      await terminalService.attachSession(terminalSessionId);
      addActiveTerminalSession(terminalSessionId);
      setPanelState('ready');
      return;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status !== 404) {
        setErrorMsg('Failed to reconnect to terminal session');
        setPanelState('error');
        return;
      }
      // 404 — session never existed yet, fall through to create
    }

    // Create a new session using the chat session ID as the terminal session ID
    try {
      await terminalService.createSession(activeCwd.current, 120, 40, terminalSessionId);
      addActiveTerminalSession(terminalSessionId);
      setPanelState('ready');
    } catch {
      setErrorMsg('Failed to create terminal session');
      setPanelState('error');
    }
  }, [terminalSessionId]);

  // Initialize on first open
  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      hasInitialized.current = true;
      initSession();
    }
  }, [isOpen, initSession]);

  // Called when the tmux session truly exits (user typed `exit` etc.) or on retry.
  // Removes from active tracking, increments mountKey to remount TerminalPanel, then re-initializes.
  const handleRetry = useCallback(() => {
    removeActiveTerminalSession(terminalSessionId);
    hasInitialized.current = false;
    setMountKey(k => k + 1);
    initSession();
  }, [terminalSessionId, initSession]);

  // Called when the user confirms deleting the session (X button).
  // Kills the tmux session, removes tracking, resets state, closes panel.
  const handleDelete = useCallback(() => {
    removeActiveTerminalSession(terminalSessionId);
    terminalService.deleteSession(terminalSessionId).catch(() => {});
    hasInitialized.current = false;
    setPanelState('idle');
    setMountKey(k => k + 1);
    onClose();
  }, [terminalSessionId, onClose]);

  // Dispatch resize event after open transition so FitAddon sizes correctly
  const prevOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !prevOpen.current) {
      prevOpen.current = true;
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 220);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      prevOpen.current = false;
    }
  }, [isOpen]);

  return (
    <div
      className="fixed right-0 z-50 flex flex-col bg-[#0d0d0d] border-l border-white/10 shadow-2xl w-full sm:w-[clamp(600px,70vw,1200px)]"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        bottom: 'env(safe-area-inset-bottom, 0px)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 200ms ease-in-out',
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
    >
      {panelState === 'loading' && (
        <div className="flex-1 flex items-center justify-center gap-3 text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Starting terminal…</span>
        </div>
      )}

      {panelState === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-red-400">{errorMsg}</p>
          <button
            className="px-4 py-2 text-sm rounded-md bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      )}

      {panelState === 'ready' && (
        <TerminalPanel
          key={mountKey}
          sessionId={terminalSessionId}
          cwd={cwd}
          isOpen={isOpen}
          onCollapse={onClose}
          onDelete={handleDelete}
          onSessionEnded={handleRetry}
        />
      )}
    </div>
  );
}
