import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { parseMakefile, getTargetDisplayName, MakeTarget } from '../lib/makefile.js';
import { getGitStatus, GitStatus } from '../lib/git.js';
import { GitHub, GitHubIssue } from '../lib/github.js';
import { launchLazyGit, isLazyGitInstalled } from '../lib/lazygit.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import type { Project } from '../app.js';

interface ProjectDashboardProps {
  project: Project;
  onBack: () => void;
  onRunCommand: (command: string) => void;
  onOpenIssues: () => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  project,
  onBack,
  onRunCommand,
  onOpenIssues,
}) => {
  const { columns, rows, isLarge, isWide } = useTerminalSize();
  const { exit } = useApp();

  const [targets, setTargets] = useState<MakeTarget[]>([]);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [issueCount, setIssueCount] = useState<{ open: number; closed: number }>({ open: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTargetIndex, setSelectedTargetIndex] = useState(0);
  const [lazyGitRunning, setLazyGitRunning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    // Load in parallel
    const [makeTargets, git] = await Promise.all([
      parseMakefile(project.path),
      getGitStatus(project.path),
    ]);

    setTargets(makeTargets);
    setGitStatus(git);

    // Load GitHub issues (don't block on this)
    const github = new GitHub(project.path);
    const issuesResult = await github.listIssues('open', 5);
    if (issuesResult.success) {
      setIssues(issuesResult.data);
      setIssueCount({ open: issuesResult.data.length, closed: 0 });
    }

    setLoading(false);
  }, [project.path]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLaunchLazyGit = useCallback(async () => {
    if (!isLazyGitInstalled()) return;

    setLazyGitRunning(true);
    await launchLazyGit(project.path);
    setLazyGitRunning(false);

    // Refresh git status after lazygit exits
    const git = await getGitStatus(project.path);
    setGitStatus(git);
  }, [project.path]);

  useInput((input, key) => {
    if (lazyGitRunning) return;

    if (key.escape) {
      onBack();
      return;
    }

    // Quick actions
    if (input === 'r' && targets.length > 0) {
      // Run selected or first target
      const target = targets[selectedTargetIndex] || targets[0];
      onRunCommand(target.name);
      return;
    }

    if (input === 'i') {
      onOpenIssues();
      return;
    }

    if (input === 'g') {
      handleLaunchLazyGit();
      return;
    }

    if (input === 'q') {
      exit();
      return;
    }

    // Navigate make targets
    if (key.upArrow) {
      setSelectedTargetIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedTargetIndex(prev => Math.min(targets.length - 1, prev + 1));
    } else if (key.return && targets[selectedTargetIndex]) {
      onRunCommand(targets[selectedTargetIndex].name);
    }
  });

  const lineWidth = Math.min(columns - 8, 100);
  const panelWidth = isWide ? Math.floor((lineWidth - 4) / 2) : lineWidth;

  if (loading) {
    return (
      <Box padding={3} width={columns} height={rows} alignItems="center" justifyContent="center">
        <Text color="yellow"><Spinner type="dots" /></Text>
        <Text> Loading {project.name}...</Text>
      </Box>
    );
  }

  if (lazyGitRunning) {
    return (
      <Box padding={3} width={columns} height={rows} alignItems="center" justifyContent="center">
        <Text color="cyan">lazygit running... (will return when you exit)</Text>
      </Box>
    );
  }

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
          <Text bold color="cyan">🥩 SWANSON</Text>
          <Text color="gray"> › </Text>
          <Text>{project.icon} </Text>
          <Text bold color={project.color}>{project.name}</Text>
          {project.description && <Text color="gray" dimColor>  {project.description}</Text>}
        </Box>
        <Text color="gray">[ESC] Back  [q] Quit</Text>
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

      <Box marginBottom={isLarge ? 2 : 1}>
        <Text color="gray">{'─'.repeat(lineWidth)}</Text>
      </Box>

      {/* Main content - panels */}
      <Box flexDirection={isWide ? 'row' : 'column'} gap={2} flexGrow={1}>
        {/* Make targets panel */}
        <Box
          flexDirection="column"
          width={panelWidth}
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
        >
          <Box marginBottom={1}>
            <Text bold color="white">MAKE TARGETS</Text>
            <Text color="gray" dimColor> ({targets.length})</Text>
          </Box>

          {targets.length === 0 ? (
            <Text color="gray" dimColor>No local.* targets found</Text>
          ) : (
            <Box flexDirection="column">
              {targets.slice(0, isLarge ? 10 : 5).map((target, index) => {
                const isSelected = index === selectedTargetIndex;
                const displayName = getTargetDisplayName(target.name);

                return (
                  <Box key={target.name}>
                    <Text color={isSelected ? 'cyan' : 'white'}>
                      {isSelected ? '❯ ' : '  '}
                    </Text>
                    <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                      {displayName}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}

          <Box marginTop={1}>
            <Text color="gray" dimColor>[⏎] Run  [↑↓] Select</Text>
          </Box>
        </Box>

        {/* Issues panel */}
        <Box
          flexDirection="column"
          width={panelWidth}
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
        >
          <Box marginBottom={1}>
            <Text bold color="white">ISSUES</Text>
            <Text color="green"> {issueCount.open} open</Text>
          </Box>

          {issues.length === 0 ? (
            <Text color="gray" dimColor>No open issues</Text>
          ) : (
            <Box flexDirection="column">
              {issues.slice(0, isLarge ? 5 : 3).map((issue) => (
                <Box key={issue.number} gap={1}>
                  <Text color="green">●</Text>
                  <Text color="gray" dimColor>#{issue.number}</Text>
                  <Text wrap="truncate-end">
                    {issue.title.slice(0, panelWidth - 12)}
                  </Text>
                </Box>
              ))}
            </Box>
          )}

          <Box marginTop={1}>
            <Text color="gray" dimColor>[i] Open browser</Text>
          </Box>
        </Box>
      </Box>

      {/* Quick actions footer */}
      <Box marginTop={2} flexDirection="column">
        <Box gap={4}>
          <Text color="cyan" bold>[r] Run</Text>
          <Text color="green" bold>[i] Issues</Text>
          <Text color="magenta" bold>[g] Git (lazygit)</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Path: {project.path}</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default ProjectDashboard;
