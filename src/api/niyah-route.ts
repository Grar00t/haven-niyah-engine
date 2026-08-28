import { randomUUID } from 'node:crypto';
import { NiyahEngineV5 } from '../engine/niyah-engine-v5';
import type { LobeId, NiyahQueryOptions } from '../engine/niyah-engine-v5';

const MAX_BODY_BYTES = 64 * 1024;
const MAX_INPUT_LENGTH = 16_000;
const MAX_SESSION_ID_LENGTH = 128;
let enginePromise: Promise<NiyahEngineV5> | null = null;

interface AskRequestBody {
  input?: unknown;
  lobe?: unknown;
  sessionId?: unknown;
  model?: unknown;
  maxOutputTokens?: unknown;
  detailed?: unknown;
  concise?: unknown;
}

function isValidLobe(value: unknown): value is LobeId {
  return value === 'sensory' || value === 'executive' || value === 'cognitive';
}

function parseSessionId(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_SESSION_ID_LENGTH) return undefined;
  return /^[a-zA-Z0-9._:-]+$/.test(value) ? value : undefined;
}

function parseOptions(body: AskRequestBody): { sessionId?: string; options: NiyahQueryOptions } {
  const model = typeof body.model === 'string' && body.model.length <= 128 && /^[a-zA-Z0-9._:-]+$/.test(body.model) ? body.model : undefined;
  const maxOutputTokens = typeof body.maxOutputTokens === 'number' && Number.isInteger(body.maxOutputTokens) ? Math.max(32, Math.min(body.maxOutputTokens, 16_384)) : undefined;
  return {
    sessionId: parseSessionId(body.sessionId),
    options: { model, maxOutputTokens, detailed: body.detailed === true, concise: body.concise !== false },
  };
}

async function getEngine(): Promise<NiyahEngineV5> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const engine = new NiyahEngineV5();
      await engine.init();
      return engine;
    })();
  }
  return enginePromise;
}

async function parseBody(request: Request): Promise<AskRequestBody | Response> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) return Response.json({ error: 'content-type must be application/json' }, { status: 415 });
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return Response.json({ error: 'request body too large' }, { status: 413 });
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_BODY_BYTES) return Response.json({ error: 'request body too large' }, { status: 413 });
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return Response.json({ error: 'request body must be a JSON object' }, { status: 400 });
    return value as AskRequestBody;
  } catch {
    return Response.json({ error: 'request body must be valid JSON' }, { status: 400 });
  }
}

export async function POST_ask(request: Request): Promise<Response> {
  const requestId = randomUUID();
  const parsed = await parseBody(request);
  if (parsed instanceof Response) return parsed;
  const input = typeof parsed.input === 'string' ? parsed.input : '';
  if (!input.trim()) return Response.json({ error: 'input is required', requestId }, { status: 400 });
  if (input.length > MAX_INPUT_LENGTH) return Response.json({ error: `input exceeds ${MAX_INPUT_LENGTH} characters`, requestId }, { status: 413 });
  const requestedLobe = isValidLobe(parsed.lobe) ? parsed.lobe : undefined;
  const { sessionId, options } = parseOptions(parsed);
  try {
    const engine = await getEngine();
    const response = await engine.query(input, sessionId, options);
    console.info(JSON.stringify({ event: 'niyah.request', requestId, provider: response.provider, model: response.model, locality: response.locality, lobe: response.lobe, latencyMs: response.latencyMs, fallback: response.fallback, executionStatus: response.executionStatus }));
    if (requestedLobe) console.info(JSON.stringify({ event: 'niyah.lobe_request', requestId, requested: requestedLobe }));
    return Response.json({ ...response, requestId });
  } catch {
    console.error(JSON.stringify({ event: 'niyah.error', requestId }));
    return Response.json({ error: 'request could not be completed', requestId }, { status: 503 });
  }
}

export async function GET_health(_request: Request): Promise<Response> {
  try {
    const engine = await getEngine();
    return Response.json(engine.health());
  } catch {
    return Response.json({ status: 'offline', provider: 'ollama', locality: 'local', models: 0, version: '5.1.0' }, { status: 503 });
  }
}
