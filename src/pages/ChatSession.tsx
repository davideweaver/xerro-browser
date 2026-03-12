import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { chatService } from "@/api/chatService";
import { useChatStream } from "@/hooks/use-chat-stream";
import type { ChatSSEEvent, XerroChatMessage } from "@/types/xerroChat";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NewChatDialog } from "@/components/chat-sessions/NewChatDialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Settings,
  Trash2,
  Send,
  Square,
  Bot,
  ChevronDown,
  ChevronRight,
  Loader2,
  Brain,
  ClipboardList,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";

interface ToolEvent {
  toolCallId: string;
  toolName: string;
  toolInput: unknown;
  toolResult?: unknown;
  isToolError?: boolean;
  isComplete: boolean;
  parentToolCallId?: string;
}

// Tool names that spawn sub-agents (their child tool calls get indented under them)
const AGENT_TOOL_NAMES = new Set(["Explore", "Plan", "Agent", "general-purpose"]);

type StreamSegment =
  | { kind: "tools"; toolIds: string[] }
  | { kind: "thinking"; text: string }
  | { kind: "text"; text: string };

interface ExecutionData {
  toolEvents: Map<string, ToolEvent>;
  segments?: StreamSegment[];
  durationMs?: number;
  costUsd?: number;
  model?: string;
  isLocal?: boolean;
  thinkingText?: string;
}

export default function ChatSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [planMode, setPlanMode] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [streamingEvents, setStreamingEvents] = useState<ChatSSEEvent[]>([]);
  const [toolEvents, setToolEvents] = useState<Map<string, ToolEvent>>(new Map());
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<string | null>(null);
  const [optimisticIsPlanMode, setOptimisticIsPlanMode] = useState(false);
  // Tracks which sessionId the current streaming state belongs to.
  // Prevents tool calls from one session appearing in another when navigating.
  const [streamingSessionId, setStreamingSessionId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Persists tool events and completion metadata after streaming ends, keyed by executionId.
  // This allows thinking/tool cards to remain visible after the agent responds.
  const [executionData, setExecutionData] = useState<Map<string, ExecutionData>>(new Map());

  const [streamingSegments, setStreamingSegments] = useState<StreamSegment[]>([]);

  // Refs for capturing data during streaming without adding to callback deps
  const currentExecutionIdRef = useRef<string | null>(null);
  const toolEventsRef = useRef<Map<string, ToolEvent>>(new Map());
  const completedEventRef = useRef<ChatSSEEvent | null>(null);
  const streamingSegmentsRef = useRef<StreamSegment[]>([]);
  // Tracks the toolCallId of the current active agent-type tool (for child grouping)
  const currentAgentParentRef = useRef<string | null>(null);

  // Load session metadata
  const { data: session } = useQuery({
    queryKey: ["chat-session", sessionId],
    queryFn: () => chatService.getSession(sessionId!),
    enabled: !!sessionId,
  });

  // Load messages
  const {
    data: messagesData,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["chat-messages", sessionId],
    queryFn: () => chatService.getMessages(sessionId!, 50),
    enabled: !!sessionId,
  });

  const messages = messagesData?.messages ?? [];

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, streamingEvents.length, toolEvents.size]);

  // Hydrate executionData from loaded messages to restore tool cards after page refresh
  useEffect(() => {
    const newExecutionData = new Map<string, ExecutionData>();

    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.metadata?.executionId && msg.metadata.toolCalls) {
        const toolEventsMap = new Map<string, ToolEvent>();

        // Convert persisted toolCalls to ToolEvent objects
        for (const toolCall of msg.metadata.toolCalls) {
          toolEventsMap.set(toolCall.toolCallId, {
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            toolInput: toolCall.toolInput,
            toolResult: toolCall.toolResult,
            isToolError: toolCall.isToolError,
            isComplete: true,
            parentToolCallId: toolCall.parentToolUseId ?? undefined,
          });
        }

        newExecutionData.set(msg.metadata.executionId, {
          toolEvents: toolEventsMap,
          durationMs: msg.metadata.durationMs,
          costUsd: msg.metadata.costUsd,
          model: msg.metadata.model,
          isLocal: msg.metadata.isLocal,
          thinkingText: msg.metadata.thinkingText,
        });
      }
    }

    // Merge: preserve in-memory segments/thinking for entries already in state
    setExecutionData((prev) => {
      const next = new Map(newExecutionData);
      for (const [id, incoming] of newExecutionData) {
        const existing = prev.get(id);
        if (existing) {
          next.set(id, {
            ...incoming,
            segments: existing.segments ?? incoming.segments,
            thinkingText: existing.thinkingText ?? incoming.thinkingText,
          });
        }
      }
      return next;
    });
  }, [messages]);

  const handleEvent = useCallback((event: ChatSSEEvent) => {
    setStreamingEvents((prev) => [...prev, event]);

    if (event.type === "started") {
      currentExecutionIdRef.current = event.executionId;
    }

    if (event.type === "completed") {
      completedEventRef.current = event;
    }

    if (event.type === "tool_use" && event.toolCallId && event.toolName) {
      // Use SDK-provided parentToolUseId when available, fall back to heuristic tracking
      const parentId = event.parentToolUseId ?? currentAgentParentRef.current ?? undefined;
      setToolEvents((prev) => {
        const next = new Map(prev);
        next.set(event.toolCallId!, {
          toolCallId: event.toolCallId!,
          toolName: event.toolName!,
          toolInput: event.toolInput,
          isComplete: false,
          parentToolCallId: parentId || undefined,
        });
        toolEventsRef.current = next;
        return next;
      });
      // Heuristic fallback: if this is an agent-type tool and SDK didn't provide parent info
      if (AGENT_TOOL_NAMES.has(event.toolName!) && !currentAgentParentRef.current && !event.parentToolUseId) {
        currentAgentParentRef.current = event.toolCallId!;
      }
      // Add toolCallId to segments — append to last tools segment, or start a new one
      setStreamingSegments((prev) => {
        const last = prev[prev.length - 1];
        const next = last?.kind === "tools"
          ? [...prev.slice(0, -1), { kind: "tools" as const, toolIds: [...last.toolIds, event.toolCallId!] }]
          : [...prev, { kind: "tools" as const, toolIds: [event.toolCallId!] }];
        streamingSegmentsRef.current = next;
        return next;
      });
    }

    if (event.type === "tool_result" && event.toolCallId) {
      setToolEvents((prev) => {
        const next = new Map(prev);
        const existing = next.get(event.toolCallId!);
        if (existing) {
          next.set(event.toolCallId!, {
            ...existing,
            toolResult: event.toolResult,
            isToolError: event.isToolError,
            isComplete: true,
          });
        }
        toolEventsRef.current = next;
        return next;
      });
      // If this was the active parent agent, clear it
      if (currentAgentParentRef.current === event.toolCallId) {
        currentAgentParentRef.current = null;
      }
    }

    if (event.type === "assistant_text" && event.text) {
      setStreamingSegments((prev) => {
        const last = prev[prev.length - 1];
        const next = last?.kind === "text"
          ? [...prev.slice(0, -1), { kind: "text" as const, text: last.text + event.text! }]
          : [...prev, { kind: "text" as const, text: event.text! }];
        streamingSegmentsRef.current = next;
        return next;
      });
    }

    if (event.type === "thinking" && event.thinking) {
      setStreamingSegments((prev) => {
        const last = prev[prev.length - 1];
        const next = last?.kind === "thinking"
          ? [...prev.slice(0, -1), { kind: "thinking" as const, text: last.text + "\n\n" + event.thinking! }]
          : [...prev, { kind: "thinking" as const, text: event.thinking! }];
        streamingSegmentsRef.current = next;
        return next;
      });
    }
  }, []);

  const handleComplete = useCallback(async () => {
    // Capture current execution data before clearing streaming state
    const executionId = currentExecutionIdRef.current;
    const capturedTools = new Map(toolEventsRef.current);
    const completed = completedEventRef.current;
    const capturedSegments = streamingSegmentsRef.current;
    const capturedThinking = capturedSegments
      .filter((s) => s.kind === "thinking")
      .map((s) => (s as { kind: "thinking"; text: string }).text)
      .join("\n\n") || undefined;

    // Reset refs
    currentExecutionIdRef.current = null;
    toolEventsRef.current = new Map();
    completedEventRef.current = null;
    streamingSegmentsRef.current = [];
    currentAgentParentRef.current = null;

    setStreamingSessionId(null);
    setOptimisticUserMsg(null);
    setStreamingEvents([]);
    setToolEvents(new Map());
    setStreamingSegments([]);

    await refetchMessages();

    // Persist execution data so tool/thinking cards remain visible after the agent responds
    if (executionId) {
      setExecutionData((prev) => {
        const next = new Map(prev);
        next.set(executionId, {
          toolEvents: capturedTools,
          segments: capturedSegments,
          durationMs: completed?.durationMs,
          costUsd: completed?.costUsd,
          model: completed?.model,
          isLocal: completed?.isLocal,
          thinkingText: capturedThinking,
        });
        return next;
      });
    }

    queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["chat-session", sessionId] });
    scrollToBottom();
  }, [refetchMessages, queryClient, sessionId]);

  const handlePlanReady = useCallback(() => {
    setPlanReady(true);
  }, []);

  const handleError = useCallback((error: string) => {
    currentExecutionIdRef.current = null;
    toolEventsRef.current = new Map();
    completedEventRef.current = null;
    streamingSegmentsRef.current = [];
    currentAgentParentRef.current = null;
    setStreamingSessionId(null);
    setOptimisticUserMsg(null);
    setStreamingEvents([]);
    setToolEvents(new Map());
    setStreamingSegments([]);
    toast.error(`Chat error: ${error}`);
  }, []);

  const { sendMessage, cancelStream, isStreaming } = useChatStream(sessionId ?? null, {
    onEvent: handleEvent,
    onPlanReady: handlePlanReady,
    onComplete: handleComplete,
    onError: handleError,
  });

  // True only when streaming is active for the session currently being viewed
  const isActiveSession = isStreaming && streamingSessionId === sessionId;

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isStreaming || !sessionId) return;

    setPlanReady(false);
    setInput("");
    setStreamingSessionId(sessionId);
    setOptimisticUserMsg(content);
    setOptimisticIsPlanMode(planMode);
    setStreamingEvents([]);
    setToolEvents(new Map());
    setStreamingSegments([]);
    scrollToBottom();

    await sendMessage(content, planMode);
  };

  const handleProceed = async () => {
    if (!sessionId || isStreaming) return;
    setPlanReady(false);
    setPlanMode(false);
    setStreamingSessionId(sessionId);
    setOptimisticUserMsg("Looks good, proceed");
    setOptimisticIsPlanMode(false);
    setStreamingEvents([]);
    setToolEvents(new Map());
    setStreamingSegments([]);
    scrollToBottom();
    await sendMessage("Looks good, proceed", false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async () => {
    if (!sessionId) return;
    setIsDeleting(true);
    try {
      await chatService.deleteSession(sessionId);
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      navigate("/chat", { replace: true });
      toast.success("Session deleted");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  const sessionLabel = session
    ? [
        session.config.cwd && session.config.cwd.split("/").pop(),
        session.config.local && session.config.localModel,
      ]
        .filter(Boolean)
        .join(" • ")
    : undefined;

  return (
    <>
      <Container
        title={session?.name ?? "Chat"}
        description={sessionLabel}
        content="fixed"
        tools={
          <div className="flex gap-2">
            <ContainerToolButton
              size="icon"
              onClick={() => setSettingsOpen(true)}
              title="Session settings"
            >
              <Settings />
            </ContainerToolButton>
            <ContainerToolButton
              size="icon"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              title="Delete session"
            >
              <Trash2 />
            </ContainerToolButton>
          </div>
        }
      >
        <div className="flex flex-col h-full">
          {/* Messages area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 font-mono" style={{ fontSize: "13px" }}
          >
            {messages.length === 0 && !isActiveSession && !optimisticUserMsg && (
              <div className="text-center text-muted-foreground py-12">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-lg font-semibold mb-1">Start a conversation</p>
                {session?.config.cwd && (
                  <p className="text-sm font-mono opacity-60">{session.config.cwd}</p>
                )}
              </div>
            )}

            {/* Persisted messages with their associated tool/thinking cards */}
            {messages.map((msg) => {
              const execData = msg.metadata?.executionId
                ? executionData.get(msg.metadata.executionId)
                : undefined;
              return (
                <div key={msg.id}>
                  {msg.role === "assistant" && execData && (
                    <div className="space-y-0.5 mb-1.5">
                      {execData.segments ? (
                        execData.segments.filter((s) => s.kind !== "text").map((seg, i) => {
                          if (seg.kind === "tools") {
                            const segTools = new Map(
                              seg.toolIds
                                .filter((id) => execData.toolEvents.has(id))
                                .map((id) => [id, execData.toolEvents.get(id)!])
                            );
                            return <ToolEventsSection key={i} toolEvents={segTools} />;
                          }
                          return <ThinkingSegmentCard key={i} text={seg.text} />;
                        })
                      ) : (
                        <>
                          <ThinkingCard execData={execData} />
                          <ToolEventsSection toolEvents={execData.toolEvents} />
                        </>
                      )}
                    </div>
                  )}
                  <MessageBubble message={msg} />
                </div>
              );
            })}

            {/* Optimistic user message */}
            {optimisticUserMsg && (
              <div className="space-y-1">
                <div className="bg-accent/40 px-4 py-2.5 rounded-md">
                  <div className="whitespace-pre-wrap">{optimisticUserMsg}</div>
                </div>
                {optimisticIsPlanMode && (
                  <div className="px-1">
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 text-[10px] py-0 h-4">
                      Plan
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Plan ready card — shown after plan stream completes */}
            {planReady && !isActiveSession && (
              <div className="border border-amber-500/30 rounded-lg p-4 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Plan ready</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Review the plan above, then proceed to execute it.
                </p>
                <Button size="sm" onClick={handleProceed} disabled={isStreaming}>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Proceed with plan
                </Button>
              </div>
            )}

            {/* Live streaming: interleaved segments in arrival order */}
            {isActiveSession && (
              <div className="space-y-1.5">
                {streamingSegments.map((seg, i) => {
                  const isLast = i === streamingSegments.length - 1;
                  if (seg.kind === "tools") {
                    const segTools = new Map(
                      seg.toolIds
                        .filter((id) => toolEvents.has(id))
                        .map((id) => [id, toolEvents.get(id)!])
                    );
                    return <ToolEventsSection key={i} toolEvents={segTools} />;
                  }
                  if (seg.kind === "thinking") {
                    return <ThinkingSegmentCard key={i} text={seg.text} isLive={isLast} />;
                  }
                  // text segment
                  return (
                    <div key={i} className="py-2">
                      <div className="prose prose-sm dark:prose-invert max-w-none font-mono opacity-80">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{seg.text}</ReactMarkdown>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t p-4 space-y-2 bg-background">
            <Textarea
              placeholder="Type your message… (Shift+Enter for new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isActiveSession}
              rows={3}
              className="resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${
                  planMode
                    ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                onClick={() => setPlanMode((v) => !v)}
                title={planMode ? "Plan mode on — click to disable" : "Plan mode — agent will plan before executing"}
                disabled={isActiveSession}
              >
                <ClipboardList className="h-4 w-4" />
              </button>
              <div className="flex gap-2">
                {isActiveSession ? (
                  <Button variant="destructive" size="sm" onClick={cancelStream}>
                    <Square className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {planMode ? "Plan" : "Send"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Settings dialog */}
      {session && (
        <NewChatDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["chat-session", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
          }}
          sessionId={sessionId}
          initialName={session.name}
          initialConfig={session.config}
        />
      )}

      {/* Delete confirmation */}
      <DestructiveConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Session"
        description={`Are you sure you want to delete "${session?.name}"? All messages will be permanently removed.`}
        confirmText="Delete Session"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        isLoading={isDeleting}
      />
    </>
  );
}

function MessageBubble({ message }: { message: XerroChatMessage }) {
  const isUser = message.role === "user";
  const timestamp = format(new Date(message.createdAt), "h:mm a");

  if (isUser) {
    return (
      <div className="bg-accent/40 px-4 py-2.5 rounded-md">
        <div className="whitespace-pre-wrap">{message.content}</div>
        <div className="text-xs text-muted-foreground mt-1 opacity-60">{timestamp}</div>
      </div>
    );
  }

  const meta = [
    timestamp,
    message.metadata?.durationMs && `${(message.metadata.durationMs / 1000).toFixed(1)}s`,
    message.metadata?.model,
    message.metadata?.toolCallCount != null && message.metadata.toolCallCount > 0
      ? `${message.metadata.toolCallCount} tool${message.metadata.toolCallCount !== 1 ? "s" : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="py-2">
      <div className="prose prose-sm dark:prose-invert max-w-none font-mono prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm" style={{ fontSize: "13px" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content || "*(no response)*"}
        </ReactMarkdown>
      </div>
      <div className="text-xs text-muted-foreground mt-1 opacity-60">{meta}</div>
    </div>
  );
}

function ThinkingCard({ execData }: { execData: ExecutionData }) {
  const [expanded, setExpanded] = useState(false);

  const label = [
    execData.durationMs && `${(execData.durationMs / 1000).toFixed(1)}s`,
    execData.model,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="text-muted-foreground">
      <button
        className="flex items-center gap-1.5 hover:opacity-80"
        onClick={() => setExpanded((v) => !v)}
      >
        <Brain className="h-3 w-3" />
        <span>Thinking{label ? ` (${label})` : ""}</span>
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>
      {expanded && (
        <div className="mt-1 ml-4 whitespace-pre-wrap opacity-70 max-h-48 overflow-y-auto border-l pl-2">
          {execData.thinkingText || (
            <span className="italic">
              {[
                execData.model && `Model: ${execData.model}${execData.isLocal ? " (local)" : ""}`,
                execData.durationMs && `Duration: ${(execData.durationMs / 1000).toFixed(2)}s`,
                execData.costUsd != null && execData.costUsd > 0 && `Cost: $${execData.costUsd.toFixed(4)}`,
              ]
                .filter(Boolean)
                .join(" • ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ThinkingSegmentCard({ text, isLive }: { text: string; isLive?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="text-muted-foreground">
      <button
        className="flex items-center gap-1.5 hover:opacity-80"
        onClick={() => setExpanded((v) => !v)}
      >
        <Brain className={`h-3 w-3 ${isLive ? "animate-pulse" : ""}`} />
        <span>Thinking{isLive ? "…" : ""}</span>
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>
      {expanded && text && (
        <div className="mt-1 ml-4 whitespace-pre-wrap opacity-70 max-h-48 overflow-y-auto border-l pl-2">
          {text}
        </div>
      )}
    </div>
  );
}

function formatToolData(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (typeof data === "string") return data;
  if (typeof data === "number" || typeof data === "boolean") return String(data);
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function getPrimaryArg(_toolName: string, toolInput: unknown): string {
  if (!toolInput) return "";
  // toolInput arrives as a JSON string from xerro-service — parse it
  let inp: Record<string, unknown>;
  if (typeof toolInput === "string") {
    try {
      const parsed = JSON.parse(toolInput);
      if (!parsed || typeof parsed !== "object") return "";
      inp = parsed as Record<string, unknown>;
    } catch {
      return "";
    }
  } else if (typeof toolInput === "object") {
    inp = toolInput as Record<string, unknown>;
  } else {
    return "";
  }

  // File path — show last 2 path segments
  for (const key of ["file_path", "path"]) {
    if (typeof inp[key] === "string" && inp[key]) {
      const val = inp[key] as string;
      const parts = val.replace(/\\/g, "/").split("/").filter(Boolean);
      return parts.length > 2 ? parts.slice(-2).join("/") : val;
    }
  }

  // Bash command — first 60 chars
  if (typeof inp.command === "string" && inp.command) {
    const cmd = (inp.command as string).trim();
    return cmd.length > 60 ? cmd.slice(0, 60) + "…" : cmd;
  }

  // Search pattern
  if (typeof inp.pattern === "string" && inp.pattern) {
    const p = inp.pattern as string;
    return p.length > 60 ? p.slice(0, 60) + "…" : p;
  }

  // Query
  if (typeof inp.query === "string" && inp.query) {
    const q = inp.query as string;
    return q.length > 60 ? q.slice(0, 60) + "…" : q;
  }

  // Agent description / prompt
  for (const key of ["description", "prompt", "task", "subagent_type"]) {
    if (typeof inp[key] === "string" && inp[key]) {
      const val = inp[key] as string;
      return val.length > 60 ? val.slice(0, 60) + "…" : val;
    }
  }

  // First non-empty string value as fallback
  for (const val of Object.values(inp)) {
    if (typeof val === "string" && val.trim()) {
      return val.length > 60 ? val.slice(0, 60) + "…" : val;
    }
  }

  return "";
}

function ToolLine({
  toolEvent,
  expanded
}: {
  toolEvent: ToolEvent;
  indent?: boolean;
  expanded?: boolean;
}) {
  const arg = getPrimaryArg(toolEvent.toolName, toolEvent.toolInput);
  const color = toolEvent.isComplete
    ? toolEvent.isToolError ? "text-red-700 dark:text-red-500" : ""
    : "text-blue-400";

  // When expanded, show full details
  if (expanded) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          {!toolEvent.isComplete && (
            <Loader2 className="h-3 w-3 animate-spin text-blue-400 flex-shrink-0" />
          )}
          <span className={`font-semibold ${color}`}>
            {toolEvent.toolName}
          </span>
        </div>

        {/* Input */}
        {toolEvent.toolInput !== undefined && toolEvent.toolInput !== null && (
          <div className="ml-4 space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Input:</div>
            <pre className="text-xs bg-muted/50 rounded px-2 py-1 overflow-x-auto max-h-48 overflow-y-auto">
              {formatToolData(toolEvent.toolInput)}
            </pre>
          </div>
        )}

        {/* Output */}
        {toolEvent.toolResult !== undefined && (
          <div className="ml-4 space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">
              {toolEvent.isToolError ? "Error:" : "Output:"}
            </div>
            <pre className={`text-xs rounded px-2 py-1 overflow-x-auto max-h-48 overflow-y-auto ${
              toolEvent.isToolError
                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                : "bg-muted/50"
            }`}>
              {formatToolData(toolEvent.toolResult)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Collapsed view (summary)
  return (
    <div className="flex items-center gap-1.5">
      {!toolEvent.isComplete && (
        <Loader2 className="h-3 w-3 animate-spin text-blue-400 flex-shrink-0" />
      )}
      <span className={color}>
        {toolEvent.toolName}{arg ? `(${arg})` : ""}
      </span>
    </div>
  );
}

function ToolEventsSection({ toolEvents }: { toolEvents: Map<string, ToolEvent> }) {
  const [expanded, setExpanded] = useState(false);

  const topLevel = Array.from(toolEvents.values()).filter((te) => !te.parentToolCallId);
  const hiddenCount = Math.max(0, topLevel.length - 3);
  const visible = expanded ? topLevel : topLevel.slice(-3);

  return (
    <>
      {visible.map((te) => (
        <ToolEventCard
          key={te.toolCallId}
          toolEvent={te}
          allToolEvents={toolEvents}
          expanded={expanded}
        />
      ))}
      {hiddenCount > 0 && (
        <button
          className="text-muted-foreground pl-2 opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronDown className="h-3 w-3" />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronRight className="h-3 w-3" />
              <span>+{hiddenCount} more tool use{hiddenCount !== 1 ? "s" : ""}</span>
            </>
          )}
        </button>
      )}
    </>
  );
}

function ToolEventCard({
  toolEvent,
  allToolEvents,
  expanded,
}: {
  toolEvent: ToolEvent;
  allToolEvents: Map<string, ToolEvent>;
  expanded?: boolean;
}) {
  const children = Array.from(allToolEvents.values()).filter(
    (te) => te.parentToolCallId === toolEvent.toolCallId
  );

  return (
    <div>
      <div className="flex items-start gap-1.5">
        <span className="text-muted-foreground mt-0.5">•</span>
        <div className="flex-1">
          <ToolLine toolEvent={toolEvent} expanded={expanded} />
        </div>
      </div>
      {children.length > 0 && (
        <div className="ml-4 mt-0.5 space-y-0.5">
          {children.map((child) => (
            <div key={child.toolCallId} className="flex items-start gap-1.5 text-muted-foreground">
              <span className="mt-0.5">└</span>
              <div className="flex-1">
                <ToolLine toolEvent={child} indent expanded={expanded} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
