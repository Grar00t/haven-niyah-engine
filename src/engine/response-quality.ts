export interface QualityLimits { maxCharacters: number; maxSentences: number; }

export function defaultQualityLimits(task: string): QualityLimits {
  if (task === 'code_gen' || task === 'code_fix' || task === 'code_review') return { maxCharacters: 40_000, maxSentences: 200 };
  if (task === 'summarize' || task === 'translate') return { maxCharacters: 12_000, maxSentences: 80 };
  return { maxCharacters: 16_000, maxSentences: 100 };
}

export function cleanResponse(input: string, limits: QualityLimits): string {
  let text = input.replace(/^\s*(sure|certainly|of course)\s*[,!:\-]?\s*/i, '').trim();
  if (!text) return '';

  const cleanedSegments: string[] = [];
  let remainingSentences = limits.maxSentences;
  for (const segment of text.split(/(```[\s\S]*?```)/g)) {
    if (!segment) continue;
    if (segment.startsWith('```') && segment.endsWith('```')) {
      cleanedSegments.push(segment);
      continue;
    }
    const cleaned = cleanProse(segment, remainingSentences);
    remainingSentences -= cleaned.sentencesUsed;
    if (cleaned.text) cleanedSegments.push(cleaned.text);
  }

  text = cleanedSegments.join('\n\n');
  if (text.length > limits.maxCharacters) text = `${text.slice(0, limits.maxCharacters).trim()}…`;
  return text.trim();
}

function cleanProse(input: string, maxSentences: number): { text: string; sentencesUsed: number } {
  const paragraphs = input.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const uniqueParagraphs: string[] = [];
  const seen = new Set<string>();
  for (const paragraph of paragraphs) {
    const key = paragraph.toLocaleLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueParagraphs.push(paragraph);
    }
  }

  const sentences = uniqueParagraphs.join('\n\n').match(/[^.!?؟]+[.!?؟]+|[^.!?؟]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  const uniqueSentences: string[] = [];
  let previous = '';
  for (const sentence of sentences) {
    const normalized = sentence.toLocaleLowerCase().replace(/\s+/g, ' ');
    if (normalized !== previous) uniqueSentences.push(sentence);
    previous = normalized;
  }

  const selected = uniqueSentences.slice(0, Math.max(0, maxSentences));
  return { text: selected.join(' '), sentencesUsed: selected.length };
}

export function validateResponse(text: string): { ok: boolean; reason?: 'empty' | 'repetition' } {
  const normalized = text.trim();
  if (!normalized) return { ok: false, reason: 'empty' };
  const sentences = normalized.split(/(?<=[.!?؟])\s+/).filter(Boolean);
  if (sentences.length >= 3) {
    const tail = sentences.slice(-3).map((s) => s.toLocaleLowerCase().replace(/\s+/g, ' '));
    if (new Set(tail).size === 1) return { ok: false, reason: 'repetition' };
  }
  return { ok: true };
}
