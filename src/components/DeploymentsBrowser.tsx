import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { Deployments, Deployment, getStatusIndicator } from '../lib/deployments.js';
import { formatRelativeTime } from '../lib/github.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface DeploymentsBrowserProps {
  projectPath: string;
  projectName: string;
  projectIcon: string;
  projectColor: string;
  onBack: () => void;
}

export const DeploymentsBrowser: React.FC<DeploymentsBrowserProps> = ({
  projectPath,
  projectName,
  projectIcon,
  projectColor,
  onBack,
}) => {
  const { columns, rows, isLarge } = useTerminalSize();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const deploymentsClient = new Deployments(projectPath);

  const loadDeployments = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await deploymentsClient.listDeployments(isLarge ? 10 : 5);

    if (result.success) {
      setDeployments(result.data);
      setSelectedIndex(0);
    } else {
      setError(result.error.message);
    }

    setLoading(false);
  }, [projectPath, isLarge]);

  useEffect(() => {
    loadDeployments();
  }, [loadDeployments]);

  const handleOpenInBrowser = async () => {
    await deploymentsClient.openInBrowser();
  };

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(deployments.length - 1, prev + 1));
    } else if (input === 'b') {
      handleOpenInBrowser();
    } else if (input === 'r') {
      loadDeployments();
    }
  });

  const lineWidth = Math.min(columns - 6, 100);

  if (loading && deployments.length === 0) {
    return (
      <Box padding={2} alignItems="center" justifyContent="center" width={columns} height={rows}>
        <Text color="yellow"><Spinner type="dots" /></Text>
        <Text> Loading deployments...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={2} width={columns}>
        <Text color="red" bold>Error loading deployments</Text>
        <Text color="gray">{error}</Text>
        <Box marginTop={2}>
          <Text color="gray">[ESC] Back  [r] Retry</Text>
        </Box>
      </Box>
    );
  }

  // Count by status
  const successCount = deployments.filter(d => d.status === 'success').length;
  const failureCount = deployments.filter(d => d.status === 'failure').length;

  return (
    <Box flexDirection="column" paddingX={isLarge ? 3 : 1} paddingY={1} width={columns} height={rows}>
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">🥩 SWANSON</Text>
          <Text color="gray"> › </Text>
          <Text>{projectIcon} </Text>
          <Text bold color={projectColor as any}>{projectName}</Text>
          <Text color="gray"> › </Text>
          <Text bold>Deployments</Text>
        </Box>
        <Text color="gray">[ESC] Back</Text>
      </Box>

      {/* Stats */}
      <Box marginBottom={1} gap={2}>
        <Text color="green">✓ {successCount} success</Text>
        {failureCount > 0 && <Text color="red">✗ {failureCount} failed</Text>}
        <Text color="gray">{deployments.length} total</Text>
        {loading && <Text color="yellow"><Spinner type="dots" /></Text>}
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">{'─'.repeat(lineWidth)}</Text>
      </Box>

      {/* Table header */}
      <Box marginBottom={1} gap={1}>
        <Text color="gray" bold>{'  '}</Text>
        <Text color="gray" bold>{'Status'.padEnd(10)}</Text>
        <Text color="gray" bold>{'Ref'.padEnd(12)}</Text>
        <Text color="gray" bold>{'Environment'.padEnd(14)}</Text>
        <Text color="gray" bold>{'Created'.padEnd(12)}</Text>
        <Text color="gray" bold>Description</Text>
      </Box>

      {/* Deployments list */}
      {deployments.length === 0 ? (
        <Box>
          <Text color="gray">No deployments found</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {deployments.map((deployment, index) => {
            const isSelected = index === selectedIndex;
            const { symbol, color } = getStatusIndicator(deployment.status);

            return (
              <Box key={deployment.id} gap={1}>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '❯' : ' '}
                </Text>
                <Text color={color as any}>
                  {symbol} {deployment.status.padEnd(9)}
                </Text>
                <Text color="magenta">
                  {deployment.shortRef.padEnd(12)}
                </Text>
                <Text color="blue">
                  {deployment.environment.padEnd(14)}
                </Text>
                <Text color="gray">
                  {formatRelativeTime(deployment.createdAt).padEnd(12)}
                </Text>
                <Text color={isSelected ? 'cyan' : 'gray'} wrap="truncate-end">
                  {(deployment.description || '').slice(0, lineWidth - 60)}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={2}>
        <Text color="gray">
          [↑↓] Navigate  [b] Browser  [r] Refresh  [ESC] Back
        </Text>
      </Box>
    </Box>
  );
};

export default DeploymentsBrowser;
