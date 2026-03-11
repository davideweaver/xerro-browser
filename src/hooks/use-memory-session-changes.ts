import { useEffect } from 'react';
import { useXerroWebSocketContext } from '@/context/XerroWebSocketContext';
import type { MemorySessionPayload, MemorySessionDeletedPayload, MemoryProjectPayload } from '@/types/websocket';

interface UseMemorySessionChangesOptions {
  onSessionCreated?: (event: MemorySessionPayload) => void;
  onSessionUpdated?: (event: MemorySessionPayload) => void;
  onSessionDeleted?: (event: MemorySessionDeletedPayload) => void;
  onProjectAdded?: (event: MemoryProjectPayload) => void;
  onProjectUpdated?: (event: MemoryProjectPayload) => void;
  onProjectDeleted?: (event: MemoryProjectPayload) => void;
}

export function useMemorySessionChanges(options: UseMemorySessionChangesOptions = {}) {
  const {
    subscribeToMemorySessionCreated,
    subscribeToMemorySessionUpdated,
    subscribeToMemorySessionDeleted,
    subscribeToMemoryProjectAdded,
    subscribeToMemoryProjectUpdated,
    subscribeToMemoryProjectDeleted,
  } = useXerroWebSocketContext();

  const { onSessionCreated, onSessionUpdated, onSessionDeleted, onProjectAdded, onProjectUpdated, onProjectDeleted } = options;

  useEffect(() => {
    if (!onSessionCreated) return;
    return subscribeToMemorySessionCreated(onSessionCreated);
  }, [onSessionCreated, subscribeToMemorySessionCreated]);

  useEffect(() => {
    if (!onSessionUpdated) return;
    return subscribeToMemorySessionUpdated(onSessionUpdated);
  }, [onSessionUpdated, subscribeToMemorySessionUpdated]);

  useEffect(() => {
    if (!onSessionDeleted) return;
    return subscribeToMemorySessionDeleted(onSessionDeleted);
  }, [onSessionDeleted, subscribeToMemorySessionDeleted]);

  useEffect(() => {
    if (!onProjectAdded) return;
    return subscribeToMemoryProjectAdded(onProjectAdded);
  }, [onProjectAdded, subscribeToMemoryProjectAdded]);

  useEffect(() => {
    if (!onProjectUpdated) return;
    return subscribeToMemoryProjectUpdated(onProjectUpdated);
  }, [onProjectUpdated, subscribeToMemoryProjectUpdated]);

  useEffect(() => {
    if (!onProjectDeleted) return;
    return subscribeToMemoryProjectDeleted(onProjectDeleted);
  }, [onProjectDeleted, subscribeToMemoryProjectDeleted]);
}
