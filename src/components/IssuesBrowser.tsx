import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { GitHub, GitHubIssue, GitHubIssueDetail, IssueState, formatRelativeTime } from '../lib/github.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface IssuesBrowserProps {
  projectPath: string;
  projectName: string;
  projectIcon: string;
  projectColor: string;
  onBack: () => void;
}

type View = 'list' | 'detail';

export const IssuesBrowser: React.FC<IssuesBrowserProps> = ({
  projectPath,
  projectName,
  projectIcon,
  projectColor,
  onBack,
}) => {
  const { columns, rows, isLarge } = useTerminalSize();
  const [view, setView] = useState<View>('list');
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssueDetail | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [stateFilter, setStateFilter] = useState<IssueState>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const github = new GitHub(projectPath);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await github.listIssues(stateFilter);

    if (result.success) {
      setIssues(result.data);
      setSelectedIndex(0);
    } else {
      setError(result.error.message);
    }

    setLoading(false);
  }, [projectPath, stateFilter]);

  const loadIssueDetail = useCallback(async (issueNumber: number) => {
    setLoading(true);

    const result = await github.getIssue(issueNumber);

    if (result.success) {
      setSelectedIssue(result.data);
      setView('detail');
    } else {
      setError(result.error.message);
    }

    setLoading(false);
  }, [projectPath]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // Clear action message after 2 seconds
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const handleCloseIssue = async () => {
    if (!selectedIssue) return;

    const result = await github.closeIssue(selectedIssue.number);
    if (result.success) {
      setActionMessage(`Closed #${selectedIssue.number}`);
      setView('list');
      loadIssues();
    } else {
      setActionMessage(`Error: ${result.error.message}`);
    }
  };

  const handleReopenIssue = async () => {
    if (!selectedIssue) return;

    const result = await github.reopenIssue(selectedIssue.number);
    if (result.success) {
      setActionMessage(`Reopened #${selectedIssue.number}`);
      setView('list');
      loadIssues();
    } else {
      setActionMessage(`Error: ${result.error.message}`);
    }
  };

  const handleOpenInBrowser = async () => {
    if (view === 'detail' && selectedIssue) {
      await github.openInBrowser(selectedIssue.number);
    } else if (issues[selectedIndex]) {
      await github.openInBrowser(issues[selectedIndex].number);
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      if (view === 'detail') {
        setView('list');
        setSelectedIssue(null);
      } else {
        onBack();
      }
      return;
    }

    if (view === 'list') {
      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex(prev => Math.min(issues.length - 1, prev + 1));
      } else if (key.return && issues[selectedIndex]) {
        loadIssueDetail(issues[selectedIndex].number);
      } else if (input === 'o') {
        setStateFilter('open');
      } else if (input === 'c') {
        setStateFilter('closed');
      } else if (input === 'a') {
        setStateFilter('all');
      } else if (input === 'b') {
        handleOpenInBrowser();
      } else if (input === 'r') {
        loadIssues();
      }
    } else if (view === 'detail') {
      if (input === 'x' && selectedIssue?.state === 'open') {
        handleCloseIssue();
      } else if (input === 'o' && selectedIssue?.state === 'closed') {
        handleReopenIssue();
      } else if (input === 'b') {
        handleOpenInBrowser();
      }
    }
  });

  const lineWidth = Math.min(columns - 6, 100);

  if (loading && issues.length === 0) {
    return (
      <Box padding={2} alignItems="center" justifyContent="center" width={columns} height={rows}>
        <Text color="yellow"><Spinner type="dots" /></Text>
        <Text> Loading issues...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={2} width={columns}>
        <Text color="red" bold>Error loading issues</Text>
        <Text color="gray">{error}</Text>
        <Box marginTop={2}>
          <Text color="gray">[ESC] Back  [r] Retry</Text>
        </Box>
      </Box>
    );
  }

  // Detail view
  if (view === 'detail' && selectedIssue) {
    const bodyLines = selectedIssue.body.split('\n').slice(0, isLarge ? 15 : 8);

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
            <Text bold>#{selectedIssue.number}</Text>
          </Box>
          <Text color="gray">[ESC] Back</Text>
        </Box>

        {/* Issue title */}
        <Box marginBottom={1}>
          <Text color={selectedIssue.state === 'open' ? 'green' : 'red'}>
            {selectedIssue.state === 'open' ? '●' : '○'}
          </Text>
          <Text bold> {selectedIssue.title}</Text>
        </Box>

        {/* Meta */}
        <Box marginBottom={1} gap={2}>
          <Text color="gray">@{selectedIssue.author}</Text>
          <Text color="gray">opened {formatRelativeTime(selectedIssue.createdAt)}</Text>
          {selectedIssue.labels.length > 0 && (
            <Text color="yellow">{selectedIssue.labels.join(', ')}</Text>
          )}
        </Box>

        <Box marginBottom={1}>
          <Text color="gray">{'─'.repeat(lineWidth)}</Text>
        </Box>

        {/* Body */}
        <Box flexDirection="column" marginBottom={1}>
          {bodyLines.map((line, i) => (
            <Text key={i} color="white" wrap="truncate-end">{line.slice(0, lineWidth)}</Text>
          ))}
          {selectedIssue.body.split('\n').length > bodyLines.length && (
            <Text color="gray" dimColor>... (truncated)</Text>
          )}
        </Box>

        {/* Comments */}
        {selectedIssue.comments.length > 0 && (
          <>
            <Box marginY={1}>
              <Text color="gray">{'─'.repeat(lineWidth)}</Text>
            </Box>
            <Text color="gray" bold>Comments ({selectedIssue.commentsCount})</Text>
            <Box flexDirection="column" marginTop={1}>
              {selectedIssue.comments.slice(0, 5).map((comment, i) => (
                <Box key={i} marginBottom={1} flexDirection="column">
                  <Box gap={2}>
                    <Text color="cyan">@{comment.author}</Text>
                    <Text color="gray" dimColor>{formatRelativeTime(comment.createdAt)}</Text>
                  </Box>
                  <Text color="gray" wrap="truncate-end">
                    {comment.body.split('\n')[0].slice(0, lineWidth - 4)}
                  </Text>
                </Box>
              ))}
            </Box>
          </>
        )}

        {/* Action message */}
        {actionMessage && (
          <Box marginTop={1}>
            <Text color="yellow">{actionMessage}</Text>
          </Box>
        )}

        {/* Footer */}
        <Box marginTop={2}>
          <Text color="gray">
            {selectedIssue.state === 'open' ? '[x] Close' : '[o] Reopen'}
            {'  '}[b] Browser  [ESC] Back
          </Text>
        </Box>
      </Box>
    );
  }

  // List view
  const openCount = issues.filter(i => i.state === 'open').length;
  const closedCount = issues.filter(i => i.state === 'closed').length;

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
          <Text bold>Issues</Text>
        </Box>
        <Text color="gray">[ESC] Back</Text>
      </Box>

      {/* Filter tabs */}
      <Box marginBottom={1} gap={2}>
        <Text
          color={stateFilter === 'open' ? 'green' : 'gray'}
          bold={stateFilter === 'open'}
        >
          [o] Open ({stateFilter === 'open' ? issues.length : openCount})
        </Text>
        <Text
          color={stateFilter === 'closed' ? 'red' : 'gray'}
          bold={stateFilter === 'closed'}
        >
          [c] Closed ({stateFilter === 'closed' ? issues.length : closedCount})
        </Text>
        <Text
          color={stateFilter === 'all' ? 'white' : 'gray'}
          bold={stateFilter === 'all'}
        >
          [a] All
        </Text>
        {loading && <Text color="yellow"><Spinner type="dots" /></Text>}
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">{'─'.repeat(lineWidth)}</Text>
      </Box>

      {/* Issues list */}
      {issues.length === 0 ? (
        <Box>
          <Text color="gray">No {stateFilter} issues</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {issues.slice(0, isLarge ? 20 : 10).map((issue, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box key={issue.number} gap={1}>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '❯' : ' '}
                </Text>
                <Text color={issue.state === 'open' ? 'green' : 'red'}>
                  {issue.state === 'open' ? '●' : '○'}
                </Text>
                <Text color="gray" dimColor>#{issue.number.toString().padEnd(5)}</Text>
                <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected} wrap="truncate-end">
                  {issue.title.slice(0, lineWidth - 30)}
                </Text>
                <Box flexGrow={1} />
                <Text color="gray" dimColor>{formatRelativeTime(issue.createdAt)}</Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Action message */}
      {actionMessage && (
        <Box marginTop={1}>
          <Text color="yellow">{actionMessage}</Text>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={2}>
        <Text color="gray">
          [↑↓] Navigate  [⏎] View  [b] Browser  [r] Refresh  [ESC] Back
        </Text>
      </Box>
    </Box>
  );
};

export default IssuesBrowser;
