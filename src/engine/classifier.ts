export type TaskType = 'code_gen' | 'code_review' | 'code_fix' | 'chat' | 'translate' | 'summarize' | 'plan' | 'security_audit' | 'architecture' | 'arabic_nlp' | 'general';
export type LobeId = 'sensory' | 'executive' | 'cognitive';
export type Dialect = 'saudi' | 'khaliji' | 'egyptian' | 'levantine' | 'msa' | 'english' | 'mixed';
export type Language = 'ar' | 'en' | 'mixed' | 'other';

export interface ClassificationResult {
  task: TaskType;
  lobe: LobeId;
  dialect: Dialect;
  language: Language;
  confidence: number | null;
  evidence: string[];
}

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/gu;
const LATIN_RE = /[A-Za-z]/g;
const CODE_RE = /```|\b(const|let|var|function|class|interface|import|export|def|return|SELECT|INSERT|UPDATE|DELETE)\b/i;
const SECURITY_RE = /\b(cve|vulnerability|exploit|pentest|firewall|ssrf|xss|csrf|secret|credential|token|security|threat)\b|ثغرة|اختراق|حماية|أمن|فحص/i;
const DEBUG_RE = /\b(debug|bug|error|exception|stack trace|fix|repair|broken)\b|خطأ|صلح|مشكلة/i;
const CODE_REVIEW_RE = /\b(code review|review code|audit code)\b|راجع الكود|تدقيق الكود/i;
const CODE_GEN_RE = /\b(write|create|build|implement|generate|script|compile)\b|اكتب|أنشئ|ابني|نفذ|برمج/i;
const TRANSLATE_RE = /\btranslate|translation\b|ترجم|ترجمة/i;
const SUMMARIZE_RE = /\bsummarize|summary|tl;dr\b|لخص|تلخيص/i;
const PLAN_RE = /\bplan|roadmap|steps|strategy\b|خطة|خطوات|استراتيجية/i;
const ARCH_RE = /\barchitecture|design|system design|tradeoff|evaluate\b|معمارية|تصميم|قيّم|تقييم/i;
const WHY_RE = /\bwhy|how does|explain|what is|compare\b|لماذا|كيف|اشرح|مؓ هو|قارن/i;

function boundedTerms(terms: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{M}])(?:${terms})(?![\\p{L}\\p{M}])`, 'u');
}

const DIALECT_RULES: Array<{ dialect: Exclude<Dialect, 'english' | 'mixed'>; terms: RegExp }> = [
  { dialect: 'saudi', terms: boundedTerms('ابغى|وش|ليش|كذا|خلاص|طيب|ذا|سوي|والله|ودي|احس|مافي|هلا|الحين|مره') },
  { dialect: 'khaliji', terms: boundedTerms('شلون|اشلون|خوش|وايد|زين|هيج|ابي|يبغالي') },
  { dialect: 'egyptian', terms: boundedTerms('عايز|عاوزه|ايه|ازيك|كده|دلوقتي|اهو|مش|لسه') },
  { dialect: 'levantine', terms: boundedTerms('كيفك|شو|هيك|بدي|عم|كتير|يسلمو|منيح|هلق|هلؓ') },
];

export function normalizeInput(input: string): string {
  return input.normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[ـ]/g, '').replace(/\s+/g, ' ').trim();
}

export function detectLanguage(input: string): Language {
  const arabic = input.match(ARABIC_RE)?.length ?? 0;
  const latin = input.match(LATIN_RE)?.length ?? 0;
  if (arabic === 0 && latin === 0) return 'other';
  if (arabic > 0 && latin > 0) return 'mixed';
  return arabic > 0 ? 'ar' : 'en';
}

export function detectDialect(input: string): Dialect {
  const normalized = normalizeInput(input);
  if (!/[\u0600-\u06FF]/u.test(normalized)) return 'english';
  const scores = new Map<Exclude<Dialect, 'english' | 'mixed'>, number>();
  for (const rule of DIALECT_RULES) {
    const matches = normalized.match(new RegExp(rule.terms.source, 'gu'))?.length ?? 0;
    if (matches > 0) scores.set(rule.dialect, matches);
  }
  const ordered = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (ordered.length === 0) return 'msa';
  if (ordered.length > 1 && ordered[0][1] === ordered[1][1]) return 'mixed';
  return ordered[0][0];
}

function makeResult(task: TaskType, lobe: LobeId, dialect: Dialect, language: Language, evidence: string[]): ClassificationResult {
  return { task, lobe, dialect, language, confidence: null, evidence };
}

export function classify(input: string): ClassificationResult {
  const normalized = normalizeInput(input);
  const language = detectLanguage(normalized);
  const dialect = detectDialect(normalized);
  if (!normalized) return makeResult('general', 'sensory', dialect, language, []);
  if (CODE_RE.test(normalized) && DEBUG_RE.test(normalized)) return makeResult('code_fix', 'executive', dialect, language, ['code', 'debug']);
  if (CODE_REVIEW_RE.test(normalized)) return makeResult('code_review', 'cognitive', dialect, language, ['code_review']);
  if (SECURITY_RE.test(normalized)) return makeResult('security_audit', 'cognitive', dialect, language, ['security']);
  if (CODE_RE.test(normalized) && CODE_GEN_RE.test(normalized)) return makeResult('code_gen', 'executive', dialect, language, ['code', 'generation']);
  if (TRANSLATE_RE.test(normalized)) return makeResult('translate', 'executive', dialect, language, ['translate']);
  if (SUMMARIZE_RE.test(normalized)) return makeResult('summarize', 'executive', dialect, language, ['summarize']);
  if (ARCH_RE.test(normalized)) return makeResult('architecture', 'cognitive', dialect, language, ['architecture']);
  if (WHY_RE.test(normalized)) return makeResult('chat', 'cognitive', dialect, language, ['explanatory']);
  if (PLAN_RE.test(normalized)) return makeResult('plan', 'executive', dialect, language, ['plan']);
  if (language === 'ar') return makeResult('arabic_nlp', 'sensory', dialect, language, ['arabic']);
  if (language === 'mixed') return makeResult('general', 'executive', dialect, language, ['mixed_language']);
  return makeResult('general', 'executive', dialect, language, []);
}
