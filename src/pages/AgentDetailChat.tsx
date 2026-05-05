import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { chatService } from "@/api/chatService";
import { agentsService } from "@/api/agentsService";
import { apiFetch } from "@/lib/apiFetch";
import ChatSession from "@/pages/ChatSession";
import { Loader2 } from "lucide-react";

const XERRO_API_URL = import.meta.env.VITE_XERRO_API_URL || "";
const storageKey = (agentId: string) => `agent-chat-session-${agentId}`;

async function sessionExists(sessionId: string): Promise<boolean> {
  try {
    const res = await apiFetch(`${XERRO_API_URL}/api/v1/chat/sessions/${sessionId}`);
    return res.ok;
  } catch {
    return false;
  }
}

// Module-level map deduplicates concurrent createSession calls (e.g. React StrictMode
// double-fires effects — the second run reuses the in-flight promise instead of making
// a second API call). Keyed by `agentId:initKey` so a forced reinit always gets a fresh session.
const inFlightCreations = new Map<string, Promise<string>>();

export default function AgentDetailChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initKey, setInitKey] = useState(0);

  useEffect(() => {
    if (!agentId) return;

    let cancelled = false;
    const creationKey = `${agentId}:${initKey}`;

    const init = async () => {
      setSessionId(null);
      setError(null);

      agentsService.getAgent(agentId)
        .then(a => { if (!cancelled) setAgentName(a.name); })
        .catch(() => {});

      const stored = localStorage.getItem(storageKey(agentId));
      if (stored) {
        if (await sessionExists(stored)) {
          if (!cancelled) setSessionId(stored);
          return;
        }
        localStorage.removeItem(storageKey(agentId));
      }

      if (cancelled) return;

      let promise = inFlightCreations.get(creationKey);
      if (!promise) {
        promise = agentsService.getAgent(agentId)
          .then(a => a.name)
          .catch(() => "Agent Chat")
          .then(name => chatService.createSession(name, undefined, undefined, agentId))
          .then(session => {
            localStorage.setItem(storageKey(agentId), session.id);
            return session.id;
          })
          .finally(() => inFlightCreations.delete(creationKey));
        inFlightCreations.set(creationKey, promise);
      }

      try {
        const id = await promise;
        if (!cancelled) setSessionId(id);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to start chat");
      }
    };

    init();
    return () => { cancelled = true; };
  }, [agentId, initKey]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        {error}
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Starting chat…
      </div>
    );
  }

  const handleDelete = () => {
    localStorage.removeItem(storageKey(agentId!));
    setInitKey(k => k + 1);
  };

  return (
    <ChatSession
      sessionId={sessionId}
      onDelete={handleDelete}
      title="Chat"
      description={agentName ? `What would you like ${agentName} to do?` : undefined}
    />
  );
}
