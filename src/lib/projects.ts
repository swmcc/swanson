// Project configuration with icons and colors
// Icons are emoji/unicode since terminals can't render SVGs

export interface ProjectConfig {
  name: string;
  path: string;
  icon: string;
  color: 'red' | 'green' | 'blue' | 'yellow' | 'cyan' | 'magenta' | 'white' | 'gray';
  description?: string;
}

export const PROJECTS: ProjectConfig[] = [
  {
    name: 'funeralsni',
    path: '/Users/swm/Code/funeralsni',
    icon: '⚱️',
    color: 'red',
    description: 'Funeral notices NI',
  },
  {
    name: 'whatisonthe.tv',
    path: '/Users/swm/Code/whatisonthe.tv',
    icon: '📺',
    color: 'cyan',
    description: 'TV guide',
  },
  {
    name: 'second_breakfast',
    path: '/Users/swm/Code/second_breakfast',
    icon: '🍳',
    color: 'yellow',
    description: 'Breakfast app',
  },
  {
    name: 'skillfulgorilla.com',
    path: '/Users/swm/Code/skillfulgorilla.com',
    icon: '🦍',
    color: 'green',
    description: 'Skillful Gorilla',
  },
  {
    name: 'theonlystephen.com',
    path: '/Users/swm/Code/theonlystephen.com',
    icon: '👤',
    color: 'blue',
    description: 'Personal site',
  },
  {
    name: 'bmk',
    path: '/Users/swm/Code/bmk',
    icon: '🔖',
    color: 'magenta',
    description: 'Bookmarks',
  },
  {
    name: 'swm.cc',
    path: '/Users/swm/Code/swm.cc',
    icon: 'Ⓢ',
    color: 'white',
    description: 'Portfolio',
  },
  {
    name: 'jotter',
    path: '/Users/swm/Code/jotter',
    icon: '📓',
    color: 'yellow',
    description: 'Notes & images',
  },
  {
    name: 'the-mcculloughs.org',
    path: '/Users/swm/Code/the-mcculloughs.org',
    icon: '👨‍👩‍👧‍👦',
    color: 'red',
    description: 'Family photos',
  },
  {
    name: 'swanson',
    path: '/Users/swm/Code/swanson',
    icon: '🥩',
    color: 'cyan',
    description: 'Dev services TUI',
  },
];

export function getProjectConfig(name: string): ProjectConfig | undefined {
  return PROJECTS.find(p => p.name === name);
}
