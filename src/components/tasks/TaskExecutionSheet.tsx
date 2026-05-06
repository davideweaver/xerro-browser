import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidePanelHeader } from "@/components/shared/SidePanelHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TaskExecution } from "@/types/agentTasks";
import { TaskExecutionDisplay } from "./TaskExecutionDisplay";
import { agentTasksService } from "@/api/agentTasksService";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Zap } from "lucide-react";
import { formatTimestamp, formatRelativeTime } from "@/lib/cronFormatter";

interface TaskExecutionSheetProps {
  execution: TaskExecution | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskExecutionSheet({
  execution,
  open,
  onOpenChange,
}: TaskExecutionSheetProps) {
  // Fetch trace data for this execution
  const { data: trace, isLoading: isLoadingTrace } = useQuery({
    queryKey: ["execution-trace", execution?.id],
    queryFn: () => agentTasksService.getExecutionTrace(execution!.id),
    enabled: !!execution && open,
  });

  if (!execution) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-2xl">
        <SidePanelHeader
          title="Execution Details"
          description={execution.agentName ?? execution.taskName}
          headerClassName="-mt-0 pt-1"
        />

        <div className="mt-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="trace">
                Trace {trace && `(${trace.toolCalls.length + (trace.assistantMessages?.length ?? 0)})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-6 space-y-4">
              {/* Status - Only show standalone for legacy executions */}
              {!execution.normalizedResult && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      {execution.success ? (
                        <Badge variant="default" className="bg-green-600">
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Message - Only show if no normalized result (legacy executions) */}
              {execution.message && !execution.normalizedResult && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Message</span>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {execution.message}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error */}
              {execution.error && (
                <Card className="border-red-200 dark:border-red-900">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        Error
                      </span>
                      <pre className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono bg-red-50 dark:bg-red-950/30 p-3 rounded-md">
                        {execution.error}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Task Execution Display - New normalized format */}
              {(execution.normalizedResult || execution.data) && (
                <TaskExecutionDisplay execution={execution} />
              )}

              {/* Trigger */}
              {execution.trigger && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Triggered By</span>
                      <div className="flex items-center gap-1.5 text-sm text-yellow-600 dark:text-yellow-500">
                        <Zap className="h-3.5 w-3.5" />
                        <span>{execution.trigger.name}</span>
                        {execution.trigger.variant && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {execution.trigger.variant}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timestamp */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Executed At</span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {new Date(execution.timestamp).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trace" className="mt-6 space-y-4">
              {isLoadingTrace ? (
                <div className="space-y-2">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : trace ? (
                <>
                  {/* Execution Metadata */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Execution Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        {trace.toolCalls.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Executed At:</span>
                            <p>{formatTimestamp(trace.toolCalls[0].calledAt)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(trace.toolCalls[0].calledAt)}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Execution ID:</span>
                          <p className="font-mono break-all">{trace.executionId}</p>
                        </div>
                        {trace.sessionId && (
                          <div>
                            <span className="text-muted-foreground">Session ID:</span>
                            <p className="font-mono break-all">{trace.sessionId}</p>
                          </div>
                        )}
                        {trace.cwd && (
                          <div>
                            <span className="text-muted-foreground">Working Dir:</span>
                            <p className="font-mono break-all">{trace.cwd}</p>
                          </div>
                        )}
                        {trace.model && (
                          <div>
                            <span className="text-muted-foreground">Model:</span>
                            <p className="font-mono">{trace.model}</p>
                          </div>
                        )}
                        {trace.permissionMode && (
                          <div>
                            <span className="text-muted-foreground">Permissions:</span>
                            <p className="font-mono">{trace.permissionMode}</p>
                          </div>
                        )}
                        {trace.settingSources && (
                          <div>
                            <span className="text-muted-foreground">Settings Sources:</span>
                            <div className="flex gap-1 flex-wrap mt-0.5">
                              {trace.settingSources.map((s) => (
                                <span key={s} className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {trace.totalCostUsd !== undefined && (
                          <div>
                            <span className="text-muted-foreground">Cost:</span>
                            <p className="font-mono">${trace.totalCostUsd.toFixed(4)}</p>
                          </div>
                        )}
                      </div>
                      {trace.usage && (
                        <div className="pt-2 border-t">
                          <span className="text-muted-foreground">Token Usage:</span>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div>
                              <span className="text-muted-foreground">Input:</span>
                              <span className="ml-1 font-mono">{trace.usage.inputTokens.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Output:</span>
                              <span className="ml-1 font-mono">{trace.usage.outputTokens.toLocaleString()}</span>
                            </div>
                            {trace.usage.cacheCreationTokens !== undefined && trace.usage.cacheCreationTokens > 0 && (
                              <div>
                                <span className="text-muted-foreground">Cache Created:</span>
                                <span className="ml-1 font-mono">{trace.usage.cacheCreationTokens.toLocaleString()}</span>
                              </div>
                            )}
                            {trace.usage.cacheReadTokens !== undefined && trace.usage.cacheReadTokens > 0 && (
                              <div>
                                <span className="text-muted-foreground">Cache Read:</span>
                                <span className="ml-1 font-mono">{trace.usage.cacheReadTokens.toLocaleString()}</span>
                              </div>
                            )}
                            {trace.promptTokenEstimate !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Our Prompt Est.:</span>
                                <span className="ml-1 font-mono">{trace.promptTokenEstimate.toLocaleString()}</span>
                              </div>
                            )}
                            {trace.promptTokenEstimate !== undefined && (
                              <div>
                                <span className="text-muted-foreground">SDK Overhead:</span>
                                <span className="ml-1 font-mono">{(trace.usage.inputTokens - trace.promptTokenEstimate).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Prompt */}
                  {trace.prompt && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>Prompt</span>
                          {trace.promptTokenEstimate !== undefined && (
                            <Badge variant="outline" className="text-xs font-mono">
                              ~{trace.promptTokenEstimate.toLocaleString()} tokens
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <details>
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none">
                            View full prompt
                          </summary>
                          <pre className="mt-3 text-xs bg-muted p-3 rounded overflow-auto max-h-96 whitespace-pre-wrap break-words font-mono">
                            {trace.prompt}
                          </pre>
                        </details>
                      </CardContent>
                    </Card>
                  )}

                  {/* Execution Timeline - interleaved assistant messages and tool calls */}
                  {(trace.toolCalls.length > 0 || (trace.assistantMessages?.length ?? 0) > 0) && (() => {
                    type TimelineItem =
                      | { type: 'assistant'; ts: number; data: typeof trace.assistantMessages[number] }
                      | { type: 'tool'; ts: number; data: typeof trace.toolCalls[number] };

                    const items: TimelineItem[] = [
                      ...(trace.assistantMessages ?? []).map(m => ({
                        type: 'assistant' as const,
                        ts: new Date(m.timestamp).getTime(),
                        data: m,
                      })),
                      ...trace.toolCalls.map(c => ({
                        type: 'tool' as const,
                        ts: new Date(c.calledAt).getTime(),
                        data: c,
                      })),
                    ].sort((a, b) => a.ts - b.ts);

                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">
                            Timeline ({trace.toolCalls.length} tool calls
                            {(trace.assistantMessages?.length ?? 0) > 0 && `, ${trace.assistantMessages.length} messages`})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {items.map((item, idx) => {
                            if (item.type === 'assistant') {
                              return (
                                <div key={`msg-${idx}`} className="border-l-2 border-blue-400/50 pl-4 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-blue-400">Assistant</span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(item.data.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">
                                    {item.data.content}
                                  </p>
                                  {item.data.truncated && (
                                    <Badge variant="secondary" className="text-xs">
                                      Truncated ({item.data.originalSizeBytes} bytes)
                                    </Badge>
                                  )}
                                </div>
                              );
                            } else {
                              const call = item.data;
                              const result = trace.toolResults.find(r => r.toolUseId === call.id);
                              return (
                                <div key={call.id} className="border-l-2 border-muted pl-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="font-mono text-xs">{call.name}</Badge>
                                      {result && (
                                        result.isError ? (
                                          <XCircle className="h-3 w-3 text-red-500" />
                                        ) : (
                                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        )
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(call.calledAt).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Input:</p>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                                      {JSON.stringify(call.input, null, 2)}
                                    </pre>
                                  </div>
                                  {result && (
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs text-muted-foreground">Output:</p>
                                        {result.truncated && (
                                          <Badge variant="secondary" className="text-xs">
                                            Truncated ({result.originalSizeBytes} bytes)
                                          </Badge>
                                        )}
                                      </div>
                                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap break-words">
                                        {result.content}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          })}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Permission Decisions */}
                  {trace.permissions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Permission Decisions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {trace.permissions.map((perm, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs border-b pb-2 last:border-0">
                              <div className="flex items-center gap-2">
                                <Badge variant={perm.decision === 'allow' ? 'default' : 'destructive'}>
                                  {perm.decision}
                                </Badge>
                                <span className="font-mono">{perm.toolName}</span>
                              </div>
                              {perm.reason && (
                                <span className="text-muted-foreground">{perm.reason}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      No trace data available for this execution
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
