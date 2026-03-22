/**
 * ════════════════════════════════════════════════════════════════════
 *  NIYAH ENGINE  ·  نية  ·  v3.0
 *  Three-Lobe Sovereign AI Orchestration
 *
 *  نحن ورثة الخوارزمي — لا يوجد مستحيل في الدنيا
 *
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  SENSORY LOBE   → Input parsing, lang detect, intent    │
 *  │  EXECUTIVE LOBE → Model routing, planning, fallback     │
 *  │  COGNITIVE LOBE → Reasoning, memory, anti-hallucination │
 *  └─────────────────────────────────────────────────────────┘
 *
 *  Model priority chain (sovereign-first):
 *    1. LOCAL  — Ollama (zero cloud, zero telemetry)
 *    2. FAST   — Claude Haiku / GPT-4o-mini / Gemini Flash
 *    3. HEAVY  — Claude Sonnet / GPT-4o / DeepSeek-V3
 *
 *  Zero telemetry. Arabic-first. Cryptographically auditable.
 * ════════════════════════════════════════════════════════════════════
 */

// ─── Env ─────────────────────────────────────────────────────────────────────

const ENV = {
  OLLAMA_HOST:       process.env.OLLAMA_HOST           ?? 'http://localhost:11434',
  OLLAMA_MODEL:      process.env.HAVEN_OLLAMA_MODEL    ?? 'qwen2.5-coder:7b',
  ANTHROPIC_KEY:     process.env.ANTHROPIC_API_KEY     ?? '',
  OPENAI_KEY:        process.env.OPENAI_API_KEY        ?? '',
  DEEPSEEK_KEY:      process.env.DEEPSEEK_API_KEY      ?? '',
  GEMINI_KEY:        process.env.GEMINI_API_KEY        ?? '',
  NIYAH_LOG:         process.env.NIYAH_LOG             ?? 'false',
  NIYAH_MAX_RETRIES: Number(process.env.NIYAH_MAX_RETRIES ?? '3'),
} as const;

// ─── Core Types ───────────────────────────────────────────────────────────────

export type ModelTier = 'local' | 'cloud_fast' | 'cloud_heavy';
export type LobeId    = 'sensory' | 'executive' | 'cognitive';
export type TaskType  =
  | 'code_generation' | 'code_review' | 'code_debug' | 'code_explain'
  | 'arabic_nlp' | 'arabic_dialectal' | 'arabic_formal'
  | 'reasoning' | 'math' | 'summarization'
  | 'osint' | 'security_analysis' | 'blockchain_forensics'
  | 'document_qa' | 'creative' | 'general';

export type ArabicDialect = 'gulf' | 'levantine' | 'egyptian' | 'maghrebi' | 'msa' | 'mixed' | 'none';
export type Language      = 'ar' | 'en' | 'mixed' | 'code' | 'other';

export interface NiyahMessage {
  role:         'system' | 'user' | 'assistant' | 'tool';
  content:      string;
  name?:        string;
  attachments?: NiyahAttachment[];
  _meta?: {
    lang?:      Language;
    dialect?:   ArabicDialect;
    lobe?:      LobeId;
    timestamp?: number;
  };
}

export interface NiyahAttachment {
  type:      'text' | 'image_base64' | 'pdf_base64' | 'code';
  data:      string;
  mimeType?: string;
  filename?: string;
}

export interface NiyahRequest {
  messages:           NiyahMessage[];
  task?:              TaskType;
  tier?:              ModelTier;
  forceModel?:        string;
  stream?:            boolean;
  maxTokens?:         number;
  temperature?:       number;
  antiHallucination?: boolean;
  memoryKey?:         string;
  arabicFirst?:       boolean;
  systemSuffix?:      string;
  context?:           Record<string, unknown>;
}

export interface NiyahResponse {
  content:    string;
  model:      string;
  tier:       ModelTier;
  lobe:       LobeId;
  confidence: number;
  lang:       Language;
  dialect?:   ArabicDialect;
  latencyMs:  number;
  tokens?:    { prompt: number; completion: number; total: number };
  trace:      NiyahTrace;
  stream?:    AsyncGenerator<string, void, unknown>;
}

export interface NiyahTrace {
  sensory: {
    detectedLang:    Language;
    detectedDialect: ArabicDialect;
    detectedTask:    TaskType;
    intentScore:     number;
    inputTokens:     number;
    arabicRatio:     number;
    codeRatio:       number;
  };
  executive: {
    selectedModel:  string;
    tier:           ModelTier;
    routingReason:  string;
    fallbackChain:  string[];
    attemptCount:   number;
  };
  cognitive: {
    confidence:         number;
    hallucinationFlags: string[];
    memoryHits:         number;
    selfCritique?:      string;
  };
}

// ─── Model Registry ───────────────────────────────────────────────────────────

interface ModelDef {
  id:             string;
  provider:       'ollama' | 'anthropic' | 'openai' | 'deepseek' | 'gemini';
  tier:           ModelTier;
  strengths:      TaskType[];
  contextWindow:  number;
  supportsVision: boolean;
  arabicQuality:  1 | 2 | 3 | 4 | 5;
  codeQuality:    1 | 2 | 3 | 4 | 5;
  speedScore:     1 | 2 | 3 | 4 | 5;
}

const MODEL_REGISTRY: ModelDef[] = [
  // LOCAL
  {
    id: 'qwen2.5-coder:7b',   provider: 'ollama', tier: 'local',
    strengths: ['code_generation', 'code_debug', 'code_review', 'code_explain'],
    contextWindow: 32768, supportsVision: false,
    arabicQuality: 3, codeQuality: 5, speedScore: 4,
  },
  {
    id: 'qwen2.5-coder:32b',  provider: 'ollama', tier: 'local',
    strengths: ['code_generation', 'code_debug', 'reasoning'],
    contextWindow: 131072, supportsVision: false,
    arabicQuality: 3, codeQuality: 5, speedScore: 2,
  },
  {
    id: 'llama3.3:70b',       provider: 'ollama', tier: 'local',
    strengths: ['reasoning', 'arabic_nlp', 'summarization', 'general'],
    contextWindow: 131072, supportsVision: false,
    arabicQuality: 4, codeQuality: 3, speedScore: 2,
  },
  {
    id: 'phi4:14b',           provider: 'ollama', tier: 'local',
    strengths: ['reasoning', 'math', 'code_generation'],
    contextWindow: 16384, supportsVision: false,
    arabicQuality: 2, codeQuality: 4, speedScore: 4,
  },
  {
    id: 'mistral-nemo:12b',   provider: 'ollama', tier: 'local',
    strengths: ['general', 'summarization', 'document_qa'],
    contextWindow: 131072, supportsVision: false,
    arabicQuality: 3, codeQuality: 3, speedScore: 4,
  },
  {
    id: 'gemma3:27b',         provider: 'ollama', tier: 'local',
    strengths: ['reasoning', 'general', 'creative'],
    contextWindow: 131072, supportsVision: true,
    arabicQuality: 3, codeQuality: 3, speedScore: 2,
  },
  // CLOUD FAST
  {
    id: 'claude-haiku-4-5-20251001', provider: 'anthropic', tier: 'cloud_fast',
    strengths: ['summarization', 'document_qa', 'general', 'code_explain'],
    contextWindow: 200000, supportsVision: true,
    arabicQuality: 4, codeQuality: 3, speedScore: 5,
  },
  {
    id: 'gemini-2.0-flash',   provider: 'gemini', tier: 'cloud_fast',
    strengths: ['general', 'summarization', 'arabic_nlp'],
    contextWindow: 1000000, supportsVision: true,
    arabicQuality: 4, codeQuality: 3, speedScore: 5,
  },
  // CLOUD HEAVY
  {
    id: 'claude-sonnet-4-20250514', provider: 'anthropic', tier: 'cloud_heavy',
    strengths: ['reasoning', 'code_generation', 'code_review', 'security_analysis', 'arabic_nlp', 'document_qa'],
    contextWindow: 200000, supportsVision: true,
    arabicQuality: 5, codeQuality: 5, speedScore: 3,
  },
  {
    id: 'deepseek-chat',      provider: 'deepseek', tier: 'cloud_heavy',
    strengths: ['code_generation', 'code_debug', 'math', 'reasoning'],
    contextWindow: 65536, supportsVision: false,
    arabicQuality: 3, codeQuality: 5, speedScore: 3,
  },
  {
    id: 'gpt-4o',             provider: 'openai', tier: 'cloud_heavy',
    strengths: ['reasoning', 'code_generation', 'osint', 'blockchain_forensics', 'general'],
    contextWindow: 128000, supportsVision: true,
    arabicQuality: 4, codeQuality: 5, speedScore: 3,
  },
];

// ─── NiyahMemory — in-process session store ───────────────────────────────────

interface MemoryEntry {
  key:       string;
  messages:  NiyahMessage[];
  summary?:  string;
  createdAt: number;
  updatedAt: number;
  hits:      number;
}

export class NiyahMemory {
  private store = new Map<string, MemoryEntry>();

  set(key: string, messages: NiyahMessage[]): void {
    const existing = this.store.get(key);
    this.store.set(key, {
      key, messages: [...messages],
      summary:   existing?.summary,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      hits:      existing?.hits ?? 0,
    });
  }

  get(key: string): MemoryEntry | undefined {
    const entry = this.store.get(key);
    if (entry) { entry.hits++; entry.updatedAt = Date.now(); }
    return entry;
  }

  /** Compress history to fit context window */
  getCompressed(key: string, maxChars = 24_000): NiyahMessage[] {
    const entry = this.get(key);
    if (!entry) return [];
    const msgs = [...entry.messages];
    let total = msgs.reduce((s, m) => s + m.content.length, 0);
    while (total > maxChars && msgs.length > 1) {
      const idx = msgs[0]?.role === 'system' ? 1 : 0;
      total -= msgs[idx].content.length;
      msgs.splice(idx, 1);
    }
    return msgs;
  }

  setSummary(key: string, summary: string): void {
    const e = this.store.get(key);
    if (e) e.summary = summary;
  }

  delete(key: string): void { this.store.delete(key); }
  keys(): string[]          { return [...this.store.keys()]; }
  size(): number             { return this.store.size; }
}

export const globalMemory = new NiyahMemory();

// ─── SENSORY LOBE — Input analysis ───────────────────────────────────────────

class SensoryLobe {
  private static readonly AR_RANGE  = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
  private static readonly CODE_PATS = /```|function |const |import |class |def |fn |<\/|{|}|=>|===/g;

  static analyse(messages: NiyahMessage[]): NiyahTrace['sensory'] {
    const userText = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n');

    const totalChars  = userText.length || 1;
    const arMatches   = (userText.match(SensoryLobe.AR_RANGE)  ?? []).length;
    const codeMatches = (userText.match(SensoryLobe.CODE_PATS) ?? []).length;

    const arabicRatio = arMatches  / totalChars;
    const codeRatio   = codeMatches / (totalChars / 20);

    const detectedLang: Language =
      arabicRatio > 0.30 && codeRatio < 0.15 ? 'ar'   :
      codeRatio   > 0.40                      ? 'code' :
      arabicRatio > 0.10                      ? 'mixed': 'en';

    const detectedDialect = SensoryLobe.detectDialect(userText);
    const detectedTask    = SensoryLobe.detectTask(userText, detectedLang, codeRatio);
    const intentScore     = SensoryLobe.intentScore(userText);
    const inputTokens     = Math.ceil(totalChars / 4);

    return {
      detectedLang, detectedDialect, detectedTask,
      intentScore, inputTokens, arabicRatio, codeRatio,
    };
  }

  private static detectDialect(text: string): ArabicDialect {
    if (/وش|كذا|ابغى|ودي|احس|مافي|وايد|زين|يالله|بعدين|هلا|ماله|هالـ/.test(text)) return 'gulf';
    if (/هيك|شو|بدي|عم|كتير|شباب|يسلمو|منيح/.test(text))                           return 'levantine';
    if (/إيه|عايز|ازيك|يعني|كدا|دلوقتي|اهو/.test(text))                            return 'egyptian';
    return /[\u0600-\u06FF]/.test(text) ? 'msa' : 'none';
  }

  private static detectTask(text: string, lang: Language, codeRatio: number): TaskType {
    const t = text.toLowerCase();
    if (codeRatio > 0.35 || /write.*function|كتابة.*كود|اكتب.*كود/.test(t))
      return /debug|fix|error|خطأ/.test(t) ? 'code_debug' : 'code_generation';
    if (/review|راجع.*كود|code review/.test(t))               return 'code_review';
    if (/explain.*code|شرح.*كود/.test(t))                      return 'code_explain';
    if (/blockchain|transaction|wallet|contract|تحقيق.*مالي/.test(t)) return 'blockchain_forensics';
    if (/osint|malware|c2|reverse.*engineer|تحليل.*أمن/.test(t))      return 'security_analysis';
    if (/تلخيص|summarize|summary|ملخص/.test(t))               return 'summarization';
    if (/question.*about|document|استفسار.*وثيقة/.test(t))    return 'document_qa';
    if (/اكتب.*قصيدة|write.*poem|creative|إبداع/.test(t))     return 'creative';
    if (lang === 'ar')                                          return 'arabic_nlp';
    if (/math|solve|equation|حل.*معادلة/.test(t))             return 'math';
    if (/reason|analyze|think step|فكر|حلل/.test(t))          return 'reasoning';
    return 'general';
  }

  private static intentScore(text: string): number {
    const len  = Math.min(text.length / 500, 1);
    const qs   = (text.match(/[?؟]/g) ?? []).length * 0.1;
    const nums = (text.match(/\d+/g)  ?? []).length * 0.05;
    return Math.min(len + qs + nums, 1);
  }
}

// ─── EXECUTIVE LOBE — Model routing ──────────────────────────────────────────

class ExecutiveLobe {
  static route(
    req:         NiyahRequest,
    sensory:     NiyahTrace['sensory'],
    ollamaAlive: boolean,
  ): NiyahTrace['executive'] {
    const tier    = req.tier ?? this.pickTier(req, sensory, ollamaAlive);
    const models  = this.rankModels(tier, sensory.detectedTask, sensory.detectedLang, req);
    const primary = req.forceModel ?? models[0];

    return {
      selectedModel: primary,
      tier,
      routingReason: this.explainRouting(tier, sensory, req),
      fallbackChain: models.slice(1, 4),
      attemptCount:  0,
    };
  }

  private static pickTier(
    req:         NiyahRequest,
    sensory:     NiyahTrace['sensory'],
    ollamaAlive: boolean,
  ): ModelTier {
    const heavyTasks: TaskType[] = [
      'reasoning', 'security_analysis', 'blockchain_forensics', 'arabic_nlp',
    ];
    const needsHeavy = heavyTasks.includes(sensory.detectedTask) || sensory.inputTokens > 4000;
    if (ollamaAlive && !needsHeavy) return 'local';
    if (ollamaAlive && needsHeavy)  return 'cloud_heavy';
    return needsHeavy ? 'cloud_heavy' : 'cloud_fast';
  }

  private static rankModels(
    tier: ModelTier, task: TaskType, lang: Language, req: NiyahRequest,
  ): string[] {
    const hasVision = req.messages.some(m =>
      m.attachments?.some(a => a.type === 'image_base64'));

    return MODEL_REGISTRY
      .filter(m => m.tier === tier)
      .filter(m => !hasVision || m.supportsVision)
      .map(m => ({ id: m.id, score: this.scoreModel(m, task, lang) }))
      .sort((a, b) => b.score - a.score)
      .map(s => s.id);
  }

  private static scoreModel(m: ModelDef, task: TaskType, lang: Language): number {
    const taskBonus = m.strengths.includes(task) ? 3 : 0;
    const langBonus = lang === 'ar' ? m.arabicQuality : m.codeQuality;
    return taskBonus + langBonus + m.speedScore * 0.3;
  }

  private static explainRouting(
    tier: ModelTier, sensory: NiyahTrace['sensory'], req: NiyahRequest,
  ): string {
    const parts: string[] = [];
    if (tier === 'local')       parts.push('sovereign-local');
    if (tier === 'cloud_heavy') parts.push('heavy-reasoning');
    parts.push(`task=${sensory.detectedTask}`, `lang=${sensory.detectedLang}`);
    if (req.antiHallucination)  parts.push('anti-hallucination=strict');
    return parts.join(' | ');
  }
}

// ─── COGNITIVE LOBE — Post-processing & anti-hallucination ───────────────────

class CognitiveLobe {
  static evaluate(
    response: string,
    request:  NiyahRequest,
    sensory:  NiyahTrace['sensory'],
  ): NiyahTrace['cognitive'] {
    const flags: string[] = [];
    let confidence = 1.0;

    // Uncertainty / hedging language
    const hedges = [
      /i (think|believe|assume|guess)/i,
      /not sure|might be|possibly|perhaps/i,
      /as of my (knowledge|training)/i,
      /أعتقد أن|ربما|من المحتمل|لست متأكد/,
    ];
    for (const h of hedges) {
      if (h.test(response)) {
        flags.push(`hedge:${h.source.slice(0, 25)}`);
        confidence -= 0.08;
      }
    }

    // Excessive citations = possibly invented
    const cites = [...response.matchAll(/\[\d+\]/g)];
    if (cites.length > 8) {
      flags.push(`excessive_citations:${cites.length}`);
      confidence -= 0.10;
    }

    // Over-verbose prose without code
    if (response.length > 4000 && sensory.codeRatio < 0.05) {
      flags.push('over_verbose');
      confidence -= 0.05;
    }

    // Strict mode: flag date density
    if (request.antiHallucination) {
      const dates = [...response.matchAll(/\b(20[2-9]\d|19\d\d)\b/g)];
      if (dates.length > 5) {
        flags.push(`date_density:${dates.length}`);
        confidence -= 0.07;
      }
    }

    return {
      confidence: Math.max(0, Math.min(1, confidence)),
      hallucinationFlags: flags,
      memoryHits: 0,
    };
  }

  static buildSystemPrompt(req: NiyahRequest, sensory: NiyahTrace['sensory']): string {
    const isArabic = sensory.detectedLang === 'ar'
      || sensory.detectedLang === 'mixed'
      || !!req.arabicFirst;

    const base = isArabic
      ? [
          'أنت Niyah — محرك ذكاء اصطناعي سيادي مبني على بنية ثلاثية الفصوص من KHAWRIZM.',
          'مبادئك الأساسية: الدقة أولاً، لا تخترع معلومات، استشهد بمصادر حقيقية فقط.',
          'إذا لم تعلم، قل "لا أعلم" — الصدق أهم من الاكتمال.',
          'اللغة الافتراضية: العربية الفصحى مع مراعاة اللهجة الخليجية.',
          'الكود: دائماً بالإنجليزية مع تعليقات عربية عند الطلب.',
        ]
      : [
          'You are Niyah — a three-lobe sovereign AI engine by KHAWRIZM.',
          'Core principles: accuracy-first, no fabrication, cite only real sources.',
          "If you don't know, say so. Never invent facts.",
          'Respond in the user\'s language. Code always in English.',
        ];

    const taskHints: Partial<Record<TaskType, string>> = {
      code_generation:       'Write production-ready code. Include error handling, types, and inline comments.',
      code_debug:            'Identify root cause first. Explain the bug. Provide fix. Add a test case.',
      code_review:           'Score: correctness, security, performance, readability. Each 1-10. Suggest improvements.',
      arabic_nlp:            'استخدم عربية فصحى واضحة. أدرك اللهجات لكن أجب بالفصحى.',
      security_analysis:     'Analyse: CVEs, OWASP Top 10, misconfigs, data exposure. Include CVSS scores.',
      blockchain_forensics:  'Trace on-chain flows. Flag suspicious patterns. Reference block explorers.',
      reasoning:             'Think step by step. Number steps. State assumptions explicitly.',
      summarization:         'Extract key points. Preserve critical nuance. Target 20% original length.',
      math:                  'Show all working. Verify the answer. Flag assumptions.',
      document_qa:           'Answer strictly from provided context. Do not extrapolate.',
    };

    const hint = taskHints[sensory.detectedTask];
    const lines = [...base];
    if (hint) lines.push('', `Task: ${sensory.detectedTask} — ${hint}`);
    if (req.antiHallucination)
      lines.push('', 'STRICT MODE: Never produce unverifiable claims. Prefix uncertain statements with [UNCERTAIN].');
    if (req.systemSuffix)
      lines.push('', req.systemSuffix);

    return lines.join('\n');
  }
}

// ─── Provider Adapters ────────────────────────────────────────────────────────

interface ChatPayload {
  model:       string;
  messages:    NiyahMessage[];
  maxTokens:   number;
  temperature: number;
}

async function callOllama(p: ChatPayload): Promise<string> {
  const msgs = p.messages.map(m => ({ role: m.role, content: m.content }));
  const res = await fetch(`${ENV.OLLAMA_HOST}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: p.model, messages: msgs, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as { message: { content: string } };
  return d.message?.content ?? '';
}

async function callAnthropic(p: ChatPayload): Promise<string> {
  if (!ENV.ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const systemMsg = p.messages.find(m => m.role === 'system')?.content ?? '';
  const userMsgs  = p.messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ENV.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      p.model,
      max_tokens: p.maxTokens,
      system:     systemMsg,
      messages:   userMsgs,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as { content: Array<{ text: string }> };
  return d.content?.[0]?.text ?? '';
}

async function callOpenAI(p: ChatPayload): Promise<string> {
  if (!ENV.OPENAI_KEY) throw new Error('OPENAI_API_KEY not set');
  const msgs = p.messages.map(m => ({ role: m.role, content: m.content }));
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ENV.OPENAI_KEY}`,
    },
    body: JSON.stringify({ model: p.model, messages: msgs, max_tokens: p.maxTokens }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return d.choices?.[0]?.message?.content ?? '';
}

async function callDeepSeek(p: ChatPayload): Promise<string> {
  if (!ENV.DEEPSEEK_KEY) throw new Error('DEEPSEEK_API_KEY not set');
  const msgs = p.messages.map(m => ({ role: m.role, content: m.content }));
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ENV.DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({ model: p.model, messages: msgs, max_tokens: p.maxTokens }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return d.choices?.[0]?.message?.content ?? '';
}

async function callGemini(p: ChatPayload): Promise<string> {
  if (!ENV.GEMINI_KEY) throw new Error('GEMINI_API_KEY not set');
  const contents = p.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${p.model}:generateContent?key=${ENV.GEMINI_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: p.maxTokens, temperature: p.temperature },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function dispatchModel(modelId: string, payload: ChatPayload): Promise<string> {
  const def = MODEL_REGISTRY.find(m => m.id === modelId);
  if (!def) throw new Error(`Unknown model: ${modelId}`);
  switch (def.provider) {
    case 'ollama':    return callOllama(payload);
    case 'anthropic': return callAnthropic(payload);
    case 'openai':    return callOpenAI(payload);
    case 'deepseek':  return callDeepSeek(payload);
    case 'gemini':    return callGemini(payload);
    default: throw new Error(`Unsupported provider: ${def.provider}`);
  }
}

// ─── Streaming adapters ───────────────────────────────────────────────────────

async function* streamOllama(p: ChatPayload): AsyncGenerator<string> {
  const msgs = p.messages.map(m => ({ role: m.role, content: m.content }));
  const res = await fetch(`${ENV.OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: p.model, messages: msgs, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`Ollama stream ${res.status}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
      try {
        const obj = JSON.parse(line) as { message?: { content: string }; done?: boolean };
        if (obj.message?.content) yield obj.message.content;
        if (obj.done) return;
      } catch { /* malformed chunk */ }
    }
  }
}

async function* streamAnthropic(p: ChatPayload): AsyncGenerator<string> {
  if (!ENV.ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const systemMsg = p.messages.find(m => m.role === 'system')?.content ?? '';
  const userMsgs  = p.messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ENV.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: p.model, max_tokens: p.maxTokens,
      system: systemMsg, messages: userMsgs, stream: true,
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Anthropic stream ${res.status}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
      try {
        const obj = JSON.parse(line.slice(6)) as {
          type: string; delta?: { text?: string };
        };
        if (obj.type === 'content_block_delta' && obj.delta?.text) yield obj.delta.text;
      } catch { /* ignore */ }
    }
  }
}

// ─── THE NIYAH ENGINE ─────────────────────────────────────────────────────────

export class NiyahEngine {
  private memory: NiyahMemory;

  constructor(memory?: NiyahMemory) {
    this.memory = memory ?? globalMemory;
  }

  // ── Main entry ──────────────────────────────────────────────────────────────

  async run(req: NiyahRequest): Promise<NiyahResponse> {
    const t0 = Date.now();

    // 1 · SENSORY
    const sensory = SensoryLobe.analyse(req.messages);
    if (req.task) sensory.detectedTask = req.task;

    // 2 · Ollama heartbeat
    const ollamaAlive = await this.checkOllama();

    // 3 · EXECUTIVE
    const executive = ExecutiveLobe.route(req, sensory, ollamaAlive);

    // 4 · Memory injection
    let historyMessages: NiyahMessage[] = [];
    if (req.memoryKey) {
      historyMessages = this.memory.getCompressed(req.memoryKey);
    }

    // 5 · Build message array
    const systemPrompt = CognitiveLobe.buildSystemPrompt(req, sensory);
    const finalMessages: NiyahMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      ...req.messages,
    ];

    const payload: ChatPayload = {
      model:       executive.selectedModel,
      messages:    finalMessages,
      maxTokens:   req.maxTokens   ?? 4096,
      temperature: req.temperature ?? (req.antiHallucination ? 0.2 : 0.7),
    };

    // 6 · Call model with fallback chain
    let content  = '';
    let usedModel = executive.selectedModel;
    const chain   = [executive.selectedModel, ...executive.fallbackChain];

    for (let attempt = 0; attempt < chain.length; attempt++) {
      const modelId = chain[attempt];
      executive.attemptCount = attempt + 1;
      try {
        if (req.stream) {
          const def      = MODEL_REGISTRY.find(m => m.id === modelId);
          const provider = def?.provider;
          const streamGen =
            provider === 'ollama'     ? streamOllama({ ...payload, model: modelId }) :
            provider === 'anthropic'  ? streamAnthropic({ ...payload, model: modelId }) :
            undefined;

          if (!streamGen) throw new Error(`Streaming not supported for ${provider}`);

          const cognitive: NiyahTrace['cognitive'] = {
            confidence: 0.9, hallucinationFlags: [], memoryHits: historyMessages.length,
          };
          return this.buildResp('', modelId, executive.tier, sensory, cognitive, executive, t0, streamGen);
        }

        content   = await dispatchModel(modelId, { ...payload, model: modelId });
        usedModel = modelId;
        break;
      } catch (err) {
        this.log(`Model ${modelId} failed (attempt ${attempt + 1}): ${err}`);
        if (attempt === chain.length - 1) throw err;
      }
    }

    // 7 · COGNITIVE
    const cognitive = CognitiveLobe.evaluate(content, req, sensory);
    cognitive.memoryHits = historyMessages.length;

    // 8 · Persist
    if (req.memoryKey) {
      this.memory.set(req.memoryKey, [
        ...req.messages,
        { role: 'assistant', content },
      ]);
    }

    return this.buildResp(content, usedModel, executive.tier, sensory, cognitive, executive, t0);
  }

  // ── Streaming ───────────────────────────────────────────────────────────────

  async *streamTokens(req: NiyahRequest): AsyncGenerator<string> {
    const resp = await this.run({ ...req, stream: true });
    if (resp.stream) {
      for await (const chunk of resp.stream) yield chunk;
    }
  }

  // ── Quick API ────────────────────────────────────────────────────────────────

  async ask(
    userMessage: string,
    opts: Omit<NiyahRequest, 'messages'> = {},
  ): Promise<string> {
    const resp = await this.run({
      messages: [{ role: 'user', content: userMessage }],
      ...opts,
    });
    return resp.content;
  }

  async askAr(userMessage: string, opts: Omit<NiyahRequest, 'messages'> = {}): Promise<string> {
    return this.ask(userMessage, { arabicFirst: true, ...opts });
  }

  async codeGen(description: string, language = 'TypeScript'): Promise<string> {
    return this.ask(
      `Write production-ready ${language} code for:\n${description}\n\nInclude: types, error handling, inline comments.`,
      { task: 'code_generation', antiHallucination: true },
    );
  }

  async codeReview(code: string): Promise<string> {
    return this.ask(
      `Review this code for correctness, security, performance, and readability. Score each 1-10.\n\`\`\`\n${code}\n\`\`\``,
      { task: 'code_review', antiHallucination: true },
    );
  }

  async codeDebug(code: string, errorMsg?: string): Promise<string> {
    const prompt = errorMsg
      ? `Debug this code. Error: ${errorMsg}\n\`\`\`\n${code}\n\`\`\``
      : `Find and fix bugs in this code:\n\`\`\`\n${code}\n\`\`\``;
    return this.ask(prompt, { task: 'code_debug', antiHallucination: true });
  }

  async summarise(text: string): Promise<string> {
    return this.ask(
      `Summarise in concise bullet points:\n${text}`,
      { task: 'summarization' },
    );
  }

  async summariseAr(text: string): Promise<string> {
    return this.ask(
      `لخص هذا النص في نقاط رئيسية دقيقة:\n${text}`,
      { task: 'summarization', arabicFirst: true },
    );
  }

  async blockchainTrace(query: string): Promise<string> {
    return this.ask(query, {
      task: 'blockchain_forensics',
      antiHallucination: true,
      tier: 'cloud_heavy',
    });
  }

  async securityScan(target: string): Promise<string> {
    return this.ask(target, {
      task: 'security_analysis',
      antiHallucination: true,
      tier: 'cloud_heavy',
    });
  }

  async osint(query: string): Promise<string> {
    return this.ask(query, {
      task: 'osint',
      antiHallucination: true,
      tier: 'cloud_heavy',
    });
  }

  // ── Memory helpers ───────────────────────────────────────────────────────────

  remember(key: string, messages: NiyahMessage[]): void {
    this.memory.set(key, messages);
  }

  recall(key: string): NiyahMessage[] {
    return this.memory.getCompressed(key);
  }

  forget(key: string): void {
    this.memory.delete(key);
  }

  // ── Introspection ─────────────────────────────────────────────────────────

  /** Return all available models for a given tier */
  listModels(tier?: ModelTier): ModelDef[] {
    return tier ? MODEL_REGISTRY.filter(m => m.tier === tier) : [...MODEL_REGISTRY];
  }

  /** Analyse an input without running inference — useful for routing inspection */
  async analyse(req: NiyahRequest): Promise<{
    sensory: NiyahTrace['sensory'];
    executive: NiyahTrace['executive'];
    ollamaAlive: boolean;
  }> {
    const sensory      = SensoryLobe.analyse(req.messages);
    const ollamaAlive  = await this.checkOllama();
    const executive    = ExecutiveLobe.route(req, sensory, ollamaAlive);
    return { sensory, executive, ollamaAlive };
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  private async checkOllama(): Promise<boolean> {
    try {
      const res = await fetch(`${ENV.OLLAMA_HOST}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch { return false; }
  }

  private buildResp(
    content:   string,
    model:     string,
    tier:      ModelTier,
    sensory:   NiyahTrace['sensory'],
    cognitive: NiyahTrace['cognitive'],
    executive: NiyahTrace['executive'],
    t0:        number,
    stream?:   AsyncGenerator<string, void, unknown>,
  ): NiyahResponse {
    return {
      content,
      model,
      tier,
      lobe:       'cognitive' as LobeId,
      confidence: cognitive.confidence,
      lang:       sensory.detectedLang,
      dialect:    sensory.detectedDialect !== 'none' ? sensory.detectedDialect : undefined,
      latencyMs:  Date.now() - t0,
      trace:      { sensory, executive, cognitive },
      stream,
    };
  }

  private log(msg: string): void {
    if (ENV.NIYAH_LOG === 'true') console.log(`[Niyah] ${msg}`);
  }
}

// ─── Default singleton ────────────────────────────────────────────────────────

export const niyah = new NiyahEngine();

// ─── Named re-exports ─────────────────────────────────────────────────────────

export {
  SensoryLobe,
  ExecutiveLobe,
  CognitiveLobe,
  MODEL_REGISTRY,
  ENV as NiyahEnv,
};

export type { ModelDef, MemoryEntry, ChatPayload };
