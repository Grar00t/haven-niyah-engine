#!/usr/bin/env python3
"""
NIYAH installer/bootstrap flow.

This intentionally avoids package installation so it remains safe on
externally-managed Python environments such as Ubuntu 24.04+.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path


HOME = Path.home() / ".niyah"
CFG = HOME / "cfg.json"


def load_existing_config() -> dict:
    if not CFG.exists():
        return {}
    try:
        return json.loads(CFG.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def pick_value(existing: dict, key: str, default: str = "") -> str:
    env_alias = key.upper().replace("_key", "_API_KEY").replace("ollama_url", "OLLAMA_HOST")
    value = existing.get(key) or os.environ.get(env_alias) or default
    return value


def ask(label: str, existing: dict, key: str, default: str = "") -> str:
    current = pick_value(existing, key, default)
    if not sys.stdin.isatty():
        return current

    masked = current[:8] + "..." if current and len(current) > 8 else current
    hint = f" [{masked}]" if masked else ""
    entered = input(f"  {label}{hint}: ").strip()
    return entered or current


def create_launcher(target: Path) -> None:
    if sys.platform == "win32":
        bin_dir = Path.home() / "AppData" / "Local" / "Microsoft" / "WindowsApps"
        bin_dir.mkdir(parents=True, exist_ok=True)
        launcher = bin_dir / "niyah.bat"
        launcher.write_text(f'@echo off\n"{sys.executable}" "{target}" %*\n', encoding="utf-8")
        return

    for bin_dir in [Path("/usr/local/bin"), Path.home() / ".local" / "bin"]:
        try:
            bin_dir.mkdir(parents=True, exist_ok=True)
            launcher = bin_dir / "niyah"
            launcher.write_text(f'#!/bin/sh\n"{sys.executable}" "{target}" "$@"\n', encoding="utf-8")
            launcher.chmod(0o755)
            return
        except PermissionError:
            continue


def main(argv: list[str] | None = None) -> int:
    HOME.mkdir(exist_ok=True)
    script_dir = Path(__file__).resolve().parent
    runtime_src = script_dir / "niyah_runtime.py"
    runtime_dst = HOME / "niyah_runtime.py"

    print(
        """
  ◈ NIYAH v3 INSTALLER
  ─────────────────────
"""
    )

    if not runtime_src.exists():
        print(f"  ✗ Runtime script not found: {runtime_src}")
        return 1

    print("  [1/3] Installing runtime files...")
    shutil.copy2(runtime_src, runtime_dst)
    print(f"  ✓ Installed runtime: {runtime_dst}")

    print("  [2/3] Creating launcher...")
    create_launcher(runtime_dst)
    print("  ✓ Launcher ready")

    print("\n  [3/3] Configure runtime")
    existing = load_existing_config()
    cfg = {
        "provider": "ollama",
        "ollama_url": ask("Ollama URL", existing, "ollama_url", "http://localhost:11434"),
        "ollama_model": ask("Ollama default model", existing, "ollama_model", "deepseek-r1:8b"),
        "alert_email": ask("Alert email", existing, "alert_email", ""),
        "monitor_interval": int(pick_value(existing, "monitor_interval", "30") or "30"),
        "status_file": pick_value(existing, "status_file", str(HOME / "status.json")),
    }

    CFG.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    print(f"  ✓ Config saved: {CFG}")

    print(
        f"""
  ─────────────────────
  DONE.

    niyah --mode monitor
    niyah --mode probe --once

  Files:
    Config:  {CFG}
    Status:  {cfg['status_file']}
  ─────────────────────
"""
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
