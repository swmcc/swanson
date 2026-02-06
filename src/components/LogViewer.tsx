import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { spawn, ChildProcess } from 'child_process';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface LogViewerProps {
  projectPath: string;
  projectName: string;
  projectIcon: string;
  projectColor: string;
  command: string;  // e.g., "local.dev"
  onExit: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  projectPath,
  projectName,
  projectIcon,
  projectColor,
  command,
  onExit,
}) => {
  const { columns, rows } = useTerminalSize();
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'starting' | 'running' | 'stopped' | 'error'>('starting');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const processRef = useRef<ChildProcess | null>(null);

  const maxLines = rows - 6; // Leave room for header and footer

  useEffect(() => {
    const proc = spawn('make', [command], {
      cwd: projectPath,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    processRef.current = proc;

    const addLog = (line: string) => {
      setLogs(prev => {
        const newLogs = [...prev, line];
        // Keep last maxLines * 2 for scrollback
        if (newLogs.length > maxLines * 2) {
          return newLogs.slice(-maxLines * 2);
        }
        return newLogs;
      });
    };

    proc.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(addLog);
      setStatus('running');
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(line => addLog(`[stderr] ${line}`));
      setStatus('running');
    });

    proc.on('error', (err) => {
      addLog(`[error] ${err.message}`);
      setStatus('error');
    });

    proc.on('close', (code) => {
      setExitCode(code);
      setStatus('stopped');
      addLog(`[process exited with code ${code}]`);
    });

    // Give it a moment to start
    setTimeout(() => {
      if (status === 'starting') {
        setStatus('running');
      }
    }, 1000);

    return () => {
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 3000);
      }
    };
  }, [projectPath, command]);

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      // Kill process and exit
      if (processRef.current && !processRef.current.killed) {
        processRef.current.kill('SIGTERM');
      }
      onExit();
    }
  });

  const displayLogs = logs.slice(-maxLines);
  const lineWidth = columns - 4;

  const statusIcon = {
    starting: '◐',
    running: '●',
    stopped: '○',
    error: '✕',
  }[status];

  const statusColor = {
    starting: 'yellow',
    running: 'green',
    stopped: 'gray',
    error: 'red',
  }[status] as 'yellow' | 'green' | 'gray' | 'red';

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      {/* Header */}
      <Box
        paddingX={1}
        paddingY={0}
        borderStyle="single"
        borderColor={statusColor}
        justifyContent="space-between"
      >
        <Box gap={2}>
          <Text>{projectIcon}</Text>
          <Text bold color={projectColor as any}>{projectName}</Text>
          <Text color="gray">·</Text>
          <Text color="white">make {command}</Text>
          <Text color="gray">·</Text>
          {status === 'starting' ? (
            <Box>
              <Text color="yellow"><Spinner type="dots" /></Text>
              <Text color="yellow"> Starting...</Text>
            </Box>
          ) : (
            <Text color={statusColor}>{statusIcon} {status}</Text>
          )}
        </Box>
        <Text color="gray">[q] Stop & Exit</Text>
      </Box>

      {/* Logs */}
      <Box
        flexDirection="column"
        flexGrow={1}
        paddingX={1}
        borderStyle="single"
        borderColor="gray"
        borderTop={false}
      >
        {displayLogs.length === 0 ? (
          <Box alignItems="center" justifyContent="center" flexGrow={1}>
            <Text color="gray">Waiting for output...</Text>
          </Box>
        ) : (
          displayLogs.map((line, i) => {
            const isStderr = line.startsWith('[stderr]');
            const isSystem = line.startsWith('[process') || line.startsWith('[error');
            return (
              <Text
                key={i}
                color={isStderr ? 'yellow' : isSystem ? 'gray' : 'white'}
                dimColor={isSystem}
                wrap="truncate-end"
              >
                {line.slice(0, lineWidth)}
              </Text>
            );
          })
        )}
      </Box>

      {/* Footer */}
      <Box paddingX={1} justifyContent="space-between">
        <Text color="gray">
          {logs.length} lines · {status === 'stopped' ? `exit ${exitCode}` : 'running'}
        </Text>
        <Text color="gray">{new Date().toLocaleTimeString()}</Text>
      </Box>
    </Box>
  );
};

export default LogViewer;
