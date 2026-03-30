#!/usr/bin/env python3
"""
Non-interactive NIYAH runtime.

This process is intentionally small and stdlib-only so it can run under
systemd without package installation or stdin prompts.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib import error, request


HOME = Path.home() / ".niyah"
CFG = HOME / "cfg.json"
DEFAULT_INTERVAL = 30


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def merged_config(repo_root: Path) -> dict:
    env_file = parse_env_file(repo_root / ".env.niyah")
    json_cfg = load_json(CFG)
    env_cfg = {
        "ollama_url": os.environ.get("OLLAMA_HOST"),
        "ollama_model": os.environ.get("HAVEN_OLLAMA_MODEL"),
        "alert_email": os.environ.get("ALERT_EMAIL"),
        "monitor_interval": os.environ.get("NIYAH_MONITOR_INTERVAL"),
        "status_file": os.environ.get("NIYAH_STATUS_FILE"),
    }

    cfg = {
        "ollama_url": "http://localhost:11434",
        "ollama_model": "deepseek-r1:8b",
        "alert_email": "",
        "monitor_interval": DEFAULT_INTERVAL,
        "status_file": str(HOME / "status.json"),
    }

    # Lowest to highest precedence: JSON config -> env file -> environment.
    cfg.update({k: v for k, v in json_cfg.items() if v not in (None, "")})
    cfg.update(
        {
            "ollama_url": env_file.get("ollama_url") or env_file.get("OLLAMA_HOST", cfg["ollama_url"]),
            "ollama_model": env_file.get("ollama_model")
            or env_file.get("OLLAMA_MODEL")
            or env_file.get("HAVEN_OLLAMA_MODEL", cfg["ollama_model"]),
            "alert_email": env_file.get("alert_email") or env_file.get("ALERT_EMAIL", cfg["alert_email"]),
            "monitor_interval": env_file.get("monitor_interval")
            or env_file.get("NIYAH_MONITOR_INTERVAL", cfg["monitor_interval"]),
            "status_file": env_file.get("status_file") or env_file.get("NIYAH_STATUS_FILE", cfg["status_file"]),
        }
    )
    cfg.update({k: v for k, v in env_cfg.items() if v not in (None, "")})

    try:
        cfg["monitor_interval"] = int(cfg["monitor_interval"])
    except (TypeError, ValueError):
        cfg["monitor_interval"] = DEFAULT_INTERVAL

    return cfg


def http_json(url: str, payload: dict | None = None) -> tuple[int, dict]:
    data = None
    headers = {"Content-Type": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = request.Request(url, data=data, headers=headers)
    try:
        with request.urlopen(req, timeout=15) as response:
            status = getattr(response, "status", 200)
            body = response.read().decode("utf-8")
            return status, json.loads(body) if body else {}
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        parsed = json.loads(body) if body else {"error": exc.reason}
        return exc.code, parsed


def probe(cfg: dict) -> dict:
    tags_url = cfg["ollama_url"].rstrip("/") + "/api/tags"
    started_at = utc_now()
    try:
        status_code, payload = http_json(tags_url)
        models = payload.get("models", [])
        model_names = [model.get("name", "") for model in models if isinstance(model, dict)]
        desired_model = cfg["ollama_model"]
        model_available = desired_model in model_names
        status = {
            "timestamp": started_at,
            "ok": status_code == 200,
            "status_code": status_code,
            "ollama_url": cfg["ollama_url"],
            "ollama_model": desired_model,
            "model_available": model_available,
            "model_count": len(model_names),
            "models": model_names,
            "alert_email": cfg.get("alert_email", ""),
        }
        return status
    except Exception as exc:  # noqa: BLE001
        return {
            "timestamp": started_at,
            "ok": False,
            "status_code": 0,
            "ollama_url": cfg["ollama_url"],
            "ollama_model": cfg["ollama_model"],
            "model_available": False,
            "model_count": 0,
            "models": [],
            "alert_email": cfg.get("alert_email", ""),
            "error": str(exc),
        }


def write_status(path: Path, status: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(status, indent=2), encoding="utf-8")


def log_status(status: dict) -> None:
    level = "INFO" if status["ok"] else "ERROR"
    detail = (
        f"status={status['status_code']} models={status['model_count']} "
        f"selected={status['ollama_model']} available={status['model_available']}"
    )
    if status.get("error"):
        detail += f" error={status['error']}"
    print(f"[{status['timestamp']}] {level} {detail}", flush=True)


def run_monitor(cfg: dict, status_path: Path, once: bool) -> int:
    while True:
        status = probe(cfg)
        write_status(status_path, status)
        log_status(status)
        if once:
            return 0 if status["ok"] else 1
        time.sleep(max(5, cfg["monitor_interval"]))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="NIYAH runtime")
    parser.add_argument("--mode", choices=["monitor", "probe"], default="monitor")
    parser.add_argument("--once", action="store_true", help="Run a single probe and exit")
    parser.add_argument("--interval", type=int, help="Override monitor interval in seconds")
    parser.add_argument("--status-file", help="Override the status output file")
    parser.add_argument("--alert-email", help="Override alert email target")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    HOME.mkdir(exist_ok=True)
    repo_root = Path(__file__).resolve().parent
    cfg = merged_config(repo_root)

    if args.interval:
        cfg["monitor_interval"] = args.interval
    if args.status_file:
        cfg["status_file"] = args.status_file
    if args.alert_email:
        cfg["alert_email"] = args.alert_email

    status_path = Path(cfg["status_file"]).expanduser()
    once = args.once or args.mode == "probe"
    return run_monitor(cfg, status_path, once)


if __name__ == "__main__":
    raise SystemExit(main())
