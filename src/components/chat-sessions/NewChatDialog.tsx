import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { chatService } from "@/api/chatService";
import { llamacppAdminService } from "@/api/llamacppAdminService";
import type { ChatSessionConfig } from "@/types/xerroChat";
import { BaseDialog } from "@/components/BaseDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { WorkingDirectoryCombobox } from "./WorkingDirectoryCombobox";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (sessionId: string) => void;
  initialConfig?: ChatSessionConfig;
  initialName?: string;
  initialGroupId?: string;
  sessionId?: string; // If provided, this is an edit dialog
}

const DEFAULT_SETTINGS_SOURCES = ["project", "user"] as const;

export function NewChatDialog({
  open,
  onOpenChange,
  onCreated,
  initialConfig,
  initialName = "",
  initialGroupId,
  sessionId,
}: NewChatDialogProps) {
  const isEdit = !!sessionId;

  const [name, setName] = useState(initialName);
  const [cwd, setCwd] = useState(initialConfig?.cwd ?? "/Users/dweaver/Projects/ai/xerro-agent");
  const [permissions, setPermissions] = useState<"allow_all" | "restricted">(
    !initialConfig?.permissions || initialConfig.permissions === "allow_all"
      ? "allow_all"
      : "restricted"
  );
  const [useLocal, setUseLocal] = useState(initialConfig?.local ?? false);
  const [localModel, setLocalModel] = useState(initialConfig?.localModel ?? "");
  const [settingSources, setSettingSources] = useState<("user" | "project" | "local")[]>(
    initialConfig?.settingSources ?? [...DEFAULT_SETTINGS_SOURCES]
  );
  const [memoryContext, setMemoryContext] = useState(!initialConfig?.disableMemoryContext);
  const [systemPrompt, setSystemPrompt] = useState(
    typeof initialConfig?.systemPrompt === "string" ? initialConfig.systemPrompt : ""
  );
  const [groupId, setGroupId] = useState<string>(initialGroupId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Reset form state whenever the dialog opens
  useEffect(() => {
    if (open) {
      setName(initialName);
      setCwd(initialConfig?.cwd ?? "/Users/dweaver/Projects/ai/xerro-agent");
      setPermissions(
        !initialConfig?.permissions || initialConfig.permissions === "allow_all"
          ? "allow_all"
          : "restricted"
      );
      setUseLocal(initialConfig?.local ?? false);
      setLocalModel(initialConfig?.localModel ?? "");
      setSettingSources(initialConfig?.settingSources ?? [...DEFAULT_SETTINGS_SOURCES]);
      setMemoryContext(!initialConfig?.disableMemoryContext);
      setSystemPrompt(
        typeof initialConfig?.systemPrompt === "string" ? initialConfig.systemPrompt : ""
      );
      setGroupId(initialGroupId ?? "");
      setAdvancedOpen(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch groups for the group selector
  const { data: groupsData } = useQuery({
    queryKey: ["chat-groups"],
    queryFn: () => chatService.listGroups(),
    enabled: open,
  });
  const groups = groupsData?.groups ?? [];

  // Fetch available LLM servers when local mode is on
  const { data: serversData } = useQuery({
    queryKey: ["llamacpp-servers"],
    queryFn: () => llamacppAdminService.listServers(),
    enabled: useLocal,
  });

  const availableServers = (serversData?.servers ?? []).filter(
    (s) => s.status === "running"
  );
  const aliasedServers = availableServers.filter((s) => s.alias);
  const nonAliasedServers = availableServers.filter((s) => !s.alias);

  const toggleSettingsSource = (source: "user" | "project") => {
    setSettingSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() && !isEdit) return;
    setIsSubmitting(true);

    const config: ChatSessionConfig = {
      ...(cwd.trim() ? { cwd: cwd.trim() } : {}),
      ...(permissions === "allow_all" ? { permissions: "allow_all" as const } : {}),
      ...(useLocal
        ? {
            local: true,
            ...(localModel.trim() ? { localModel: localModel.trim() } : {}),
          }
        : {}),
      ...(settingSources.length > 0 ? { settingSources } : {}),
      ...(!memoryContext ? { disableMemoryContext: true } : {}),
      ...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
    };

    try {
      if (isEdit && sessionId) {
        await chatService.updateSession(sessionId, {
          ...(name.trim() && name !== initialName ? { name: name.trim() } : {}),
          config,
        });
        onCreated(sessionId);
      } else {
        const session = await chatService.createSession(name.trim(), config, groupId || undefined);
        onCreated(session.id);
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex gap-2 justify-end">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={(!isEdit && !name.trim()) || isSubmitting}
      >
        {isSubmitting ? "Creating..." : isEdit ? "Save" : "Create"}
      </Button>
    </div>
  );

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Session Settings" : "New Chat"}
      footer={footer}
      footerHeight={64}
    >
        <div className="space-y-4 py-2">
          {/* Session Name */}
          <div className="space-y-1.5">
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              placeholder="My chat session"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Working Directory */}
          <div className="space-y-1.5">
            <Label htmlFor="cwd">Working Directory</Label>
            <WorkingDirectoryCombobox value={cwd} onChange={setCwd} />
          </div>

          {/* Group (create mode only) */}
          {!isEdit && groups.length > 0 && (
            <div className="space-y-1.5">
              <Label>Group (optional)</Label>
              <Select
                value={groupId || "__none__"}
                onValueChange={(v) => setGroupId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No group</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Advanced Section */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-0 hover:bg-transparent"
              >
                <span className="text-sm font-medium">Advanced</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    advancedOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {/* Permissions */}
              <div className="space-y-1.5">
                <Label>Permissions</Label>
                <Select
                  value={permissions}
                  onValueChange={(v) => setPermissions(v as "allow_all" | "restricted")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allow_all">Allow All</SelectItem>
                    <SelectItem value="restricted">Restricted (no tools)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Use Local LLM */}
              <div className="flex items-center justify-between">
                <Label htmlFor="use-local">Use Local LLM</Label>
                <Switch
                  id="use-local"
                  checked={useLocal}
                  onCheckedChange={setUseLocal}
                />
              </div>

              {/* Local Model Selector */}
              {useLocal && (
                <div className="space-y-1.5 pl-4 border-l-2 border-muted">
                  <Label htmlFor="local-model">Model Server</Label>
                  <Select value={localModel} onValueChange={setLocalModel}>
                    <SelectTrigger id="local-model">
                      <SelectValue placeholder="Select a server…" />
                    </SelectTrigger>
                    <SelectContent>
                      {aliasedServers.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            Alias
                          </div>
                          {aliasedServers.map((s) => (
                            <SelectItem key={s.id} value={s.alias!}>
                              {s.alias}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {nonAliasedServers.length > 0 && (
                        <>
                          {aliasedServers.length > 0 && <div className="h-px bg-border my-1" />}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            Models
                          </div>
                          {nonAliasedServers.map((s) => (
                            <SelectItem key={s.id} value={s.modelName}>
                              {s.modelName}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {availableServers.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No running servers available. Start a server in System Control.
                    </p>
                  )}
                </div>
              )}

              {/* Settings Sources */}
              <div className="space-y-2">
                <Label>Settings Sources</Label>
                <div className="flex gap-4">
                  {(["project", "user"] as const).map((source) => (
                    <div key={source} className="flex items-center gap-2">
                      <Checkbox
                        id={`source-${source}`}
                        checked={settingSources.includes(source)}
                        onCheckedChange={() => toggleSettingsSource(source)}
                      />
                      <Label htmlFor={`source-${source}`} className="font-normal capitalize cursor-pointer">
                        {source}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Memory Context */}
              <div className="flex items-center justify-between">
                <Label htmlFor="memory-context">Memory Context</Label>
                <Switch
                  id="memory-context"
                  checked={memoryContext}
                  onCheckedChange={setMemoryContext}
                />
              </div>

              {/* System Prompt */}
              <div className="space-y-1.5">
                <Label htmlFor="system-prompt">System Prompt (optional)</Label>
                <Textarea
                  id="system-prompt"
                  placeholder="Leave empty to use default..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={3}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
    </BaseDialog>
  );
}
