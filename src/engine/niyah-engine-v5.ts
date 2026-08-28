/**
 * NIYAH ENGINE v5
 * Three-lobe local model orchestration.
 */

export type ModelTier = 'local' | 'cloud_fast' | 'cloud_heavy';
export type LobeId = 'sensory' | 'executive' | 'cognitive';
export type TaskType =
  | 'code_gen' | 'code_review' | 'code_fix' | 'code_explain'
  | 'chat' | 'translate' | 'summarize' | 'plan'
  | 'security_audit' | 'architecture' | 'system_command'
  | 'arabic_nlp' | 'general';
export type Dialect = 'saudi' | 'khaliji' | 'egyptian' | 'levantine' | 'msa' | 'english' | 'mixed';
export type Tone = 'commanding' | 'friendly' | 'formal' | 'angry' | 'curious' | 'playful' | 'urgent' | 'neutral';

export interface IntentVector {
  intent: TaskType;
  /** Routing confidence in [0,1], derived from matched-rule strength. Null when no signal exists. */
  confidence: number | null;
  dialect: Dialect;
  tone: Tone;
  domain: TaskType;
  roots: string[];
  flags: {
    sovereign: boolean;
    deepMode: boolean;
    urgent: boolean;
    creative: boolean;
  };
}

export interface NiyahResponse {
  text: string;
  lobe: LobeId;
  model: string;
  latencyMs: number;
  tokensUsed: number;
  sessionId: string;
  vector: IntentVector;
  sovereign: boolean;
}

interface ModelSpec {
  name: string;
  requiredRamGb: number;
  lobeAffinity: LobeId[];
  qualityScore: Partial<Record<LobeId, number>>;
  tags: string[];
}

const MODEL_SPECS: ModelSpec[] = [
  { name: 'niyah:sovereign', requiredRamGb: 5.5, lobeAffinity: ['cognitive'], qualityScore: { cognitive: 90 }, tags: ['local'] },
  { name: 'niyah:writer', requiredRamGb: 3.5, lobeAffinity: ['sensory'], qualityScore: { sensory: 95 }, tags: ['local', 'arabic', 'creative'] },
  { name: 'niyah:v4', requiredRamGb: 3.5, lobeAffinity: ['executive', 'sensory'], qualityScore: { executive: 80, sensory: 85 }, tags: ['local'] },
  { name: 'deepseek-r1:1.5b', requiredRamGb: 3.5, lobeAffinity: ['cognitive', 'executive'], qualityScore: { cognitive: 78, executive: 72 }, tags: ['local', 'reasoning'] },
  { name: 'deepseek-r1:8b', requiredRamGb: 12, lobeAffinity: ['cognitive'], qualityScore: { cognitive: 92 }, tags: ['local', 'reasoning'] },
  { name: 'llama3.2:3b', requiredRamGb: 5, lobeAffinity: ['executive'], qualityScore: { executive: 88 }, tags: ['local', 'general'] },
  { name: 'qwen2.5-coder:7b', requiredRamGb: 10, lobeAffinity: ['cognitive', 'executive'], qualityScore: { cognitive: 90, executive: 85 }, tags: ['local', 'code'] },
];

class CircuitBreaker {
  private readonly states = new Map<string, { failures: number; lastFailure: number; open: boolean }>();
  private readonly threshold = 3;
  private readonly resetTimeMs = 30_000;

  canCall(key: string): boolean {
    const state = this.states.get(key);
    if (!state || !state.open) return true;
    if (Date.now() - state.lastFailure >= this.resetTimeMs) {
      this.states.delete(key);
      return true;
    }
    return false;
  }

  success(key: string): void {
    this.states.delete(key);
  }

  failure(key: string): void {
    const state = this.states.get(key) ?? { failures: 0, lastFailure: 0, open: false };
    state.failures += 1;
    state.lastFailure = Date.now();
    state.open = state.failures >= this.threshold;
    this.states.set(key, state);
  }
}

class ResponseCache {
  private readonly cache = new Map<string, { response: NiyahResponse; expiresAt: number }>();
  private readonly ttlMs = 60_000;
  private readonly maxSize = 100;

  private key(query: string, lobe: LobeId): string {
    const source = `${lobe}:${query}`;
    let h = 2166136261;
    for (let i = 0; i < source.length; i += 1) {
      h ^= source.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `${h >>> 0}`;
  }

  get(query: string, lobe: LobeId): NiyahResponse | null {
    const cacheKey = this.key(query, lobe);
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }
    return entry.response;
  }

  set(query: string, lobe: LobeId, response: NiyahResponse): void {
    if (this.cache.size >= this.maxSize) {
      const first = this.cache.keys().next();
      if (!first.done) this.cache.delete(first.value);
    }
    this.cache.set(this.key(query, lobe), { response, expiresAt: Date.now() + this.ttlMs });
  }
}

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

function detectDialect(text: string): Dialect {
  const scores: Record<Exclude<Dialect, 'english' | 'mixed'>, number> = {
    saudi: 0,
    khaliji: 0,
    egyptian: 0,
    levantine: 0,
    msa: 0,
  };

  const rules: Array<[keyof typeof scores, RegExp]> = [
    ['saudi', /ابغى|أبغى|وش|ليش|كذا|خلاص|طيب|ذا|سوي|والله|ودي|احس|أحس|مافي|هلا/],
    ['khaliji', /شلون|اشلون|خوش|هيج|وايد|زين/],
    ['egyptian', /إيه|ايه|عايز|ازيك|يعني|كده|دلوقتي|أهو|اهو/],
    ['levantine', /كيفك|شو|هيك|بدي|عم|كتير|يسلمو|منيح/],
  ];

  for (const [dialect, rule] of rules) {
    if (rule.test(text)) scores[dialect] += 1;
  }

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (winner && winner[1] > 0) return winner[0] as Dialect;
  return ARABIC_RANGE.test(text) ? 'msa' : 'english';
}

function detectTone(text: string): Tone {
  if (/!{2,}|ضروري|عاجل|urgent|asap|الآن|الحين/i.test(text)) return 'urgent';
  if (/سوي|اكتب|نفذ|ابني|صلح|شغل|build|write|create|deploy|fix|execute/i.test(text)) return 'commanding';
  if (/\?|ليش|لماذا|كيف|وش|why|how|what/i.test(text)) return 'curious';
  if (/شكراً|شكرا|يعطيك|thanks|thank you/i.test(text)) return 'friendly';
  if (/رسمي|formal|official/i.test(text)) return 'formal';
  return 'neutral';
}

const SECURITY_TRIGGERS = [
  'vulnerability', 'exploit', 'cve', 'pentest', 'scan', 'firewall', 'telemetry', 'ثغرة', 'اختراق', 'فحص', 'حماية',
];
const COGNITIVE_TRIGGERS = [
  'analyze', 'explain', 'compare', 'design', 'why', 'how does', 'architecture', 'evaluate', 'reason', 'debug', 'review', 'audit', 'threat',
  'حلل', 'اشرح', 'قارن', 'صمم', 'لماذا', 'كيف', 'راجع',
];
const EXECUTIVE_TRIGGERS = [
  'write', 'create', 'build', 'implement', 'fix', 'deploy', 'generate', 'code', 'script', 'install', 'run', 'execute', 'compile',
  'اكتب', 'أنشئ', 'ابني', 'نفذ', 'صلح', 'شغل', 'سوي', 'ابغى',
];

function countMatches(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  return terms.reduce((count, term) => count + (lower.includes(term.toLowerCase()) ? 1 : 0), 0);
}

/**
 * Deterministic rule-based routing confidence.
 * Not a model-derived probability: it reflects how many independent keyword
 * rules agreed on the same lobe. 0 matches -> null (unknown), more matches
 * -> higher confidence, capped below 1 because keyword rules are never certain.
 */
function ruleConfidence(matchCount: number): number | null {
  if (matchCount <= 0) return null;
  return Math.min(0.5 + matchCount * 0.12, 0.95);
}

function routeToLobe(query: string, dialect: Dialect): { lobe: LobeId; task: TaskType; confidence: number | null } {
  const securityMatches = countMatches(query, SECURITY_TRIGGERS);
  if (securityMatches > 0) {
    return { lobe: 'cognitive', task: 'security_audit', confidence: ruleConfidence(securityMatches) };
  }
  const cognitiveMatches = countMatches(query, COGNITIVE_TRIGGERS);
  if (cognitiveMatches > 0) {
    return { lobe: 'cognitive', task: 'architecture', confidence: ruleConfidence(cognitiveMatches) };
  }
  const executiveMatches = countMatches(query, EXECUTIVE_TRIGGERS);
  if (executiveMatches > 0) {
    return { lobe: 'executive', task: 'code_gen', confidence: ruleConfidence(executiveMatches) };
  }
  if (dialect !== 'english') {
    // Dialect detection itself already required a matched marker rule (see detectDialect),
    // so route confidence mirrors that one signal rather than inventing a new number.
    return { lobe: 'sensory', task: 'arabic_nlp', confidence: dialect === 'msa' ? null : ruleConfidence(1) };
  }
  return { lobe: 'executive', task: 'general', confidence: null };
}

function selectModel(lobe: LobeId, availableModels: string[], maxRamGb: number): string | null {
  const available = new Set(availableModels);
  const candidates = MODEL_SPECS
    .filter((model) => available.has(model.name) && model.requiredRamGb <= maxRamGb)
    .sort((a, b) => {
      const affinity = Number(b.lobeAffinity.includes(lobe)) - Number(a.lobeAffinity.includes(lobe));
      if (affinity !== 0) return affinity;
      return (b.qualityScore[lobe] ?? 0) - (a.qualityScore[lobe] ?? 0);
    });

  return candidates[0]?.name ?? null;
}

const SYSTEM_PROMPTS: Record<LobeId, string> = {
  sensory: 'You are Niyah Sensory. Identify language and intent accurately. Preserve the user language. Do not invent facts.',
  cognitive: 'You are Niyah Cognitive. Analyze carefully, verify assumptions from available context, and produce a concise evidence-based answer. Do not fabricate.',
  executive: 'You are Niyah Executive. Execute the requested task directly. For code, return production-quality code. Do not claim execution unless execution actually occurred.',
};

export class NiyahEngineV5 {
  private readonly ollamaUrl: string;
  private models: string[] = [];
  private readonly circuit = new CircuitBreaker();
  private readonly cache = new ResponseCache();
  private readonly maxRamGb: number;
  private sessionCounter = 0;

  constructor(ollamaUrl = 'http://localhost:11434', maxRamGb = 16) {
    this.ollamaUrl = ollamaUrl.replace(/\/$/, '');
    this.maxRamGb = Number.isFinite(maxRamGb) && maxRamGb > 0 ? maxRamGb : 16;
  }

  async init(): Promise<void> {
    this.models = await this.fetchModels();
  }

  private async fetchModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return [];
      const data = await response.json() as { models?: Array<{ name?: string }> };
      return (data.models ?? []).map((model) => model.name).filter((name): name is string => Boolean(name));
    } catch {
      return [];
    }
  }

  private async generate(model: string, prompt: string, system: string): Promise<{ text: string; tokensUsed: number }> {
    if (!this.circuit.canCall(model)) throw new Error(`model temporarily unavailable: ${model}`);

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          system,
          stream: false,
        }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!response.ok) throw new Error(`ollama HTTP ${response.status}`);
      const data = await response.json() as { response?: string; eval_count?: number; prompt_eval_count?: number };
      this.circuit.success(model);
      return {
        text: (data.response ?? '').trim(),
        tokensUsed: (data.eval_count ?? 0) + (data.prompt_eval_count ?? 0),
      };
    } catch (error) {
      this.circuit.failure(model);
      throw error;
    }
  }

  async query(input: string, forceLobe?: LobeId, sessionId?: string): Promise<NiyahResponse> {
    const started = performance.now();
    const cleanInput = input.trim();
    const sid = sessionId ?? `niyah-${++this.sessionCounter}`;
    const dialect = detectDialect(cleanInput);
    const tone = detectTone(cleanInput);

    if (!cleanInput) {
      return {
        text: dialect === 'english' ? 'Input is empty.' : 'المدخل فارغ.',
        lobe: 'sensory', model: 'niyah-validator', latencyMs: Math.round(performance.now() - started), tokensUsed: 0,
        sessionId: sid,
        vector: { intent: 'general', confidence: 1, dialect, tone, domain: 'general', roots: [], flags: { sovereign: true, deepMode: false, urgent: false, creative: false } },
        sovereign: true,
      };
    }

    const routed = routeToLobe(cleanInput, dialect);
    const activeLobe = forceLobe ?? routed.lobe;
    const cached = this.cache.get(cleanInput, activeLobe);
    if (cached) return { ...cached, latencyMs: Math.round(performance.now() - started) };

    const model = selectModel(activeLobe, this.models, this.maxRamGb);
    if (!model) {
      const text = dialect === 'english'
        ? 'No compatible local model is installed.'
        : 'لا يوجد نموذج محلي متوافق مثبت حاليًا.';
      return {
        text,
        lobe: activeLobe,
        model: 'none',
        latencyMs: Math.round(performance.now() - started),
        tokensUsed: 0,
        sessionId: sid,
        vector: { intent: routed.task, confidence: routed.confidence, dialect, tone, domain: routed.task, roots: [], flags: { sovereign: true, deepMode: false, urgent: tone === 'urgent', creative: false } },
        sovereign: true,
      };
    }

    try {
      const generated = await this.generate(model, `User: ${cleanInput}\nNiyah:`, SYSTEM_PROMPTS[activeLobe]);
      const text = generated.text || (dialect === 'english' ? 'I do not have enough information.' : 'لا أعلم.');
      const response: NiyahResponse = {
        text,
        lobe: activeLobe,
        model,
        latencyMs: Math.round(performance.now() - started),
        tokensUsed: generated.tokensUsed,
        sessionId: sid,
        vector: { intent: routed.task, confidence: routed.confidence, dialect, tone, domain: routed.task, roots: [], flags: { sovereign: true, deepMode: activeLobe === 'cognitive', urgent: tone === 'urgent', creative: false } },
        sovereign: true,
      };
      this.cache.set(cleanInput, activeLobe, response);
      return response;
    } catch (error) {
      const text = dialect === 'english'
        ? `Local model error: ${error instanceof Error ? error.message : String(error)}`
        : `خطأ في النموذج المحلي: ${error instanceof Error ? error.message : String(error)}`;
      return {
        text,
        lobe: activeLobe,
        model,
        latencyMs: Math.round(performance.now() - started),
        tokensUsed: 0,
        sessionId: sid,
        vector: { intent: routed.task, confidence: routed.confidence, dialect, tone, domain: routed.task, roots: [], flags: { sovereign: true, deepMode: activeLobe === 'cognitive', urgent: tone === 'urgent', creative: false } },
        sovereign: true,
      };
    }
  }

  get availableModels(): string[] {
    return [...this.models];
  }

  get version(): string {
    return '5.0.2';
  }

  health(): { status: string; models: number; version: string } {
    return { status: this.models.length > 0 ? 'ready' : 'offline', models: this.models.length, version: this.version };
  }
}
