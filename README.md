<div align="center">

# 🛡️ HAVEN — The Sovereign Algorithm

### Saudi Arabia's First Sovereign AI Development Environment

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-000000)](https://ollama.ai/)
[![Zero Telemetry](https://img.shields.io/badge/Telemetry-ZERO-00ff41)](https://khawrizm.com)
[![Made in Riyadh](https://img.shields.io/badge/Made_in-Riyadh_🇸🇦-006c35)](https://khawrizm.com)

**الخوارزمية دائماً تعود للوطن**
*The Algorithm Always Returns Home*

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

## ⚡ Quick Start

```bash
# Clone
git clone https://github.com/Grar00t/haven-sovereign.git
cd haven-sovereign

# Install
npm install

# Run (development)
npm run dev
# → http://localhost:5173

# Build (production)
npm run build
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
| **Tests** | 1,211 | 102 tests across 15 suites |

**Total: 8,395+ lines of production TypeScript**

## 🆚 Comparison

| Feature | HAVEN | VSCode | Cursor | Copilot |
|---------|:-----:|:------:|:------:|:-------:|
| Zero Telemetry | ✅ | ❌ | ❌ | ❌ |
| Local AI (Ollama) | ✅ | ❌ | ❌ | ❌ |
| Arabic NLP | ✅ | ❌ | ❌ | ❌ |
| Gulf Dialect | ✅ | ❌ | ❌ | ❌ |
| Multi-Model (11) | ✅ | ❌ | ✅ | ❌ |
| Offline Mode | ✅ | ✅ | ❌ | ❌ |
| Open Source | ✅ | Partial | ❌ | ❌ |
| Fraud Detection | ✅ | ❌ | ❌ | ❌ |
| Sovereign OS | ✅ | ❌ | ❌ | ❌ |
| PDPL Compliant | ✅ | ❌ | ❌ | ❌ |

## 🇸🇦 بالعربي

**خوارزم** هو أول نظام بيئي سيادي للذكاء الاصطناعي من السعودية.

- **HAVEN IDE** — بيئة تطوير متكاملة تعمل محلياً بالكامل
- **محرك النية (NiyahEngine)** — معمارية ثلاثية الفصوص للذكاء الاصطناعي
- **KhawrizmOS** — نظام تشغيل سيادي ARM64

صفر تتبع. صفر سحابة. سيادة كاملة.

## 🔒 Security

- AES-256-GCM session encryption
- Zero telemetry (no data leaves your machine)
- Phalanx Gate zero-trust firewall
- QEMU sandboxing for untrusted processes
- PDPL (Saudi Data Protection) compliant
- NCA-ECC compatible

## 📜 License

AGPL-3.0 — see [LICENSE](LICENSE)

Commercial license available for enterprises: contact@khawrizm.com

## 🔗 Links

- **Website:** [khawrizm.com](https://khawrizm.com)
- **Live IDE:** [ide.khawrizm.com](https://ide.khawrizm.com)
- **YouTube:** [@saudicyper](https://youtube.com/@saudicyper)
- **X/Twitter:** [@khawrzm](https://x.com/khawrzm)
- **Company:** Ghala Rafaa Al-Omari Co. (CR: 7050426415)

---

<div align="center">

**Built by [Sulaiman Alshammari](https://github.com/Grar00t) (Dragon403) in Riyadh, Saudi Arabia**

*From Baghdad's House of Wisdom (820 AD) to Riyadh's Sovereign AI (2026)*

الخوارزمية دائماً تعود للوطن 🇸🇦

</div>
