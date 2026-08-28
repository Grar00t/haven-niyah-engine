# Niyah Engine

Arabic-language intent analysis and local model orchestration components.

## Components

| Component | Description |
|-----------|-------------|
| NiyahEngine | Core intent analysis and model routing layer |
| SovereignBridge | QEMU sandboxing, process isolation, IPC |
| SovereignSessionCleaner | Session state management with AES-256-GCM encryption |
| CacheAndGraphImprovements | LRU cache and intent graph tracking |
| arabic-roots-expanded | Arabic word-form/root data tables |
| useNiyah.tsx | React hook for streaming responses |
| niyah-route.ts | API handlers |
| i18n.ts | Multi-language locale support |
| Tests | Automated test scaffold |

## Architecture

Niyah separates request analysis from model execution:

- Sensory: language, dialect, and input analysis
- Executive: task routing and model selection
- Cognitive: reasoning and validation
- Runtime: local model execution through configured providers

The default local runtime is Ollama. Cloud providers are optional configuration choices.

## Security

- AES-256-GCM session encryption
- QEMU-based isolation components
- Local-first model execution support

## License

AGPL-3.0 — see [LICENSE](LICENSE)
