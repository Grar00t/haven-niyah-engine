import { NiyahEngineV5 } from '../engine/niyah-engine-v5';
import type { LobeId, NiyahResponse } from '../engine/niyah-engine-v5';

const engine = new NiyahEngineV5();
const engineReady = engine.init();

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Request failed';
}

async function ready(): Promise<void> {
  await engineReady;
}

export async function POST_stream(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { input?: unknown; forceLobe?: LobeId; sessionId?: unknown };
    if (typeof body.input !== 'string') {
      return Response.json({ error: 'input must be a string' }, { status: 400 });
    }

    await ready();
    const response = await engine.query(body.input, body.forceLobe, typeof body.sessionId === 'string' ? body.sessionId : undefined);
    const encoder = new TextEncoder();
    const payload = [
      `data: ${JSON.stringify({
        type: 'meta',
        model: response.model,
        lobe: response.lobe,
        latencyMs: response.latencyMs,
      })}\n\n`,
      `data: ${JSON.stringify({ type: 'chunk', content: response.text })}\n\n`,
      `data: ${JSON.stringify({ type: 'done', latencyMs: response.latencyMs })}\n\n`,
      'data: [DONE]\n\n',
    ].join('');

    return new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(payload));
        controller.close();
      },
    }), {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Niyah': engine.version,
      },
    });
  } catch (error) {
    return Response.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function POST_ask(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { input?: unknown; forceLobe?: LobeId; sessionId?: unknown };
    if (typeof body.input !== 'string') {
      return Response.json({ error: 'input must be a string' }, { status: 400 });
    }

    await ready();
    const resp: NiyahResponse = await engine.query(
      body.input,
      body.forceLobe,
      typeof body.sessionId === 'string' ? body.sessionId : undefined,
    );

    return Response.json({
      content: resp.text,
      model: resp.model,
      lobe: resp.lobe,
      confidence: resp.vector.confidence,
      dialect: resp.vector.dialect,
      tone: resp.vector.tone,
      latencyMs: resp.latencyMs,
      tokensUsed: resp.tokensUsed,
      sessionId: resp.sessionId,
      vector: resp.vector,
      sovereign: resp.sovereign,
    });
  } catch (error) {
    return Response.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function GET_models(_request: Request): Promise<Response> {
  await ready();
  return Response.json({
    models: engine.availableModels,
    version: engine.version,
  });
}

export async function GET_health(_request: Request): Promise<Response> {
  await ready();
  return Response.json(engine.health());
}

export function niyahExpressRouter() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require('express');
  const router = express.Router();

  router.post('/stream', async (req: { body?: { input?: unknown; forceLobe?: LobeId; sessionId?: unknown } }, res: {
    status: (code: number) => { json: (data: unknown) => void };
    setHeader: (key: string, value: string) => void;
    write: (data: string) => void;
    end: () => void;
  }) => {
    try {
      const body = req.body ?? {};
      if (typeof body.input !== 'string') {
        res.status(400).json({ error: 'input must be a string' });
        return;
      }
      await ready();
      const response = await engine.query(body.input, body.forceLobe, typeof body.sessionId === 'string' ? body.sessionId : undefined);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ type: 'meta', model: response.model, lobe: response.lobe, latencyMs: response.latencyMs })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: response.text })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', latencyMs: response.latencyMs })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  router.post('/', async (req: { body?: { input?: unknown; forceLobe?: LobeId; sessionId?: unknown } }, res: {
    status: (code: number) => { json: (data: unknown) => void };
    json: (data: unknown) => void;
  }) => {
    try {
      const body = req.body ?? {};
      if (typeof body.input !== 'string') {
        res.status(400).json({ error: 'input must be a string' });
        return;
      }
      await ready();
      const response = await engine.query(body.input, body.forceLobe, typeof body.sessionId === 'string' ? body.sessionId : undefined);
      res.json({
        content: response.text,
        model: response.model,
        lobe: response.lobe,
        confidence: response.vector.confidence,
        dialect: response.vector.dialect,
        tone: response.vector.tone,
        latencyMs: response.latencyMs,
        tokensUsed: response.tokensUsed,
        sessionId: response.sessionId,
        vector: response.vector,
        sovereign: response.sovereign,
      });
    } catch (error) {
      res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  router.get('/models', async (_req: unknown, res: { json: (data: unknown) => void }) => {
    await ready();
    res.json({ models: engine.availableModels, version: engine.version });
  });

  router.get('/health', async (_req: unknown, res: { json: (data: unknown) => void }) => {
    await ready();
    res.json(engine.health());
  });

  return router;
}
