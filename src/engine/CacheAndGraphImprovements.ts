/**
 * HAVEN IDE — Enhanced LRU Cache + Intent Graph
 * ===============================================
 * Upgrades for NiyahEngine and ModelRouter:
 *
 *   LRU Cache:    64 → 512 entries   + TTL + memory-aware eviction + stats
 *   IntentGraph:  20 → 200 sessions  + persistence + weighted edges +
 *                 cluster analysis + JSON export + full statistics
 *
 * Drop-in replacement — same public interface, richer internals.
 *
 * @author  Sulaiman Alshammari (أبو خوارزم / @Grar00t)
 * @project HAVEN — Sovereign AI Development Environment
 * @website khawrizm.com
 * @license AGPL-3.0
 * @version 5.0.0
 */

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 1: ENHANCED LRU CACHE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the enhanced LRU cache.
 */
export interface LRUCacheConfig {
  /** Maximum number of entries. Default: 512 (up from 64). */
  maxSize?: number;
  /** Time-to-live in milliseconds. 0 = never expire. Default: 600_000 (10 min). */
  ttl?: number;
  /** Rough memory budget in bytes. 0 = unlimited. Default: 64 * 1024 * 1024 (64 MB). */
  maxMemoryBytes?: number;
  /** If true, log cache events to console for debugging. */
  debug?: boolean;
}

/** Internal entry stored inside the doubly-linked list. */
interface LRUEntry<K, V> {
  key: K;
  value: V;
  /** Epoch ms when this entry was inserted / last refreshed. */
  insertedAt: number;
  /** Rough byte size estimate for memory budget tracking. */
  sizeBytes: number;
  prev: LRUEntry<K, V> | null;
  next: LRUEntry<K, V> | null;
}

/** Cache performance statistics. */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
  currentSize: number;
  maxSize: number;
  estimatedMemoryBytes: number;
  hitRate: number;         // 0–1
  totalRequests: number;
}

/**
 * Enhanced LRU Cache with:
 * - 512 entry default (upgraded from 64)
 * - TTL-based expiration
 * - Memory-aware eviction
 * - Hit/miss statistics
 * - Cache warming API
 *
 * @example
 *   const cache = new EnhancedLRUCache<string, ModelScore>({ maxSize: 512 });
 *   cache.set('llama3:code', score);
 *   const hit = cache.get('llama3:code');
 *   console.log(cache.getStats());
 */
export class EnhancedLRUCache<K, V> {
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly maxMemoryBytes: number;
  private readonly debug: boolean;

  // O(1) lookup
  private map: Map<K, LRUEntry<K, V>> = new Map();

  // Doubly-linked list: head = most-recent, tail = least-recent
  private head: LRUEntry<K, V> | null = null;
  private tail: LRUEntry<K, V> | null = null;

  // Stats
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private expirations = 0;
  private estimatedMemoryBytes = 0;

  constructor(config: LRUCacheConfig = {}) {
    this.maxSize         = config.maxSize         ?? 512;
    this.ttl             = config.ttl             ?? 600_000; // 10 minutes
    this.maxMemoryBytes  = config.maxMemoryBytes  ?? 64 * 1024 * 1024; // 64 MB
    this.debug           = config.debug           ?? false;
  }

  // ── Public Interface ──────────────────────────────────────────────────────

  /**
   * Retrieve a value. Returns `undefined` on miss or expiry.
   * Moves the entry to the head of the LRU list on hit.
   */
  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (this.isExpired(entry)) {
      this.deleteEntry(entry);
      this.expirations++;
      this.misses++;
      return undefined;
    }
    this.promoteToHead(entry);
    this.hits++;
    this.log(`HIT  ${String(key)}`);
    return entry.value;
  }

  /**
   * Store a value. Evicts stale/oversized entries as needed.
   * @param key
   * @param value
   * @param ttlOverride  Entry-specific TTL (ms). Overrides the global TTL.
   */
  set(key: K, value: V, ttlOverride?: number): void {
    // Reuse existing entry if key already present
    const existing = this.map.get(key);
    if (existing) {
      this.estimatedMemoryBytes -= existing.sizeBytes;
      existing.value = value;
      existing.insertedAt = ttlOverride !== undefined
        ? Date.now() - (this.ttl - ttlOverride)
        : Date.now();
      existing.sizeBytes = this.estimateSize(value);
      this.estimatedMemoryBytes += existing.sizeBytes;
      this.promoteToHead(existing);
      return;
    }

    const sizeBytes = this.estimateSize(value);
    const entry: LRUEntry<K, V> = {
      key,
      value,
      insertedAt: Date.now(),
      sizeBytes,
      prev: null,
      next: null,
    };

    // Evict until we're within budget
    while (
      (this.map.size >= this.maxSize) ||
      (this.maxMemoryBytes > 0 && this.estimatedMemoryBytes + sizeBytes > this.maxMemoryBytes)
    ) {
      if (!this.evictLRU()) break; // nothing left to evict
    }

    this.map.set(key, entry);
    this.prependToHead(entry);
    this.estimatedMemoryBytes += sizeBytes;
    this.log(`SET  ${String(key)} (${sizeBytes} bytes)`);
  }

  /**
   * Check if a key is present and non-expired without updating LRU order.
   */
  has(key: K): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.deleteEntry(entry);
      this.expirations++;
      return false;
    }
    return true;
  }

  /**
   * Remove a key explicitly.
   */
  delete(key: K): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    this.deleteEntry(entry);
    return true;
  }

  /**
   * Clear all entries and reset statistics.
   */
  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
    this.estimatedMemoryBytes = 0;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expirations = 0;
  }

  /**
   * Iterate over all non-expired entries (most-recent first).
   */
  entries(): Array<[K, V]> {
    const result: Array<[K, V]> = [];
    let node = this.head;
    while (node) {
      if (!this.isExpired(node)) result.push([node.key, node.value]);
      node = node.next;
    }
    return result;
  }

  /**
   * Warm the cache by pre-loading a batch of key-value pairs.
   * Pairs are inserted from the end of the array so that the first element
   * ends up as the most-recent entry.
   *
   * @param pairs  Array of [key, value] tuples
   */
  warm(pairs: Array<[K, V]>): void {
    // Insert in reverse so order is preserved in LRU priority
    for (let i = pairs.length - 1; i >= 0; i--) {
      this.set(pairs[i][0], pairs[i][1]);
    }
    this.log(`WARM ${pairs.length} entries`);
  }

  /**
   * Purge all expired entries in one pass. Call periodically if TTL is used.
   * @returns Number of entries removed
   */
  purgeExpired(): number {
    let count = 0;
    let node = this.tail; // Start from LRU end for efficiency
    while (node) {
      const prev = node.prev;
      if (this.isExpired(node)) {
        this.deleteEntry(node);
        this.expirations++;
        count++;
      }
      node = prev;
    }
    this.log(`PURGE ${count} expired entries`);
    return count;
  }

  /**
   * Snapshot of current performance metrics.
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      expirations: this.expirations,
      currentSize: this.map.size,
      maxSize: this.maxSize,
      estimatedMemoryBytes: this.estimatedMemoryBytes,
      hitRate: total === 0 ? 0 : this.hits / total,
      totalRequests: total,
    };
  }

  /** Number of currently stored entries. */
  get size(): number {
    return this.map.size;
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private isExpired(entry: LRUEntry<K, V>): boolean {
    if (this.ttl === 0) return false;
    return Date.now() - entry.insertedAt > this.ttl;
  }

  private prependToHead(entry: LRUEntry<K, V>): void {
    entry.prev = null;
    entry.next = this.head;
    if (this.head) this.head.prev = entry;
    this.head = entry;
    if (!this.tail) this.tail = entry;
  }

  private promoteToHead(entry: LRUEntry<K, V>): void {
    if (entry === this.head) return;
    // Detach
    if (entry.prev) entry.prev.next = entry.next;
    if (entry.next) entry.next.prev = entry.prev;
    if (entry === this.tail) this.tail = entry.prev;
    // Reattach at head
    entry.prev = null;
    entry.next = this.head;
    if (this.head) this.head.prev = entry;
    this.head = entry;
  }

  private evictLRU(): boolean {
    if (!this.tail) return false;
    this.deleteEntry(this.tail);
    this.evictions++;
    return true;
  }

  private deleteEntry(entry: LRUEntry<K, V>): void {
    this.map.delete(entry.key);
    this.estimatedMemoryBytes -= entry.sizeBytes;
    if (entry.prev) entry.prev.next = entry.next;
    else this.head = entry.next;           // entry was head
    if (entry.next) entry.next.prev = entry.prev;
    else this.tail = entry.prev;           // entry was tail
    entry.prev = null;
    entry.next = null;
  }

  /**
   * Rough byte-size estimator.
   * Handles primitives, JSON-serialisable objects, and ArrayBuffers.
   */
  private estimateSize(value: V): number {
    if (value === null || value === undefined) return 8;
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 4;
    if (typeof value === 'string') return (value as string).length * 2; // UTF-16
    if (value instanceof ArrayBuffer) return (value as ArrayBuffer).byteLength;
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 256; // Fallback for non-serializable objects
    }
  }

  private log(msg: string): void {
    if (this.debug) {
      console.debug(`[HAVEN LRU] ${msg} | size=${this.map.size}/${this.maxSize}`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 2: ENHANCED INTENT GRAPH
// ═════════════════════════════════════════════════════════════════════════════

/** Edge types with their relative weights. */
export const EDGE_WEIGHTS = {
  context:  4.0,   // Direct conversational context (strongest)
  root:     3.0,   // Arabic root morphological link
  domain:   2.0,   // Same domain (e.g., cybersecurity → cybersecurity)
  temporal: 1.0,   // Temporal proximity (weakest)
} as const;

export type EdgeType = keyof typeof EDGE_WEIGHTS;

/** A single intent node in the graph. */
export interface IntentNode {
  id: string;
  /** Canonical intent label (e.g., "explain_function", "fix_bug"). */
  intent: string;
  /** NiyahEngine dialect tag. */
  dialect?: string;
  /** Tone classifier output. */
  tone?: string;
  /** Domain router output. */
  domain?: string;
  /** Epoch ms when first seen in this session. */
  firstSeen: number;
  /** Epoch ms of most recent occurrence. */
  lastSeen: number;
  /** Total number of times this intent has been observed. */
  frequency: number;
  /** Average NiyahEngine confidence (0–1). */
  avgConfidence: number;
}

/** A directed weighted edge between two intent nodes. */
export interface IntentEdge {
  /** Source node ID. */
  from: string;
  /** Target node ID. */
  to: string;
  type: EdgeType;
  /** Accumulated weight (increases each time this transition is reinforced). */
  weight: number;
  /** Epoch ms of most recent traversal. */
  lastTraversed: number;
  /** Total number of traversals. */
  traversals: number;
}

/** A detected intent cluster (dominant usage pattern). */
export interface IntentCluster {
  id: string;
  /** Most frequently co-occurring intent set. */
  intents: string[];
  /** Total frequency across all nodes in the cluster. */
  totalFrequency: number;
  /** Dominant domain if most nodes share one. */
  dominantDomain?: string;
  /** Mean confidence of cluster nodes. */
  avgConfidence: number;
}

/** Serialisable graph snapshot for persistence / export. */
export interface IntentGraphSnapshot {
  version: string;
  exportedAt: number;
  nodes: IntentNode[];
  edges: IntentEdge[];
  sessionLookback: number;
}

/** Summary statistics for the entire graph. */
export interface IntentGraphStats {
  nodeCount: number;
  edgeCount: number;
  /** edges / (nodes * (nodes - 1)) */
  density: number;
  topClusters: IntentCluster[];
  topIntents: Array<{ intent: string; frequency: number; avgConfidence: number }>;
  /** Average weight of all edges. */
  avgEdgeWeight: number;
  /** Total traversals across all edges. */
  totalTraversals: number;
  sessionLookback: number;
}

/** Configuration for the intent graph. */
export interface IntentGraphConfig {
  /** Maximum sessions (recent intents) to keep. Default: 200 (up from 20). */
  sessionLookback?: number;
  /** Minimum edge weight before pruning. Default: 0.5. */
  pruneThreshold?: number;
  /** Number of top clusters to compute. Default: 5. */
  topClusters?: number;
  /** localStorage key for persistence. Set to null to disable. */
  persistenceKey?: string | null;
  /** If true, auto-persist on every mutation. */
  autoPersist?: boolean;
}

/**
 * Enhanced Intent Graph for NiyahEngine.
 *
 * Improvements over the original (20-session, non-persistent) version:
 * - Session lookback: 200 (10× more history)
 * - Graph persistence via localStorage
 * - Weighted edges: context > root > domain > temporal
 * - Graph pruning (removes weak/stale edges)
 * - Cluster analysis (dominant intent patterns)
 * - JSON export for visualization (e.g., D3.js, Cytoscape)
 * - Rich statistics: density, top intents, top clusters
 *
 * @example
 *   const graph = new EnhancedIntentGraph();
 *   graph.recordIntent({ intent: 'explain_function', domain: 'software', confidence: 0.9 });
 *   graph.recordIntent({ intent: 'fix_bug',          domain: 'software', confidence: 0.85 });
 *   console.log(graph.getStats());
 *   graph.save();
 */
export class EnhancedIntentGraph {
  private readonly sessionLookback: number;
  private readonly pruneThreshold: number;
  private readonly topClustersCount: number;
  private readonly persistenceKey: string | null;
  private readonly autoPersist: boolean;

  /** All intent nodes, keyed by node ID. */
  private nodes: Map<string, IntentNode> = new Map();

  /** All edges, keyed by `${from}→${to}:${type}`. */
  private edges: Map<string, IntentEdge> = new Map();

  /**
   * Sliding window of the last N intent IDs (bounded by sessionLookback).
   * Used to detect recent context transitions.
   */
  private sessionWindow: string[] = [];

  constructor(config: IntentGraphConfig = {}) {
    this.sessionLookback  = config.sessionLookback  ?? 200;
    this.pruneThreshold   = config.pruneThreshold   ?? 0.5;
    this.topClustersCount = config.topClusters      ?? 5;
    this.persistenceKey   = config.persistenceKey   !== undefined
                              ? config.persistenceKey
                              : 'haven:intent-graph';
    this.autoPersist      = config.autoPersist      ?? false;

    // Attempt to restore from storage
    this.load();
  }

  // ── Public Interface ──────────────────────────────────────────────────────

  /**
   * Record a new intent observation. This is the primary ingestion method.
   * Call once per NiyahEngine analysis result.
   *
   * @param params.intent      Canonical intent label
   * @param params.confidence  NiyahEngine confidence score (0–1)
   * @param params.dialect     Detected Arabic dialect (optional)
   * @param params.tone        Tone classifier output (optional)
   * @param params.domain      Domain router output (optional)
   * @param params.context     Extra context string for node ID hashing (optional)
   */
  recordIntent(params: {
    intent: string;
    confidence?: number;
    dialect?: string;
    tone?: string;
    domain?: string;
    context?: string;
  }): string {
    const { intent, confidence = 1.0, dialect, tone, domain, context } = params;
    const nodeId = this.makeNodeId(intent, domain, context);
    const now = Date.now();

    // ── Upsert node ──────────────────────────────────────────────────────
    const existing = this.nodes.get(nodeId);
    if (existing) {
      existing.lastSeen = now;
      existing.frequency++;
      existing.avgConfidence =
        existing.avgConfidence + (confidence - existing.avgConfidence) / existing.frequency;
      if (dialect)  existing.dialect = dialect;
      if (tone)     existing.tone    = tone;
      if (domain)   existing.domain  = domain;
    } else {
      this.nodes.set(nodeId, {
        id: nodeId,
        intent,
        dialect,
        tone,
        domain,
        firstSeen: now,
        lastSeen: now,
        frequency: 1,
        avgConfidence: confidence,
      });
    }

    // ── Add edges from the session window ────────────────────────────────
    for (const prevId of this.sessionWindow) {
      const prevNode = this.nodes.get(prevId);
      if (!prevNode) continue;

      const edgeType = this.classifyEdgeType(prevNode, this.nodes.get(nodeId)!);
      this.upsertEdge(prevId, nodeId, edgeType, now);
    }

    // ── Update sliding window ─────────────────────────────────────────────
    this.sessionWindow.push(nodeId);
    if (this.sessionWindow.length > this.sessionLookback) {
      this.sessionWindow.shift();
    }

    if (this.autoPersist) this.save();
    return nodeId;
  }

  /**
   * Get all outgoing edges from a given node, sorted by weight (descending).
   */
  getOutEdges(nodeId: string): IntentEdge[] {
    const edges: IntentEdge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.from === nodeId) edges.push(edge);
    }
    return edges.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Predict the most likely next intent given the current node,
   * using weighted edge traversal.
   *
   * @returns Top N candidates, sorted by predicted probability.
   */
  predictNext(nodeId: string, topN = 3): Array<{ nodeId: string; node: IntentNode; score: number }> {
    const outEdges = this.getOutEdges(nodeId);
    if (outEdges.length === 0) return [];

    const totalWeight = outEdges.reduce((s, e) => s + e.weight, 0);
    return outEdges
      .slice(0, topN)
      .map((e) => ({
        nodeId: e.to,
        node: this.nodes.get(e.to)!,
        score: e.weight / totalWeight,
      }))
      .filter((r) => r.node !== undefined);
  }

  /**
   * Remove edges below the prune threshold and/or older than maxAgeDays.
   * @param maxAgeDays  Edges last traversed more than N days ago are removed.
   *                    Default: 30 days.
   * @returns Number of edges removed.
   */
  prune(maxAgeDays = 30): number {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let removed = 0;
    for (const [key, edge] of this.edges) {
      if (edge.weight < this.pruneThreshold || edge.lastTraversed < cutoff) {
        this.edges.delete(key);
        removed++;
      }
    }
    // Remove orphan nodes (nodes with no edges and frequency = 1)
    for (const [id, node] of this.nodes) {
      if (node.frequency === 1 && !this.hasAnyEdge(id)) {
        this.nodes.delete(id);
      }
    }
    if (this.autoPersist) this.save();
    return removed;
  }

  /**
   * Perform simple connected-component cluster analysis.
   * Returns the top N clusters ordered by total frequency.
   */
  computeClusters(): IntentCluster[] {
    const visited = new Set<string>();
    const clusters: IntentCluster[] = [];

    for (const nodeId of this.nodes.keys()) {
      if (visited.has(nodeId)) continue;

      // BFS / DFS to find connected component
      const component: string[] = [];
      const queue = [nodeId];
      while (queue.length > 0) {
        const cur = queue.pop()!;
        if (visited.has(cur)) continue;
        visited.add(cur);
        component.push(cur);

        // Follow edges both directions
        for (const edge of this.edges.values()) {
          if (edge.from === cur && !visited.has(edge.to))   queue.push(edge.to);
          if (edge.to   === cur && !visited.has(edge.from)) queue.push(edge.from);
        }
      }

      if (component.length === 0) continue;

      const compNodes = component.map((id) => this.nodes.get(id)!).filter(Boolean);
      const totalFreq = compNodes.reduce((s, n) => s + n.frequency, 0);
      const avgConf   = compNodes.reduce((s, n) => s + n.avgConfidence, 0) / compNodes.length;

      // Find dominant domain
      const domainCounts: Record<string, number> = {};
      for (const n of compNodes) {
        if (n.domain) domainCounts[n.domain] = (domainCounts[n.domain] ?? 0) + n.frequency;
      }
      const dominantDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

      clusters.push({
        id: `cluster-${clusters.length}`,
        intents: compNodes.map((n) => n.intent),
        totalFrequency: totalFreq,
        dominantDomain,
        avgConfidence: avgConf,
      });
    }

    return clusters
      .sort((a, b) => b.totalFrequency - a.totalFrequency)
      .slice(0, this.topClustersCount);
  }

  /**
   * Compute comprehensive graph statistics.
   */
  getStats(): IntentGraphStats {
    const nodeCount = this.nodes.size;
    const edgeCount = this.edges.size;
    const maxEdges  = nodeCount > 1 ? nodeCount * (nodeCount - 1) : 1;
    const density   = edgeCount / maxEdges;

    const allEdges  = Array.from(this.edges.values());
    const avgWeight = allEdges.length > 0
      ? allEdges.reduce((s, e) => s + e.weight, 0) / allEdges.length
      : 0;
    const totalTraversals = allEdges.reduce((s, e) => s + e.traversals, 0);

    const topIntents = Array.from(this.nodes.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
      .map((n) => ({ intent: n.intent, frequency: n.frequency, avgConfidence: n.avgConfidence }));

    return {
      nodeCount,
      edgeCount,
      density,
      topClusters: this.computeClusters(),
      topIntents,
      avgEdgeWeight: avgWeight,
      totalTraversals,
      sessionLookback: this.sessionLookback,
    };
  }

  /**
   * Export the full graph as a JSON snapshot (for D3.js / Cytoscape / debugging).
   */
  toJSON(): IntentGraphSnapshot {
    return {
      version: '5.0.0',
      exportedAt: Date.now(),
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      sessionLookback: this.sessionLookback,
    };
  }

  /**
   * Restore from a JSON snapshot (overwrites current state).
   */
  fromJSON(snapshot: IntentGraphSnapshot): void {
    this.nodes.clear();
    this.edges.clear();
    this.sessionWindow = [];

    for (const node of snapshot.nodes) {
      this.nodes.set(node.id, { ...node });
    }
    for (const edge of snapshot.edges) {
      const key = this.edgeKey(edge.from, edge.to, edge.type);
      this.edges.set(key, { ...edge });
    }
  }

  /**
   * Persist the graph to localStorage.
   * No-op in non-browser environments or when persistenceKey is null.
   */
  save(): boolean {
    if (!this.persistenceKey) return false;
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const json = JSON.stringify(this.toJSON());
      window.localStorage.setItem(this.persistenceKey, json);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load graph from localStorage.
   * No-op if no data found or parse fails.
   */
  load(): boolean {
    if (!this.persistenceKey) return false;
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const raw = window.localStorage.getItem(this.persistenceKey);
      if (!raw) return false;
      const snapshot: IntentGraphSnapshot = JSON.parse(raw);
      this.fromJSON(snapshot);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wipe the graph and remove it from localStorage.
   */
  reset(): void {
    this.nodes.clear();
    this.edges.clear();
    this.sessionWindow = [];
    if (this.persistenceKey) {
      try {
        window.localStorage?.removeItem(this.persistenceKey);
      } catch { /* ignore */ }
    }
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private makeNodeId(intent: string, domain?: string, context?: string): string {
    // Deterministic ID so the same intent+domain maps to the same node
    const parts = [intent, domain ?? 'any', context?.slice(0, 32) ?? ''];
    return parts.join('::');
  }

  private edgeKey(from: string, to: string, type: EdgeType): string {
    return `${from}→${to}:${type}`;
  }

  private upsertEdge(from: string, to: string, type: EdgeType, now: number): void {
    const key = this.edgeKey(from, to, type);
    const baseWeight = EDGE_WEIGHTS[type];
    const existing = this.edges.get(key);

    if (existing) {
      existing.weight       += baseWeight;
      existing.lastTraversed = now;
      existing.traversals++;
    } else {
      this.edges.set(key, {
        from,
        to,
        type,
        weight: baseWeight,
        lastTraversed: now,
        traversals: 1,
      });
    }
  }

  /**
   * Classify the most appropriate edge type between two consecutive nodes.
   * Priority: context > root > domain > temporal
   */
  private classifyEdgeType(prev: IntentNode, next: IntentNode): EdgeType {
    // Context: intents are highly similar (same intent label)
    if (prev.intent === next.intent) return 'context';

    // Root: same Arabic morphological root (heuristic: first 3 chars of intent label)
    // In a real implementation this would consult NiyahEngine's root DB
    if (prev.intent.slice(0, 3) === next.intent.slice(0, 3)) return 'root';

    // Domain: both nodes belong to the same domain
    if (prev.domain && next.domain && prev.domain === next.domain) return 'domain';

    // Temporal: default — adjacent in time
    return 'temporal';
  }

  private hasAnyEdge(nodeId: string): boolean {
    for (const edge of this.edges.values()) {
      if (edge.from === nodeId || edge.to === nodeId) return true;
    }
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 3: DROP-IN REPLACEMENTS FOR EXISTING HAVEN CLASSES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * ModelRouter-compatible cache.
 * Replace the original 64-entry Map cache in ModelRouter with this.
 *
 * @example
 *   // In ModelRouter.ts, replace:
 *   //   private cache = new Map<string, ModelScore>();        // OLD
 *   // With:
 *   //   private cache = new ModelRouterCache();               // NEW
 */
export class ModelRouterCache extends EnhancedLRUCache<string, unknown> {
  constructor() {
    super({
      maxSize: 512,
      ttl: 600_000, // 10 minutes — models don't change frequently
      maxMemoryBytes: 32 * 1024 * 1024, // 32 MB
    });
  }

  /**
   * Warm the cache with the 16 default model families scored for common tasks.
   */
  warmWithDefaults(defaultScores: Array<[string, unknown]>): void {
    this.warm(defaultScores);
  }
}

/**
 * NiyahEngine-compatible intent graph.
 * Replace the original 20-session IntentGraph in NiyahEngine with this.
 *
 * @example
 *   // In NiyahEngine.ts, replace:
 *   //   private intentGraph = new IntentGraph(20);             // OLD
 *   // With:
 *   //   private intentGraph = new NiyahIntentGraph();          // NEW
 */
export class NiyahIntentGraph extends EnhancedIntentGraph {
  constructor() {
    super({
      sessionLookback: 200,
      pruneThreshold: 0.5,
      topClusters: 5,
      persistenceKey: 'haven:niyah-intent-graph',
      autoPersist: false, // Manual save for performance; call .save() on session end
    });
  }

  /**
   * Convenience method that matches the NiyahEngine API signature.
   */
  track(intent: string, confidence: number, dialect?: string, tone?: string, domain?: string): void {
    this.recordIntent({ intent, confidence, dialect, tone, domain });
  }

  /**
   * Save graph at the end of a session, trimming weak edges.
   */
  endSession(): void {
    this.prune(30); // Remove edges older than 30 days
    this.save();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 4: UTILITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Create a debounced version of `EnhancedLRUCache.purgeExpired()` to call
 * on a timer without blocking the main thread.
 *
 * @example
 *   const cache = new EnhancedLRUCache<string, string>({ ttl: 60_000 });
 *   const stopPurger = scheduleCachePurge(cache, 120_000); // every 2 min
 *   // Later:
 *   stopPurger();
 */
export function scheduleCachePurge<K, V>(
  cache: EnhancedLRUCache<K, V>,
  intervalMs = 120_000
): () => void {
  if (typeof setInterval === 'undefined') return () => {};
  const id = setInterval(() => cache.purgeExpired(), intervalMs);
  return () => clearInterval(id);
}

/**
 * Pretty-print cache stats to the console (useful during development).
 */
export function logCacheStats<K, V>(cache: EnhancedLRUCache<K, V>, label = 'Cache'): void {
  const s = cache.getStats();
  console.group(`[HAVEN ${label} Stats]`);
  console.log(`  Entries : ${s.currentSize} / ${s.maxSize}`);
  console.log(`  Hit rate: ${(s.hitRate * 100).toFixed(1)}%`);
  console.log(`  Hits    : ${s.hits}`);
  console.log(`  Misses  : ${s.misses}`);
  console.log(`  Evicted : ${s.evictions}`);
  console.log(`  Expired : ${s.expirations}`);
  console.log(`  Memory  : ${(s.estimatedMemoryBytes / 1024).toFixed(1)} KB`);
  console.groupEnd();
}

/**
 * Pretty-print intent graph stats to the console.
 */
export function logGraphStats(graph: EnhancedIntentGraph, label = 'IntentGraph'): void {
  const s = graph.getStats();
  console.group(`[HAVEN ${label} Stats]`);
  console.log(`  Nodes       : ${s.nodeCount}`);
  console.log(`  Edges       : ${s.edgeCount}`);
  console.log(`  Density     : ${(s.density * 100).toFixed(2)}%`);
  console.log(`  Avg weight  : ${s.avgEdgeWeight.toFixed(2)}`);
  console.log(`  Traversals  : ${s.totalTraversals}`);
  console.log(`  Top intents : ${s.topIntents.slice(0, 3).map((i) => i.intent).join(', ')}`);
  console.log(`  Clusters    : ${s.topClusters.length}`);
  console.groupEnd();
}

// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

export default {
  EnhancedLRUCache,
  EnhancedIntentGraph,
  ModelRouterCache,
  NiyahIntentGraph,
  EDGE_WEIGHTS,
  scheduleCachePurge,
  logCacheStats,
  logGraphStats,
};
