/**
 * SovereignSessionCleaner.ts
 * ===========================
 * مُنظِّف الجلسات السيادية - HAVEN IDE
 *
 * مسؤولية هذا الملف: إدارة دورة حياة جلسات NiyahEngine
 * بما في ذلك التنظيف التلقائي، رصد ضغط الذاكرة، التصدير المشفر،
 * وجدولة الصيانة الدورية — كل ذلك بشكل محلي كامل بلا اتصال سحابي.
 *
 * Responsibilities:
 * - TTL-based session expiry (default: 24 hours)
 * - Memory pressure detection (session count + estimated heap usage)
 * - Auto-eviction when session count exceeds max threshold
 * - AES-256-GCM encrypted export before permanent deletion
 * - Configurable cleanup scheduler
 * - Statistics tracking (cleaned count, bytes freed, last run time)
 * - Zero telemetry — all data stays on-device
 *
 * @module SovereignSessionCleaner
 */

// ─── Types (mirrored from NiyahEngine to avoid circular import) ───────────────

/** متجه التمثيل الدلالي للجلسة */
export interface NiyahVector {
  dims: number[];
  magnitude: number;
}

/** نتيجة فص معالجة واحد */
export interface LobeResult {
  lobe: 'semantic' | 'pragmatic' | 'executive';
  score: number;
  output: string;
}

/**
 * جلسة NiyahEngine الكاملة
 * A single NiyahEngine processing session record.
 */
export interface NiyahSession {
  id: string;
  timestamp: number;           // Unix ms — وقت الإنشاء
  input: string;               // المدخل الأصلي
  vector: NiyahVector;
  lobes: LobeResult[];
  response: string;
  alignmentScore: number;      // 0–1 درجة التوافق السيادي
}

/**
 * ذاكرة NiyahEngine الكاملة
 * Complete in-memory store for a NiyahEngine instance.
 */
export interface NiyahMemory {
  sessions: NiyahSession[];
  intentGraph: Map<string, string[]>;
}

// ─── Configuration ─────────────────────────────────────────────────────────────

/**
 * إعدادات مُنظِّف الجلسات
 * All values are optional; sensible defaults are provided.
 */
export interface SessionCleanerConfig {
  /** مدة صلاحية الجلسة بالميلي ثانية (default: 24 hours) */
  ttlMs?: number;
  /** الحد الأقصى لعدد الجلسات المحتفظ بها (default: 500) */
  maxSessions?: number;
  /** الفترة الزمنية بين دورات التنظيف بالميلي ثانية (default: 15 minutes) */
  cleanupIntervalMs?: number;
  /** تفعيل التصدير المشفر قبل الحذف (default: true) */
  encryptBeforeDelete?: boolean;
  /** مفتاح التشفير AES-256-GCM المرمّز بـ Base64 — يُولَّد تلقائياً إذا لم يُوفَّر */
  encryptionKeyBase64?: string;
  /** استدعاء خارجي عند اكتمال دورة تنظيف (اختياري) */
  onCleanupComplete?: (stats: CleanupStats) => void;
  /** تسجيل التفاصيل في الكونسول (default: false) */
  verbose?: boolean;
}

// ─── Statistics ────────────────────────────────────────────────────────────────

/**
 * إحصائيات دورة التنظيف
 * Emitted after every cleanup cycle.
 */
export interface CleanupStats {
  /** عدد الجلسات المحذوفة في هذه الدورة */
  sessionsRemoved: number;
  /** الحجم التقديري للبيانات المحررة (بايت) */
  bytesFreed: number;
  /** وقت بدء دورة التنظيف (Unix ms) */
  cleanupStartedAt: number;
  /** مدة دورة التنظيف (ميلي ثانية) */
  durationMs: number;
  /** سبب التنظيف */
  reason: 'ttl' | 'max_sessions' | 'memory_pressure' | 'manual';
  /** بيانات التصدير المشفرة (إن كان التشفير مفعّلاً) */
  encryptedExport?: EncryptedExport;
}

/** إجمالي إحصائيات الجلسة منذ إنشاء المُنظِّف */
export interface CleanerLifetimeStats {
  totalSessionsCleaned: number;
  totalBytesFreed: number;
  totalCyclesRun: number;
  lastCleanupAt: number | null;
  isSchedulerRunning: boolean;
}

// ─── Encrypted Export ──────────────────────────────────────────────────────────

/**
 * حزمة التصدير المشفرة
 * Encrypted export bundle produced before sessions are deleted.
 */
export interface EncryptedExport {
  /** البيانات المشفرة مرمّزة Base64 */
  ciphertext: string;
  /** متجه التهيئة (IV) مرمّز Base64 — 12 bytes for AES-GCM */
  iv: string;
  /** طابع زمني للتصدير */
  exportedAt: number;
  /** عدد الجلسات المُصدَّرة */
  sessionCount: number;
  /** خوارزمية التشفير المستخدمة */
  algorithm: 'AES-256-GCM';
}

// ─── Memory Pressure ───────────────────────────────────────────────────────────

/**
 * تقرير ضغط الذاكرة
 */
export interface MemoryPressureReport {
  /** هل يوجد ضغط ذاكرة فعلي */
  underPressure: boolean;
  /** عدد الجلسات الحالي */
  sessionCount: number;
  /** تقدير حجم الجلسات بالبايت */
  estimatedBytes: number;
  /** نسبة استخدام السعة القصوى (0–1) */
  capacityRatio: number;
}

// ─── Helper: estimate session byte size ────────────────────────────────────────

/**
 * تقدير حجم جلسة واحدة بالبايت
 * Uses JSON serialization length as a proxy for memory usage.
 */
function estimateSessionBytes(session: NiyahSession): number {
  try {
    return new TextEncoder().encode(JSON.stringify(session)).length;
  } catch {
    // fallback: rough average if serialization fails
    return 2048;
  }
}

// ─── SovereignSessionCleaner ───────────────────────────────────────────────────

/**
 * مُنظِّف الجلسات السيادية
 *
 * Usage:
 * ```typescript
 * const cleaner = new SovereignSessionCleaner(niyahMemory, {
 *   ttlMs: 12 * 60 * 60 * 1000, // 12 hours
 *   maxSessions: 300,
 *   verbose: true,
 * });
 * await cleaner.init();
 * cleaner.startScheduler();
 * ```
 */
export class SovereignSessionCleaner {
  // ── Configuration (with defaults) ──────────────────────────────────────────
  private readonly ttlMs: number;
  private readonly maxSessions: number;
  private readonly cleanupIntervalMs: number;
  private readonly encryptBeforeDelete: boolean;
  private readonly onCleanupComplete?: (stats: CleanupStats) => void;
  private readonly verbose: boolean;

  // ── State ──────────────────────────────────────────────────────────────────
  /** مرجع ذاكرة NiyahEngine — يُعدَّل مباشرةً */
  private memory: NiyahMemory;

  /** مؤقت الجدولة */
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;

  /** مفتاح AES-256-GCM المُشتَق */
  private cryptoKey: CryptoKey | null = null;

  /** إحصائيات طوال عمر المُنظِّف */
  private lifetimeStats: CleanerLifetimeStats = {
    totalSessionsCleaned: 0,
    totalBytesFreed: 0,
    totalCyclesRun: 0,
    lastCleanupAt: null,
    isSchedulerRunning: false,
  };

  constructor(memory: NiyahMemory, config: SessionCleanerConfig = {}) {
    this.memory = memory;
    this.ttlMs               = config.ttlMs              ?? 24 * 60 * 60 * 1000; // 24h
    this.maxSessions         = config.maxSessions         ?? 500;
    this.cleanupIntervalMs   = config.cleanupIntervalMs   ?? 15 * 60 * 1000;      // 15m
    this.encryptBeforeDelete = config.encryptBeforeDelete ?? true;
    this.onCleanupComplete   = config.onCleanupComplete;
    this.verbose             = config.verbose             ?? false;

    // Import provided key material if given
    if (config.encryptionKeyBase64) {
      this._importKeyFromBase64(config.encryptionKeyBase64).catch((err) => {
        console.error('[SovereignSessionCleaner] Failed to import encryption key:', err);
      });
    }
  }

  // ─── Initialisation ─────────────────────────────────────────────────────────

  /**
   * تهيئة المُنظِّف — يجب استدعاؤها قبل أي عملية تشفير
   * Generates an AES-256-GCM key if none was supplied via config.
   */
  async init(): Promise<void> {
    if (!this.cryptoKey) {
      this.cryptoKey = await this._generateAesKey();
      this._log('Encryption key generated (AES-256-GCM)');
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * تشغيل المُنظِّف مرة واحدة يدوياً
   * Run a single cleanup cycle immediately.
   */
  async runOnce(reason: CleanupStats['reason'] = 'manual'): Promise<CleanupStats> {
    const started = Date.now();
    this._log(`Starting cleanup cycle (reason: ${reason})`);

    const expiredSessions = this._collectExpired();
    const overflowSessions = this._collectOverflow(expiredSessions);

    // دمج الجلسات المستهدفة مع إزالة التكرار
    const toRemoveIds = new Set<string>([
      ...expiredSessions.map(s => s.id),
      ...overflowSessions.map(s => s.id),
    ]);
    const toRemove = this.memory.sessions.filter(s => toRemoveIds.has(s.id));

    let encryptedExport: EncryptedExport | undefined;
    if (this.encryptBeforeDelete && toRemove.length > 0) {
      try {
        encryptedExport = await this._encryptSessions(toRemove);
        this._log(`Encrypted ${toRemove.length} session(s) before removal`);
      } catch (err) {
        console.error('[SovereignSessionCleaner] Encryption failed; skipping export:', err);
      }
    }

    // حساب الحجم التقديري قبل الحذف
    const bytesFreed = toRemove.reduce((acc, s) => acc + estimateSessionBytes(s), 0);

    // الحذف الفعلي من الذاكرة
    this.memory.sessions = this.memory.sessions.filter(s => !toRemoveIds.has(s.id));

    const durationMs = Date.now() - started;

    const stats: CleanupStats = {
      sessionsRemoved: toRemove.length,
      bytesFreed,
      cleanupStartedAt: started,
      durationMs,
      reason,
      encryptedExport,
    };

    // تحديث الإحصائيات الكلية
    this.lifetimeStats.totalSessionsCleaned += toRemove.length;
    this.lifetimeStats.totalBytesFreed      += bytesFreed;
    this.lifetimeStats.totalCyclesRun       += 1;
    this.lifetimeStats.lastCleanupAt         = Date.now();

    this._log(
      `Cleanup complete: removed=${toRemove.length}, freed≈${bytesFreed}B, duration=${durationMs}ms`
    );

    this.onCleanupComplete?.(stats);
    return stats;
  }

  /**
   * بدء المُجدِّل الدوري
   * Start the cleanup scheduler. Idempotent — calling twice is safe.
   */
  startScheduler(): void {
    if (this.schedulerTimer !== null) {
      this._log('Scheduler already running; ignoring duplicate start');
      return;
    }
    this.schedulerTimer = setInterval(async () => {
      const pressure = this.checkMemoryPressure();
      const reason: CleanupStats['reason'] = pressure.underPressure
        ? 'memory_pressure'
        : 'ttl';
      await this.runOnce(reason);
    }, this.cleanupIntervalMs);

    this.lifetimeStats.isSchedulerRunning = true;
    this._log(`Scheduler started (interval: ${this.cleanupIntervalMs}ms)`);
  }

  /**
   * إيقاف المُجدِّل الدوري
   * Stop the scheduler gracefully.
   */
  stopScheduler(): void {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
      this.lifetimeStats.isSchedulerRunning = false;
      this._log('Scheduler stopped');
    }
  }

  /**
   * فحص ضغط الذاكرة الحالي
   * Returns a snapshot of current memory pressure.
   */
  checkMemoryPressure(): MemoryPressureReport {
    const sessions = this.memory.sessions;
    const sessionCount = sessions.length;
    const estimatedBytes = sessions.reduce((acc, s) => acc + estimateSessionBytes(s), 0);
    const capacityRatio = sessionCount / this.maxSessions;

    return {
      underPressure: capacityRatio >= 0.85, // >85% capacity = pressure
      sessionCount,
      estimatedBytes,
      capacityRatio,
    };
  }

  /**
   * استرداد الإحصائيات الكلية
   * Returns lifetime statistics for this cleaner instance.
   */
  getLifetimeStats(): Readonly<CleanerLifetimeStats> {
    return { ...this.lifetimeStats };
  }

  /**
   * تحديث مرجع الذاكرة (مفيد عند إعادة تهيئة NiyahEngine)
   * Swap the memory reference (e.g. after NiyahEngine reload).
   */
  setMemory(newMemory: NiyahMemory): void {
    this.memory = newMemory;
    this._log('Memory reference updated');
  }

  /**
   * تصدير مفتاح التشفير بتنسيق Base64 (للتخزين الآمن المحلي)
   * Export the active AES key as a Base64 string.
   */
  async exportEncryptionKey(): Promise<string | null> {
    if (!this.cryptoKey) return null;
    const raw = await crypto.subtle.exportKey('raw', this.cryptoKey);
    return _arrayBufferToBase64(raw);
  }

  /**
   * إغلاق المُنظِّف بشكل آمن — يوقف المُجدِّل ويؤدي تنظيفاً أخيراً
   * Graceful shutdown: stop scheduler and run a final cleanup.
   */
  async shutdown(): Promise<CleanupStats> {
    this._log('Shutdown initiated');
    this.stopScheduler();
    return this.runOnce('manual');
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /** تجميع الجلسات المنتهية الصلاحية */
  private _collectExpired(): NiyahSession[] {
    const cutoff = Date.now() - this.ttlMs;
    return this.memory.sessions.filter(s => s.timestamp < cutoff);
  }

  /**
   * تجميع الجلسات الزائدة عن الحد الأقصى (الأقدم أولاً)
   * Collect sessions to evict when count exceeds maxSessions.
   * excludeIds: sessions already scheduled for TTL removal.
   */
  private _collectOverflow(alreadyMarked: NiyahSession[]): NiyahSession[] {
    const markedIds = new Set(alreadyMarked.map(s => s.id));
    const remaining = this.memory.sessions.filter(s => !markedIds.has(s.id));
    const overCount = remaining.length - this.maxSessions;
    if (overCount <= 0) return [];

    // الأقدم أولاً للإزالة
    const sorted = [...remaining].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.slice(0, overCount);
  }

  /** توليد مفتاح AES-256-GCM */
  private async _generateAesKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,  // extractable — needed for export
      ['encrypt', 'decrypt'],
    );
  }

  /** استيراد مفتاح Base64 */
  private async _importKeyFromBase64(b64: string): Promise<void> {
    const raw = _base64ToArrayBuffer(b64);
    this.cryptoKey = await crypto.subtle.importKey(
      'raw',
      raw,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    this._log('Encryption key imported from Base64');
  }

  /**
   * تشفير مجموعة من الجلسات باستخدام AES-256-GCM
   * Encrypts sessions array to an EncryptedExport bundle.
   */
  private async _encryptSessions(sessions: NiyahSession[]): Promise<EncryptedExport> {
    if (!this.cryptoKey) {
      throw new Error('Encryption key not initialised. Call init() first.');
    }

    const plaintext = new TextEncoder().encode(JSON.stringify(sessions));
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

    const cipherbuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey,
      plaintext,
    );

    return {
      ciphertext: _arrayBufferToBase64(cipherbuf),
      iv: _arrayBufferToBase64(iv.buffer),
      exportedAt: Date.now(),
      sessionCount: sessions.length,
      algorithm: 'AES-256-GCM',
    };
  }

  /**
   * فك تشفير حزمة تصدير (للاسترداد عند الحاجة)
   * Decrypt a previously exported bundle back to sessions.
   */
  async decryptExport(bundle: EncryptedExport): Promise<NiyahSession[]> {
    if (!this.cryptoKey) {
      throw new Error('Encryption key not initialised. Call init() first.');
    }

    const cipherbuf = _base64ToArrayBuffer(bundle.ciphertext);
    const iv = new Uint8Array(_base64ToArrayBuffer(bundle.iv));

    const plainbuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey,
      cipherbuf,
    );

    const json = new TextDecoder().decode(plainbuf);
    return JSON.parse(json) as NiyahSession[];
  }

  /** طباعة تفصيلية للتطوير */
  private _log(message: string): void {
    if (this.verbose) {
      console.log(`[SovereignSessionCleaner ${new Date().toISOString()}] ${message}`);
    }
  }
}

// ─── Utility: Base64 ↔ ArrayBuffer ────────────────────────────────────────────

/**
 * تحويل ArrayBuffer إلى Base64
 */
function _arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * تحويل Base64 إلى ArrayBuffer
 */
function _base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ─── Convenience Factory ───────────────────────────────────────────────────────

/**
 * مصنع سريع: ينشئ مُنظِّفاً جاهزاً ومُهيَّأً
 * Factory helper that creates and initialises a cleaner in one call.
 *
 * ```typescript
 * const cleaner = await createSessionCleaner(memory, { ttlMs: 6 * 3600_000 });
 * cleaner.startScheduler();
 * ```
 */
export async function createSessionCleaner(
  memory: NiyahMemory,
  config?: SessionCleanerConfig,
): Promise<SovereignSessionCleaner> {
  const cleaner = new SovereignSessionCleaner(memory, config);
  await cleaner.init();
  return cleaner;
}
