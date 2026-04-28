import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useXerroWebSocketContext } from '@/context/XerroWebSocketContext';

/**
 * Global hook that subscribes to agent WebSocket events and invalidates
 * relevant React Query caches. Register once in Layout.tsx.
 */
export function useAgentQueryUpdates() {
  const queryClient = useQueryClient();
  const {
    subscribeToAgentCreated,
    subscribeToAgentUpdated,
    subscribeToAgentDeleted,
    subscribeToAgentFileCreated,
    subscribeToAgentFileUpdated,
    subscribeToAgentFileDeleted,
    subscribeToAgentFileMoved,
    subscribeToAgentFolderCreated,
    subscribeToAgentFolderDeleted,
    subscribeToAgentFolderMoved,
  } = useXerroWebSocketContext();

  useEffect(() => {
    const unsubAgentCreated = subscribeToAgentCreated(() => {
      queryClient.invalidateQueries({ queryKey: ['agents-nav'] });
    });

    const unsubAgentUpdated = subscribeToAgentUpdated((data) => {
      queryClient.invalidateQueries({ queryKey: ['agents-nav'] });
      queryClient.invalidateQueries({ queryKey: ['agent', data.id] });
    });

    const unsubAgentDeleted = subscribeToAgentDeleted((data) => {
      queryClient.invalidateQueries({ queryKey: ['agents-nav'] });
      queryClient.removeQueries({ queryKey: ['agent', data.id] });
    });

    const unsubFileCreated = subscribeToAgentFileCreated((data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-files-nav', data.agentId] });
    });

    const unsubFileUpdated = subscribeToAgentFileUpdated((data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-files-nav', data.agentId] });
      queryClient.invalidateQueries({ queryKey: ['agent-file-content', data.agentId, data.path] });
    });

    const unsubFileDeleted = subscribeToAgentFileDeleted((data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-files-nav', data.agentId] });
      queryClient.removeQueries({ queryKey: ['agent-file-content', data.agentId, data.path] });
    });

    const unsubFileMoved = subscribeToAgentFileMoved((data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-files-nav', data.agentId] });
      queryClient.removeQueries({ queryKey: ['agent-file-content', data.agentId, data.oldPath] });
      queryClient.invalidateQueries({ queryKey: ['agent-file-content', data.agentId, data.newPath] });
    });

    const unsubFolderCreated = subscribeToAgentFolderCreated((data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-files-nav', data.agentId] });
    });

    const unsubFolderDeleted = subscribeToAgentFolderDeleted((data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-files-nav', data.agentId] });
    });

    const unsubFolderMoved = subscribeToAgentFolderMoved((data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-files-nav', data.agentId] });
    });

    return () => {
      unsubAgentCreated();
      unsubAgentUpdated();
      unsubAgentDeleted();
      unsubFileCreated();
      unsubFileUpdated();
      unsubFileDeleted();
      unsubFileMoved();
      unsubFolderCreated();
      unsubFolderDeleted();
      unsubFolderMoved();
    };
  }, [
    queryClient,
    subscribeToAgentCreated,
    subscribeToAgentUpdated,
    subscribeToAgentDeleted,
    subscribeToAgentFileCreated,
    subscribeToAgentFileUpdated,
    subscribeToAgentFileDeleted,
    subscribeToAgentFileMoved,
    subscribeToAgentFolderCreated,
    subscribeToAgentFolderDeleted,
    subscribeToAgentFolderMoved,
  ]);
}
