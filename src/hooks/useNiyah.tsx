/**
 * useNiyah — React hook for Haven IDE
 * Drop-in multi-model AI hook. Streams tokens. Traces routing.
 * نحن ورثة الخوارزمي
 */

import { useState, useCallback, useRef } from 'react';

// ── Types (inline subset — import from niyah-engine-v3 in production) ─────────

export type TaskType  = 'code_generation' | 'code_debug' | 'code_review' | 'arabic_nlp'
  | 'reasoning' | 'security_analysis' | 'blockchain_forensics' | 'summarization' | 'general';
export type ModelTier = 'local' | 'cloud_fast' | 'cloud_heavy';
export type Language  = 'ar' | 'en' | 'mixed' | 'code';

export interface NiyahState {
  content:    string;
  streaming:  boolean;
  loading:    boolean;
  error:      string | null;
  model:      string | null;
  tier:       ModelTier | null;
  confidence: number;
  latencyMs:  number;
  task:       TaskType | null;
  lang:       Language | null;
}

export interface UseNiyahOptions {
  /** /api/niyah endpoint on your Haven backend */
  apiBase?:           string;
  defaultTier?:       ModelTier;
  antiHallucination?: boolean;
  memoryKey?:         string;
  arabicFirst?:       boolean;
  onChunk?:           (chunk: string) => void;
  onComplete?:        (state: NiyahState) => void;
  onError?:           (err: Error) => void;
}

const DEFAULT_STATE: NiyahState = {
  content: '', streaming: false, loading: false, error: null,
  model: null, tier: null, confidence: 1, latencyMs: 0,
  task: null, lang: null,
};

export function useNiyah(options: UseNiyahOptions = {}) {
  const {
    apiBase           = '/api/niyah',
    defaultTier,
    antiHallucination = false,
    memoryKey,
    arabicFirst       = false,
    onChunk,
    onComplete,
    onError,
  } = options;

  const [state, setState] = useState<NiyahState>(DEFAULT_STATE);
  const abortRef = useRef<AbortController | null>(null);

  // ── Stream ────────────────────────────────────────────────────────────────

  const send = useCallback(async (
    userMessage: string,
    overrides: Partial<{
      task: TaskType;
      tier: ModelTier;
      stream: boolean;
      forceModel: string;
      temperature: number;
      maxTokens: number;
      systemSuffix: string;
    }> = {},
  ) => {
    // Cancel any previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({ ...DEFAULT_STATE, loading: true });

    const body = JSON.stringify({
      messages:         [{ role: 'user', content: userMessage }],
      tier:             overrides.tier      ?? defaultTier,
      task:             overrides.task,
      stream:           overrides.stream    ?? true,
      forceModel:       overrides.forceModel,
      temperature:      overrides.temperature,
      maxTokens:        overrides.maxTokens,
      antiHallucination,
      memoryKey,
      arabicFirst,
      systemSuffix:     overrides.systemSuffix,
    });

    try {
      const res = await fetch(`${apiBase}/stream`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal:  abortRef.current.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Niyah API ${res.status}: ${errText}`);
      }

      if (!res.body) throw new Error('No response body');

      // Streaming read
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let meta: Partial<NiyahState> = {};

      setState(s => ({ ...s, loading: false, streaming: true }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        for (const line of decoder.decode(value).split('\n')) {
          if (!line) continue;

          if (line.startsWith('data: ')) {
            const raw = line.slice(6);
            if (raw === '[DONE]') break;
            try {
              const obj = JSON.parse(raw) as {
                type: 'chunk' | 'meta' | 'done';
                content?: string;
                model?: string;
                tier?: ModelTier;
                confidence?: number;
                latencyMs?: number;
                task?: TaskType;
                lang?: Language;
              };

              if (obj.type === 'chunk' && obj.content) {
                accumulated += obj.content;
                onChunk?.(obj.content);
                setState(s => ({ ...s, content: accumulated }));
              } else if (obj.type === 'meta') {
                meta = {
                  model:      obj.model      ?? null,
                  tier:       obj.tier       ?? null,
                  confidence: obj.confidence ?? 1,
                  latencyMs:  obj.latencyMs  ?? 0,
                  task:       obj.task       ?? null,
                  lang:       obj.lang       ?? null,
                };
              }
            } catch { /* malformed SSE line */ }
          }
        }
      }

      const finalState: NiyahState = {
        ...DEFAULT_STATE,
        content:    accumulated,
        streaming:  false,
        loading:    false,
        ...meta,
      };
      setState(finalState);
      onComplete?.(finalState);

    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setState(s => ({ ...s, streaming: false, loading: false }));
        return;
      }
      const e = err instanceof Error ? err : new Error(String(err));
      setState(s => ({ ...s, error: e.message, streaming: false, loading: false }));
      onError?.(e);
    }
  }, [apiBase, defaultTier, antiHallucination, memoryKey, arabicFirst, onChunk, onComplete, onError]);

  // ── Non-streaming ─────────────────────────────────────────────────────────

  const ask = useCallback(async (
    userMessage: string,
    opts: Parameters<typeof send>[1] = {},
  ) => send(userMessage, { ...opts, stream: false }), [send]);

  // ── Shortcuts ─────────────────────────────────────────────────────────────

  const codeGen    = (desc: string)  => send(desc,    { task: 'code_generation', tier: 'local'       });
  const codeDebug  = (code: string)  => send(code,    { task: 'code_debug',      tier: 'local'       });
  const codeReview = (code: string)  => send(code,    { task: 'code_review',     tier: 'cloud_heavy' });
  const secScan    = (text: string)  => send(text,    { task: 'security_analysis', tier: 'cloud_heavy' });
  const arabicChat = (text: string)  => send(text,    { task: 'arabic_nlp',      tier: 'cloud_fast'  });
  const reason     = (text: string)  => send(text,    { task: 'reasoning',       tier: 'cloud_heavy' });

  const cancel = () => abortRef.current?.abort();
  const reset  = () => setState(DEFAULT_STATE);

  return {
    ...state,
    send,
    ask,
    codeGen,
    codeDebug,
    codeReview,
    secScan,
    arabicChat,
    reason,
    cancel,
    reset,
  };
}

// ─── NiyahPanel — drop-in UI component for Haven IDE ─────────────────────────

import type { FC, KeyboardEvent } from 'react';

interface NiyahPanelProps {
  apiBase?: string;
  placeholder?: string;
  className?: string;
}

export const NiyahPanel: FC<NiyahPanelProps> = ({
  apiBase,
  placeholder = 'Ask Niyah anything — Arabic or English…',
  className   = '',
}) => {
  const [input, setInput] = useState('');
  const niyahState = useNiyah({ apiBase });

  const handleSend = () => {
    if (!input.trim() || niyahState.loading || niyahState.streaming) return;
    niyahState.send(input.trim());
    setInput('');
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className={`niyah-panel ${className}`} style={panelStyle}>
      {/* Output */}
      <div style={outputStyle}>
        {niyahState.content
          ? <pre style={preStyle}>{niyahState.content}</pre>
          : <span style={placeholderStyle}>Niyah Engine v3 · نية</span>
        }
        {niyahState.streaming && <span style={cursorStyle}>▋</span>}
        {niyahState.error &&
          <div style={{ color: '#ff6b6b', fontSize: 12 }}>{niyahState.error}</div>
        }
      </div>

      {/* Meta bar */}
      {niyahState.model && (
        <div style={metaBarStyle}>
          <span>{niyahState.model}</span>
          <span>{niyahState.tier}</span>
          <span>⚡ {niyahState.latencyMs}ms</span>
          <span>🎯 {Math.round(niyahState.confidence * 100)}%</span>
          {niyahState.task && <span>{niyahState.task}</span>}
        </div>
      )}

      {/* Input */}
      <div style={inputRowStyle}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          rows={2}
          style={textareaStyle}
          dir="auto"
        />
        <button
          onClick={handleSend}
          disabled={niyahState.loading || niyahState.streaming || !input.trim()}
          style={btnStyle(niyahState.loading || niyahState.streaming)}
        >
          {niyahState.streaming ? '◼' : niyahState.loading ? '…' : '⬆'}
        </button>
      </div>
    </div>
  );
};

// Minimal inline styles — override with className in production
const panelStyle:       React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'monospace', background: '#0d0d14', border: '1px solid #1e1e3f', borderRadius: 8, padding: 12, color: '#e0e0ff' };
const outputStyle:      React.CSSProperties = { minHeight: 120, maxHeight: 400, overflowY: 'auto', padding: 8, background: '#060610', borderRadius: 6, fontSize: 13, lineHeight: 1.6 };
const preStyle:         React.CSSProperties = { margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
const placeholderStyle: React.CSSProperties = { color: '#444466', fontSize: 12 };
const cursorStyle:      React.CSSProperties = { animation: 'blink 1s step-end infinite', color: '#00d4ff' };
const metaBarStyle:     React.CSSProperties = { display: 'flex', gap: 12, fontSize: 10, color: '#556', padding: '2px 4px' };
const inputRowStyle:    React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'flex-end' };
const textareaStyle:    React.CSSProperties = { flex: 1, background: '#0a0a1a', border: '1px solid #1e1e3f', borderRadius: 6, color: '#e0e0ff', padding: 8, fontSize: 13, resize: 'none', fontFamily: 'monospace' };
const btnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '8px 14px', background: disabled ? '#1e1e3f' : '#00d4ff',
  color: disabled ? '#444' : '#000', border: 'none', borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 16,
  transition: 'all .15s',
});
