import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface ServiceProcess {
  id: string;
  name: string;
  command: string;
  cwd: string;
  process: ChildProcess | null;
  status: 'stopped' | 'starting' | 'running' | 'error';
  logs: string[];
  pid?: number;
  error?: string;
}

export class ProcessManager extends EventEmitter {
  private services: Map<string, ServiceProcess> = new Map();
  private maxLogLines = 1000;

  getService(id: string): ServiceProcess | undefined {
    return this.services.get(id);
  }

  getAllServices(): ServiceProcess[] {
    return Array.from(this.services.values());
  }

  getServicesByProject(projectPath: string): ServiceProcess[] {
    return this.getAllServices().filter(s => s.cwd === projectPath);
  }

  async start(id: string, name: string, command: string, cwd: string): Promise<ServiceProcess> {
    // Stop existing if running
    if (this.services.has(id)) {
      await this.stop(id);
    }

    const service: ServiceProcess = {
      id,
      name,
      command,
      cwd,
      process: null,
      status: 'starting',
      logs: [],
    };

    this.services.set(id, service);
    this.emit('status', id, 'starting');

    try {
      const proc = spawn('make', [name], {
        cwd,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      service.process = proc;
      service.pid = proc.pid;

      proc.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        service.logs.push(...lines);

        // Trim logs if too long
        if (service.logs.length > this.maxLogLines) {
          service.logs = service.logs.slice(-this.maxLogLines);
        }

        this.emit('log', id, lines);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        service.logs.push(...lines.map(l => `[stderr] ${l}`));

        if (service.logs.length > this.maxLogLines) {
          service.logs = service.logs.slice(-this.maxLogLines);
        }

        this.emit('log', id, lines);
      });

      proc.on('error', (err) => {
        service.status = 'error';
        service.error = err.message;
        this.emit('status', id, 'error', err.message);
      });

      proc.on('close', (code) => {
        if (service.status !== 'error') {
          service.status = 'stopped';
          this.emit('status', id, 'stopped', code);
        }
        service.process = null;
        service.pid = undefined;
      });

      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 500));

      if (service.status === 'starting') {
        service.status = 'running';
        this.emit('status', id, 'running');
      }

      return service;
    } catch (error) {
      service.status = 'error';
      service.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('status', id, 'error', service.error);
      return service;
    }
  }

  async stop(id: string): Promise<void> {
    const service = this.services.get(id);
    if (!service || !service.process) {
      return;
    }

    return new Promise((resolve) => {
      const proc = service.process!;

      proc.on('close', () => {
        service.status = 'stopped';
        service.process = null;
        service.pid = undefined;
        this.emit('status', id, 'stopped');
        resolve();
      });

      // Try graceful shutdown first
      proc.kill('SIGTERM');

      // Force kill after timeout
      setTimeout(() => {
        if (service.process) {
          proc.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  async stopAll(): Promise<void> {
    const promises = Array.from(this.services.keys()).map(id => this.stop(id));
    await Promise.all(promises);
  }

  getLogs(id: string, lines?: number): string[] {
    const service = this.services.get(id);
    if (!service) return [];

    if (lines) {
      return service.logs.slice(-lines);
    }
    return [...service.logs];
  }
}

// Singleton instance
export const processManager = new ProcessManager();
