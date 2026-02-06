import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { parseMakefile, getTargetDisplayName, MakeTarget } from '../lib/makefile.js';
import { processManager, ServiceProcess } from '../lib/process.js';
import { getGitStatus, GitStatus } from '../lib/git.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface Project {
  name: string;
  path: string;
}

interface ProjectViewProps {
  project: Project;
  onBack: () => void;
}

type Panel = 'services' | 'logs';

export const ProjectView: React.FC<ProjectViewProps> = ({ project, onBack }) => {
  const { columns, rows, isLarge, isWide } = useTerminalSize();
  const [activePanel, setActivePanel] = useState<Panel>('services');
  const [targets, setTargets] = useState<MakeTarget[]>([]);
  const [services, setServices] = useState<Map<string, ServiceProcess>>(new Map());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Use split view on large terminals
  const useSplitView = isLarge && columns > 120;
  const panelWidth = useSplitView ? Math.floor((columns - 10) / 2) : columns - 6;

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const makeTargets = await parseMakefile(project.path);
      setTargets(makeTargets);

      const git = await getGitStatus(project.path);
      setGitStatus(git);

      const running = processManager.getServicesByProject(project.path);
      const serviceMap = new Map<string, ServiceProcess>();
      running.forEach(s => serviceMap.set(s.name, s));
      setServices(serviceMap);

      setLoading(false);
    };

    load();

    const handleStatus = (id: string) => {
      if (id.startsWith(project.name)) {
        setServices(new Map(processManager.getServicesByProject(project.path).map(s => [s.name, s])));
        setActionInProgress(null);
      }
    };

    processManager.on('status', handleStatus);
    return () => {
      processManager.off('status', handleStatus);
    };
  }, [project]);

  const handleStartService = useCallback(async (target: MakeTarget) => {
    const serviceId = `${project.name}:${target.name}`;
    setActionInProgress(target.name);

    await processManager.start(
      serviceId,
      target.name,
      `make ${target.name}`,
      project.path
    );

    setServices(new Map(processManager.getServicesByProject(project.path).map(s => [s.name, s])));
  }, [project]);

  const handleStopService = useCallback(async (target: MakeTarget) => {
    const serviceId = `${project.name}:${target.name}`;
    setActionInProgress(target.name);

    await processManager.stop(serviceId);

    setServices(new Map(processManager.getServicesByProject(project.path).map(s => [s.name, s])));
  }, [project]);

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    // Panel switching (only in split view)
    if (useSplitView && key.tab) {
      setActivePanel(prev => prev === 'services' ? 'logs' : 'services');
      return;
    }

    // In non-split view, s/l switches panels
    if (!useSplitView) {
      if (input === 's') setActivePanel('services');
      if (input === 'l') setActivePanel('logs');
    }

    if (activePanel === 'services' || useSplitView) {
      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex(prev => Math.min(targets.length - 1, prev + 1));
      } else if (key.return && targets[selectedIndex]) {
        const target = targets[selectedIndex];
        const service = services.get(target.name);

        if (service?.status === 'running') {
          handleStopService(target);
        } else {
          handleStartService(target);
        }
      }
    }
  });

  const getServiceStatus = (targetName: string): ServiceProcess['status'] => {
    return services.get(targetName)?.status || 'stopped';
  };

  const getStatusIcon = (status: ServiceProcess['status']) => {
    switch (status) {
      case 'running': return { icon: '●', color: 'green' as const };
      case 'starting': return { icon: '◐', color: 'yellow' as const };
      case 'error': return { icon: '✕', color: 'red' as const };
      default: return { icon: '○', color: 'gray' as const };
    }
  };

  const logLines = isLarge ? Math.floor(rows * 0.6) : 8;

  if (loading) {
    return (
      <Box padding={3} width={columns} height={rows} alignItems="center" justifyContent="center">
        <Text color="yellow"><Spinner type="dots" /></Text>
        <Text> Loading {project.name}...</Text>
      </Box>
    );
  }

  // Services Panel Component
  const ServicesPanel = ({ width, showBorder = false }: { width: number; showBorder?: boolean }) => (
    <Box
      flexDirection="column"
      width={width}
      borderStyle={showBorder ? 'single' : undefined}
      borderColor={activePanel === 'services' ? 'cyan' : 'gray'}
      paddingX={showBorder ? 1 : 0}
    >
      <Box marginBottom={1}>
        <Text bold color={activePanel === 'services' ? 'cyan' : 'white'}>
          SERVICES
        </Text>
        {useSplitView && activePanel === 'services' && (
          <Text color="cyan"> ◄</Text>
        )}
      </Box>

      {targets.length === 0 ? (
        <Text color="gray">No local.* targets in Makefile</Text>
      ) : (
        <Box flexDirection="column">
          {targets.map((target, index) => {
            const isSelected = index === selectedIndex;
            const status = getServiceStatus(target.name);
            const { icon, color } = getStatusIcon(status);
            const isLoading = actionInProgress === target.name;
            const displayName = getTargetDisplayName(target.name);

            return (
              <Box key={target.name}>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '❯ ' : '  '}
                </Text>
                {isLoading ? (
                  <Text color="yellow"><Spinner type="dots" /></Text>
                ) : (
                  <Text color={color}>{icon}</Text>
                )}
                <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                  {' '}{displayName.padEnd(15)}
                </Text>
                <Text color="gray" dimColor>
                  {status === 'running' ? 'stop' : 'start'}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );

  // Logs Panel Component
  const LogsPanel = ({ width, showBorder = false }: { width: number; showBorder?: boolean }) => {
    const runningServices = Array.from(services.values()).filter(s => s.status === 'running');

    return (
      <Box
        flexDirection="column"
        width={width}
        borderStyle={showBorder ? 'single' : undefined}
        borderColor={activePanel === 'logs' ? 'cyan' : 'gray'}
        paddingX={showBorder ? 1 : 0}
      >
        <Box marginBottom={1}>
          <Text bold color={activePanel === 'logs' ? 'cyan' : 'white'}>
            LOGS
          </Text>
          {useSplitView && activePanel === 'logs' && (
            <Text color="cyan"> ◄</Text>
          )}
        </Box>

        {runningServices.length === 0 ? (
          <Text color="gray" dimColor>No services running</Text>
        ) : (
          <Box flexDirection="column">
            {runningServices.map(service => (
              <Box key={service.id} flexDirection="column" marginBottom={1}>
                <Text color="green" bold>{getTargetDisplayName(service.name)}</Text>
                <Box flexDirection="column" marginLeft={1}>
                  {service.logs.slice(-logLines).map((line, i) => (
                    <Text key={i} color="gray" wrap="truncate-end">
                      {line.slice(0, width - 4)}
                    </Text>
                  ))}
                  {service.logs.length === 0 && (
                    <Text color="gray" dimColor>Waiting...</Text>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box
      flexDirection="column"
      paddingX={isLarge ? 3 : 1}
      paddingY={isLarge ? 2 : 1}
      width={columns}
      height={isLarge ? rows : undefined}
    >
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">SWANSON</Text>
          <Text color="gray"> › </Text>
          <Text bold color="white">{project.name}</Text>
          {useSplitView && <Text color="gray" dimColor>  [split view]</Text>}
        </Box>
        <Text color="gray">[ESC] Back</Text>
      </Box>

      {/* Git status bar */}
      {gitStatus && (
        <Box marginBottom={1}>
          <Text color="magenta"> {gitStatus.branch}</Text>
          {gitStatus.isClean ? (
            <Text color="green"> ✓</Text>
          ) : (
            <Box>
              {gitStatus.staged > 0 && <Text color="green"> +{gitStatus.staged}</Text>}
              {gitStatus.unstaged > 0 && <Text color="yellow"> ~{gitStatus.unstaged}</Text>}
              {gitStatus.untracked > 0 && <Text color="red"> ?{gitStatus.untracked}</Text>}
            </Box>
          )}
          {gitStatus.ahead > 0 && <Text color="cyan"> ↑{gitStatus.ahead}</Text>}
          {gitStatus.behind > 0 && <Text color="yellow"> ↓{gitStatus.behind}</Text>}
        </Box>
      )}

      {/* Divider */}
      <Box marginBottom={isLarge ? 2 : 1}>
        <Text color="gray">{'─'.repeat(Math.min(columns - 8, 100))}</Text>
      </Box>

      {/* Main Content */}
      {useSplitView ? (
        /* Split View - Services and Logs side by side */
        <Box flexGrow={1} gap={2}>
          <ServicesPanel width={panelWidth} showBorder />
          <LogsPanel width={panelWidth} showBorder />
        </Box>
      ) : (
        /* Tabbed View */
        <Box flexDirection="column" flexGrow={1}>
          {/* Tabs */}
          <Box marginBottom={1} gap={2}>
            <Text color={activePanel === 'services' ? 'cyan' : 'gray'} bold={activePanel === 'services'}>
              [s] Services
            </Text>
            <Text color={activePanel === 'logs' ? 'cyan' : 'gray'} bold={activePanel === 'logs'}>
              [l] Logs
            </Text>
          </Box>

          {activePanel === 'services' && <ServicesPanel width={panelWidth} />}
          {activePanel === 'logs' && <LogsPanel width={panelWidth} />}
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={2} justifyContent="space-between">
        <Text color="gray">
          {useSplitView
            ? '[↑↓] Navigate  [⏎] Start/Stop  [TAB] Switch panel'
            : '[↑↓] Navigate  [⏎] Start/Stop  [s/l] Switch tab'}
        </Text>
        {isLarge && <Text color="gray" dimColor>{columns}×{rows}</Text>}
      </Box>
    </Box>
  );
};

export default ProjectView;
