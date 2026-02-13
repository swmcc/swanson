import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { Deployments, Deployment, getStatusIndicator } from '../lib/deployments.js';
import { formatRelativeTime } from '../lib/github.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { PROJECTS, ProjectConfig } from '../lib/projects.js';

interface ProjectDeployment {
  project: ProjectConfig;
  deployment: Deployment | null;
  loading: boolean;
  error?: string;
}

interface DeploymentsOverviewProps {
  onBack: () => void;
}

export const DeploymentsOverview: React.FC<DeploymentsOverviewProps> = ({
  onBack,
}) => {
  const { columns, rows, isLarge } = useTerminalSize();
  const [projectDeployments, setProjectDeployments] = useState<ProjectDeployment[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadAllDeployments = useCallback(async () => {
    setLoading(true);

    // Initialize with loading state
    const initial: ProjectDeployment[] = PROJECTS.map(project => ({
      project,
      deployment: null,
      loading: true,
    }));
    setProjectDeployments(initial);

    // Fetch deployments for all projects in parallel
    const results = await Promise.all(
      PROJECTS.map(async (project) => {
        const client = new Deployments(project.path);
        const result = await client.listDeployments(1);

        return {
          project,
          deployment: result.success && result.data.length > 0 ? result.data[0] : null,
          loading: false,
          error: result.success ? undefined : result.error.message,
        };
      })
    );

    setProjectDeployments(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAllDeployments();
  }, [loadAllDeployments]);

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(projectDeployments.length - 1, prev + 1));
    } else if (input === 'r') {
      loadAllDeployments();
    }
  });

  const lineWidth = Math.min(columns - 6, 120);

  // Count stats
  const successCount = projectDeployments.filter(p => p.deployment?.status === 'success').length;
  const failureCount = projectDeployments.filter(p => p.deployment?.status === 'failure').length;
  const noDeployCount = projectDeployments.filter(p => !p.deployment && !p.loading).length;

  return (
    <Box flexDirection="column" paddingX={isLarge ? 3 : 1} paddingY={1} width={columns} height={rows}>
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">🥩 SWANSON</Text>
          <Text color="gray"> › </Text>
          <Text bold>All Deployments</Text>
        </Box>
        <Text color="gray">[ESC] Back</Text>
      </Box>

      {/* Stats */}
      <Box marginBottom={1} gap={2}>
        <Text color="green">✓ {successCount} success</Text>
        {failureCount > 0 && <Text color="red">✗ {failureCount} failed</Text>}
        <Text color="gray">○ {noDeployCount} no deploys</Text>
        {loading && <Text color="yellow"><Spinner type="dots" /></Text>}
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">{'─'.repeat(lineWidth)}</Text>
      </Box>

      {/* Table header */}
      <Box marginBottom={1} gap={1}>
        <Text color="gray" bold>{'  '}</Text>
        <Text color="gray" bold>{'Project'.padEnd(22)}</Text>
        <Text color="gray" bold>{'Status'.padEnd(12)}</Text>
        <Text color="gray" bold>{'Ref'.padEnd(10)}</Text>
        <Text color="gray" bold>{'Environment'.padEnd(14)}</Text>
        <Text color="gray" bold>Deployed</Text>
      </Box>

      {/* Projects list */}
      <Box flexDirection="column">
        {projectDeployments.map((item, index) => {
          const isSelected = index === selectedIndex;
          const { project, deployment, loading: itemLoading } = item;

          if (itemLoading) {
            return (
              <Box key={project.name} gap={1}>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '❯' : ' '}
                </Text>
                <Text>{project.icon} </Text>
                <Text color={project.color as any}>{project.name.padEnd(20)}</Text>
                <Text color="yellow"><Spinner type="dots" /></Text>
              </Box>
            );
          }

          if (!deployment) {
            return (
              <Box key={project.name} gap={1}>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '❯' : ' '}
                </Text>
                <Text>{project.icon} </Text>
                <Text color={project.color as any}>{project.name.padEnd(20)}</Text>
                <Text color="gray" dimColor>{'—'.padEnd(12)}</Text>
                <Text color="gray" dimColor>No deployments</Text>
              </Box>
            );
          }

          const { symbol, color } = getStatusIndicator(deployment.status);

          return (
            <Box key={project.name} gap={1}>
              <Text color={isSelected ? 'cyan' : 'white'}>
                {isSelected ? '❯' : ' '}
              </Text>
              <Text>{project.icon} </Text>
              <Text color={project.color as any} bold={isSelected}>
                {project.name.padEnd(20)}
              </Text>
              <Text color={color as any}>
                {symbol} {deployment.status.padEnd(10)}
              </Text>
              <Text color="magenta">
                {deployment.shortRef.padEnd(10)}
              </Text>
              <Text color="blue">
                {deployment.environment.padEnd(14)}
              </Text>
              <Text color="gray">
                {formatRelativeTime(deployment.createdAt)}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box marginTop={2}>
        <Text color="gray">
          [↑↓] Navigate  [r] Refresh  [ESC] Back
        </Text>
      </Box>
    </Box>
  );
};

export default DeploymentsOverview;
