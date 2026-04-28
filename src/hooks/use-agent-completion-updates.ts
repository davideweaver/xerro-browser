import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useXerroWebSocketContext } from '@/context/XerroWebSocketContext';

/**
 * Hook to listen for agent completion events via WebSocket
 * and automatically refresh related data (history, scratchpad, traces).
 *
 * This hook handles the completion lifecycle:
 * - Completed tasks - successful completion
 * - Cancelled tasks - user-cancelled execution
 * - Error tasks - failed execution
 *
 * It invalidates React Query caches for:
 * - Global task execution history (used by /agent-tasks/history page)
 * - Task-specific execution history (used by /agent-tasks/:id page)
 * - Task scratchpad
 * - Task traces
 * - Agent history (used by /agent-tasks/agents/:id/config page)
 * - Agent config (for last-run timestamp updates)
 */
export function useAgentCompletionUpdates() {
  const { subscribeToAgentStatus } = useXerroWebSocketContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = subscribeToAgentStatus((event) => {
      // Only handle terminal states
      if (
        event.status === 'completed' ||
        event.status === 'cancelled' ||
        event.status === 'error'
      ) {
        console.log('[Agent Completion] Task finished:', event.taskName, event.status);

        // Invalidate global history query (used by /agent-tasks/history page)
        queryClient.invalidateQueries({ queryKey: ['agent-task-history'] });

        // Invalidate task-specific queries (used by /agent-tasks/:id page)
        queryClient.invalidateQueries({ queryKey: ['agent-task-history', event.taskId] });
        queryClient.invalidateQueries({ queryKey: ['agent-task-scratchpad', event.taskId] });
        queryClient.invalidateQueries({ queryKey: ['agent-task-trace', event.taskId] });

        // Invalidate agent history queries (used by /agent-tasks/agents/:id/config page)
        queryClient.invalidateQueries({ queryKey: ['agent-history'] });
        queryClient.invalidateQueries({ queryKey: ['agent', event.taskId] });
      }
    });

    return unsubscribe;
  }, [subscribeToAgentStatus, queryClient]);
}
