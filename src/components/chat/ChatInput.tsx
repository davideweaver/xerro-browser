import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  selectedModel: string;
  onModelChange: (value: string) => void;
  selectedAgent: string;
  onAgentChange: (value: string) => void;
  contextWindow: number;
  onContextWindowChange: (value: number) => void;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  isStreaming = false,
  selectedModel,
  onModelChange,
  selectedAgent,
  onAgentChange,
  contextWindow,
  onContextWindowChange,
}: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const charCount = value.length;
  const maxChars = 2000;

  return (
    <div className="border-t p-4 space-y-2 bg-background">
      <textarea
        placeholder="Type your message... (Shift+Enter for new line)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={3}
        className="w-full resize-none bg-background border-0 rounded-md shadow-none outline-none focus:outline-none placeholder:text-muted-foreground text-sm px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="flex justify-between items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {charCount} / {maxChars} chars
        </span>
        <div className="flex items-center gap-2">
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="qwen">Qwen</SelectItem>
              <SelectItem value="gpt-oss-q4">GPT-OSS Q4</SelectItem>
              <SelectItem value="gpt-oss-q3">GPT-OSS Q3</SelectItem>
              <SelectItem value="mistral">Mistral</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="openrouter">OpenRouter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedAgent} onValueChange={onAgentChange}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="react-selective">React Selective</SelectItem>
              <SelectItem value="react-batch">React Batch</SelectItem>
              <SelectItem value="codemode">CodeMode</SelectItem>
              <SelectItem value="comprehensive">Comprehensive</SelectItem>
              <SelectItem value="grounded">Grounded</SelectItem>
              <SelectItem value="auto">Auto</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={contextWindow.toString()}
            onValueChange={(value) => onContextWindowChange(Number(value))}
          >
            <SelectTrigger className="w-24 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0 msgs</SelectItem>
              <SelectItem value="1">1 msg</SelectItem>
              <SelectItem value="2">2 msgs</SelectItem>
              <SelectItem value="3">3 msgs</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={onSend}
            disabled={!value.trim() || disabled || isStreaming}
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
