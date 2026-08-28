import { type GenerateRequest, type GenerateResult, type ModelDescriptor, type ModelProvider, normalizeTokenUsage, ProviderError } from './model-provider';

interface OllamaTagModel { name?: string; details?: { parameter_size?: string; family?: string; families?: string[]; context_length?: number } }
interface OllamaTagsResponse { models?: OllamaTagModel[] }
interface OllamaGenerateResponse { response?: unknown; eval_count?: unknown; prompt_eval_count?: unknown }

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new ProviderError('configuration', 'provider URL must use http or https');
  if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && url.hostname !== '::1') throw new ProviderError('configuration', 'Ollama provider must resolve to localhost');
  return url.toString().replace(/\/$/, '');
}

function parseParameterGb(value?: string): number | null {
  const match = value?.match(/([0-9]+(?:\.[0-9]+)?)\s*([BM])/i);
  if (!match) return null;
  const amount = Number(match[1]);
  return match[2].toUpperCase() === 'M' ? amount / 1024 : amount;
}

export class OllamaProvider implements ModelProvider {
  readonly name = 'ollama';
  readonly locality = 'local' as const;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;

  constructor(baseUrl = 'http://localhost:11434', timeoutMs = 120_000, maxResponseBytes = 8 * 1024 * 1024) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.timeoutMs = Math.max(1_000, timeoutMs);
    this.maxResponseBytes = Math.max(1_024, maxResponseBytes);
  }

  async listModels(signal?: AbortSignal): Promise<ModelDescriptor[]> {
    const payload = await this.fetchJson<OllamaTagsResponse>(`${this.baseUrl}/api/tags`, signal, 10_000);
    return (payload.models ?? []).flatMap((model) => {
      const name = typeof model.name === 'string' ? model.name.trim() : '';
      if (!name) return [];
      const details = model.details ?? {};
      const family = `${details.family ?? ''} ${(details.families ?? []).join(' ')}`.toLowerCase();
      const normalizedName = name.toLowerCase();
      const parameterGb = parseParameterGb(details.parameter_size);
      return [{
        name,
        provider: this.name,
        locality: this.locality,
        capabilities: {
          coding: /coder|code|deepseek|starcoder/.test(normalizedName),
          reasoning: /reason|r1|deepseek|qwq/.test(normalizedName),
          arabic: /qwen|aya|arabic|command|llama|mistral|gemma/.test(`${family} ${normalizedName}`),
          vision: /vision|vl|llava/.test(normalizedName),
          contextWindow: Number.isFinite(details.context_length) ? details.context_length : undefined,
          toolCalling: /qwen|llama|mistral|command|gemma/.test(normalizedName),
          speed: parameterGb === null ? null : parameterGb <= 4 ? 'fast' : parameterGb <= 10 ? 'medium' : 'slow',
          memoryRequirementGb: parameterGb,
        },
      } as ModelDescriptor];
    });
  }

  async health(signal?: AbortSignal): Promise<{ ok: boolean; latencyMs: number }> {
    const started = performance.now();
    try {
      await this.fetchJson<OllamaTagsResponse>(`${this.baseUrl}/api/tags`, signal, 5_000);
      return { ok: true, latencyMs: Math.round(performance.now() - started) };
    } catch {
      return { ok: false, latencyMs: Math.round(performance.now() - started) };
    }
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    if (!request.model || request.model.includes('..') || /[\r\n]/.test(request.model)) throw new ProviderError('invalid_model', 'invalid model name');
    const messages = request.messages.map((message) => ({ role: message.role, content: message.content }));
    const payload = await this.fetchJson<OllamaGenerateResponse>(`${this.baseUrl}/api/chat`, request.signal, this.timeoutMs, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model: request.model,
        messages,
        stream: false,
        ...(request.maxOutputTokens ? { options: { num_predict: request.maxOutputTokens } } : {}),
      }),
    });
    if (typeof payload.response !== 'string') throw new ProviderError('malformed_response', 'provider returned no text response');
    const prompt = messages.map((message) => message.content).join('\n');
    const promptTokens = typeof payload.prompt_eval_count === 'number' ? payload.prompt_eval_count : undefined;
    const completionTokens = typeof payload.eval_count === 'number' ? payload.eval_count : undefined;
    return {
      text: payload.response.trim(),
      usage: normalizeTokenUsage(prompt, payload.response, {
        prompt: promptTokens,
        completion: completionTokens,
        total: typeof promptTokens === 'number' || typeof completionTokens === 'number' ? (promptTokens ?? 0) + (completionTokens ?? 0) : undefined,
        estimated: typeof promptTokens !== 'number' && typeof completionTokens !== 'number',
      }),
    };
  }

  private async fetchJson<T>(url: string, signal: AbortSignal | undefined, timeoutMs: number, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const relayAbort = () => controller.abort();
    signal?.addEventListener('abort', relayAbort, { once: true });
    try {
      let response: Response;
      try {
        response = await fetch(url, { ...init, signal: controller.signal });
      } catch {
        if (controller.signal.aborted) throw new ProviderError('timeout', 'provider request timed out');
        throw new ProviderError('connection', 'provider connection failed');
      }
      if (!response.ok) {
        if (response.status === 404 && url.endsWith('/api/chat')) throw new ProviderError('invalid_model', 'model or endpoint not found', 404);
        throw new ProviderError('http', `provider HTTP error ${response.status}`, response.status);
      }
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (!contentType.includes('application/json')) throw new ProviderError('malformed_response', 'provider returned non-JSON content');
      const contentLength = Number(response.headers.get('content-length') ?? '0');
      if (Number.isFinite(contentLength) && contentLength > this.maxResponseBytes) throw new ProviderError('malformed_response', 'provider response exceeds configured limit');
      const body = await response.text();
      if (body.length > this.maxResponseBytes) throw new ProviderError('malformed_response', 'provider response exceeds configured limit');
      try { return JSON.parse(body) as T; } catch { throw new ProviderError('malformed_response', 'provider returned malformed JSON'); }
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', relayAbort);
    }
  }
}
