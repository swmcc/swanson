import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Project {
  name: string;
  path: string;
  running: number;
  total: number;
}

interface ProjectListProps {
  projects: Project[];
  onSelect: (project: Project) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelect }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  useInput((input, key) => {
    if (key.escape) {
      if (isSearching) {
        setIsSearching(false);
        setFilter('');
      }
      return;
    }

    if (input === '/') {
      setIsSearching(true);
      return;
    }

    if (isSearching) {
      if (key.backspace || key.delete) {
        setFilter(prev => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setFilter(prev => prev + input);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filteredProjects.length - 1, prev + 1));
    } else if (key.return) {
      if (filteredProjects[selectedIndex]) {
        onSelect(filteredProjects[selectedIndex]);
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">SWANSON</Text>
        <Text color="gray"> │ </Text>
        <Text color="gray">{new Date().toLocaleTimeString()}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">{'─'.repeat(50)}</Text>
      </Box>

      {/* Search bar */}
      {isSearching && (
        <Box marginBottom={1}>
          <Text color="yellow">/ </Text>
          <Text>{filter}</Text>
          <Text color="gray">▌</Text>
        </Box>
      )}

      {/* Project list */}
      {filteredProjects.map((project, index) => {
        const isSelected = index === selectedIndex;
        const statusIcon = project.running > 0 ? '●' : '○';
        const statusColor = project.running > 0 ? 'green' : 'gray';
        const serviceText = project.running > 0
          ? `${project.running} service${project.running > 1 ? 's' : ''}`
          : 'stopped';

        return (
          <Box key={project.name}>
            <Text color={isSelected ? 'cyan' : 'white'}>
              {isSelected ? '❯ ' : '  '}
            </Text>
            <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
              {project.name.padEnd(25)}
            </Text>
            <Text color={statusColor}>{statusIcon} </Text>
            <Text color="gray">{serviceText}</Text>
          </Box>
        );
      })}

      {/* Footer */}
      <Box marginTop={2}>
        <Text color="gray">
          [↑↓] Navigate  [⏎] Select  [/] Search  [q] Quit
        </Text>
      </Box>
    </Box>
  );
};

export default ProjectList;
