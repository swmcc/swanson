import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { parseMakefile, getTargetDisplayName, MakeTarget } from '../lib/makefile.js';
import { processManager, ServiceProcess } from '../lib/process.js';
import { getGitStatus, GitStatus } from '../lib/git.js';

interface Project {
  name: string;
  path: string;
}

interface ProjectViewProps {
  project: Project;
  onBack: () => void;
}

type Tab = 'services' | 'logs' | 'git';

export const ProjectView: React.FC<ProjectViewProps> = ({ project, onBack }) => {
  const [tab, setTab] = useState<Tab>('services');
  const [targets, setTargets] = useState<MakeTarget[]>([]);
  const [services, setServices] = useState<Map<string, ServiceProcess>>(new Map());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Load project data
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Load Makefile targets
      const makeTargets = await parseMakefile(project.path);
      setTargets(makeTargets);

      // Load git status
      const git = await getGitStatus(project.path);
      setGitStatus(git);

      // Get any running services for this project
      const running = processManager.getServicesByProject(project.path);
      const serviceMap = new Map<string, ServiceProcess>();
      running.forEach(s => serviceMap.set(s.name, s));
      setServices(serviceMap);

      setLoading(false);
    };

    load();

    // Listen for status updates
    const handleStatus = (id: string, status: string) => {
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

    // Tab switching
    if (input === 's') setTab('services');
    if (input === 'l') setTab('logs');
    if (input === 'g') setTab('git');

    if (tab === 'services') {
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

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading {project.name}...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">SWANSON</Text>
        <Text color="gray"> › </Text>
        <Text bold color="white">{project.name}</Text>
        <Box flexGrow={1} />
        <Text color="gray">[ESC] Back</Text>
      </Box>

      {/* Git status bar */}
      {gitStatus && (
        <Box marginBottom={1}>
          <Text color="magenta"> {gitStatus.branch}</Text>
          {gitStatus.isClean ? (
            <Text color="green"> ✓ clean</Text>
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

      <Box marginBottom={1}>
        <Text color="gray">{'─'.repeat(60)}</Text>
      </Box>

      {/* Tabs */}
      <Box marginBottom={1} gap={2}>
        <Text color={tab === 'services' ? 'cyan' : 'gray'} bold={tab === 'services'}>
          [s] Services
        </Text>
        <Text color={tab === 'logs' ? 'cyan' : 'gray'} bold={tab === 'logs'}>
          [l] Logs
        </Text>
        <Text color={tab === 'git' ? 'cyan' : 'gray'} bold={tab === 'git'}>
          [g] Git
        </Text>
      </Box>

      {/* Services tab */}
      {tab === 'services' && (
        <Box flexDirection="column">
          {targets.length === 0 ? (
            <Text color="gray">No local.* targets found in Makefile</Text>
          ) : (
            targets.map((target, index) => {
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
                    <Text color="yellow">
                      <Spinner type="dots" />
                    </Text>
                  ) : (
                    <Text color={color}>{icon}</Text>
                  )}
                  <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                    {' '}{displayName.padEnd(20)}
                  </Text>
                  <Text color="gray">
                    {status === 'running' ? '[⏎ stop]' : '[⏎ start]'}
                  </Text>
                  {target.description && (
                    <Text color="gray" dimColor> - {target.description}</Text>
                  )}
                </Box>
              );
            })
          )}

          <Box marginTop={2}>
            <Text color="gray">
              [↑↓] Navigate  [⏎] Start/Stop  [a] Start all  [x] Stop all
            </Text>
          </Box>
        </Box>
      )}

      {/* Logs tab */}
      {tab === 'logs' && (
        <Box flexDirection="column">
          <Text color="gray">Select a running service to view logs</Text>
          {Array.from(services.values())
            .filter(s => s.status === 'running')
            .map(service => (
              <Box key={service.id} marginTop={1} flexDirection="column">
                <Text color="cyan" bold>{getTargetDisplayName(service.name)}</Text>
                <Box flexDirection="column" marginLeft={2}>
                  {service.logs.slice(-10).map((line, i) => (
                    <Text key={i} color="gray" wrap="truncate">{line}</Text>
                  ))}
                </Box>
              </Box>
            ))}
          {Array.from(services.values()).filter(s => s.status === 'running').length === 0 && (
            <Text color="yellow" dimColor>No services running</Text>
          )}
        </Box>
      )}

      {/* Git tab */}
      {tab === 'git' && (
        <Box flexDirection="column">
          {gitStatus ? (
            <Box flexDirection="column" gap={1}>
              <Box>
                <Text color="white">Branch: </Text>
                <Text color="magenta">{gitStatus.branch}</Text>
              </Box>
              <Box>
                <Text color="white">Status: </Text>
                {gitStatus.isClean ? (
                  <Text color="green">Clean</Text>
                ) : (
                  <Text color="yellow">
                    {gitStatus.staged} staged, {gitStatus.unstaged} modified, {gitStatus.untracked} untracked
                  </Text>
                )}
              </Box>
              {(gitStatus.ahead > 0 || gitStatus.behind > 0) && (
                <Box>
                  <Text color="white">Remote: </Text>
                  {gitStatus.ahead > 0 && <Text color="cyan">{gitStatus.ahead} ahead </Text>}
                  {gitStatus.behind > 0 && <Text color="yellow">{gitStatus.behind} behind</Text>}
                </Box>
              )}
              <Box marginTop={1}>
                <Text color="gray">[p] Pull  [f] Fetch</Text>
              </Box>
            </Box>
          ) : (
            <Text color="gray">Not a git repository</Text>
          )}
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={2}>
        <Text color="gray">Path: {project.path}</Text>
      </Box>
    </Box>
  );
};

export default ProjectView;
