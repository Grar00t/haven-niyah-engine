# HAVEN Niyah Engine

Arabic-language intent analysis and hybrid model orchestration components for HAVEN.

[Website](https://khawrizm.com) · [YouTube](https://youtube.com/@saudicyper) · [X/Twitter](https://x.com/khawrzm)

## Components

| Component | Description |
|-----------|-------------|
| NiyahEngine | Core AI orchestration/routing layer |
| SovereignBridge | QEMU sandboxing, process isolation, IPC |
| SovereignSessionCleaner | Session state management with AES-256-GCM encryption |
| CacheAndGraphImprovements | LRU cache + intent graph tracking |
| arabic-roots-expanded | Arabic word-form/root data tables |
| useNiyah.tsx | React hook for streaming responses |
| niyah-route.ts | Next.js/Express API handlers |
| i18n.ts | Multi-language locale support |
| Tests | Test scaffold covering the above modules |

Repository includes TypeScript and Python implementation components.

## بالعربي

مشروع لتطوير أدوات ذكاء اصطناعي مع دعم اللغة العربية والنماذج المحلية والسحابية.

- **HAVEN IDE** — مكونات لبيئة تطوير مدعومة بالذكاء الاصطناعي
- **NiyahEngine** — طبقة توجيه/تنسيق نماذج الذكاء الاصطناعي
- **KhawrizmOS** — مشروع نظام تشغيل ARM64 قيد التطوير

## Security

- AES-256-GCM session encryption
- QEMU virtual-machine management components

## License

AGPL-3.0 — see [LICENSE](LICENSE)
