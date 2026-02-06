import React, { useState, useEffect } from 'react';
import { useApp, useInput } from 'ink';
import { Splash } from './components/Splash.js';
import { ProjectList } from './components/ProjectList.js';
import { ProjectView } from './components/ProjectView.js';
import { processManager } from './lib/process.js';
import { PROJECTS, ProjectConfig } from './lib/projects.js';

type Screen = 'splash' | 'list' | 'project';

export interface Project extends ProjectConfig {
  running: number;
  total: number;
}

// Extend project configs with runtime state
const projectsWithState: Project[] = PROJECTS.map(p => ({
  ...p,
  running: 0,
  total: 0,
}));

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
    return <Splash onComplete={handleSplashComplete} projectCount={projectsWithState.length} />;
  }

  if (screen === 'list') {
    return <ProjectList projects={projectsWithState} onSelect={handleProjectSelect} />;
  }

  if (screen === 'project' && selectedProject) {
    return <ProjectView project={selectedProject} onBack={handleBack} />;
  }

  return null;
};

export default App;
