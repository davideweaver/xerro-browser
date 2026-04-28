import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { chatService } from "@/api/chatService";
import { getDraft, saveDraft, clearDraft } from "@/lib/chatDraftsStorage";
import { useChatStream } from "@/hooks/use-chat-stream";
import type { ChatSSEEvent, XerroChatMessage } from "@/types/xerroChat";
import Container from "@/components/container/Container";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SessionSettingsDialog } from "@/components/chat-sessions/SessionSettingsDialog";
import { SlashCommandPicker } from "@/components/chat-sessions/SlashCommandPicker";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ClickableImage from "@/components/chat/ClickableImage";
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
  Paperclip,
  X,
  FileText,
  TerminalSquare,
} from "lucide-react";
import { TerminalSidePanel } from "@/components/terminal/TerminalSidePanel";
import { useActiveTerminalSessions } from "@/lib/terminalSessions";
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
  thinkingDurationMs?: number;
}

interface ChatSessionProps {
  sessionId?: string;
  onDelete?: () => void;
}

export default function ChatSession({ sessionId: sessionIdProp, onDelete }: ChatSessionProps = {}) {
  const { sessionId: sessionIdParam } = useParams<{ sessionId: string }>();
  const sessionId = sessionIdProp ?? sessionIdParam;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState(() => (sessionId ? getDraft(sessionId) : ""));
  const [slashPickerIndex, setSlashPickerIndex] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [planMode, setPlanMode] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [streamingEvents, setStreamingEvents] = useState<ChatSSEEvent[]>([]);
  const [streamingExecutionId, setStreamingExecutionId] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<string | null>(null);
  const [optimisticIsPlanMode, setOptimisticIsPlanMode] = useState(false);
  const [optimisticAttachedImages, setOptimisticAttachedImages] = useState<string[]>([]);
  // Tracks which sessionId the current streaming state belongs to.
  // Prevents tool calls from one session appearing in another when navigating.
  const [streamingSessionId, setStreamingSessionId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalEverOpened, setTerminalEverOpened] = useState(false);
  const activeTerminalSessions = useActiveTerminalSessions();
  const hasActiveTerminal = !!sessionId && activeTerminalSessions.has(sessionId);

  // Single data model for both live streaming and persisted messages, keyed by executionId.
  const [executionData, setExecutionData] = useState<Map<string, ExecutionData>>(new Map());

  // Refs for non-rendering bookkeeping during streaming
  const reconnectControllerRef = useRef<AbortController | null>(null);
  const currentExecutionIdRef = useRef<string | null>(null);
  const completedEventRef = useRef<ChatSSEEvent | null>(null);
  // Tracks the toolCallId of the current active agent-type tool (for child grouping)
  const currentAgentParentRef = useRef<string | null>(null);
  // Tracks thinking phase duration
  const thinkingStartMsRef = useRef<number | null>(null);
  const thinkingDurationMsRef = useRef<number | null>(null);

  // Load draft when navigating to a different session (component reuses across routes)
  useEffect(() => {
    setInput(sessionId ? getDraft(sessionId) : "");
  }, [sessionId]);

  // Load session metadata
  const { data: session } = useQuery({
    queryKey: ["chat-session", sessionId],
    queryFn: () => chatService.getSession(sessionId!),
    enabled: !!sessionId,
  });

  // Load messages
  const { data: messagesData } = useQuery({
    queryKey: ["chat-messages", sessionId],
    queryFn: () => chatService.getMessages(sessionId!, 50),
    enabled: !!sessionId,
  });

  const messages = messagesData?.messages ?? [];

  // Reset picker selection when input changes
  useEffect(() => {
    setSlashPickerIndex(0);
  }, [input]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollToBottom());
    return () => cancelAnimationFrame(frame);
  }, [sessionId, messagesData, streamingEvents.length]);

  // Hydrate executionData from loaded messages to restore tool cards after page refresh
  useEffect(() => {
    const newExecutionData = new Map<string, ExecutionData>();

    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.metadata?.executionId && msg.metadata.contentBlocks?.length) {
        const toolEventsMap = new Map<string, ToolEvent>();
        const segments: StreamSegment[] = [];

        // Reconstruct ordered segments + toolEventsMap from persisted contentBlocks
        for (const block of msg.metadata.contentBlocks) {
          if (block.type === 'tool_use') {
            toolEventsMap.set(block.toolCallId, {
              toolCallId: block.toolCallId,
              toolName: block.toolName,
              toolInput: block.toolInput,
              toolResult: block.toolResult,
              isToolError: block.isToolError,
              isComplete: true,
              parentToolCallId: block.parentToolUseId ?? undefined,
            });
            const last = segments[segments.length - 1];
            if (last?.kind === 'tools') {
              last.toolIds.push(block.toolCallId);
            } else {
              segments.push({ kind: 'tools', toolIds: [block.toolCallId] });
            }
          } else if (block.type === 'thinking') {
            const last = segments[segments.length - 1];
            if (last?.kind === 'thinking') {
              last.text += '\n\n' + block.text;
            } else {
              segments.push({ kind: 'thinking', text: block.text });
            }
          } else if (block.type === 'text') {
            const last = segments[segments.length - 1];
            if (last?.kind === 'text') {
              last.text += block.text;
            } else {
              segments.push({ kind: 'text', text: block.text });
            }
          }
        }

        newExecutionData.set(msg.metadata.executionId, {
          toolEvents: toolEventsMap,
          segments,
          durationMs: msg.metadata.durationMs,
          costUsd: msg.metadata.costUsd,
          model: msg.metadata.model,
          isLocal: msg.metadata.isLocal,
        });
      }
    }

    // Merge: start from prev so in-memory entries (segments, thinking) aren't wiped by refetch.
    setExecutionData((prev) => {
      const next = new Map(prev);
      for (const [id, incoming] of newExecutionData) {
        const existing = prev.get(id);
        next.set(id, {
          ...incoming,
          segments: existing?.segments ?? incoming.segments,
          thinkingDurationMs: existing?.thinkingDurationMs ?? incoming.thinkingDurationMs,
        });
      }
      return next;
    });
  }, [messages]);

  // When the session loads with an activeExecutionId, pre-hydrate executionData from the
  // disk snapshot immediately so the user sees partial state before the stream connects.
  const activeExecutionHydratedRef = useRef<string | null>(null);
  useEffect(() => {
    const activeId = session?.activeExecutionId;
    if (!activeId || !sessionId) return;
    if (activeExecutionHydratedRef.current === activeId) return; // already hydrated this execution
    activeExecutionHydratedRef.current = activeId;

    chatService.getActiveExecution(sessionId).then((data) => {
      if (!data || data.executionId !== activeId) return;

      const toolEventsMap = new Map<string, ToolEvent>();
      const segments: StreamSegment[] = [];

      for (const block of data.contentBlocks) {
        if (block.type === 'tool_use') {
          toolEventsMap.set(block.toolCallId, {
            toolCallId: block.toolCallId,
            toolName: block.toolName,
            toolInput: block.toolInput,
            toolResult: block.toolResult,
            isToolError: block.isToolError,
            isComplete: block.toolResult !== undefined,
            parentToolCallId: block.parentToolUseId ?? undefined,
          });
          const last = segments[segments.length - 1];
          if (last?.kind === 'tools') {
            last.toolIds.push(block.toolCallId);
          } else {
            segments.push({ kind: 'tools', toolIds: [block.toolCallId] });
          }
        } else if (block.type === 'thinking') {
          const last = segments[segments.length - 1];
          if (last?.kind === 'thinking') {
            last.text += '\n\n' + block.text;
          } else {
            segments.push({ kind: 'thinking', text: block.text });
          }
        } else if (block.type === 'text') {
          const last = segments[segments.length - 1];
          if (last?.kind === 'text') {
            last.text += block.text;
          } else {
            segments.push({ kind: 'text', text: block.text });
          }
        }
      }

      setStreamingExecutionId(activeId);
      setStreamingSessionId(sessionId);
      setExecutionData((prev) => {
        const next = new Map(prev);
        // Only hydrate if the stream hasn't already populated this execution
        if (!next.has(activeId)) {
          next.set(activeId, { toolEvents: toolEventsMap, segments });
        }
        return next;
      });
    });
  }, [session?.activeExecutionId, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount (or session change), try to reconnect to any active stream.
  // Lock the input immediately — we don't yet know if a stream is active.
  // If no stream is found (404) we unlock within one round-trip (~20ms for a local API).
  useEffect(() => {
    if (!sessionId) return;

    const controller = new AbortController();
    reconnectControllerRef.current = controller;
    let mounted = true;

    // Clear any stale streaming state from a previous session before acquiring the reconnect lock.
    // Without this, streamingExecutionId (from the old session) leaks into this session's view.
    setStreamingExecutionId(null);
    setStreamingSessionId(null);
    setOptimisticUserMsg(null);

    // Pre-lock: prevents the window where input is unlocked before the fetch resolves
    setIsReconnecting(true);
    setStreamingSessionId(sessionId);

    (async () => {
      try {
        const response = await chatService.connectToStream(sessionId, controller.signal);

        if (!response.ok || !response.body) {
          // No active stream — unlock immediately and refetch messages in case the
          // execution completed while the page was loading (stale messages query).
          if (mounted) {
            setIsReconnecting(false);
            setStreamingSessionId(null);
            queryClient.invalidateQueries({ queryKey: ["chat-messages", sessionId] });
          }
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6)) as ChatSSEEvent;
                handleEvent(event);
                if (event.type === 'completed' || event.type === 'cancelled') {
                  await handleComplete();
                } else if (event.type === 'error') {
                  handleError(event.error ?? 'Stream error');
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        // Network or other error — unlock so the user isn't stuck
        if (mounted) {
          setIsReconnecting(false);
          setStreamingSessionId(null);
        }
      } finally {
        reconnectControllerRef.current = null;
        if (mounted) {
          setIsReconnecting(false);
        }
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
      reconnectControllerRef.current = null;
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEvent = useCallback((event: ChatSSEEvent) => {
    setStreamingEvents((prev) => [...prev, event]);
    const execId = event.executionId;

    if (event.type === "started") {
      currentExecutionIdRef.current = execId;
      setStreamingExecutionId(execId);
      setExecutionData((prev) => {
        const next = new Map(prev);
        next.set(execId, { toolEvents: new Map(), segments: [] });
        return next;
      });
    }

    if (event.type === "completed") {
      completedEventRef.current = event;
    }

    if (event.type === "tool_use" && event.toolCallId && event.toolName) {
      const parentId = event.parentToolUseId ?? currentAgentParentRef.current ?? undefined;
      setExecutionData((prev) => {
        const next = new Map(prev);
        const ed = next.get(execId) ?? { toolEvents: new Map(), segments: [] };
        const newToolEvents = new Map(ed.toolEvents);
        newToolEvents.set(event.toolCallId!, {
          toolCallId: event.toolCallId!,
          toolName: event.toolName!,
          toolInput: event.toolInput,
          isComplete: false,
          parentToolCallId: parentId || undefined,
        });
        const segs = [...(ed.segments ?? [])];
        const last = segs[segs.length - 1];
        if (last?.kind === "tools") {
          segs[segs.length - 1] = { kind: "tools", toolIds: [...last.toolIds, event.toolCallId!] };
        } else {
          segs.push({ kind: "tools", toolIds: [event.toolCallId!] });
        }
        next.set(execId, { ...ed, toolEvents: newToolEvents, segments: segs });
        return next;
      });
      if (AGENT_TOOL_NAMES.has(event.toolName!) && !currentAgentParentRef.current && !event.parentToolUseId) {
        currentAgentParentRef.current = event.toolCallId!;
      }
    }

    if (event.type === "tool_result" && event.toolCallId) {
      setExecutionData((prev) => {
        const next = new Map(prev);
        const ed = next.get(execId);
        if (!ed) return prev;
        const newToolEvents = new Map(ed.toolEvents);
        const existing = newToolEvents.get(event.toolCallId!);
        if (existing) {
          newToolEvents.set(event.toolCallId!, {
            ...existing,
            toolResult: event.toolResult,
            isToolError: event.isToolError,
            isComplete: true,
          });
        }
        next.set(execId, { ...ed, toolEvents: newToolEvents });
        return next;
      });
      if (currentAgentParentRef.current === event.toolCallId) {
        currentAgentParentRef.current = null;
      }
    }

    if (event.type === "assistant_text" && event.text) {
      if (thinkingStartMsRef.current !== null && thinkingDurationMsRef.current === null) {
        thinkingDurationMsRef.current = Date.now() - thinkingStartMsRef.current;
      }
      setExecutionData((prev) => {
        const next = new Map(prev);
        const ed = next.get(execId);
        if (!ed) return prev;
        const segs = [...(ed.segments ?? [])];
        const last = segs[segs.length - 1];
        if (last?.kind === "text") {
          segs[segs.length - 1] = { kind: "text", text: last.text + event.text! };
        } else {
          segs.push({ kind: "text", text: event.text! });
        }
        next.set(execId, { ...ed, segments: segs });
        return next;
      });
    }

    if (event.type === "thinking" && event.thinking) {
      if (thinkingStartMsRef.current === null) {
        thinkingStartMsRef.current = Date.now();
      }
      setExecutionData((prev) => {
        const next = new Map(prev);
        const ed = next.get(execId);
        if (!ed) return prev;
        const segs = [...(ed.segments ?? [])];
        const last = segs[segs.length - 1];
        if (last?.kind === "thinking") {
          segs[segs.length - 1] = { kind: "thinking", text: last.text + "\n\n" + event.thinking! };
        } else {
          segs.push({ kind: "thinking", text: event.thinking! });
        }
        next.set(execId, { ...ed, segments: segs });
        return next;
      });
    }
  }, []);

  const handleComplete = useCallback(async () => {
    const executionId = currentExecutionIdRef.current;
    const completed = completedEventRef.current;
    const capturedThinkingDuration =
      thinkingDurationMsRef.current ??
      (thinkingStartMsRef.current !== null ? Date.now() - thinkingStartMsRef.current : undefined);

    // Stamp completion metadata onto the existing executionData entry
    if (executionId) {
      setExecutionData((prev) => {
        const next = new Map(prev);
        const ed = next.get(executionId);
        if (ed) {
          next.set(executionId, {
            ...ed,
            durationMs: completed?.durationMs,
            costUsd: completed?.costUsd,
            model: completed?.model,
            isLocal: completed?.isLocal,
            thinkingDurationMs: capturedThinkingDuration,
          });
        }
        return next;
      });
    }

    // Reset refs
    currentExecutionIdRef.current = null;
    completedEventRef.current = null;
    currentAgentParentRef.current = null;
    thinkingStartMsRef.current = null;
    thinkingDurationMsRef.current = null;

    setStreamingEvents([]);
    setStreamingSessionId(null);
    setOptimisticUserMsg(null);

    await queryClient.refetchQueries({ queryKey: ["chat-messages", sessionId] });

    setStreamingExecutionId(null);

    queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["chat-session", sessionId] });
    scrollToBottom();
  }, [queryClient, sessionId]);

  const handlePlanReady = useCallback(() => {
    setPlanReady(true);
  }, []);

  const handleError = useCallback((error: string) => {
    currentExecutionIdRef.current = null;
    completedEventRef.current = null;
    currentAgentParentRef.current = null;
    thinkingStartMsRef.current = null;
    thinkingDurationMsRef.current = null;
    setStreamingExecutionId(null);
    setStreamingSessionId(null);
    setOptimisticUserMsg(null);
    setStreamingEvents([]);
    toast.error(`Chat error: ${error}`);
  }, []);

  const { sendMessage, cancelStream, isStreaming } = useChatStream(sessionId ?? null, {
    onEvent: handleEvent,
    onPlanReady: handlePlanReady,
    onComplete: handleComplete,
    onError: handleError,
  });

  // Cancel handler — works for both the POST SSE stream and the reconnect GET stream
  const handleCancel = useCallback(() => {
    if (isReconnecting) {
      reconnectControllerRef.current?.abort();
      chatService.cancelMessage(sessionId!).catch(() => {});
      setIsReconnecting(false);
      setStreamingSessionId(null);
    } else {
      cancelStream();
    }
  }, [isReconnecting, cancelStream, sessionId]);

  // True when streaming (POST) or reconnected stream is active for this session
  const isActiveSession = (isStreaming || isReconnecting) && streamingSessionId === sessionId;

  // Slash command picker: show when cursor is after a "/" that's at start or after whitespace,
  // with no space between it and end of input (so it works mid-sentence too).
  const slashTriggerMatch = !isActiveSession ? input.match(/(^|\s)\/(\S*)$/) : null;
  const showSlashPicker = !!slashTriggerMatch;
  const slashFilter = slashTriggerMatch ? slashTriggerMatch[2].toLowerCase() : "";
  // Built-in Claude Code CLI commands — these are intercepted at the CLI layer and cannot
  // be invoked via the Agent SDK's query() call. Only show user-defined skills in the picker.
  const BUILTIN_COMMANDS = new Set([
    "compact", "context", "clear", "help", "model", "mcp", "memory",
    "login", "logout", "status", "doctor", "vim", "permissions", "settings",
    "cost", "heapdump", "init", "ide", "approved-tools", "migrate-installer",
  ]);
  const allSlashCommands = (session?.slash_commands ?? []).filter(
    (cmd) => !BUILTIN_COMMANDS.has(cmd.replace(/^\//, ""))
  );
  const slashCommands = showSlashPicker
    ? allSlashCommands.filter((cmd) => cmd.slice(1).toLowerCase().startsWith(slashFilter))
    : [];

  // True when we have a streaming executionId that hasn't been persisted yet.
  // Keeps the streaming UI visible during the refetch gap after the stream ends.
  const streamingIsLive =
    !!streamingExecutionId &&
    !messages.some((m) => m.metadata?.executionId === streamingExecutionId);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isStreaming || isReconnecting || !sessionId) return;

    const filesToSend = [...attachedFiles];

    // Convert image files to base64 data URLs for inline preview
    const imageFiles = filesToSend.filter((f) => f.type.startsWith("image/"));
    const base64Images = await Promise.all(
      imageFiles.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(f);
          })
      )
    );

    setPlanReady(false);
    setInput("");
    clearDraft(sessionId);
    setAttachedFiles([]);
    setStreamingSessionId(sessionId);
    setOptimisticUserMsg(content);
    setOptimisticIsPlanMode(planMode);
    setOptimisticAttachedImages(base64Images);
    setStreamingEvents([]);
    scrollToBottom();

    await sendMessage(
      content,
      planMode,
      filesToSend.length > 0 ? filesToSend : undefined,
      base64Images.length > 0 ? base64Images : undefined
    );
  };

  const handleProceed = async () => {
    if (!sessionId || isStreaming || isReconnecting) return;
    setPlanReady(false);
    setPlanMode(false);
    setStreamingSessionId(sessionId);
    setOptimisticUserMsg("Looks good, proceed");
    setOptimisticIsPlanMode(false);
    setStreamingEvents([]);
    scrollToBottom();
    await sendMessage("Looks good, proceed", false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (slashCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashPickerIndex((i) => Math.min(i + 1, slashCommands.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashPickerIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        setInput(input.replace(/((?:^|\s)\/)(\S*)$/, `$1${slashCommands[slashPickerIndex].slice(1)} `));
        setSlashPickerIndex(0);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setInput("");
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addFiles = useCallback((newFiles: File[]) => {
    setAttachedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const unique = newFiles.filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...unique].slice(0, 10);
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (imageFiles.length > 0) {
      addFiles(imageFiles);
    }
  }, [addFiles]);

  const handleDelete = async () => {
    if (!sessionId) return;
    setIsDeleting(true);
    try {
      await chatService.deleteSession(sessionId);
      clearDraft(sessionId);
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      if (onDelete) {
        onDelete();
      } else {
        navigate("/chat", { replace: true });
      }
      toast.success("Session deleted");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  const isMobile = useIsMobile();

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
        bodyHorzPadding={0}
        content={isMobile ? undefined : "fixed"}
      >
        <div className="flex flex-col h-full">
          {/* Messages area */}
          <div
            ref={scrollRef}
            className={`flex-1 overflow-y-auto px-6 py-4 space-y-4 font-mono ${isMobile ? "pb-40" : ""}`} style={{ fontSize: "13px" }}
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
                        <>
                          {execData.segments.map((seg, i) => {
                            if (seg.kind === "tools") {
                              const segTools = new Map(
                                seg.toolIds
                                  .filter((id) => execData.toolEvents.has(id))
                                  .map((id) => [id, execData.toolEvents.get(id)!])
                              );
                              return <ToolEventsSection key={i} toolEvents={segTools} />;
                            }
                            if (seg.kind === "thinking") {
                              return <ThinkingSegmentCard key={i} text={seg.text} />;
                            }
                            // TODO: Local model support — local models may not populate message.content,
                            // so MessageBubble renders nothing. When local model chat is implemented,
                            // render text segments here only when message.content is empty/absent.
                            // if (seg.kind === "text") {
                            //   return (
                            //     <div key={i} className="py-2">
                            //       <div className="prose prose-sm dark:prose-invert max-w-none font-mono opacity-80" style={{ fontSize: "13px" }}>
                            //         <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({ src, alt }) => <ClickableImage src={src} alt={alt} /> }}>
                            //           {seg.text}
                            //         </ReactMarkdown>
                            //       </div>
                            //     </div>
                            //   );
                            // }
                            return null;
                          })}
                          {(() => {
                            const durationMs = execData.thinkingDurationMs ?? execData.durationMs;
                            return durationMs != null ? (
                              <div className="flex items-center gap-1.5 text-muted-foreground text-[13px]">
                                <Brain className="h-3 w-3" />
                                <span>Thought for {formatThinkingDuration(durationMs)}</span>
                              </div>
                            ) : null;
                          })()}
                        </>
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

            {/* Optimistic user message — hide once the turn is persisted to avoid duplication */}
            {optimisticUserMsg && (isActiveSession || streamingIsLive) && (
              <div className="space-y-1">
                <div className="bg-accent/40 px-4 py-2.5 rounded-md">
                  <div className="whitespace-pre-wrap">{optimisticUserMsg}</div>
                  {optimisticAttachedImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {optimisticAttachedImages.map((src, i) => (
                        <ClickableImage key={i} src={src} alt={`attached image ${i + 1}`} className="max-h-20 max-w-[120px] rounded object-contain cursor-zoom-in" />
                      ))}
                    </div>
                  )}
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

            {/* Live streaming: also shown during refetch gap (streamingIsLive) to prevent blank flash */}
            {(isActiveSession || streamingIsLive) && (() => {
              const ed = streamingExecutionId ? executionData.get(streamingExecutionId) : undefined;
              const segments = ed?.segments ?? [];
              const hasText = segments.some((s) => s.kind === "text");
              return (
                <div className="space-y-1.5">
                  {/* Shown while reconnect is in progress and no events have arrived yet */}
                  {isReconnecting && !streamingExecutionId && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Reconnecting to active session…</span>
                    </div>
                  )}
                  {segments.map((seg, i) => {
                    if (seg.kind === "tools") {
                      const segTools = new Map(
                        seg.toolIds
                          .filter((id) => ed!.toolEvents.has(id))
                          .map((id) => [id, ed!.toolEvents.get(id)!])
                      );
                      return <ToolEventsSection key={i} toolEvents={segTools} />;
                    }
                    if (seg.kind === "thinking") {
                      return <ThinkingSegmentCard key={i} text={seg.text} />;
                    }
                    return (
                      <div key={i} className="py-2">
                        <div className="prose prose-sm dark:prose-invert max-w-none font-mono opacity-80" style={{ fontSize: "13px" }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({ src, alt }) => <ClickableImage src={src} alt={alt} /> }}>{seg.text}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  })}
                  {!hasText && (!isReconnecting || !!streamingExecutionId) && <ThinkingStatusLine />}
                </div>
              );
            })()}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div
            className={`px-4 bg-background ${isMobile ? "fixed bottom-0 left-0 right-0 z-20 pt-0" : "pt-4 space-y-2"}`}
            style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.txt,.md,.json,.csv,.pdf,.js,.ts,.tsx,.jsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.sh"
              className="hidden"
              onChange={handleFileInput}
            />

            {/* Attachment preview strip */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {attachedFiles.map((file, i) => (
                  <AttachmentChip key={i} file={file} onRemove={() => removeFile(i)} />
                ))}
              </div>
            )}

            <div className="relative">
              {slashCommands.length > 0 && (
                <SlashCommandPicker
                  commands={slashCommands}
                  selectedIndex={slashPickerIndex}
                  onSelect={(cmd) => {
                    setInput(input.replace(/((?:^|\s)\/)(\S*)$/, `$1${cmd.slice(1)} `));
                    setSlashPickerIndex(0);
                  }}
                />
              )}
              <Textarea
                placeholder="Type your message… (Shift+Enter for new line, paste images)"
                value={input}
                onChange={(e) => {
                  const val = e.target.value;
                  setInput(val);
                  if (sessionId) saveDraft(sessionId, val);
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={isActiveSession}
                rows={3}
                className="resize-none bg-transparent border-0 border-t border-t-white/20 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-white/30"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
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
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach files"
                  disabled={isActiveSession}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <div className="w-px h-5 bg-border mx-1" />
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => setSettingsOpen(true)}
                  title="Session settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteOpen(true)}
                  title="Delete session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="w-px h-5 bg-border mx-1" />
                <button
                  className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${
                    terminalOpen
                      ? "text-green-400 bg-green-500/10 hover:bg-green-500/20"
                      : hasActiveTerminal
                        ? "text-green-500/70 hover:text-green-400 hover:bg-green-500/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  onClick={() => {
                    setTerminalOpen((v) => !v);
                    setTerminalEverOpened(true);
                  }}
                  title={terminalOpen ? "Hide terminal" : "Open terminal"}
                >
                  <TerminalSquare className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                {isActiveSession ? (
                  <Button variant="destructive" size="sm" onClick={handleCancel}>
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

      {/* Terminal side panel — always mounted once opened to preserve xterm state */}
      {terminalEverOpened && sessionId && (
        <TerminalSidePanel
          isOpen={terminalOpen}
          chatSessionId={sessionId}
          cwd={session?.config?.cwd || "~"}
          onClose={() => setTerminalOpen(false)}
        />
      )}

      {/* Settings dialog */}
      {session && (
        <SessionSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["chat-session", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
          }}
          sessionId={sessionId!}
          initialName={session.name}
          initialGroupId={session.groupId}
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
    const attachedImages = message.metadata?.attachedImages;
    return (
      <div className="bg-accent/40 px-4 py-2.5 rounded-md">
        <div className="whitespace-pre-wrap">{message.content}</div>
        {attachedImages && attachedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachedImages.map((src, i) => (
              <ClickableImage key={i} src={src} alt={`attached image ${i + 1}`} className="max-h-20 max-w-[120px] rounded object-contain cursor-zoom-in" />
            ))}
          </div>
        )}
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
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({ src, alt }) => <ClickableImage src={src} alt={alt} /> }}>
          {message.content || "*(no response)*"}
        </ReactMarkdown>
      </div>
      <div className="text-xs text-muted-foreground mt-1 opacity-60">{meta}</div>
    </div>
  );
}

function formatThinkingDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function ThinkingCard({ execData }: { execData: ExecutionData }) {
  const label = execData.thinkingDurationMs != null
    ? `Thought for ${formatThinkingDuration(execData.thinkingDurationMs)}`
    : "Thought";

  return (
    <div className="text-muted-foreground text-[13px] flex items-center gap-1.5">
      <Brain className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
}

function ThinkingStatusLine() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-muted-foreground text-[13px] flex items-center gap-1.5">
      <Brain className="h-3 w-3 animate-pulse" />
      <span>
        Thinking…
        {elapsedMs > 0 && (
          <span className="ml-1 opacity-60">{(elapsedMs / 1000).toFixed(1)}s</span>
        )}
      </span>
    </div>
  );
}

function ThinkingSegmentCard({ text }: { text: string; durationMs?: number }) {
  return (
    <div className="text-[13px] text-muted-foreground/70 whitespace-pre-wrap font-mono leading-relaxed border-l-2 border-muted pl-3 py-0.5">
      {text}
    </div>
  );
}

function AttachmentChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className="relative flex items-center gap-1.5 bg-muted rounded-md px-2 py-1 text-xs max-w-[160px] group">
      {isImage && preview ? (
        <img src={preview} alt={file.name} className="h-6 w-6 rounded object-cover flex-shrink-0" />
      ) : (
        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      )}
      <span className="truncate text-muted-foreground">{file.name}</span>
      <button
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        onClick={onRemove}
        title="Remove"
      >
        <X className="h-3 w-3" />
      </button>
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
  const [childrenExpanded, setChildrenExpanded] = useState(false);

  const children = Array.from(allToolEvents.values()).filter(
    (te) => te.parentToolCallId === toolEvent.toolCallId
  );
  const hiddenChildCount = Math.max(0, children.length - 3);
  const visibleChildren = (expanded || childrenExpanded) ? children : children.slice(-3);

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
          {visibleChildren.map((child) => (
            <div key={child.toolCallId} className="flex items-start gap-1.5 text-muted-foreground">
              <span className="mt-0.5">└</span>
              <div className="flex-1">
                <ToolLine toolEvent={child} indent expanded={expanded} />
              </div>
            </div>
          ))}
          {!expanded && hiddenChildCount > 0 && (
            <button
              className="text-muted-foreground pl-4 opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
              onClick={() => setChildrenExpanded((v) => !v)}
            >
              {childrenExpanded ? (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>Show less</span>
                </>
              ) : (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span>+{hiddenChildCount} more tool use{hiddenChildCount !== 1 ? "s" : ""}</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
