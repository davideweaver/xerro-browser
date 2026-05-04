import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/api/chatService";
import { saveDraft } from "@/lib/chatDraftsStorage";
import type { Todo } from "@/types/todos";

const PROJECTS_BASE = "/Users/dweaver/Projects/ai/claude-assist/projects";

function buildPrompt(todo: Todo): string {
  const lines = [`Help me work on this todo: "${todo.title}"`];
  if (todo.body) lines.push(`\nContext:\n${todo.body}`);
  return lines.join("");
}

export function useSendTodoToChat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return async (todo: Todo) => {
    const prompt = buildPrompt(todo);

    if (todo.agentId) {
      // Use the agent's persistent chat session if it exists
      const storedKey = `agent-chat-session-${todo.agentId}`;
      const existingSessionId = localStorage.getItem(storedKey);
      if (existingSessionId) {
        saveDraft(existingSessionId, prompt);
      }
      navigate(`/agent-tasks/agents/${todo.agentId}/chat`);
      return;
    }

    const cwd = todo.projectName
      ? `${PROJECTS_BASE}/${todo.projectName}`
      : undefined;

    const session = await chatService.createSession(
      todo.title,
      cwd ? { cwd } : undefined
    );
    saveDraft(session.id, prompt);
    queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    navigate(`/chat/${session.id}`);
  };
}
