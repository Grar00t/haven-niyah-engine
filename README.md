# Niyah Engine

Niyah Engine is a TypeScript orchestration layer for local language-model execution. It analyzes request text deterministically, selects an installed compatible model, executes through a provider adapter, validates and cleans the generated response, and returns execution metadata.

## Runtime

The canonical runtime is TypeScript/Node.js. The default provider is Ollama and is restricted by the adapter to a localhost endpoint. The engine does not contain a model of its own; model intelligence comes from the selected provider model.

## Architecture

`input -> normalize -> classify -> policy -> route/model selection -> provider execution -> validate -> clean -> response`

The classifier provides language, dialect, task, lobe, and evidence. Confidence is nullable because the built-in deterministic rules are not empirically calibrated probabilities. Model metadata is populated from provider discovery and exposes capabilities rather than fabricated quality scores.

The engine maintains bounded in-process session history so recent context is included in subsequent model calls. It does not provide persistent storage or cross-process memory.

## Local model execution

On startup the Ollama adapter discovers installed models from `/api/tags`. Model selection considers task/language capability, advertised context window, advertised memory requirement when available, speed metadata, and detected host RAM/GPU signals. A requested model must exactly match a discovered model.

Provider failures caused by timeout, connection failure, HTTP failure, or malformed provider responses can trigger a fallback to another installed compatible local model. Application-level validation failures are not counted as transport failures.

## Configuration

`OLLAMA_HOST` defaults to `http://localhost:11434`.

`NIYAH_MAX_RAM_GB` optionally limits the memory budget used during model selection.

`NIYAH_GPU_VRAM_GB` can provide detected GPU VRAM when the runtime cannot discover it directly; `NVIDIA_VISIBLE_DEVICES` is also recognized as a GPU-presence signal.

## API

`POST /ask` accepts JSON with `input`, optional `sessionId`, optional exact `model`, optional `maxOutputTokens`, and optional `detailed`/`concise` flags.

The response returns `text`, `provider`, `model`, `locality`, `lobe`, `latencyMs`, `tokenUsage`, `fallback`, `executionStatus`, `sessionId`, `vector`, and a request identifier. Token usage is provider-reported when available and explicitly marked estimated otherwise.

The HTTP adapter validates JSON content type, request size, input size, model/session identifiers, and JSON parsing before invoking the engine.

## Security boundaries

The Ollama adapter only accepts localhost provider addresses. API request bodies and generated provider responses are size-bounded. Public errors do not expose internal exception text or filesystem paths. Routing is deterministic and does not delegate execution policy to model output.

The repository also contains process/QEMU isolation and AES-256-GCM session-cleanup components. They are security primitives, not evidence that every request is isolated or encrypted by default.

## Testing

The test suite is behavior-oriented and covers Unicode normalization, Arabic/English/mixed language detection, dialect uncertainty, layered classification, prompt-injection-resistant routing, response deduplication, empty output validation, real/estimated token accounting, bounded session memory, cache context separation, model fallback, and transport-vs-application error handling.

Run:

```bash
npm install
npm test
npm run typecheck
```

## Limitations

Cloud providers are not implemented as first-party adapters. Session memory is in-process only. GPU VRAM is only used when available through configured/runtime-detectable signals. The deterministic classifier is not a calibrated statistical model and therefore reports unknown confidence rather than invented probabilities.

## License

MIT. See [LICENSE](LICENSE).
