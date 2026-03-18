import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { ToolsMultiSelect } from "@/components/agent-tasks/ToolsMultiSelect";
import { agentTasksService } from "@/api/agentTasksService";
import { llamacppAdminService } from "@/api/llamacppAdminService";
import type { ScheduledTask, RunAgentProperties } from "@/types/agentTasks";
import { Pencil, Save, Loader2, X, History } from "lucide-react";

interface RunAgentConfigFormProps {
  task: ScheduledTask;
  onSaved?: () => void;
  buttonPosition?: "top" | "bottom";
  onVersionsClick?: () => void;
}

export function RunAgentConfigForm({
  task,
  onSaved,
  buttonPosition = "top",
  onVersionsClick,
}: RunAgentConfigFormProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Parse current properties
  const props = task.properties as unknown as RunAgentProperties;
  const currentPermissions = props.permissions;
  const currentPermissionMode =
    !currentPermissions ||
    (typeof currentPermissions === "string" &&
      currentPermissions === "allow_all")
      ? "allow_all"
      : "custom";
  const currentAllowList =
    typeof currentPermissions === "object" && currentPermissions.allowList
      ? currentPermissions.allowList
      : [];

  // Form state
  const [prompt, setPrompt] = useState(props.prompt || "");
  const [cwd, setCwd] = useState(props.cwd || "");
  const [permissionMode, setPermissionMode] = useState<"allow_all" | "custom">(
    currentPermissionMode,
  );
  const [allowList, setAllowList] = useState<string[]>(currentAllowList);
  const [additionalDirectories, setAdditionalDirectories] = useState<string[]>(
    props.additionalDirectories || [],
  );
  const [newDirectory, setNewDirectory] = useState("");
  const [local, setLocal] = useState(props.local || false);
  const [localModel, setLocalModel] = useState(props.localModel || "");
  const [settingSources, setSettingSources] = useState<
    ("user" | "project" | "local")[]
  >(props.settingSources || ["project"]);
  const [disallowedTools, setDisallowedTools] = useState<string[]>(
    props.disallowedTools || [],
  );
  const [disableMemoryContext, setDisableMemoryContext] = useState(
    props.disableMemoryContext ?? false,
  );
  const [notificationMode, setNotificationMode] = useState(
    props.notificationMode ?? true,
  );

  // System prompt state
  type SystemPromptMode = "default" | "plain" | "preset_append";
  const deriveSystemPromptMode = (
    sp: RunAgentProperties["systemPrompt"],
  ): SystemPromptMode => {
    if (!sp) return "default";
    if (typeof sp === "string") return "plain";
    return "preset_append";
  };
  const deriveSystemPromptText = (
    sp: RunAgentProperties["systemPrompt"],
  ): string => {
    if (!sp) return "";
    if (typeof sp === "string") return sp;
    return sp.append;
  };
  const [systemPromptMode, setSystemPromptMode] = useState<SystemPromptMode>(
    deriveSystemPromptMode(props.systemPrompt),
  );
  const [systemPromptText, setSystemPromptText] = useState(
    deriveSystemPromptText(props.systemPrompt),
  );

  // Fetch available LLM servers from LlamaCPP Admin API
  const { data: serversData } = useQuery({
    queryKey: ["llamacpp-servers"],
    queryFn: () => llamacppAdminService.listServers(),
    enabled: local, // Only fetch when local LLM is enabled
  });

  // Filter to only running servers
  const availableServers = (serversData?.servers || []).filter(
    (server) => server.status === "running",
  );

  // Split servers into aliased and non-aliased groups
  const aliasedServers = availableServers.filter((server) => server.alias);
  const nonAliasedServers = availableServers.filter((server) => !server.alias);

  // Validation
  const [promptError, setPromptError] = useState("");

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Validate
      if (!prompt.trim()) {
        setPromptError("Prompt is required");
        throw new Error("Prompt is required");
      }

      // Parse permissions
      let permissions: "allow_all" | { allowList: string[] };
      if (permissionMode === "allow_all") {
        permissions = "allow_all";
      } else {
        permissions = { allowList };
      }

      // Build systemPrompt value
      let systemPrompt: RunAgentProperties["systemPrompt"];
      if (systemPromptMode === "plain" && systemPromptText.trim()) {
        systemPrompt = systemPromptText.trim();
      } else if (
        systemPromptMode === "preset_append" &&
        systemPromptText.trim()
      ) {
        systemPrompt = {
          type: "preset",
          preset: "claude_code",
          append: systemPromptText.trim(),
        };
      }

      // Build updated properties
      const updatedProperties: RunAgentProperties = {
        prompt: prompt.trim(),
        ...(cwd.trim() && { cwd: cwd.trim() }),
        permissions,
        ...(additionalDirectories.length > 0 && { additionalDirectories }),
        local,
        ...(local && localModel && { localModel }),
        ...(JSON.stringify([...settingSources].sort()) !==
          JSON.stringify(["project"]) && { settingSources }),
        ...(disallowedTools.length > 0 && { disallowedTools }),
        ...(disableMemoryContext && { disableMemoryContext }),
        ...(!notificationMode && { notificationMode: false }),
        ...(systemPrompt !== undefined && { systemPrompt }),
      };

      return agentTasksService.updateTask(task.id, {
        properties: updatedProperties as unknown as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-task", task.id] });
      queryClient.invalidateQueries({ queryKey: ["agent-tasks"] });
      setIsEditing(false);
      onSaved?.();
    },
  });

  const handleSave = () => {
    setPromptError("");
    updateMutation.mutate();
  };

  const handleCancel = () => {
    // Reset form to current values
    setPrompt(props.prompt || "");
    setCwd(props.cwd || "");
    setPermissionMode(currentPermissionMode);
    setAllowList(currentAllowList);
    setAdditionalDirectories(props.additionalDirectories || []);
    setNewDirectory("");
    setLocal(props.local || false);
    setLocalModel(props.localModel || "");
    setSettingSources(props.settingSources || ["project"]);
    setDisallowedTools(props.disallowedTools || []);
    setDisableMemoryContext(props.disableMemoryContext ?? false);
    setNotificationMode(props.notificationMode ?? true);
    setSystemPromptMode(deriveSystemPromptMode(props.systemPrompt));
    setSystemPromptText(deriveSystemPromptText(props.systemPrompt));
    setPromptError("");
    setIsEditing(false);
  };

  if (!isEditing) {
    // View Mode
    return (
      <div className="space-y-4">
        <Card>
          {buttonPosition === "top" && (
            <CardHeader className="flex flex-row items-center justify-end">
              <ContainerToolButton
                onClick={() => setIsEditing(true)}
                size="icon"
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
              </ContainerToolButton>
            </CardHeader>
          )}
          <CardContent
            className={
              buttonPosition === "top" ? "space-y-4" : "pt-6 space-y-4"
            }
          >
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Prompt
              </h3>
              <p className="text-sm whitespace-pre-wrap">{props.prompt}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Working Directory
                </h3>
                <p className="text-sm font-mono">
                  {props.cwd || "/Users/dweaver/Projects/ai/xerro-agent"}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Permissions
                </h3>
                {typeof currentPermissions === "string" &&
                currentPermissions === "allow_all" ? (
                  <p className="text-sm">Allow All</p>
                ) : typeof currentPermissions === "object" &&
                  currentPermissions.allowList ? (
                  <div className="flex flex-wrap gap-1">
                    {currentPermissions.allowList.map((tool, index) => (
                      <span
                        key={index}
                        className="text-xs bg-muted px-2 py-1 rounded"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Not configured
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Use Local LLM
                </h3>
                <p className="text-sm">{props.local ? "Yes" : "No"}</p>
              </div>

              {props.local && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Model Server
                  </h3>
                  <p className="text-sm font-mono">
                    {props.localModel || (
                      <span className="text-muted-foreground">
                        Not selected
                      </span>
                    )}
                  </p>
                </div>
              )}

              {props.additionalDirectories &&
                props.additionalDirectories.length > 0 && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Additional Directories
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {props.additionalDirectories.map((dir, index) => (
                        <span
                          key={index}
                          className="text-xs bg-muted px-2 py-1 rounded font-mono"
                        >
                          {dir}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Settings Sources */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Settings Sources
                </h3>
                <div className="flex gap-1 flex-wrap">
                  {(props.settingSources || ["project"]).map((s) => (
                    <span
                      key={s}
                      className="text-xs bg-muted px-2 py-1 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Memory Context */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Memory Context
                </h3>
                <p className="text-sm">
                  {props.disableMemoryContext ? "Disabled" : "Enabled"}
                </p>
              </div>

              {/* Notifications */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Notifications
                </h3>
                <p className="text-sm">
                  {(props.notificationMode ?? true) ? "Enabled" : "Disabled"}
                </p>
              </div>

              {/* Blocked Tools */}
              {props.disallowedTools && props.disallowedTools.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Blocked Tools
                  </h3>
                  <div className="flex gap-1 flex-wrap">
                    {props.disallowedTools.map((t, i) => (
                      <span
                        key={i}
                        className="text-xs bg-muted px-2 py-1 rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* System Prompt */}
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  System Prompt
                </h3>
                {!props.systemPrompt ? (
                  <p className="text-sm">Default</p>
                ) : typeof props.systemPrompt === "string" ? (
                  <div>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mb-1">
                      Plain string — replaces claude_code preset
                    </p>
                    <p className="text-sm whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded">
                      {props.systemPrompt}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Appended to claude_code preset
                    </p>
                    <p className="text-sm whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded">
                      {props.systemPrompt.append}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        {buttonPosition === "bottom" && (
          <div className="flex justify-end gap-2">
            {onVersionsClick && (
              <Button onClick={onVersionsClick} variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />
                Versions
              </Button>
            )}
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Configuration
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Edit Mode
  return (
    <Card>
      {buttonPosition === "top" && (
        <CardHeader className="flex flex-row items-center justify-end">
          <ContainerToolButton
            onClick={handleSave}
            disabled={updateMutation.isPending}
            size="icon"
            variant="primary"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </ContainerToolButton>
        </CardHeader>
      )}
      <CardContent className={buttonPosition === "top" ? "" : "pt-6"}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-6"
        >
          {/* Prompt Field */}
          <div className="space-y-2">
            <Label htmlFor="prompt">
              Prompt <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (promptError) setPromptError("");
              }}
              placeholder="Search my documents for..."
              rows={6}
              disabled={updateMutation.isPending}
              className={promptError ? "border-red-500" : ""}
            />
            <p className="text-xs text-muted-foreground">
              The task or instruction for the agent to execute
            </p>
            {promptError && (
              <p className="text-xs text-red-500">{promptError}</p>
            )}
          </div>

          {/* Working Directory Field */}
          <div className="space-y-2">
            <Label htmlFor="cwd">Working Directory</Label>
            <Input
              id="cwd"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="/Users/dweaver/Projects/ai/xerro-agent"
              disabled={updateMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Default: /Users/dweaver/Projects/ai/xerro-agent
            </p>
          </div>

          {/* Permissions Field */}
          <div className="space-y-2">
            <Label htmlFor="permissions">Permissions</Label>
            <Select
              value={permissionMode}
              onValueChange={(value: "allow_all" | "custom") =>
                setPermissionMode(value)
              }
              disabled={updateMutation.isPending}
            >
              <SelectTrigger id="permissions">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allow_all">Allow All</SelectItem>
                <SelectItem value="custom">Custom Allow List</SelectItem>
              </SelectContent>
            </Select>

            {permissionMode === "custom" && (
              <div className="space-y-2 mt-2">
                <ToolsMultiSelect
                  selectedTools={allowList}
                  onChange={setAllowList}
                  disabled={updateMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Select tools the agent is allowed to use. Tools are grouped by
                  category.
                </p>
              </div>
            )}
          </div>

          {/* Additional Directories Field */}
          <div className="space-y-2">
            <Label htmlFor="additionalDirectories">
              Additional Directories
            </Label>
            <div className="space-y-2">
              {additionalDirectories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {additionalDirectories.map((dir, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="gap-1 font-mono"
                    >
                      {dir}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-foreground"
                        onClick={() => {
                          setAdditionalDirectories(
                            additionalDirectories.filter((_, i) => i !== index),
                          );
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  id="additionalDirectories"
                  value={newDirectory}
                  onChange={(e) => setNewDirectory(e.target.value)}
                  placeholder="/path/to/directory"
                  disabled={updateMutation.isPending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (
                        newDirectory.trim() &&
                        !additionalDirectories.includes(newDirectory.trim())
                      ) {
                        setAdditionalDirectories([
                          ...additionalDirectories,
                          newDirectory.trim(),
                        ]);
                        setNewDirectory("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (
                      newDirectory.trim() &&
                      !additionalDirectories.includes(newDirectory.trim())
                    ) {
                      setAdditionalDirectories([
                        ...additionalDirectories,
                        newDirectory.trim(),
                      ]);
                      setNewDirectory("");
                    }
                  }}
                  disabled={updateMutation.isPending || !newDirectory.trim()}
                >
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Additional directories the agent is allowed to access beyond the
                working directory
              </p>
            </div>
          </div>

          {/* Settings Sources */}
          <div className="space-y-2">
            <Label>Settings Sources</Label>
            <div className="space-y-2">
              {(
                [
                  {
                    value: "project",
                    label: "Project",
                    description: "Current folder settings",
                    path: ".claude/settings.json",
                  },
                  {
                    value: "user",
                    label: "User",
                    description: "Global user settings",
                    path: "~/.claude/settings.json",
                  },
                ] as const
              ).map(({ value, label, description, path }) => (
                <label
                  key={value}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={settingSources.includes(value)}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSettingSources([...settingSources, value]);
                      else
                        setSettingSources(
                          settingSources.filter((s) => s !== value),
                        );
                    }}
                    disabled={updateMutation.isPending}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm">{label}</span>
                    <p className="text-xs text-muted-foreground">
                      {description} — <code className="font-mono">{path}</code>
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Blocked Tools */}
          <div className="space-y-2">
            <Label>Blocked Tools</Label>
            <ToolsMultiSelect
              selectedTools={disallowedTools}
              onChange={setDisallowedTools}
              disabled={updateMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Tools to always block, regardless of permission mode.
            </p>
          </div>

          {/* Memory Context */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="disableMemoryContext">Memory Context</Label>
              <p className="text-xs text-muted-foreground">
                Inject memory prompt into task
              </p>
            </div>
            <Switch
              id="disableMemoryContext"
              checked={!disableMemoryContext}
              onCheckedChange={(checked) => setDisableMemoryContext(!checked)}
              disabled={updateMutation.isPending}
            />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notificationMode">Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Notify when task completes
              </p>
            </div>
            <Switch
              id="notificationMode"
              checked={notificationMode}
              onCheckedChange={setNotificationMode}
              disabled={updateMutation.isPending}
            />
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPromptMode">System Prompt</Label>
            <Select
              value={systemPromptMode}
              onValueChange={(value: SystemPromptMode) =>
                setSystemPromptMode(value)
              }
              disabled={updateMutation.isPending}
            >
              <SelectTrigger id="systemPromptMode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  Default (claude_code preset)
                </SelectItem>
                <SelectItem value="plain">
                  Plain string — replace preset
                </SelectItem>
                <SelectItem value="preset_append">
                  Append to claude_code preset
                </SelectItem>
              </SelectContent>
            </Select>
            {systemPromptMode === "plain" && (
              <div className="space-y-1">
                <Textarea
                  value={systemPromptText}
                  onChange={(e) => setSystemPromptText(e.target.value)}
                  placeholder="You are a helpful assistant. Use the available tools to complete the task as instructed."
                  rows={4}
                  disabled={updateMutation.isPending}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Replaces the entire claude_code preset. Dramatically reduces
                  SDK token overhead (~27k → near-zero). Recommended for local
                  models with limited context windows.
                </p>
              </div>
            )}
            {systemPromptMode === "preset_append" && (
              <div className="space-y-1">
                <Textarea
                  value={systemPromptText}
                  onChange={(e) => setSystemPromptText(e.target.value)}
                  placeholder="Always respond in JSON."
                  rows={3}
                  disabled={updateMutation.isPending}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Appended to the full claude_code preset. Retains all built-in
                  tool usage instructions.
                </p>
              </div>
            )}
            {systemPromptMode === "default" && (
              <p className="text-xs text-muted-foreground">
                Uses the full claude_code preset unchanged.
              </p>
            )}
          </div>

          {/* Local LLM Switch */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="local">Use Local LLM</Label>
                <p className="text-xs text-muted-foreground">
                  Use local inference server instead of Anthropic API
                </p>
              </div>
              <Switch
                id="local"
                checked={local}
                onCheckedChange={setLocal}
                disabled={updateMutation.isPending}
              />
            </div>

            {/* Model Selector - Only shown when local is true */}
            {local && (
              <div className="space-y-2">
                <Label htmlFor="localModel">Model Server</Label>
                <Select
                  value={localModel}
                  onValueChange={setLocalModel}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger id="localModel">
                    <SelectValue placeholder="Select a server..." />
                  </SelectTrigger>
                  <SelectContent>
                    {aliasedServers.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Alias
                        </div>
                        {aliasedServers.map((server) => (
                          <SelectItem key={server.id} value={server.alias!}>
                            {server.alias}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {nonAliasedServers.length > 0 && (
                      <>
                        {aliasedServers.length > 0 && (
                          <div className="h-px bg-border my-1" />
                        )}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Models
                        </div>
                        {nonAliasedServers.map((server) => (
                          <SelectItem key={server.id} value={server.modelName}>
                            {server.modelName}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {availableServers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No running servers available. Start a server in System
                    Control.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Select the local LLM server to use for this task. Servers with
                  aliases are recommended for stable task configurations.
                </p>
                {nonAliasedServers.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Tip: Configure aliases for your servers using:{" "}
                    <code className="font-mono text-xs">
                      llamacpp server config &lt;id&gt; --alias &lt;name&gt;
                    </code>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {buttonPosition === "top" && (
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </form>
        {buttonPosition === "bottom" && (
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
