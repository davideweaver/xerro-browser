import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useXerroWebSocketContext } from '@/context/XerroWebSocketContext';

export function useTriggerUpdates() {
  const { subscribeToTriggerCreated, subscribeToTriggerUpdated, subscribeToTriggerDeleted } =
    useXerroWebSocketContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribeCreated = subscribeToTriggerCreated(() => {
      queryClient.invalidateQueries({ queryKey: ['agent-triggers'] });
    });

    const unsubscribeUpdated = subscribeToTriggerUpdated(() => {
      queryClient.invalidateQueries({ queryKey: ['agent-triggers'] });
    });

    const unsubscribeDeleted = subscribeToTriggerDeleted(() => {
      queryClient.invalidateQueries({ queryKey: ['agent-triggers'] });
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [subscribeToTriggerCreated, subscribeToTriggerUpdated, subscribeToTriggerDeleted, queryClient]);
}
