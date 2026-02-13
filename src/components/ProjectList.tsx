import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import type { Project } from '../app.js';

interface ProjectListProps {
  projects: Project[];
  onSelect: (project: Project) => void;
}

// Card component for grid view
const ProjectCard: React.FC<{
  project: Project;
  isSelected: boolean;
  width: number;
}> = ({ project, isSelected, width }) => {
  const isRunning = project.running > 0;

  // Use project's accent color for border when selected
  const borderColor = isSelected ? project.color : 'gray';

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle={isSelected ? 'double' : 'single'}
      borderColor={borderColor}
      paddingX={1}
      paddingY={0}
    >
      {/* Icon and name row */}
      <Box>
        <Text>{project.icon} </Text>
        <Text color={isSelected ? project.color : 'white'} bold>
          {project.name.length > width - 6
            ? project.name.slice(0, width - 9) + '...'
            : project.name}
        </Text>
      </Box>
      {/* Running indicator OR description */}
      {isRunning ? (
        <Box>
          <Text color="green">● running</Text>
        </Box>
      ) : project.description ? (
        <Box>
          <Text color="gray" dimColor>
            {project.description.length > width - 4
              ? project.description.slice(0, width - 7) + '...'
              : project.description}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};

// List row component for compact view
const ProjectRow: React.FC<{
  project: Project;
  isSelected: boolean;
  showDescription: boolean;
}> = ({ project, isSelected, showDescription }) => {
  const isRunning = project.running > 0;

  return (
    <Box>
      <Text color={isSelected ? project.color : 'white'}>
        {isSelected ? '❯ ' : '  '}
      </Text>
      <Text>{project.icon} </Text>
      <Text color={isSelected ? project.color : 'white'} bold={isSelected}>
        {project.name.padEnd(22)}
      </Text>
      {isRunning ? (
        <Text color="green">● running</Text>
      ) : showDescription && project.description ? (
        <Text color="gray" dimColor>{project.description}</Text>
      ) : null}
    </Box>
  );
};

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelect }) => {
  const { columns, rows, isLarge, isWide } = useTerminalSize();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  // Reset selection when filter changes to avoid out-of-bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Grid layout calculations - wider cards to fit icon + description
  const cardWidth = 26;
  const cardGap = 2;
  const availableWidth = columns - 6; // padding
  const cardsPerRow = Math.floor(availableWidth / (cardWidth + cardGap));
  const useGridView = isLarge && cardsPerRow >= 3;

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

    // Handle search input (but don't block navigation)
    if (isSearching) {
      if (key.backspace || key.delete) {
        setFilter(prev => prev.slice(0, -1));
        return;
      } else if (input && !key.ctrl && !key.meta && !key.upArrow && !key.downArrow && !key.leftArrow && !key.rightArrow && !key.return) {
        setFilter(prev => prev + input);
        return;
      }
    }

    if (useGridView) {
      // Grid navigation
      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - cardsPerRow));
      } else if (key.downArrow) {
        setSelectedIndex(prev => Math.min(filteredProjects.length - 1, prev + cardsPerRow));
      } else if (key.leftArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.rightArrow) {
        setSelectedIndex(prev => Math.min(filteredProjects.length - 1, prev + 1));
      } else if (key.return) {
        if (filteredProjects[selectedIndex]) {
          onSelect(filteredProjects[selectedIndex]);
        }
      }
    } else {
      // List navigation
      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex(prev => Math.min(filteredProjects.length - 1, prev + 1));
      } else if (key.return) {
        if (filteredProjects[selectedIndex]) {
          onSelect(filteredProjects[selectedIndex]);
        }
      }
    }
  });

  // Build grid rows
  const gridRows: Project[][] = [];
  if (useGridView) {
    for (let i = 0; i < filteredProjects.length; i += cardsPerRow) {
      gridRows.push(filteredProjects.slice(i, i + cardsPerRow));
    }
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
      <Box marginBottom={isLarge ? 2 : 1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">🥩 SWANSON</Text>
          <Text color="gray"> │ </Text>
          <Text color="white">{filteredProjects.length} projects</Text>
          {useGridView && <Text color="gray" dimColor>  [grid]</Text>}
        </Box>
        <Text color="gray">{new Date().toLocaleTimeString()}</Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={isLarge ? 2 : 1}>
        <Text color="gray">{'─'.repeat(Math.min(columns - 8, 80))}</Text>
      </Box>

      {/* Search bar */}
      {isSearching && (
        <Box marginBottom={isLarge ? 2 : 1}>
          <Text color="yellow">/ </Text>
          <Text>{filter}</Text>
          <Text color="gray">▌</Text>
        </Box>
      )}

      {/* Grid View */}
      {useGridView && (
        <Box flexDirection="column" gap={1}>
          {gridRows.map((row, rowIndex) => (
            <Box key={rowIndex} gap={cardGap}>
              {row.map((project, colIndex) => {
                const globalIndex = rowIndex * cardsPerRow + colIndex;
                return (
                  <ProjectCard
                    key={project.name}
                    project={project}
                    isSelected={globalIndex === selectedIndex}
                    width={cardWidth}
                  />
                );
              })}
            </Box>
          ))}
        </Box>
      )}

      {/* List View */}
      {!useGridView && (
        <Box flexDirection="column">
          {filteredProjects.map((project, index) => (
            <ProjectRow
              key={project.name}
              project={project}
              isSelected={index === selectedIndex}
              showDescription={isWide}
            />
          ))}
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={isLarge ? 3 : 2} flexDirection="column">
        <Text color="gray">
          {useGridView
            ? '[←↑↓→] Navigate  [⏎] Select  [/] Search  [d] Deploys  [q] Quit'
            : '[↑↓] Navigate  [⏎] Select  [/] Search  [d] Deploys  [q] Quit'}
        </Text>
        {isLarge && (
          <Box marginTop={1}>
            <Text color="gray" dimColor>{columns}×{rows}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ProjectList;
