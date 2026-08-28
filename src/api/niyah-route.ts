/**
 * NIYAH API routes.
 *
 * Thin HTTP adapter over NiyahEngineV5. Works with Next.js App Router,
 * Vite+Express, or standalone Node (Request/Response are the Fetch API types).
 *
 * NiyahEngineV5 is Ollama-only and synchronous per request (no streaming,
 * no persistent cross-process memory). This module does not claim
 * capabilities the engine does not implement.
 */

import { NiyahEngineV5 } from '../engine/niyah-engine-v5';
import type { LobeId, NiyahResponse } from '../engine/niyah-engine-v5';

const OLLAMA_URL = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MAX_RAM_GB = Number(process.env.NIYAH_MAX_RAM_GB) || 16;

let enginePromise: Promise<NiyahEngineV5> | null = null;

async function getEngine(): Promise<NiyahEngineV5> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const instance = new NiyahEngineV5(OLLAMA_URL, MAX_RAM_GB);
      await instance.init();
      return instance;
    })();
  }
  return enginePromise;
}

interface AskRequestBody {
  input?: string;
  lobe?: LobeId;
  sessionId?: string;
}

function isValidLobe(value: unknown): value is LobeId {
  return value === 'sensory' || value === 'executive' || value === 'cognitive';
}

const MAX_INPUT_LENGTH = 8_000;

export async function POST_ask(request: Request): Promise<Response> {
  let body: AskRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const input = typeof body.input === 'string' ? body.input : '';
  if (!input.trim()) {
    return Response.json({ error: 'input is required' }, { status: 400 });
  }
  if (input.length > MAX_INPUT_LENGTH) {
    return Response.json({ error: `input exceeds ${MAX_INPUT_LENGTH} characters` }, { status: 413 });
  }

  const forceLobe = isValidLobe(body.lobe) ? body.lobe : undefined;
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 128) : undefined;

  try {
    const engine = await getEngine();
    const resp: NiyahResponse = await engine.query(input, forceLobe, sessionId);
    return Response.json({
      text: resp.text,
      lobe: resp.lobe,
      model: resp.model,
      latencyMs: resp.latencyMs,
      tokensUsed: resp.tokensUsed,
      sessionId: resp.sessionId,
      vector: resp.vector,
      sovereign: resp.sovereign,
    });
  } catch (err) {
    console.error('[NIYAH API]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET_health(_request: Request): Promise<Response> {
  try {
    const engine = await getEngine();
    const status = engine.health();
    return Response.json({
      status: status.status,
      modelsAvailable: status.models,
      engineVersion: status.version,
      provider: 'ollama',
      local: true,
    });
  } catch (err) {
    console.error('[NIYAH HEALTH]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
