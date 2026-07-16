<div align="center">

# HAVEN Niyah Engine
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-000000)](https://ollama.ai/)

[Live Demo](https://ide.khawrizm.com) · [Website](https://khawrizm.com) · [YouTube](https://youtube.com/@saudicyper) · [X/Twitter](https://x.com/khawrzm)

</div>

---

## 🧠 Architecture: Three-Lobe Engine

```
                    ┌─────────────────────┐
                    │   USER INPUT        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   SENSORY LOBE      │
                    │   ─────────────     │
                    │   • Arabic NLP      │
                    │   • 2,976 word forms │
                    │   • Dialect detect  │
                    │   • Intent scoring  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼─────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │ EXECUTIVE     │  │ COGNITIVE   │  │ OLLAMA      │
    │ ────────      │  │ ─────────   │  │ (Local)     │
    │ Model routing │  │ Anti-halluc │  │ niyah:v3    │
    │ Tier select   │  │ Confidence  │  │ deepseek-r1 │
    │ Fallback chain│  │ Memory      │  │ llama3.2    │
    └───────────────┘  └─────────────┘  └─────────────┘
```

## 🏗️ Components

| Component | Lines | Description |
|-----------|-------|-------------|
| **NiyahEngine v3** | 949 | Core AI orchestration — Three-Lobe Architecture |
| **SovereignBridge** | 953 | QEMU sandboxing, process isolation, IPC |
| **SovereignSessionCleaner** | 534 | AES-256-GCM encrypted session management |
| **CacheAndGraphImprovements** | 988 | LRU Cache (256) + Intent Graph (100 sessions) |
| **arabic-roots-expanded** | 1,548 | 2,976 Arabic word forms, 283 roots |
| **useNiyah.tsx** | 305 | React hook with SSE streaming |
| **niyah-route.ts** | 164 | Next.js/Express API handlers |
| **i18n.ts** | 1,744 | 10-language support (Arabic-first) |
| **Tests** | 1,211 | Behavioral mock test scaffold across 15 suites |

**Repository includes TypeScript and Python implementation components.**

## 🇸🇦 بالعربي

**خوارزم** مشروع لتطوير أدوات ذكاء اصطناعي مع دعم اللغة العربية والنماذج المحلية والسحابية.

- **HAVEN IDE** — مكونات لبيئة تطوير مدعومة بالذكاء الاصطناعي
- **محرك النية (NiyahEngine)** — معمارية ثلاثية الفصوص للذكاء الاصطناعي
- **KhawrizmOS** — مشروع نظام تشغيل ARM64 قيد التطوير

## 🔒 Security

- AES-256-GCM session encryption
- QEMU virtual-machine management components
## 📜 License

AGPL-3.0 — see [LICENSE](LICENSE)


## 🔗 Links

- **Website:** [khawrizm.com](https://khawrizm.com)
- **Live IDE:** [ide.khawrizm.com](https://ide.khawrizm.com)
- **YouTube:** [@saudicyper](https://youtube.com/@saudicyper)
- **X/Twitter:** [@khawrzm](https://x.com/khawrzm)

---

<div align="center">


</div>
