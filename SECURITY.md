# Security Policy

Niyah Engine is self-hosted and ships **zero telemetry** by design. We take
security reports seriously and ask that you disclose responsibly.

## Reporting a vulnerability

**Do not** open a public GitHub issue for security problems.

Use one of these private channels:

1. **GitHub Security Advisories** (preferred):
   <https://github.com/Grar00t/haven-niyah-engine/security/advisories/new>

2. **Email:** `security@khawrizm.com`
   Please include "niyah-engine" in the subject line.

For sensitive reports, you may encrypt mail with the maintainer's public key
(available on request — ask in the initial unencrypted ping).

## What to include

- A short description of the issue and its impact.
- Steps to reproduce, or a proof-of-concept.
- The commit SHA / version you tested against.
- Your name / handle for the credit (or "anonymous" if preferred).

## Disclosure window

- We aim to acknowledge reports **within 72 hours**.
- Initial assessment and severity rating: **within 7 days**.
- Coordinated disclosure: typically **90 days** from the initial report, or
  sooner if a fix ships earlier.
- We will credit reporters in the advisory unless they request otherwise.

## Scope

In scope:

- The TypeScript engine (`src/engine/**`)
- The API route handlers (`src/api/**`)
- The React hook and panel (`src/hooks/**`)
- The Python health-probe runtime/installer (`niyah_*.py`)

Out of scope:

- Issues that require a malicious local user with shell access on the host.
- Vulnerabilities in upstream LLM providers (Anthropic, OpenAI, etc.) — please
  report those to the provider directly.
- Theoretical issues without a working PoC.

## Hardening notes

- Niyah does not call any external analytics or telemetry endpoint. If you
  observe such a call, treat it as a security report.
- Provider API keys are read from environment variables only and never
  written to disk by the engine itself.
- The Python health probe writes status JSON to `~/.niyah/status.json`.
  Do not place secrets there; treat that file as readable by other local
  processes that share your user.
