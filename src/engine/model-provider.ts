export type ProviderLocality = 'local' | 'cloud';

export interface ModelCapabilities {
  coding?: boolean;
  reasoning?: boolean;
  arabic?: boolean;
  vision?: boolean;
  contextWindow?: number;
  toolCalling?: boolean;
  speed?: 'slow' | 'medium' | 'fast' | null;
  memoryRequirementGb?: number | null;
}

export interface ModelDescriptor {
  name: string;
  provider: string;
  locality: ProviderLocality;
  capabilities: ModelCapabilities;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
  estimated: boolean;
}

export interface GenerateRequest {
  model: string;
  system: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export interface GenerateResult {
  text: string;
  usage: TokenUsage;
}

export type ProviderErrorClass =
  | 'timeout'
  | 'connection'
  | 'http'
  | 'malformed_response'
  | 'invalid_model'
  | 'configuration';

export class ProviderError extends Error {
  readonly kind: ProviderErrorClass;
  readonly status?: number;

  constructor(kind: ProviderErrorClass, message: string, status?: number) {
    super(message);
    this.name = 'ProviderError';
    this.kind = kind;
    this.status = status;
  }
}

export interface ModelProvider {
  readonly name: string;
  readonly locality: ProviderLocality;
  listModels(signal?: AbortSignal): Promise<ModelDescriptor[]>;
  health(signal?: AbortSignal): Promise<{ ok: boolean; latencyMs: number }>;
  generate(request: GenerateRequest): Promise<GenerateResult>;
}

export function estimateTokens(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / 4));
}

export function normalizeTokenUsage(prompt: string, completion: string, usage?: Partial<TokenUsage>): TokenUsage {
  const promptTokens = Number.isFinite(usage?.prompt) ? Math.max(0, Math.trunc(usage?.prompt ?? 0)) : estimateTokens(prompt);
  const completionTokens = Number.isFinite(usage?.completion) ? Math.max(0, Math.trunc(usage?.completion ?? 0)) : estimateTokens(completion);
  const total = Number.isFinite(usage?.total) ? Math.max(0, Math.trunc(usage?.total ?? 0)) : promptTokens + completionTokens;
  return {
    prompt: promptTokens,
    completion: completionTokens,
    total,
    estimated: usage?.estimated ?? !Number.isFinite(usage?.total),
  };
}
