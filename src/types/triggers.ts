export type TriggerTypeName = 'document' | 'message' | 'cron';
export type ConditionOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'matches';

export interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface TriggerSubscription {
  id: string;
  name: string;
  description?: string;
  triggerType: TriggerTypeName;
  triggerVariant: string;
  conditions: TriggerCondition[];
  conditionLogic: 'all' | 'any';
  taskIds: string[];
  enabled: boolean;
  instructions?: string;
  schedule?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTriggerInput {
  name: string;
  description?: string;
  triggerType: TriggerTypeName;
  triggerVariant: string;
  conditions?: TriggerCondition[];
  conditionLogic?: 'all' | 'any';
  taskIds: string[];
  enabled?: boolean;
  instructions?: string;
  schedule?: string;
}

export interface UpdateTriggerInput {
  name?: string;
  description?: string;
  conditions?: TriggerCondition[];
  conditionLogic?: 'all' | 'any';
  enabled?: boolean;
  instructions?: string;
  schedule?: string;
}

export interface ListTriggersResponse {
  subscriptions: TriggerSubscription[];
  count: number;
}

export interface TriggerTypeField {
  type: string;
  description: string;
}

export interface TriggerTypeDefinition {
  type: TriggerTypeName;
  variants: string[];
  fields: Record<string, TriggerTypeField>;
}

export interface TriggerTypesResponse {
  types: Record<TriggerTypeName, TriggerTypeDefinition>;
}
