/**
 * NiyahEngine.comprehensive.test.ts
 * ===================================
 * اختبارات شاملة لمحرك Niyah — HAVEN IDE
 *
 * NOTE on rewiring (PR #5):
 *   The previous version of this file defined a self-contained mock
 *   `NiyahEngine` class inline and tested its own mock. None of the
 *   assertions reached the production engine.
 *
 *   This file now imports from the real engine module
 *   (`../engine/niyah-engine-v3`) and asserts against its public
 *   surface: NiyahEngine, NiyahMemory, SensoryLobe, ExecutiveLobe,
 *   CognitiveLobe, MODEL_REGISTRY.
 *
 *   Where the legacy test bucket assumed APIs that the real engine
 *   does NOT expose (e.g. `tokenizeArabicRoots`, `detectTone`,
 *   `detectDomain`, `parseFlags`, `vectorise`, intent-graph
 *   visualisation), the entire `describe.skip()` block is annotated
 *   with a TODO naming the gap. **Skipped tests are not deleted** —
 *   they document the contract the engine SHOULD have so it can be
 *   un-skipped once the corresponding feature lands (Tier 2 / 3 in
 *   the upgrade plan).
 *
 *   Running counts:
 *     - Active suites      → tests that pass against real v3
 *     - Skipped suites     → see `describe.skip()` + TODO comments
 *     - Total `it` cases   → reported in the PR description
 *
 * @file NiyahEngine.comprehensive.test.ts
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ExecutiveLobe,
  MODEL_REGISTRY,
  NiyahEngine,
  NiyahMemory,
  SensoryLobe,
  globalMemory,
  type ArabicDialect,
  type Language,
  type ModelTier,
  type NiyahMessage,
  type TaskType,
} from '../engine/niyah-engine-v3.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const userMsg = (content: string): NiyahMessage => ({ role: 'user', content });

// ─── 1. SensoryLobe: language + Arabic ratio ────────────────────────────────

describe('SensoryLobe.analyse — language detection', () => {
  it('classifies pure Arabic input as ar', () => {
    const t = SensoryLobe.analyse([userMsg('السلام عليكم، كيف حالك اليوم؟')]);
    expect(t.detectedLang).toBe<Language>('ar');
    expect(t.arabicRatio).toBeGreaterThan(0.5);
  });

  it('classifies pure English input as en', () => {
    const t = SensoryLobe.analyse([userMsg('Please summarise this article in three bullet points.')]);
    expect(t.detectedLang).toBe<Language>('en');
    expect(t.arabicRatio).toBeLessThan(0.1);
  });

  it('classifies mixed Arabic+English content as mixed', () => {
    const t = SensoryLobe.analyse([userMsg('اشرح لي concept of recursion في البرمجة')]);
    expect(['ar', 'mixed']).toContain(t.detectedLang);
  });

  it('produces a non-negative intentScore in [0, 1]', () => {
    const t = SensoryLobe.analyse([userMsg('What is 2 + 2?')]);
    expect(t.intentScore).toBeGreaterThanOrEqual(0);
    expect(t.intentScore).toBeLessThanOrEqual(1);
  });

  it('estimates inputTokens roughly as chars/4', () => {
    const text = 'a'.repeat(400);
    const t = SensoryLobe.analyse([userMsg(text)]);
    expect(t.inputTokens).toBe(100);
  });

  it.skip('ignores non-user roles when computing language ratios', () => {
    // TODO: production bug per audit §2.2 — SensoryLobe.analyse only
    // concatenates user messages, so an assistant turn carrying Arabic
    // text silently degrades dialect detection in multi-turn sessions.
    // Un-skip when the analyser includes assistant turns.
    const t = SensoryLobe.analyse([
      { role: 'user',      content: 'hello' },
      { role: 'assistant', content: 'مرحبا، كيف يمكنني مساعدتك اليوم؟' },
      { role: 'user',      content: 'thanks' },
    ]);
    expect(t.detectedLang).toBe<Language>('mixed');
  });
});

// ─── 2. SensoryLobe: dialect detection ──────────────────────────────────────

describe('SensoryLobe.analyse — Arabic dialect detection', () => {
  it('detects Gulf markers as gulf dialect', () => {
    const t = SensoryLobe.analyse([userMsg('وش رايك في هذا الأمر، ابغى مساعدة')]);
    expect(t.detectedDialect).toBe<ArabicDialect>('gulf');
  });

  it('detects Levantine markers as levantine dialect', () => {
    const t = SensoryLobe.analyse([userMsg('شو هيك بدي اسألك سؤال')]);
    expect(t.detectedDialect).toBe<ArabicDialect>('levantine');
  });

  it('detects Egyptian markers as egyptian dialect', () => {
    const t = SensoryLobe.analyse([userMsg('ازيك يا صاحبي، عايز اعرف ايه الموضوع')]);
    expect(t.detectedDialect).toBe<ArabicDialect>('egyptian');
  });

  it('falls back to msa for neutral Arabic without strong markers', () => {
    const t = SensoryLobe.analyse([userMsg('السلام عليكم ورحمة الله وبركاته')]);
    expect(t.detectedDialect).toBe<ArabicDialect>('msa');
  });

  it('returns "none" for non-Arabic text', () => {
    const t = SensoryLobe.analyse([userMsg('hello world')]);
    expect(t.detectedDialect).toBe<ArabicDialect>('none');
  });
});

// ─── 3. SensoryLobe: task detection ──────────────────────────────────────────

describe('SensoryLobe.analyse — task detection', () => {
  it('detects code_generation from "write a function"', () => {
    const t = SensoryLobe.analyse([userMsg('write a function that returns the nth Fibonacci number')]);
    expect(t.detectedTask).toBe<TaskType>('code_generation');
  });

  it('detects code_review on review-style prompts', () => {
    const t = SensoryLobe.analyse([userMsg('review this code please and tell me what is wrong')]);
    expect(t.detectedTask).toBe<TaskType>('code_review');
  });

  it('detects summarization for explicit summary requests', () => {
    const t = SensoryLobe.analyse([userMsg('summarize this paragraph in two sentences')]);
    expect(t.detectedTask).toBe<TaskType>('summarization');
  });

  it('detects security_analysis for security-domain prompts', () => {
    const t = SensoryLobe.analyse([userMsg('reverse engineer this malware sample')]);
    expect(t.detectedTask).toBe<TaskType>('security_analysis');
  });

  it.skip('routes "explain how to write a function" to code_explain not code_generation', () => {
    // TODO: production bug per audit §2.2 — task detection short-circuits
    // on `write.*function` before reaching the explain branch, so prompts
    // that *ask for an explanation of writing* are mis-classified as
    // code_generation. Un-skip when the order is fixed.
    const t = SensoryLobe.analyse([userMsg('explain how to write a function in TypeScript')]);
    expect(t.detectedTask).toBe<TaskType>('code_explain');
  });
});

// ─── 4. ExecutiveLobe: routing ───────────────────────────────────────────────

describe('ExecutiveLobe.route — model selection', () => {
  it('picks local tier when Ollama is alive and task is light', () => {
    const sensory = SensoryLobe.analyse([userMsg('hello')]);
    const exec = ExecutiveLobe.route({ messages: [userMsg('hello')] }, sensory, true);
    expect(exec.tier).toBe<ModelTier>('local');
  });

  it('escalates to cloud_heavy for security_analysis even with Ollama alive', () => {
    const sensory = SensoryLobe.analyse([userMsg('reverse engineer this malware')]);
    const exec = ExecutiveLobe.route(
      { messages: [userMsg('reverse engineer this malware')] },
      sensory,
      true,
    );
    expect(exec.tier).toBe<ModelTier>('cloud_heavy');
  });

  it('returns a non-empty fallbackChain in cloud tiers', () => {
    const sensory = SensoryLobe.analyse([userMsg('reverse engineer this malware')]);
    const exec = ExecutiveLobe.route(
      { messages: [userMsg('reverse engineer this malware')] },
      sensory,
      false,
    );
    expect(exec.fallbackChain.length).toBeGreaterThan(0);
  });

  it('honours forceModel override regardless of routing', () => {
    const sensory = SensoryLobe.analyse([userMsg('hello')]);
    const exec = ExecutiveLobe.route(
      { messages: [userMsg('hello')], forceModel: 'gpt-4o' },
      sensory,
      true,
    );
    expect(exec.selectedModel).toBe('gpt-4o');
  });
});

// ─── 5. NiyahEngine: model registry introspection ────────────────────────────

describe('NiyahEngine.listModels', () => {
  const engine = new NiyahEngine();

  it('returns the full registry by default', () => {
    expect(engine.listModels().length).toBe(MODEL_REGISTRY.length);
  });

  it('filters by tier', () => {
    const local = engine.listModels('local');
    expect(local.every((m) => m.tier === 'local')).toBe(true);
    expect(local.length).toBeGreaterThan(0);
  });

  it('every model has an id and a provider', () => {
    for (const m of engine.listModels()) {
      expect(typeof m.id).toBe('string');
      expect(m.id.length).toBeGreaterThan(0);
      expect(['ollama', 'anthropic', 'openai', 'deepseek', 'gemini']).toContain(m.provider);
    }
  });
});

// ─── 6. NiyahMemory: per-session isolation ───────────────────────────────────

describe('NiyahMemory', () => {
  let mem: NiyahMemory;

  beforeEach(() => {
    mem = new NiyahMemory();
  });

  it('round-trips a key + messages', () => {
    mem.set('s1', [userMsg('hi')]);
    const e = mem.get('s1');
    expect(e?.messages[0]?.content).toBe('hi');
  });

  it('keeps separate session keys isolated', () => {
    mem.set('s1', [userMsg('alice secret')]);
    mem.set('s2', [userMsg('bob secret')]);
    expect(mem.get('s1')?.messages[0]?.content).toBe('alice secret');
    expect(mem.get('s2')?.messages[0]?.content).toBe('bob secret');
  });

  it('two NiyahMemory instances do not share state', () => {
    const a = new NiyahMemory();
    const b = new NiyahMemory();
    a.set('k', [userMsg('a')]);
    expect(b.get('k')).toBeUndefined();
  });

  it('delete removes the entry', () => {
    mem.set('s1', [userMsg('hi')]);
    mem.delete('s1');
    expect(mem.get('s1')).toBeUndefined();
  });

  it('size and keys reflect the current store', () => {
    mem.set('s1', [userMsg('a')]);
    mem.set('s2', [userMsg('b')]);
    expect(mem.size()).toBe(2);
    expect(new Set(mem.keys())).toEqual(new Set(['s1', 's2']));
  });

  it('hits counter increments on get', () => {
    mem.set('s1', [userMsg('a')]);
    mem.get('s1');
    mem.get('s1');
    expect(mem.get('s1')?.hits).toBeGreaterThanOrEqual(2);
  });

  it.skip('compresses by emitting a summary back into the prompt context', () => {
    // TODO: production bug per audit §2.2 — NiyahMemory.getCompressed
    // drops oldest user messages but never injects `summary` back, even
    // though setSummary stores one. Un-skip when summary is consumed.
    mem.setSummary('s1', 'previous discussion was about X');
    mem.set('s1', [userMsg('y'.repeat(50_000))]);
    const compressed = mem.getCompressed('s1', 1_000);
    expect(JSON.stringify(compressed)).toContain('previous discussion was about X');
  });
});

// ─── 7. NiyahEngine.analyse — end-to-end routing without inference ───────────

describe('NiyahEngine.analyse', () => {
  const engine = new NiyahEngine(new NiyahMemory());

  it('returns sensory + executive trace + ollamaAlive boolean', async () => {
    const a = await engine.analyse({ messages: [userMsg('hello world')] });
    expect(a.sensory).toBeTruthy();
    expect(a.executive).toBeTruthy();
    expect(typeof a.ollamaAlive).toBe('boolean');
  });

  it('produces a routing reason string', async () => {
    const a = await engine.analyse({ messages: [userMsg('hello world')] });
    expect(typeof a.executive.routingReason).toBe('string');
    expect(a.executive.routingReason.length).toBeGreaterThan(0);
  });
});

// ─── 8. globalMemory singleton ───────────────────────────────────────────────

describe('globalMemory singleton', () => {
  afterEach(() => {
    for (const k of globalMemory.keys()) globalMemory.delete(k);
  });

  it('is a NiyahMemory instance', () => {
    expect(globalMemory).toBeInstanceOf(NiyahMemory);
  });

  it('persists across calls within the same process', () => {
    globalMemory.set('shared', [userMsg('persist')]);
    expect(globalMemory.get('shared')?.messages[0]?.content).toBe('persist');
  });
});

// ─── SKIPPED SUITES ─────────────────────────────────────────────────────────
//
// The following describe.skip() blocks document features the legacy
// inline-mock test file asserted but the production engine does not yet
// expose. They are retained, NOT deleted, so they can be flipped on as
// the engine catches up. See the upgrade plan §5 for tier numbering.
//
// ────────────────────────────────────────────────────────────────────────────

describe.skip('Arabic root tokenization', () => {
  // TODO: T2.5 — the engine has no `tokenizeArabicRoots` method.
  // `src/nlp/arabic-roots-expanded.ts` exists with 2,976 forms but
  // is not consumed by SensoryLobe. Wire `RootMatcher` into the
  // sensory analyser, then un-skip these tests.
  it('extracts the كتب root from كاتب / مكتوب / كتابة', () => {
    /* deferred */
  });
  it('extracts the قرأ root from قارئ / مقروء / قراءة', () => {
    /* deferred */
  });
});

describe.skip('Tone detection', () => {
  // TODO: T3 — engine has no `detectTone` API. The legacy mock had a
  // 7-tone classifier (commanding / friendly / formal / angry /
  // curious / playful / urgent). If this is a real product
  // requirement, expose it on SensoryLobe and rewire these tests.
  it('detects commanding tone', () => {
    /* deferred */
  });
  it('detects friendly tone', () => {
    /* deferred */
  });
});

describe.skip('Domain detection', () => {
  // TODO: T3 — engine has TaskType, not Domain. The legacy mock had
  // an 8-class domain classifier (code/content/security/infrastructure/
  // creative/business/education/datascience). Decide whether to
  // collapse Domain into TaskType or add a parallel surface.
  it('classifies code domain', () => {
    /* deferred */
  });
});

describe.skip('Flag parsing', () => {
  // TODO: not implemented — engine has no `parseFlags`. The legacy
  // mock parsed `--flag value` from prompt strings. If this is desired,
  // implement on SensoryLobe and un-skip.
  it('parses --tier=cloud_heavy from input', () => {
    /* deferred */
  });
});

describe.skip('Vectorisation', () => {
  // TODO: not implemented — engine has no `vectorise`. The legacy
  // mock produced a fake numerical vector + magnitude. A real
  // embedding integration is plan §5 Tier 3 (currently no embeddings).
  it('produces a normalised vector', () => {
    /* deferred */
  });
});

describe.skip('Three-lobe processing (parallel evaluation)', () => {
  // TODO: T2.2 — engine runs the three lobes sequentially inside
  // NiyahEngine.run, not as pluggable Lobe<I,O> implementations.
  // The legacy mock asserted parallel lobe results with scores; that
  // is the target architecture once the lobe interface lands.
  it('produces results for sensory, executive, cognitive', () => {
    /* deferred */
  });
});

describe.skip('Intent graph + clustering', () => {
  // TODO: T2.6 — `EnhancedIntentGraph` lives in
  // `src/engine/CacheAndGraphImprovements.ts` but is NOT wired into
  // the engine. Wire `recordIntent()` after each run() and expose
  // a snapshot endpoint, then un-skip.
  it('records nodes and edges across sessions', () => {
    /* deferred */
  });
  it('computes clusters from session history', () => {
    /* deferred */
  });
});

describe.skip('Confidence calibration on real prompts', () => {
  // TODO: production bug per audit §2.2 — the
  // `\b(20[2-9]\d|19\d\d)\b` heuristic in CognitiveLobe penalises
  // every modern year reference, so legitimate answers discussing
  // dates 2024-2029 hit the false-positive threshold. Replace with
  // a calibrated classifier, then un-skip.
  it('does not penalise responses that mention recent years', () => {
    /* deferred */
  });
});

describe.skip('Streaming for OpenAI / DeepSeek / Gemini', () => {
  // TODO: T3.3 — engine throws "Streaming not supported for ${provider}"
  // for any provider other than Ollama and Anthropic. Implement
  // streamOpenAI / streamDeepSeek / streamGemini, then un-skip.
  it('streams tokens from gpt-4o', () => {
    /* deferred */
  });
});
