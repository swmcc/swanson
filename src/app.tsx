import React, { useState, useEffect } from 'react';
import { useApp, useInput } from 'ink';
import { Splash } from './components/Splash.js';
import { ProjectList } from './components/ProjectList.js';
import { ProjectDashboard } from './components/ProjectDashboard.js';
import { IssuesBrowser } from './components/IssuesBrowser.js';
import { DeploymentsBrowser } from './components/DeploymentsBrowser.js';
import { LogViewer } from './components/LogViewer.js';
import { processManager } from './lib/process.js';
import { PROJECTS, ProjectConfig } from './lib/projects.js';

type Screen = 'splash' | 'list' | 'dashboard' | 'issues' | 'deployments' | 'logs';

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
  const [runCommand, setRunCommand] = useState<string | null>(null);

  // Cleanup on exit
  useEffect(() => {
    return () => {
      processManager.stopAll();
    };
  }, []);

  useInput((input, key) => {
    // Global quit from list screen
    if (input === 'q' && screen === 'list') {
      processManager.stopAll().then(() => exit());
    }
  });

  const handleSplashComplete = () => {
    setScreen('list');
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setScreen('dashboard');
  };

  const handleBack = () => {
    if (screen === 'issues' || screen === 'logs' || screen === 'deployments') {
      setScreen('dashboard');
      setRunCommand(null);
    } else {
      setScreen('list');
      setSelectedProject(null);
    }
  };

  const handleRunCommand = (command: string) => {
    setRunCommand(command);
    setScreen('logs');
  };

  const handleOpenIssues = () => {
    setScreen('issues');
  };

  const handleOpenDeployments = () => {
    setScreen('deployments');
  };

  const handleLogExit = () => {
    setRunCommand(null);
    setScreen('dashboard');
  };

  // Splash screen
  if (screen === 'splash') {
    return <Splash onComplete={handleSplashComplete} projectCount={projectsWithState.length} />;
  }

  // Project list
  if (screen === 'list') {
    return <ProjectList projects={projectsWithState} onSelect={handleProjectSelect} />;
  }

  // Project dashboard
  if (screen === 'dashboard' && selectedProject) {
    return (
      <ProjectDashboard
        project={selectedProject}
        onBack={handleBack}
        onRunCommand={handleRunCommand}
        onOpenIssues={handleOpenIssues}
        onOpenDeployments={handleOpenDeployments}
      />
    );
  }

  // Issues browser
  if (screen === 'issues' && selectedProject) {
    return (
      <IssuesBrowser
        projectPath={selectedProject.path}
        projectName={selectedProject.name}
        projectIcon={selectedProject.icon}
        projectColor={selectedProject.color}
        onBack={handleBack}
      />
    );
  }

  // Deployments browser
  if (screen === 'deployments' && selectedProject) {
    return (
      <DeploymentsBrowser
        projectPath={selectedProject.path}
        projectName={selectedProject.name}
        projectIcon={selectedProject.icon}
        projectColor={selectedProject.color}
        onBack={handleBack}
      />
    );
  }

  // Log viewer (running a command)
  if (screen === 'logs' && selectedProject && runCommand) {
    return (
      <LogViewer
        projectPath={selectedProject.path}
        projectName={selectedProject.name}
        projectIcon={selectedProject.icon}
        projectColor={selectedProject.color}
        command={runCommand}
        onExit={handleLogExit}
      />
    );
  }

  return null;
};

export default App;
