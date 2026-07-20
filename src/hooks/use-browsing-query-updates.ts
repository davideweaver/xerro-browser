import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useXerroWebSocketContext } from '@/context/XerroWebSocketContext';

/**
 * Global hook that subscribes to browsing-history WebSocket events and
 * invalidates the relevant React Query caches. Register once in Layout.tsx.
 */
export function useBrowsingQueryUpdates() {
  const queryClient = useQueryClient();
  const {
    subscribeToBrowsingVisitsSynced,
    subscribeToBrowsingTopicsUpdated,
    subscribeToBrowsingInterestsUpdated,
  } = useXerroWebSocketContext();

  useEffect(() => {
    const unsubVisits = subscribeToBrowsingVisitsSynced(() => {
      queryClient.invalidateQueries({ queryKey: ['browsing', 'timeline'] });
      queryClient.invalidateQueries({ queryKey: ['browsing', 'domains'] });
      queryClient.invalidateQueries({ queryKey: ['browsing', 'stats'] });
    });

    const unsubTopics = subscribeToBrowsingTopicsUpdated(() => {
      queryClient.invalidateQueries({ queryKey: ['browsing', 'topics'] });
    });

    const unsubInterests = subscribeToBrowsingInterestsUpdated(() => {
      queryClient.invalidateQueries({ queryKey: ['browsing', 'interests'] });
    });

    return () => {
      unsubVisits();
      unsubTopics();
      unsubInterests();
    };
  }, [queryClient, subscribeToBrowsingVisitsSynced, subscribeToBrowsingTopicsUpdated, subscribeToBrowsingInterestsUpdated]);
}
