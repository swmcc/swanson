import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Splash } from './components/Splash.js';
import { ProjectList } from './components/ProjectList.js';

type Screen = 'splash' | 'list' | 'project';

// Your projects from CLAUDE.md
const PROJECTS = [
  { name: 'funeralsni', path: '/Users/swm/Code/funeralsni', running: 0, total: 3 },
  { name: 'whatisonthe.tv', path: '/Users/swm/Code/whatisonthe.tv', running: 0, total: 2 },
  { name: 'second_breakfast', path: '/Users/swm/Code/second_breakfast', running: 0, total: 2 },
  { name: 'skillfulgorilla.com', path: '/Users/swm/Code/skillfulgorilla.com', running: 0, total: 2 },
  { name: 'theonlystephen.com', path: '/Users/swm/Code/theonlystephen.com', running: 0, total: 1 },
  { name: 'bmk', path: '/Users/swm/Code/bmk', running: 0, total: 2 },
  { name: 'swm.cc', path: '/Users/swm/Code/swm.cc', running: 0, total: 1 },
  { name: 'jotter', path: '/Users/swm/Code/jotter', running: 0, total: 2 },
  { name: 'the-mcculloughs.org', path: '/Users/swm/Code/the-mcculloughs.org', running: 0, total: 1 },
];

interface Project {
  name: string;
  path: string;
  running: number;
  total: number;
}

export const App: React.FC = () => {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>('splash');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useInput((input, key) => {
    if (input === 'q' && screen !== 'splash') {
      exit();
    }
    if (key.escape && screen === 'project') {
      setScreen('list');
      setSelectedProject(null);
    }
  });

  const handleSplashComplete = () => {
    setScreen('list');
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setScreen('project');
  };

  if (screen === 'splash') {
    return <Splash onComplete={handleSplashComplete} projectCount={PROJECTS.length} />;
  }

  if (screen === 'list') {
    return <ProjectList projects={PROJECTS} onSelect={handleProjectSelect} />;
  }

  // Project detail view (placeholder for now)
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">SWANSON</Text>
        <Text color="gray"> › </Text>
        <Text bold color="white">{selectedProject?.name}</Text>
        <Text color="gray">  [ESC] Back</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">{'─'.repeat(50)}</Text>
      </Box>

      <Box>
        <Text color="yellow">Project view coming next...</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Path: {selectedProject?.path}</Text>
      </Box>
    </Box>
  );
};

export default App;
