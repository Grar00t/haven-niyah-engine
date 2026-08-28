import { useCallback, useRef, useState } from 'react';
import type { NiyahResponse, NiyahQueryOptions } from '../engine/niyah-engine-v5';

export interface NiyahState { content: string; loading: boolean; error: string | null; response: NiyahResponse | null; }
export interface UseNiyahOptions { apiBase?: string; sessionId?: string; }
const DEFAULT_STATE: NiyahState = { content: '', loading: false, error: null, response: null };

export function useNiyah(options: UseNiyahOptions = {}) {
  const { apiBase = '/api/niyah' } = options;
  const sessionIdRef = useRef(options.sessionId ?? `niyah-${Date.now()}`);
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<NiyahState>(DEFAULT_STATE);

  const ask = useCallback(async (input: string, queryOptions: NiyahQueryOptions = {}): Promise<NiyahResponse | null> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ content: '', loading: true, error: null, response: null });
    try {
      const response = await fetch(`${apiBase}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ input, sessionId: sessionIdRef.current, model: queryOptions.model, maxOutputTokens: queryOptions.maxOutputTokens, detailed: queryOptions.detailed, concise: queryOptions.concise }),
        signal: controller.signal,
      });
      const payload = await response.json() as NiyahResponse & { error?: string };
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'request failed');
      setState({ content: payload.text, loading: false, error: null, response: payload });
      return payload;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
      const message = error instanceof Error ? error.message : 'request failed';
      setState({ content: '', loading: false, error: message, response: null });
      return null;
    }
  }, [apiBase]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => setState(DEFAULT_STATE), []);

  return { ...state, ask, send: ask, cancel, reset, sessionId: sessionIdRef.current };
}
