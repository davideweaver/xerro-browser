import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Trash2 } from "lucide-react";
import { messagesService } from "@/api/messagesService";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Message } from "@/types/messages";

interface MessageThreadViewProps {
  threadId: string;
}

interface MessageBubbleProps {
  message: Message;
  onDelete: (id: string) => void;
}

function MessageBubble({ message, onDelete }: MessageBubbleProps) {
  const isUser = message.fromId === "user";
  const isMobile = useIsMobile();

  return (
    <div className={cn("flex group", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[75%] space-y-1", isUser ? "items-end" : "items-start")}>
        <div className={cn("flex items-center gap-2", isUser ? "justify-end" : "justify-start")}>
          {!isUser && (
            <span className="text-xs font-medium text-muted-foreground">
              {message.fromName}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
          <button
            className={cn(
              "transition-opacity text-muted-foreground/50 hover:text-destructive",
              isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            title="Delete message"
            onClick={() => onDelete(message.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 break-words",
            isUser
              ? "bg-primary text-white rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          )}
        >
          <div className={cn(
            "text-sm prose prose-sm max-w-none",
            "[&_h1]:text-[16px] [&_h1]:font-medium [&_h2]:text-[16px] [&_h2]:font-medium [&_h3]:text-[16px] [&_h3]:font-medium [&_h4]:text-[16px] [&_h4]:font-medium [&_h5]:text-[16px] [&_h5]:font-medium [&_h6]:text-[16px] [&_h6]:font-medium",
            "[&_hr]:my-2",
            isUser ? "prose-invert [&_p]:text-white [&_code]:text-white [&_li]:text-white [&_strong]:text-white [&_em]:text-white [&_a]:text-white" : "dark:prose-invert"
          )}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.body}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MessageThreadView({ threadId }: MessageThreadViewProps) {
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { subscribeToMessageCreated, subscribeToMessageUpdated } = useXerroWebSocketContext();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["message-thread", threadId],
    queryFn: () => messagesService.getThread(threadId),
    enabled: !!threadId,
  });

  // Auto-mark unread messages as read when thread opens
  useEffect(() => {
    if (!messages || !Array.isArray(messages)) return;
    const unread = messages.filter(m => !m.read && m.toId === "user");
    unread.forEach(m => {
      messagesService.markRead(m.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ["message-threads"] });
        queryClient.invalidateQueries({ queryKey: ["messages-unread-count"] });
      });
    });
  }, [messages, queryClient]);

  // Real-time updates for this thread
  useEffect(() => {
    const unsub1 = subscribeToMessageCreated((event) => {
      if (event.message.threadId === threadId) {
        queryClient.invalidateQueries({ queryKey: ["message-thread", threadId] });
      }
    });
    const unsub2 = subscribeToMessageUpdated((event) => {
      if (event.message.threadId === threadId) {
        queryClient.invalidateQueries({ queryKey: ["message-thread", threadId] });
      }
    });
    return () => { unsub1(); unsub2(); };
  }, [threadId, subscribeToMessageCreated, subscribeToMessageUpdated, queryClient]);

  // Scroll to bottom when messages load or update
  useEffect(() => {
    if (messages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const replyMutation = useMutation({
    mutationFn: ({ body, lastMessageId }: { body: string; lastMessageId: string }) =>
      messagesService.replyToMessage(lastMessageId, body),
    onSuccess: () => {
      setReplyBody("");
      queryClient.invalidateQueries({ queryKey: ["message-thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => messagesService.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread-count"] });
    },
  });

  const handleSendReply = () => {
    if (!replyBody.trim() || replyMutation.isPending) return;
    const lastMessage = Array.isArray(messages) ? messages[messages.length - 1] : undefined;
    if (!lastMessage) return;
    replyMutation.mutate({ body: replyBody, lastMessageId: lastMessage.id });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
            <Skeleton className={cn("h-16 rounded-2xl", i % 2 === 0 ? "w-48" : "w-56")} />
          </div>
        ))}
      </div>
    );
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No messages in this thread</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message: Message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply area */}
      <div className="flex-shrink-0 px-4 pb-3 bg-background">
        <Textarea
          placeholder="Reply… (Shift+Enter for new line)"
          className="resize-none bg-transparent border-0 border-t border-t-border rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[60px] max-h-[120px] placeholder:text-muted-foreground/40"
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={handleSendReply}
            disabled={!replyBody.trim() || replyMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
