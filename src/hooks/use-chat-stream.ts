import { useState, useCallback, useRef } from "react";
import { chatService } from "@/api/chatService";
import type { ChatSSEEvent } from "@/types/xerroChat";

interface UseChatStreamOptions {
  onEvent: (event: ChatSSEEvent) => void;
  onPlanReady?: () => void;
  onComplete: () => void | Promise<void>;
  onError: (error: string) => void;
}

export function useChatStream(
  sessionId: string | null,
  { onEvent, onPlanReady, onComplete, onError }: UseChatStreamOptions
) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, planMode?: boolean, files?: File[], attachedImages?: string[]) => {
      if (!sessionId || isStreaming) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsStreaming(true);

      try {
        const reader = await chatService.sendMessage(sessionId, content, controller.signal, planMode, files, attachedImages);
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6)) as ChatSSEEvent;
                onEvent(event);
                if (event.type === "plan_ready") {
                  onPlanReady?.();
                } else if (
                  event.type === "completed" ||
                  event.type === "error" ||
                  event.type === "cancelled"
                ) {
                  if (event.type === "error") {
                    onError(event.error ?? "Unknown error");
                  } else {
                    await onComplete();
                  }
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // User cancelled — not an error
          await onComplete();
        } else {
          const msg = error instanceof Error ? error.message : "Stream error";
          onError(msg);
        }
      } finally {
        abortControllerRef.current = null;
        setIsStreaming(false);
      }
    },
    [sessionId, isStreaming, onEvent, onPlanReady, onComplete, onError]
  );

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { sendMessage, cancelStream, isStreaming };
}
