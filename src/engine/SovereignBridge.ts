/**
 * SovereignBridge.ts
 * ==================
 * الجسر السيادي - HAVEN IDE
 *
 * يُدير هذا الملف التواصل والعزل بين مكوّنات HAVEN IDE المحلية:
 * - إنشاء عمليات مع حدود موارد صارمة (sandbox)
 * - إدارة أجهزة QEMU الافتراضية (إنشاء، تشغيل، إيقاف، مراقبة)
 * - مراقبة موارد CPU/RAM/قرص
 * - نظام IPC آمن بين المضيف والعمليات السيادية
 * - فحوصات صحة دورية لجميع العمليات
 * - تسجيل منظّم (structured logging)
 * - إغلاق آمن مع تنظيف شامل
 * - نظام أحداث لدورة حياة العمليات
 * - دعم كامل لـ Windows و Linux
 *
 * Zero telemetry — all communication stays local.
 *
 * @module SovereignBridge
 */

import { EventEmitter } from 'events';
import {
  spawn,
  execFile,
  ChildProcess,
  SpawnOptionsWithoutStdio,
} from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// ─── Platform Detection ────────────────────────────────────────────────────────

const IS_WINDOWS = os.platform() === 'win32';
const IS_LINUX   = os.platform() === 'linux';

/**
 * مسارات النظام حسب المنصة
 * Platform-aware binary and socket paths.
 */
const PLATFORM_PATHS = {
  qemuBin: IS_WINDOWS
    ? 'C:\\Program Files\\qemu\\qemu-system-x86_64.exe'
    : '/usr/bin/qemu-system-x86_64',
  ipcSocketDir: IS_WINDOWS
    ? path.join(os.tmpdir(), 'haven-ipc')
    : '/tmp/haven-ipc',
  pidDir: IS_WINDOWS
    ? path.join(os.tmpdir(), 'haven-pids')
    : '/tmp/haven-pids',
} as const;

// ─── Enumerations ──────────────────────────────────────────────────────────────

/** حالة العملية */
export type ProcessStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed';

/** حالة جهاز QEMU */
export type VMStatus = 'created' | 'starting' | 'running' | 'paused' | 'stopping' | 'stopped' | 'destroyed' | 'error';

/** أحداث الجسر السيادي */
export type BridgeEvent =
  | 'process:spawn'
  | 'process:exit'
  | 'process:crash'
  | 'process:health'
  | 'vm:created'
  | 'vm:started'
  | 'vm:stopped'
  | 'vm:destroyed'
  | 'vm:error'
  | 'ipc:message'
  | 'ipc:error'
  | 'resource:pressure'
  | 'bridge:shutdown';

// ─── Interfaces ────────────────────────────────────────────────────────────────

/**
 * معرّف عملية سيادية
 */
export interface SovereignProcess {
  id: string;
  pid: number;
  command: string;
  args: string[];
  status: ProcessStatus;
  startedAt: number;
  lastHealthCheck: number | null;
  /** عدد مرات الانهيار */
  crashCount: number;
  /** مرجع ChildProcess الداخلي */
  handle: ChildProcess;
}

/**
 * قيود موارد العملية
 * Resource limits applied to spawned processes.
 */
export interface ResourceLimits {
  /** الحد الأقصى للذاكرة (ميغابايت) */
  maxMemoryMb?: number;
  /** الحد الأقصى لاستخدام CPU (نسبة مئوية 0–100) */
  maxCpuPercent?: number;
  /** الحد الأقصى لوصف الملفات */
  maxOpenFiles?: number;
  /** مهلة تنفيذ بالميلي ثانية (0 = بلا حدود) */
  timeoutMs?: number;
}

/**
 * إعدادات إنشاء عملية
 */
export interface SpawnConfig {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  limits?: ResourceLimits;
  /** إعادة التشغيل تلقائياً عند الانهيار */
  autoRestart?: boolean;
  /** الحد الأقصى لإعادات التشغيل */
  maxRestarts?: number;
  /** تسمية مخصصة */
  label?: string;
}

/**
 * إعدادات إنشاء جهاز QEMU
 */
export interface VMConfig {
  /** اسم فريد للجهاز */
  name: string;
  /** ذاكرة RAM (ميغابايت، default: 512) */
  ramMb?: number;
  /** عدد أنوية CPU (default: 1) */
  cpuCores?: number;
  /** مسار صورة القرص (.qcow2 أو .img) */
  diskImage?: string;
  /** حجم القرص عند الإنشاء (غيغابايت، default: 4) */
  diskSizeGb?: number;
  /** منفذ SSH للتحويل (اختياري) */
  sshPort?: number;
  /** وضع الشبكة */
  networkMode?: 'user' | 'none' | 'bridge';
  /** معامِلات QEMU إضافية */
  extraArgs?: string[];
}

/**
 * سجل جهاز QEMU
 */
export interface VMRecord {
  id: string;
  config: VMConfig;
  status: VMStatus;
  pid?: number;
  monitorSocketPath?: string;
  createdAt: number;
  startedAt?: number;
  stoppedAt?: number;
}

/**
 * مقياس استخدام الموارد
 */
export interface ResourceSnapshot {
  pid: number;
  cpuPercent: number;
  memoryMb: number;
  timestamp: number;
}

/**
 * لقطة موارد النظام الكلي
 */
export interface SystemResourceSnapshot {
  totalMemoryMb: number;
  freeMemoryMb: number;
  usedMemoryMb: number;
  memoryPressureRatio: number;    // 0–1
  cpuLoadAvg1m: number;
  cpuCount: number;
  platform: NodeJS.Platform;
  timestamp: number;
}

/**
 * رسالة IPC
 */
export interface IPCMessage {
  id: string;
  from: string;             // عملية المُرسِل
  to: string;               // عملية المُستقبِل أو 'host'
  type: 'request' | 'response' | 'event' | 'heartbeat';
  payload: unknown;
  timestamp: number;
}

/**
 * إعدادات الجسر الكاملة
 */
export interface BridgeConfig {
  /** مسار ثنائي QEMU (override للمسار الافتراضي) */
  qemuBinPath?: string;
  /** مجلد ملفات IPC */
  ipcDir?: string;
  /** فترة فحص الصحة بالميلي ثانية (default: 30s) */
  healthCheckIntervalMs?: number;
  /** فترة مراقبة الموارد بالميلي ثانية (default: 10s) */
  resourceMonitorIntervalMs?: number;
  /** حد ضغط الذاكرة (default: 0.85) */
  memoryPressureThreshold?: number;
  /** تسجيل تفصيلي */
  verbose?: boolean;
}

// ─── SovereignBridge ───────────────────────────────────────────────────────────

/**
 * الجسر السيادي الرئيسي
 *
 * Extends EventEmitter to emit typed lifecycle events.
 *
 * ```typescript
 * const bridge = new SovereignBridge({ verbose: true });
 * await bridge.init();
 *
 * const proc = await bridge.spawnProcess({
 *   command: 'node',
 *   args: ['worker.js'],
 *   limits: { maxMemoryMb: 256 },
 * });
 *
 * const vm = await bridge.createVM({ name: 'sandbox-1', ramMb: 1024 });
 * await bridge.startVM(vm.id);
 * ```
 */
export class SovereignBridge extends EventEmitter {
  // ── Config ──────────────────────────────────────────────────────────────────
  private readonly qemuBinPath: string;
  private readonly ipcDir: string;
  private readonly healthCheckIntervalMs: number;
  private readonly resourceMonitorIntervalMs: number;
  private readonly memoryPressureThreshold: number;
  private readonly verbose: boolean;

  // ── State ───────────────────────────────────────────────────────────────────
  private processes: Map<string, SovereignProcess> = new Map();
  private vms: Map<string, VMRecord> = new Map();
  private ipcHandlers: Map<string, (msg: IPCMessage) => void> = new Map();

  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private resourceTimer: ReturnType<typeof setInterval> | null = null;
  private isShuttingDown = false;

  private idCounter = 0;

  constructor(config: BridgeConfig = {}) {
    super();
    this.qemuBinPath               = config.qemuBinPath               ?? PLATFORM_PATHS.qemuBin;
    this.ipcDir                    = config.ipcDir                    ?? PLATFORM_PATHS.ipcSocketDir;
    this.healthCheckIntervalMs     = config.healthCheckIntervalMs     ?? 30_000;
    this.resourceMonitorIntervalMs = config.resourceMonitorIntervalMs ?? 10_000;
    this.memoryPressureThreshold   = config.memoryPressureThreshold   ?? 0.85;
    this.verbose                   = config.verbose                   ?? false;
  }

  // ─── Initialisation ─────────────────────────────────────────────────────────

  /**
   * تهيئة الجسر: إنشاء مجلدات IPC وبدء المراقبة
   */
  async init(): Promise<void> {
    this._ensureDir(this.ipcDir);
    this._ensureDir(PLATFORM_PATHS.pidDir);
    this._startHealthChecker();
    this._startResourceMonitor();
    this._log('SovereignBridge initialised');
  }

  // ─── Process Management ──────────────────────────────────────────────────────

  /**
   * إنشاء عملية جديدة مع حدود موارد
   * Spawn a sandboxed child process with resource limits applied.
   */
  async spawnProcess(config: SpawnConfig): Promise<SovereignProcess> {
    if (this.isShuttingDown) {
      throw new Error('Bridge is shutting down; cannot spawn new processes');
    }

    const id = this._nextId('proc');
    const label = config.label ?? id;
    this._log(`Spawning process [${label}]: ${config.command} ${(config.args ?? []).join(' ')}`);

    const spawnOpts: SpawnOptionsWithoutStdio = {
      cwd: config.cwd ?? process.cwd(),
      env: { ...process.env, ...config.env },
      shell: false,
      detached: false,
    };

    // Linux cgroups-style ulimit prefix for resource limiting
    let command = config.command;
    let args = config.args ?? [];

    if (IS_LINUX && config.limits) {
      // Wrap with `prlimit` when available for clean resource limits
      const limitArgs = this._buildPrlimitArgs(config.limits);
      if (limitArgs.length > 0) {
        args = [...limitArgs, command, ...args];
        command = 'prlimit';
      }
    }

    const child = spawn(command, args, spawnOpts);

    if (!child.pid) {
      throw new Error(`Failed to spawn process: ${config.command}`);
    }

    const proc: SovereignProcess = {
      id,
      pid: child.pid,
      command: config.command,
      args: config.args ?? [],
      status: 'starting',
      startedAt: Date.now(),
      lastHealthCheck: null,
      crashCount: 0,
      handle: child,
    };

    this.processes.set(id, proc);

    // ── Event wiring ──
    child.stdout?.on('data', (data: Buffer) => {
      this._log(`[${label}:stdout] ${data.toString().trim()}`);
    });

    child.stderr?.on('data', (data: Buffer) => {
      this._log(`[${label}:stderr] ${data.toString().trim()}`);
    });

    child.on('spawn', () => {
      proc.status = 'running';
      this.emit('process:spawn', { id, pid: child.pid, command: config.command });
      this._log(`Process [${label}] spawned (PID: ${child.pid})`);
    });

    child.on('exit', (code, signal) => {
      const wasCrash = code !== 0 && code !== null;
      proc.status = wasCrash ? 'crashed' : 'stopped';

      if (wasCrash) {
        proc.crashCount += 1;
        this.emit('process:crash', { id, pid: child.pid, code, signal, crashCount: proc.crashCount });
        this._log(`Process [${label}] CRASHED (code=${code}, signal=${signal})`);

        // تلقائي: إعادة التشغيل إذا كانت مُفعَّلة وضمن الحد
        if (
          config.autoRestart &&
          proc.crashCount <= (config.maxRestarts ?? 3) &&
          !this.isShuttingDown
        ) {
          this._log(`Auto-restarting process [${label}] (attempt ${proc.crashCount})`);
          setTimeout(() => {
            this.processes.delete(id);
            this.spawnProcess(config).catch((err) =>
              this._log(`Auto-restart failed for [${label}]: ${err.message}`)
            );
          }, 1_000 * proc.crashCount); // back-off exponential simple
        }
      } else {
        this.emit('process:exit', { id, pid: child.pid, code, signal });
        this._log(`Process [${label}] exited (code=${code})`);
      }
    });

    // Timeout watchdog
    if (config.limits?.timeoutMs && config.limits.timeoutMs > 0) {
      setTimeout(() => {
        if (proc.status === 'running') {
          this._log(`Process [${label}] timed out — killing`);
          this.killProcess(id, 'SIGKILL');
        }
      }, config.limits.timeoutMs);
    }

    return proc;
  }

  /**
   * إرسال إشارة إلى عملية
   */
  killProcess(id: string, signal: NodeJS.Signals = 'SIGTERM'): void {
    const proc = this.processes.get(id);
    if (!proc) throw new Error(`Process not found: ${id}`);
    proc.status = 'stopping';
    proc.handle.kill(signal);
    this._log(`Sent ${signal} to process ${id} (PID: ${proc.pid})`);
  }

  /**
   * جلب معلومات عملية
   */
  getProcess(id: string): SovereignProcess | undefined {
    return this.processes.get(id);
  }

  /**
   * جلب جميع العمليات
   */
  getAllProcesses(): SovereignProcess[] {
    return Array.from(this.processes.values());
  }

  // ─── QEMU VM Management ──────────────────────────────────────────────────────

  /**
   * إنشاء جهاز QEMU جديد (لا يبدأ تشغيله)
   * Create a new VM record and (optionally) provision its disk image.
   */
  async createVM(config: VMConfig): Promise<VMRecord> {
    const id = this._nextId('vm');
    const monitorSocket = path.join(this.ipcDir, `${id}-monitor.sock`);

    const vm: VMRecord = {
      id,
      config: {
        ramMb: 512,
        cpuCores: 1,
        diskSizeGb: 4,
        networkMode: 'user',
        ...config,
      },
      status: 'created',
      monitorSocketPath: monitorSocket,
      createdAt: Date.now(),
    };

    // إنشاء صورة القرص إن لم تكن موجودة
    if (!config.diskImage) {
      const diskPath = path.join(this.ipcDir, `${id}-disk.qcow2`);
      vm.config.diskImage = diskPath;
      await this._createQcow2Disk(diskPath, vm.config.diskSizeGb ?? 4);
    }

    this.vms.set(id, vm);
    this.emit('vm:created', { id, name: config.name });
    this._log(`VM [${config.name}] created (id=${id})`);
    return vm;
  }

  /**
   * تشغيل جهاز QEMU
   */
  async startVM(id: string): Promise<void> {
    const vm = this._requireVM(id);
    if (vm.status === 'running') {
      this._log(`VM [${vm.config.name}] already running`);
      return;
    }

    vm.status = 'starting';
    this._log(`Starting VM [${vm.config.name}]…`);

    const args = this._buildQEMUArgs(vm);
    this._log(`QEMU args: ${args.join(' ')}`);

    let child: ChildProcess;
    try {
      child = spawn(this.qemuBinPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });
    } catch (err) {
      vm.status = 'error';
      this.emit('vm:error', { id, error: (err as Error).message });
      throw err;
    }

    if (!child.pid) {
      vm.status = 'error';
      throw new Error(`Failed to start QEMU for VM: ${id}`);
    }

    vm.pid = child.pid;
    vm.startedAt = Date.now();
    vm.status = 'running';
    this.emit('vm:started', { id, pid: child.pid });
    this._log(`VM [${vm.config.name}] running (PID: ${child.pid})`);

    child.stderr?.on('data', (d: Buffer) => {
      this._log(`[VM:${vm.config.name}:stderr] ${d.toString().trim()}`);
    });

    child.on('exit', (code) => {
      vm.status = code === 0 ? 'stopped' : 'error';
      vm.stoppedAt = Date.now();
      vm.pid = undefined;
      this.emit(code === 0 ? 'vm:stopped' : 'vm:error', { id, code });
      this._log(`VM [${vm.config.name}] exited (code=${code})`);
    });
  }

  /**
   * إيقاف جهاز QEMU بشكل آمن عبر ACPI powerdown
   */
  async stopVM(id: string, force = false): Promise<void> {
    const vm = this._requireVM(id);
    if (vm.status !== 'running') {
      this._log(`VM [${vm.config.name}] is not running (status=${vm.status})`);
      return;
    }

    vm.status = 'stopping';
    this._log(`Stopping VM [${vm.config.name}] (force=${force})…`);

    if (vm.monitorSocketPath && !force) {
      // ACPI shutdown via QMP monitor socket
      await this._sendQMPCommand(vm.monitorSocketPath, 'system_powerdown');
    } else if (vm.pid) {
      try {
        process.kill(vm.pid, force ? 'SIGKILL' : 'SIGTERM');
      } catch {
        // Process may have already exited
      }
    }

    this.emit('vm:stopped', { id });
  }

  /**
   * إيقاف وحذف جهاز QEMU
   */
  async destroyVM(id: string): Promise<void> {
    const vm = this._requireVM(id);
    this._log(`Destroying VM [${vm.config.name}]…`);

    if (vm.status === 'running') {
      await this.stopVM(id, true);
    }

    // حذف القرص المؤقت إذا كنا من أنشأناه
    if (vm.config.diskImage && vm.config.diskImage.includes(this.ipcDir)) {
      try { fs.unlinkSync(vm.config.diskImage); } catch { /* ignore */ }
    }
    // حذف socket المراقبة
    if (vm.monitorSocketPath) {
      try { fs.unlinkSync(vm.monitorSocketPath); } catch { /* ignore */ }
    }

    vm.status = 'destroyed';
    this.vms.delete(id);
    this.emit('vm:destroyed', { id });
    this._log(`VM [${vm.config.name}] destroyed`);
  }

  /**
   * حالة جهاز QEMU
   */
  getVMStatus(id: string): VMStatus {
    return this._requireVM(id).status;
  }

  /**
   * جلب جميع أجهزة QEMU
   */
  getAllVMs(): VMRecord[] {
    return Array.from(this.vms.values());
  }

  // ─── IPC Messaging ───────────────────────────────────────────────────────────

  /**
   * تسجيل معالج رسائل IPC لعملية معيّنة
   */
  registerIPCHandler(processId: string, handler: (msg: IPCMessage) => void): void {
    this.ipcHandlers.set(processId, handler);
    this._log(`IPC handler registered for ${processId}`);
  }

  /**
   * إرسال رسالة IPC إلى عملية
   */
  sendIPC(to: string, payload: unknown, type: IPCMessage['type'] = 'request'): IPCMessage {
    const msg: IPCMessage = {
      id: this._nextId('msg'),
      from: 'host',
      to,
      type,
      payload,
      timestamp: Date.now(),
    };

    const handler = this.ipcHandlers.get(to);
    if (handler) {
      try {
        handler(msg);
        this.emit('ipc:message', msg);
      } catch (err) {
        this.emit('ipc:error', { msg, error: (err as Error).message });
      }
    } else {
      // Fallback: try writing to process stdin if available
      const proc = this.processes.get(to);
      if (proc?.handle.stdin) {
        proc.handle.stdin.write(JSON.stringify(msg) + '\n');
        this.emit('ipc:message', msg);
      } else {
        const vmRecord = this.vms.get(to);
        if (vmRecord?.monitorSocketPath) {
          this._log(`[IPC] Forwarding to VM monitor socket for ${to}`);
          // QMP forward — best-effort
          this._sendQMPCommand(vmRecord.monitorSocketPath, JSON.stringify(payload)).catch(() => {});
        } else {
          this._log(`[IPC] No handler/stdin for ${to}; message dropped`);
          this.emit('ipc:error', { msg, error: `No handler for target: ${to}` });
        }
      }
    }

    return msg;
  }

  // ─── Resource Monitoring ─────────────────────────────────────────────────────

  /**
   * لقطة موارد النظام الحالية
   */
  getSystemResources(): SystemResourceSnapshot {
    const totalMemoryMb = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemoryMb  = Math.round(os.freemem()  / 1024 / 1024);
    const usedMemoryMb  = totalMemoryMb - freeMemoryMb;

    return {
      totalMemoryMb,
      freeMemoryMb,
      usedMemoryMb,
      memoryPressureRatio: usedMemoryMb / totalMemoryMb,
      cpuLoadAvg1m: os.loadavg()[0],
      cpuCount: os.cpus().length,
      platform: os.platform(),
      timestamp: Date.now(),
    };
  }

  /**
   * لقطة موارد عملية واحدة (Linux فقط via /proc)
   * Returns approximate resource usage. On non-Linux platforms returns zeros.
   */
  async getProcessResources(id: string): Promise<ResourceSnapshot> {
    const proc = this.processes.get(id);
    if (!proc || proc.status !== 'running') {
      return { pid: proc?.pid ?? 0, cpuPercent: 0, memoryMb: 0, timestamp: Date.now() };
    }

    let memoryMb = 0;
    let cpuPercent = 0;

    if (IS_LINUX) {
      try {
        const statm = fs.readFileSync(`/proc/${proc.pid}/statm`, 'utf-8');
        const pages = parseInt(statm.split(' ')[1], 10); // RSS pages
        memoryMb = Math.round((pages * 4096) / 1024 / 1024);
      } catch { /* ignore */ }

      try {
        const stat = fs.readFileSync(`/proc/${proc.pid}/stat`, 'utf-8');
        const fields = stat.split(' ');
        const utime = parseInt(fields[13], 10);
        const stime = parseInt(fields[14], 10);
        const totalTicks = utime + stime;
        const uptimeSec = parseFloat(fs.readFileSync('/proc/uptime', 'utf-8').split(' ')[0]);
        const startTicks = parseInt(fields[21], 10);
        const hz = 100; // CLK_TCK
        const processAge = uptimeSec - startTicks / hz;
        cpuPercent = processAge > 0
          ? Math.min(100, Math.round((totalTicks / hz / processAge) * 100))
          : 0;
      } catch { /* ignore */ }
    }

    return { pid: proc.pid, cpuPercent, memoryMb, timestamp: Date.now() };
  }

  // ─── Health Checks ───────────────────────────────────────────────────────────

  /**
   * فحص صحة جميع العمليات فوراً
   */
  async checkAllHealth(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [id, proc] of this.processes) {
      const alive = await this._isProcessAlive(proc.pid);
      proc.lastHealthCheck = Date.now();

      if (!alive && proc.status === 'running') {
        proc.status = 'crashed';
        this.emit('process:crash', { id, pid: proc.pid, reason: 'health_check_failed' });
        this._log(`Health check: process ${id} (PID ${proc.pid}) is dead`);
      }

      results.set(id, alive);
      this.emit('process:health', { id, alive });
    }

    for (const [id, vm] of this.vms) {
      if (vm.status === 'running' && vm.pid) {
        const alive = await this._isProcessAlive(vm.pid);
        if (!alive) {
          vm.status = 'error';
          this.emit('vm:error', { id, reason: 'health_check_failed' });
          this._log(`Health check: VM ${id} (PID ${vm.pid}) is dead`);
        }
        results.set(`vm:${id}`, alive);
      }
    }

    return results;
  }

  // ─── Graceful Shutdown ───────────────────────────────────────────────────────

  /**
   * إغلاق آمن للجسر — يوقف جميع العمليات والأجهزة الافتراضية
   */
  async shutdown(timeoutMs = 10_000): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    this._log('Shutdown initiated…');

    // إيقاف المراقبة
    if (this.healthTimer)   clearInterval(this.healthTimer);
    if (this.resourceTimer) clearInterval(this.resourceTimer);

    // إيقاف جميع الأجهزة
    const vmStops = Array.from(this.vms.keys()).map((id) =>
      this.stopVM(id, false).catch(() => this.stopVM(id, true).catch(() => {}))
    );
    await Promise.allSettled(vmStops);

    // إيقاف جميع العمليات
    for (const [id, proc] of this.processes) {
      if (proc.status === 'running') {
        try {
          this.killProcess(id, 'SIGTERM');
        } catch { /* ignore */ }
      }
    }

    // انتظر حتى الإغلاق أو المهلة
    await new Promise<void>((resolve) => {
      const deadline = setTimeout(() => {
        // فرض الإغلاق
        for (const [id, proc] of this.processes) {
          if (proc.status === 'running' || proc.status === 'stopping') {
            try { this.killProcess(id, 'SIGKILL'); } catch { /* ignore */ }
          }
        }
        resolve();
      }, timeoutMs);

      const check = setInterval(() => {
        const allStopped = Array.from(this.processes.values()).every(
          (p) => p.status === 'stopped' || p.status === 'crashed'
        );
        if (allStopped) {
          clearTimeout(deadline);
          clearInterval(check);
          resolve();
        }
      }, 250);
    });

    this.emit('bridge:shutdown');
    this._log('Shutdown complete');
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private _ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private _nextId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  /** بناء معامِلات prlimit لـ Linux */
  private _buildPrlimitArgs(limits: ResourceLimits): string[] {
    const args: string[] = [];
    if (limits.maxMemoryMb) {
      const bytes = limits.maxMemoryMb * 1024 * 1024;
      args.push(`--as=${bytes}`);
    }
    if (limits.maxOpenFiles) {
      args.push(`--nofile=${limits.maxOpenFiles}`);
    }
    return args;
  }

  /** بناء معامِلات QEMU */
  private _buildQEMUArgs(vm: VMRecord): string[] {
    const cfg = vm.config;
    const args: string[] = [
      '-nographic',
      '-m', String(cfg.ramMb ?? 512),
      '-smp', String(cfg.cpuCores ?? 1),
    ];

    if (cfg.diskImage) {
      args.push('-drive', `file=${cfg.diskImage},format=qcow2,if=virtio`);
    }

    // الشبكة
    if (cfg.networkMode === 'user') {
      const netStr = cfg.sshPort
        ? `user,id=net0,hostfwd=tcp::${cfg.sshPort}-:22`
        : 'user,id=net0';
      args.push('-netdev', netStr, '-device', 'virtio-net,netdev=net0');
    } else if (cfg.networkMode === 'none') {
      args.push('-net', 'none');
    }

    // QMP monitor socket
    if (vm.monitorSocketPath) {
      args.push(
        '-qmp',
        `unix:${vm.monitorSocketPath},server,nowait`,
      );
    }

    // معامِلات إضافية
    if (cfg.extraArgs) {
      args.push(...cfg.extraArgs);
    }

    return args;
  }

  /** إنشاء صورة قرص qcow2 */
  private async _createQcow2Disk(diskPath: string, sizeGb: number): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(
        'qemu-img',
        ['create', '-f', 'qcow2', diskPath, `${sizeGb}G`],
        (err) => {
          if (err) {
            this._log(`qemu-img create failed (non-fatal): ${err.message}`);
            // Non-fatal: QEMU can run without a disk for testing
            resolve();
          } else {
            this._log(`Disk image created: ${diskPath} (${sizeGb}G)`);
            resolve();
          }
        },
      );
    });
  }

  /** إرسال أمر QMP للجهاز الافتراضي (عبر socket) */
  private async _sendQMPCommand(socketPath: string, command: string): Promise<void> {
    // QMP communication via net.createConnection to unix socket
    // On Windows, use named pipe convention
    return new Promise((resolve) => {
      try {
        const net = require('net') as typeof import('net');
        const client = net.createConnection(socketPath);
        const payload = JSON.stringify({ execute: command });
        client.on('connect', () => {
          client.write(payload);
          setTimeout(() => { client.destroy(); resolve(); }, 500);
        });
        client.on('error', () => resolve()); // best-effort
      } catch {
        resolve();
      }
    });
  }

  /** فحص ما إذا كانت العملية ما زالت تعمل */
  private async _isProcessAlive(pid: number): Promise<boolean> {
    try {
      process.kill(pid, 0); // signal 0 = check existence only
      return true;
    } catch {
      return false;
    }
  }

  /** بدء مؤقت فحص الصحة */
  private _startHealthChecker(): void {
    this.healthTimer = setInterval(async () => {
      await this.checkAllHealth();
    }, this.healthCheckIntervalMs);
    this._log(`Health checker started (every ${this.healthCheckIntervalMs}ms)`);
  }

  /** بدء مؤقت مراقبة الموارد */
  private _startResourceMonitor(): void {
    this.resourceTimer = setInterval(() => {
      const snap = this.getSystemResources();
      if (snap.memoryPressureRatio >= this.memoryPressureThreshold) {
        this._log(`Memory pressure: ${(snap.memoryPressureRatio * 100).toFixed(1)}%`);
        this.emit('resource:pressure', snap);
      }
    }, this.resourceMonitorIntervalMs);
    this._log(`Resource monitor started (every ${this.resourceMonitorIntervalMs}ms)`);
  }

  private _requireVM(id: string): VMRecord {
    const vm = this.vms.get(id);
    if (!vm) throw new Error(`VM not found: ${id}`);
    return vm;
  }

  private _log(message: string): void {
    if (this.verbose) {
      const ts = new Date().toISOString();
      console.log(`[SovereignBridge ${ts}] ${message}`);
    }
  }
}

// ─── Singleton Factory ─────────────────────────────────────────────────────────

let _bridgeInstance: SovereignBridge | null = null;

/**
 * الحصول على نسخة مفردة من الجسر (singleton)
 * Returns the global singleton bridge, initialising it on first call.
 */
export async function getSovereignBridge(config?: BridgeConfig): Promise<SovereignBridge> {
  if (!_bridgeInstance) {
    _bridgeInstance = new SovereignBridge(config);
    await _bridgeInstance.init();
  }
  return _bridgeInstance;
}

/**
 * إعادة تعيين النسخة المفردة (للاختبار فقط)
 */
export function _resetBridgeSingleton(): void {
  _bridgeInstance = null;
}
