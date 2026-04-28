import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidePanelHeader } from "@/components/shared/SidePanelHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { triggersService } from "@/api/triggersService";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type {
  TriggerSubscription,
  TriggerTypeName,
  TriggerCondition,
  ConditionOperator,
} from "@/types/triggers";
import { formatCronExpression } from "@/lib/cronFormatter";

const VARIANT_OPTIONS: Record<TriggerTypeName, { value: string; label: string }[]> = {
  document: [
    { value: "created", label: "Created" },
    { value: "updated", label: "Updated" },
    { value: "deleted", label: "Deleted" },
    { value: "moved", label: "Moved" },
  ],
  message: [
    { value: "received", label: "Received" },
    { value: "reply", label: "Reply" },
  ],
  cron: [],
};

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "contains", label: "contains" },
  { value: "startsWith", label: "starts with" },
  { value: "endsWith", label: "ends with" },
  { value: "matches", label: "matches" },
];

interface TriggerSheetProps {
  agentId: string;
  trigger: TriggerSubscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function TriggerSheet({
  agentId,
  trigger,
  open,
  onOpenChange,
  onSaved,
}: TriggerSheetProps) {
  const queryClient = useQueryClient();
  const isEditing = trigger !== null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerTypeName>("message");
  const [triggerVariant, setTriggerVariant] = useState("received");
  const [schedule, setSchedule] = useState("");
  const [instructions, setInstructions] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [conditions, setConditions] = useState<TriggerCondition[]>([]);
  const [conditionLogic, setConditionLogic] = useState<"all" | "any">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: triggerTypes } = useQuery({
    queryKey: ["trigger-types"],
    queryFn: () => triggersService.getTriggerTypes(),
    staleTime: Infinity,
  });

  const activeType = isEditing ? trigger.triggerType : triggerType;
  const availableFields = triggerTypes?.types[activeType]?.fields ?? {};
  const fieldOptions = Object.entries(availableFields).map(([key, def]) => ({
    value: key,
    description: def.description,
  }));

  useEffect(() => {
    if (open) {
      if (trigger) {
        setName(trigger.name);
        setDescription(trigger.description ?? "");
        setTriggerType(trigger.triggerType);
        setTriggerVariant(trigger.triggerVariant);
        setSchedule(trigger.schedule ?? "");
        setInstructions(trigger.instructions ?? "");
        setEnabled(trigger.enabled);
        setConditions(trigger.conditions ?? []);
        setConditionLogic(trigger.conditionLogic ?? "all");
      } else {
        setName("");
        setDescription("");
        setTriggerType("message");
        setTriggerVariant("received");
        setSchedule("");
        setInstructions("");
        setEnabled(true);
        setConditions([]);
        setConditionLogic("all");
      }
    }
  }, [open, trigger]);

  // When type changes, reset variant to first option and clear conditions
  const handleTypeChange = (val: TriggerTypeName) => {
    setTriggerType(val);
    const options = VARIANT_OPTIONS[val];
    setTriggerVariant(options[0]?.value ?? "fire");
    setConditions([]);
  };

  const handleAddCondition = () => {
    const firstField = fieldOptions[0]?.value ?? "";
    setConditions((prev) => [
      ...prev,
      { field: firstField, operator: "equals", value: "" },
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConditionChange = (
    index: number,
    key: keyof TriggerCondition,
    value: string
  ) => {
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [key]: value } : c))
    );
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["agent-triggers", agentId] });
    queryClient.invalidateQueries({ queryKey: ["triggers"] });
  };

  const validConditions = conditions.filter((c) => c.field && c.value.trim());

  const saveMutation = useMutation({
    mutationFn: () => {
      const variant = triggerType === "cron" ? "fire" : triggerVariant;
      if (isEditing) {
        return triggersService.updateTrigger(trigger.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          instructions: instructions.trim() || undefined,
          schedule: trigger.triggerType === "cron" ? schedule.trim() : undefined,
          conditions: validConditions,
          conditionLogic,
          enabled,
        });
      }
      return triggersService.createTrigger({
        name: name.trim(),
        description: description.trim() || undefined,
        triggerType,
        triggerVariant: variant,
        taskIds: [agentId],
        instructions: instructions.trim() || undefined,
        schedule: triggerType === "cron" ? schedule.trim() : undefined,
        conditions: validConditions,
        conditionLogic,
        enabled,
      });
    },
    onSuccess: () => {
      invalidate();
      onSaved();
      onOpenChange(false);
      toast.success(isEditing ? "Trigger updated" : "Trigger created");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => triggersService.deleteTrigger(trigger!.id),
    onSuccess: () => {
      invalidate();
      onSaved();
      onOpenChange(false);
      setDeleteDialogOpen(false);
      toast.success("Trigger deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const canSave =
    name.trim().length > 0 &&
    (triggerType !== "cron" || schedule.trim().length > 0);

  const showConditions = activeType !== "cron" && fieldOptions.length > 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-2xl flex flex-col">
          <SidePanelHeader
            title={isEditing ? "Edit Trigger" : "Add Trigger"}
            headerClassName="-mt-0 pt-1"
          />

          <div className="mt-6 flex-1 space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. On message received"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this trigger do?"
                rows={2}
              />
            </div>

            {/* Type */}
            {!isEditing && (
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={triggerType} onValueChange={(v) => handleTypeChange(v as TriggerTypeName)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="cron">Schedule (Cron)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Variant — shown for document/message */}
            {!isEditing && triggerType !== "cron" && (
              <div className="space-y-1.5">
                <Label>Event</Label>
                <Select value={triggerVariant} onValueChange={setTriggerVariant}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIANT_OPTIONS[triggerType].map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Schedule — shown for cron */}
            {triggerType === "cron" && (
              <div className="space-y-1.5">
                <Label>Schedule</Label>
                <Input
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="0 9 * * 1-5"
                  className="font-mono"
                />
                {schedule && (
                  <p className="text-xs text-muted-foreground">
                    {formatCronExpression(schedule)}
                  </p>
                )}
              </div>
            )}

            {/* Conditions */}
            {showConditions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Conditions <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleAddCondition}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>

                {conditions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">
                    No conditions — trigger fires on every {activeType} event.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {conditions.length >= 1 && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Match</span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={conditionLogic === "all" ? "default" : "outline"}
                            className="h-6 px-2 text-xs"
                            onClick={() => setConditionLogic("all")}
                          >
                            all
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={conditionLogic === "any" ? "default" : "outline"}
                            className="h-6 px-2 text-xs"
                            onClick={() => setConditionLogic("any")}
                          >
                            any
                          </Button>
                        </div>
                        <span className="text-muted-foreground">of these conditions</span>
                      </div>
                    )}

                    {conditions.map((condition, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <Select
                          value={condition.field}
                          onValueChange={(v) => handleConditionChange(index, "field", v)}
                        >
                          <SelectTrigger className="flex-1 min-w-0">
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldOptions.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={condition.operator}
                          onValueChange={(v) => handleConditionChange(index, "operator", v as ConditionOperator)}
                        >
                          <SelectTrigger className="w-[110px] shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATOR_OPTIONS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          className="flex-1 min-w-0"
                          value={condition.value}
                          onChange={(e) => handleConditionChange(index, "value", e.target.value)}
                          placeholder="Value"
                        />

                        <button
                          type="button"
                          className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          onClick={() => handleRemoveCondition(index)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-1.5">
              <Label>Instructions <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Natural language instructions sent to the agent when this trigger fires"
                rows={3}
              />
            </div>

            {/* Enabled */}
            <div className="flex items-center justify-between">
              <Label>Enabled</Label>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-between border-t pt-4">
            <div>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!canSave || saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Save" : "Add Trigger"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <DestructiveConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteDialogOpen(false)}
        title="Delete Trigger"
        description={`Are you sure you want to delete "${trigger?.name}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
        confirmText="Delete"
        confirmLoadingText="Deleting..."
        confirmVariant="destructive"
      />
    </>
  );
}
