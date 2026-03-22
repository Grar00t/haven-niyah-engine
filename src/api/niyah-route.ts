/**
 * Haven IDE · Niyah API Route
 * POST /api/niyah/stream   — SSE streaming
 * POST /api/niyah          — non-streaming JSON
 * GET  /api/niyah/models   — list available models
 * GET  /api/niyah/health   — ollama + key status
 *
 * Works with Next.js App Router, Vite+Express, or standalone Node.
 */

import { NiyahEngine, NiyahMemory, globalMemory } from './niyah-engine-v3';
import type { NiyahRequest, NiyahResponse } from './niyah-engine-v3';

const engine = new NiyahEngine(globalMemory);

// ─── Streaming endpoint ───────────────────────────────────────────────────────

export async function handleStream(
  req: NiyahRequest,
  writer: { write: (s: string) => void; end: () => void },
): Promise<void> {
  const send = (type: string, payload: object) =>
    writer.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);

  try {
    // Emit meta first (routing decision)
    const analysis = await engine.analyse(req);
    send('meta', {
      model:     analysis.executive.selectedModel,
      tier:      analysis.executive.tier,
      task:      analysis.sensory.detectedTask,
      lang:      analysis.sensory.detectedLang,
      routing:   analysis.executive.routingReason,
    });

    // Stream tokens
    const t0 = Date.now();
    for await (const chunk of engine.streamTokens({ ...req, stream: true })) {
      send('chunk', { content: chunk });
    }

    send('done', { latencyMs: Date.now() - t0 });
    writer.write('data: [DONE]\n\n');
  } catch (err) {
    send('error', { message: String(err) });
  } finally {
    writer.end();
  }
}

// ─── Next.js App Router handler ──────────────────────────────────────────────

// pages/api/niyah/stream.ts  OR  app/api/niyah/stream/route.ts

export async function POST_stream(request: Request): Promise<Response> {
  const body = (await request.json()) as NiyahRequest;

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const w = {
    write: (s: string) => writer.write(encoder.encode(s)),
    end:   () => writer.close(),
  };

  // Run async — don't await, return the stream immediately
  handleStream(body, w).catch(err => {
    w.write(`data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`);
    w.end();
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Niyah':       'v3',
    },
  });
}

export async function POST_ask(request: Request): Promise<Response> {
  const body = (await request.json()) as NiyahRequest;
  try {
    const resp: NiyahResponse = await engine.run({ ...body, stream: false });
    return Response.json({
      content:    resp.content,
      model:      resp.model,
      tier:       resp.tier,
      confidence: resp.confidence,
      lang:       resp.lang,
      latencyMs:  resp.latencyMs,
      trace:      resp.trace,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET_models(_request: Request): Promise<Response> {
  return Response.json({
    models: engine.listModels(),
    memory: {
      keys: (globalMemory as NiyahMemory).keys(),
      size: (globalMemory as NiyahMemory).size(),
    },
  });
}

export async function GET_health(_request: Request): Promise<Response> {
  const analysis = await engine.analyse({
    messages: [{ role: 'user', content: 'ping' }],
  });
  return Response.json({
    ollamaAlive: analysis.ollamaAlive,
    anthropic:   !!process.env.ANTHROPIC_API_KEY,
    openai:      !!process.env.OPENAI_API_KEY,
    deepseek:    !!process.env.DEEPSEEK_API_KEY,
    gemini:      !!process.env.GEMINI_API_KEY,
    engine:      'Niyah v3.0',
    memory:      (globalMemory as NiyahMemory).size(),
  });
}

// ─── Express / Hono adapter ──────────────────────────────────────────────────

export function niyahExpressRouter() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require('express');
  const router  = express.Router();

  router.post('/stream', async (req: { body: NiyahRequest }, res: {
    setHeader: (k: string, v: string) => void;
    write: (s: string) => void;
    end: () => void;
  }) => {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    await handleStream(req.body, res);
  });

  router.post('/', async (req: { body: NiyahRequest }, res: { json: (d: unknown) => void }) => {
    const resp = await engine.run({ ...req.body, stream: false });
    res.json({ content: resp.content, model: resp.model, tier: resp.tier,
               confidence: resp.confidence, lang: resp.lang, trace: resp.trace });
  });

  router.get('/models', (_: unknown, res: { json: (d: unknown) => void }) => {
    res.json({ models: engine.listModels() });
  });

  router.get('/health', async (_: unknown, res: { json: (d: unknown) => void }) => {
    const a = await engine.analyse({ messages: [{ role: 'user', content: 'ping' }] });
    res.json({ ollamaAlive: a.ollamaAlive, engine: 'Niyah v3.0' });
  });

  return router;
}

// Usage:
//   import { niyahExpressRouter } from './niyah-route';
//   app.use('/api/niyah', niyahExpressRouter());
