import React, { useState, useEffect } from 'react';
import { useApp, useInput } from 'ink';
import { Splash } from './components/Splash.js';
import { ProjectList } from './components/ProjectList.js';
import { ProjectView } from './components/ProjectView.js';
import { processManager } from './lib/process.js';

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
  { name: 'swanson', path: '/Users/swm/Code/swanson', running: 0, total: 4 },
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

  // Cleanup on exit
  useEffect(() => {
    return () => {
      processManager.stopAll();
    };
  }, []);

  useInput((input, key) => {
    if (input === 'q' && screen === 'list') {
      processManager.stopAll().then(() => exit());
    }
  });

  const handleSplashComplete = () => {
    setScreen('list');
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setScreen('project');
  };

  const handleBack = () => {
    setScreen('list');
    setSelectedProject(null);
  };

  if (screen === 'splash') {
    return <Splash onComplete={handleSplashComplete} projectCount={PROJECTS.length} />;
  }

  if (screen === 'list') {
    return <ProjectList projects={PROJECTS} onSelect={handleProjectSelect} />;
  }

  if (screen === 'project' && selectedProject) {
    return <ProjectView project={selectedProject} onBack={handleBack} />;
  }

  return null;
};

export default App;
