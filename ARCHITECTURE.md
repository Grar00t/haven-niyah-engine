# Architecture

This document records the load-bearing decisions in `haven-niyah-engine`
so reviewers do not have to re-derive them from grep.

## Canonical engine: v3

`src/engine/niyah-engine-v3.ts` is the single source of truth for the
Niyah orchestration engine. Everything that talks to a model goes
through it:

- `src/api/niyah-route.ts` — Next.js / Express handlers
- `src/hooks/useNiyah.tsx` — React hook + panel
- `src/index.ts` — package main entry

The engine class is `NiyahEngine`; the default singleton is exported as
`niyah`.

### Why v3, not v5

A previous experimental rewrite (`niyah-engine-v5.ts`) explored ideas
like a circuit breaker, a small response cache, identity-guard logic,
and RAM-aware model selection. It was never wired to the API route and
shipped types that were **incompatible** with v3 (different `TaskType`
union, different `Dialect` union, etc.).

Shipping both engines side-by-side caused two practical problems:

1. **Type collision.** A consumer importing `Dialect` from one file and
   `TaskType` from the other got a contradictory model.
2. **Behaviour drift.** v5 dropped v3's multi-provider fallback chain
   and only supported single-model Ollama calls — strictly weaker for
   the production code path.

Decision (see PR #5 / commit decommissioning v5): **archive v5** under
`src/engine/_archived/niyah-engine-v5.ts`. The folder is excluded from
`tsconfig.json` so it does not compile, ship, or appear in
`dist/`. It is kept on disk only as historical reference for the ideas
that may be ported back to v3 in later work.

## Deferred work

The following is **explicitly out of scope** for the engine
consolidation step and tracked separately:

- **Tier 2 / T2.2** — promoting the three lobes to a real `Lobe<I,O>`
  interface with pluggable implementations. Today the lobes are three
  static classes (`SensoryLobe`, `ExecutiveLobe`, `CognitiveLobe`)
  inside v3.
- **Tier 2 / T2.5** — wiring `arabic-roots-expanded.ts` into the
  Sensory lobe. The dataset exists but no engine code imports it.
- **Tier 2 / T2.6** — wiring `CacheAndGraphImprovements.ts` into the
  engine memory path. The LRU + intent graph are well-implemented but
  unconsumed.
- **Tier 3 / T3.1** — replacing v5's substring identity-guard with a
  real classifier. Not ported back to v3 because the substring approach
  was a footgun (legitimate prompts mentioning "GPT" or "Claude" got
  hijacked).
- **Tier 3 / T3.2** — proper circuit breaker (closed / open / half-open
  with single-flight probe). v5's version was eager-reset; not worth
  porting as-is.

## What's load-bearing right now

| File | Role |
| --- | --- |
| `src/engine/niyah-engine-v3.ts` | Engine, model registry, provider adapters, streaming for Ollama + Anthropic |
| `src/api/niyah-route.ts` | Next.js / Express handlers, SSE wrapper |
| `src/hooks/useNiyah.tsx` | React hook + panel component (consumer-side) |
| `src/index.ts` | Package entry; re-exports v3 |

## What's in the repo but **not** load-bearing

- `src/engine/SovereignBridge.ts` — QEMU control + process spawn library; no consumer in this repo. Kept for reference; review in a separate ownership decision.
- `src/engine/SovereignSessionCleaner.ts` — TTL/AES session cleaner; no consumer in this repo.
- `src/engine/CacheAndGraphImprovements.ts` — best-quality LRU + intent graph in the repo; not yet wired (T2.6).
- `src/nlp/arabic-roots-expanded.ts` — 2,976-form Arabic root dataset; not yet wired (T2.5).
- `src/i18n/i18n.ts` — 10-locale i18n table; not consumed by the engine.
- `niyah_runtime.py` / `niyah_installer.py` / `niyah-v3.py` — Python health-probe + installer; not coupled to the TS engine over IPC.

These are kept because they may have consumers in sibling repos
(`haven-sovereign`, `niyah-engine`) or are queued for wiring in a later
tier. They do **not** affect the runtime served by
`src/api/niyah-route.ts`.

## Single-engine invariant

Going forward:

- New features land in v3 only.
- Provider adapters live in v3 only.
- If an experimental rewrite is started, it lives on a feature branch
  or under `src/engine/_experiments/` — never in parallel with v3 on
  `main`.
