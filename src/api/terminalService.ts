/**
 * Terminal Service
 *
 * REST + Socket.IO client for xerro-service terminal sessions.
 * Each session is backed by a tmux session on the server, allowing
 * sessions to persist across service restarts.
 *
 * The socket connection is shared across all terminal instances.
 * Each terminal session joins its own Socket.IO room so output is
 * only delivered to the owning terminal.
 */

import { io, type Socket } from 'socket.io-client';
import { apiFetch } from '@/lib/apiFetch';
import { getToken } from '@/lib/authStorage';

const XERRO_URL = import.meta.env.VITE_XERRO_API_URL || '';
const BASE = `${XERRO_URL}/api/v1/terminal`;

class TerminalService {
  private socket: Socket | null = null;
  // Track all active room joins so we can re-join after reconnect
  private activeRooms = new Set<string>();

  private getSocket(): Socket {
    if (!this.socket) {
      const token = getToken();
      const sock = io(XERRO_URL, {
        path: '/ws',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        ...(token ? { auth: { token } } : {}),
      });

      // Re-join all active rooms after connect/reconnect
      sock.on('connect', () => {
        console.log('[terminal] socket connected, id:', sock.id, 'rejoining rooms:', [...this.activeRooms]);
        for (const sessionId of this.activeRooms) {
          sock.emit('terminal:join', { sessionId });
        }
      });

      this.socket = sock;
    }
    return this.socket;
  }

  async createSession(cwd: string, cols: number = 120, rows: number = 40, sessionId?: string): Promise<{ sessionId: string }> {
    const res = await apiFetch(`${BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd, cols, rows, ...(sessionId ? { sessionId } : {}) }),
    });
    if (!res.ok) throw new Error(`Failed to create terminal session: ${res.statusText}`);
    return res.json();
  }

  async attachSession(sessionId: string, cols: number = 120, rows: number = 40): Promise<{ sessionId: string }> {
    const res = await apiFetch(`${BASE}/sessions/${sessionId}/attach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cols, rows }),
    });
    if (res.status === 404) throw Object.assign(new Error('Session not found'), { status: 404 });
    if (!res.ok) throw new Error(`Failed to attach terminal session: ${res.statusText}`);
    return res.json();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await apiFetch(`${BASE}/sessions/${sessionId}`, { method: 'DELETE' });
  }

  async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
    await apiFetch(`${BASE}/sessions/${sessionId}/resize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cols, rows }),
    });
  }

  /** Join the socket.io room for this session to receive output. */
  joinRoom(sessionId: string): void {
    this.activeRooms.add(sessionId);
    const sock = this.getSocket();
    if (sock.connected) {
      sock.emit('terminal:join', { sessionId });
    }
    // If not yet connected, the 'connect' handler above will emit terminal:join once connected
  }

  /** Leave the socket.io room (called on panel unmount). */
  leaveRoom(sessionId: string): void {
    this.activeRooms.delete(sessionId);
    this.socket?.emit('terminal:leave', { sessionId });
  }

  sendInput(sessionId: string, data: string): void {
    this.getSocket().emit('terminal:input', { sessionId, data });
  }

  sendResize(sessionId: string, cols: number, rows: number): void {
    this.getSocket().emit('terminal:resize', { sessionId, cols, rows });
  }

  onOutput(sessionId: string, cb: (data: string) => void): () => void {
    const handler = (event: { sessionId: string; data: string }) => {
      if (event.sessionId === sessionId) cb(event.data);
    };
    this.getSocket().on('terminal:output', handler);
    return () => this.socket?.off('terminal:output', handler);
  }

  onExit(sessionId: string, cb: (exitCode: number) => void): () => void {
    const handler = (event: { sessionId: string; exitCode: number }) => {
      if (event.sessionId === sessionId) cb(event.exitCode);
    };
    this.getSocket().on('terminal:exit', handler);
    return () => this.socket?.off('terminal:exit', handler);
  }
}

export const terminalService = new TerminalService();
