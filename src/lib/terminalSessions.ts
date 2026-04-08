/**
 * Tracks which chat session IDs have an active terminal session.
 * Stored in localStorage so it persists across page refreshes.
 * Dispatches a custom event for same-tab reactivity.
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'terminal-active-sessions';
const CHANGE_EVENT = 'terminal-sessions-changed';

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return new Set();
}

function save(sessions: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...sessions]));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {}
}

export function addActiveTerminalSession(chatSessionId: string): void {
  const sessions = load();
  sessions.add(chatSessionId);
  save(sessions);
}

export function removeActiveTerminalSession(chatSessionId: string): void {
  const sessions = load();
  sessions.delete(chatSessionId);
  save(sessions);
}

export function useActiveTerminalSessions(): Set<string> {
  const [sessions, setSessions] = useState<Set<string>>(load);

  useEffect(() => {
    const handler = () => setSessions(load());
    window.addEventListener(CHANGE_EVENT, handler);
    // Also sync across tabs
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return sessions;
}
