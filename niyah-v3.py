#!/usr/bin/env python3
"""
NIYAH v3 — One-command installer
Works on: Kali/Ubuntu, Windows (Python), WSL
"""
import os, sys, subprocess, shutil, json
from pathlib import Path

HOME = Path.home() / ".niyah"
HOME.mkdir(exist_ok=True)
CFG  = HOME / "cfg.json"

print("""
  ◈ NIYAH v3 INSTALLER
  ─────────────────────
""")

# 1. Install deps
print("  [1/4] Installing Python deps...")
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q",
    "rich", "prompt-toolkit", "httpx", "anthropic", "openai"])
print("  ✓ Dependencies installed")

# 2. Copy main script
script_dir = Path(__file__).parent
src = script_dir / "niyah_v3.py"
dst = HOME / "niyah.py"
if src.exists():
    shutil.copy(src, dst)
    print(f"  ✓ Installed: {dst}")
else:
    print(f"  ✗ niyah_v3.py not found in {script_dir}")
    sys.exit(1)

# 3. Create launcher
print("  [2/4] Creating launcher...")
if sys.platform == "win32":
    bat = Path(sys.prefix) / "Scripts" / "niyah.bat"
    bat.write_text(f'@echo off\n"{sys.executable}" "{dst}" %*\n')
    print(f"  ✓ Windows launcher: {bat}")
    # Also create in D:\WORKSPACE if exists
    ws = Path("D:/WORKSPACE")
    if ws.exists():
        (ws / "niyah.bat").write_text(f'@echo off\n"{sys.executable}" "{dst}" %*\n')
        print(f"  ✓ Also in: D:\\WORKSPACE\\niyah.bat")
else:
    # Linux/Mac
    for bin_dir in [Path("/usr/local/bin"), Path.home() / ".local/bin"]:
        try:
            bin_dir.mkdir(parents=True, exist_ok=True)
            launcher = bin_dir / "niyah"
            launcher.write_text(f'#!/bin/bash\n"{sys.executable}" "{dst}" "$@"\n')
            launcher.chmod(0o755)
            print(f"  ✓ Launcher: {launcher}")
            break
        except PermissionError:
            continue
    # PATH reminder
    local_bin = Path.home() / ".local/bin"
    for rc in [Path.home() / ".bashrc", Path.home() / ".zshrc"]:
        if rc.exists():
            content = rc.read_text()
            if ".local/bin" not in content:
                rc.write_text(content + '\nexport PATH="$HOME/.local/bin:$PATH"\n')

# 4. Configure API keys
print("\n  [3/4] Configure API keys")
print("  (Press Enter to skip — you can set later with /set)\n")

existing = {}
if CFG.exists():
    try:
        existing = json.loads(CFG.read_text())
    except:
        pass

def ask(label, key, default=""):
    current = existing.get(key, os.environ.get(
        key.upper().replace("_key","_API_KEY").replace("ollama_url","OLLAMA_HOST"), default))
    masked = current[:8] + "..." if current and len(current) > 8 else current
    hint = f" [{masked}]" if masked else ""
    val = input(f"  {label}{hint}: ").strip()
    return val if val else current

cfg = {
    "provider":       "auto",
    "model":          "",
    "anthropic_key":  ask("Anthropic key (sk-ant-...)", "anthropic_key"),
    "openai_key":     ask("OpenAI key (sk-...)", "openai_key"),
    "deepseek_key":   ask("DeepSeek key", "deepseek_key"),
    "groq_key":       ask("Groq key", "groq_key"),
    "gemini_key":     ask("Gemini key", "gemini_key"),
    "ollama_url":     ask("Ollama URL", "ollama_url", "http://95.177.176.8:11434"),
    "ollama_model":   ask("Ollama default model", "ollama_model", "deepseek-r1:14b"),
    "max_tokens":     8192,
    "temperature":    0.7,
    "ctx_on":         True,
    "agent_on":       True,
    "stream":         True,
}

# Carry over any existing values not overwritten
for k, v in existing.items():
    if k not in cfg or not cfg[k]:
        cfg[k] = v

CFG.write_text(json.dumps(cfg, indent=2))
print(f"\n  ✓ Config saved: {CFG}")

# 5. Test run
print("\n  [4/4] Testing...")
result = subprocess.run(
    [sys.executable, str(dst), "--no-ctx", "--no-agent", "--prompt", "ping"],
    capture_output=True, text=True, timeout=15)
if "MISSING" in result.stdout or "No provider" in result.stdout:
    print("  ✓ Script runs (no provider configured yet — add a key above)")
elif result.returncode == 0:
    print("  ✓ Running OK")
else:
    print(f"  ✗ {result.stderr[:200]}")

print(f"""
  ─────────────────────
  DONE. Launch:

    niyah                           # interactive
    niyah --prompt "hello"          # one-shot
    niyah -p ollama                 # force Ollama
    niyah -p anthropic              # force Claude
    niyah --set anthropic_key <k>   # set key from CLI

  In NIYAH:
    /set anthropic_key sk-ant-...
    /sw ollama                      # switch to local
    /status                         # check everything
    /help                           # all commands

  Files:
    Config:  {CFG}
    Memory:  {HOME / 'mem.db'}
    Context: {HOME / 'context.md'}
  ─────────────────────
""")
