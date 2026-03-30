#!/usr/bin/env python3
"""
Compatibility entrypoint for NIYAH v3.

- Runtime flags delegate to the non-interactive runtime module.
- Plain execution launches the installer/bootstrap flow.
"""

from __future__ import annotations

import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))


def _is_runtime_invocation(argv: list[str]) -> bool:
    runtime_flags = {
        "--mode",
        "--once",
        "--interval",
        "--status-file",
        "--alert-email",
    }
    return any(arg in runtime_flags for arg in argv) or any(
        arg.startswith("--mode=") or arg.startswith("--interval=") for arg in argv
    )


def main() -> int:
    if _is_runtime_invocation(sys.argv[1:]):
        from niyah_runtime import main as runtime_main

        return runtime_main(sys.argv[1:])

    from niyah_installer import main as installer_main

    return installer_main(sys.argv[1:])


if __name__ == "__main__":
    raise SystemExit(main())
