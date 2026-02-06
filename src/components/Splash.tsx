import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { checkPrerequisites, PrerequisiteCheck } from '../lib/prerequisites.js';

const SWANSON_LOGO = `
███████╗██╗    ██╗ █████╗ ███╗   ██╗███████╗ ██████╗ ███╗   ██╗
██╔════╝██║    ██║██╔══██╗████╗  ██║██╔════╝██╔═══██╗████╗  ██║
███████╗██║ █╗ ██║███████║██╔██╗ ██║███████╗██║   ██║██╔██╗ ██║
╚════██║██║███╗██║██╔══██║██║╚██╗██║╚════██║██║   ██║██║╚██╗██║
███████║╚███╔███╔╝██║  ██║██║ ╚████║███████║╚██████╔╝██║ ╚████║
╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝`;

const TAGLINE = "Give me all the services you have.";

interface SplashProps {
  onComplete: () => void;
  projectCount?: number;
}

export const Splash: React.FC<SplashProps> = ({ onComplete, projectCount = 9 }) => {
  const { columns, rows, isLarge, isTall } = useTerminalSize();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'logo' | 'checking' | 'ready' | 'error'>('logo');
  const [loadingText, setLoadingText] = useState('Initializing');
  const [prerequisites, setPrerequisites] = useState<PrerequisiteCheck[]>([]);
  const [hasErrors, setHasErrors] = useState(false);

  const loadingSteps = [
    'Initializing',
    'Checking prerequisites',
    'Scanning projects',
    'Detecting services',
    'Ready',
  ];

  useEffect(() => {
    const logoTimer = setTimeout(() => {
      setPhase('checking');
    }, 800);

    return () => clearTimeout(logoTimer);
  }, []);

  useEffect(() => {
    if (phase !== 'checking') return;

    // Check prerequisites
    const checks = checkPrerequisites();
    setPrerequisites(checks);

    const missingRequired = checks.filter(c => c.required && !c.installed);
    if (missingRequired.length > 0) {
      setHasErrors(true);
      setPhase('error');
      return;
    }

    // Continue with loading animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 15 + 5;

        const stepIndex = Math.min(
          Math.floor((next / 100) * loadingSteps.length),
          loadingSteps.length - 1
        );
        setLoadingText(loadingSteps[stepIndex]);

        if (next >= 100) {
          clearInterval(interval);
          setPhase('ready');
          setTimeout(onComplete, 600);
          return 100;
        }
        return next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [phase, onComplete]);

  const progressBarWidth = isLarge ? 60 : 40;
  const filledWidth = Math.floor((progress / 100) * progressBarWidth);
  const progressBar = '█'.repeat(filledWidth) + '░'.repeat(progressBarWidth - filledWidth);

  const contentHeight = 15;
  const topPadding = isTall ? Math.floor((rows - contentHeight) / 2) : 1;

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent={isTall ? 'center' : 'flex-start'}
      paddingY={topPadding}
      width={columns}
      height={isTall ? rows : undefined}
    >
      {/* Logo */}
      <Box marginBottom={isLarge ? 2 : 1}>
        <Gradient name="morning">
          <Text>{SWANSON_LOGO}</Text>
        </Gradient>
      </Box>

      {/* Tagline */}
      <Box marginBottom={isLarge ? 2 : 1}>
        <Text italic color="gray">{TAGLINE}</Text>
      </Box>

      {/* Loading section */}
      {phase === 'checking' && (
        <Box flexDirection="column" alignItems="center" marginTop={isLarge ? 3 : 1}>
          <Box>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            <Text color="white"> {loadingText}...</Text>
          </Box>

          <Box marginTop={isLarge ? 2 : 1}>
            <Text color="cyan">{progressBar}</Text>
            <Text color="white"> {Math.floor(progress)}%</Text>
          </Box>

          <Box marginTop={isLarge ? 2 : 1}>
            <Text color="gray">Found {projectCount} projects</Text>
          </Box>
        </Box>
      )}

      {/* Ready state */}
      {phase === 'ready' && (
        <Box flexDirection="column" alignItems="center" marginTop={isLarge ? 3 : 1}>
          <Text color="green" bold>✓ Ready</Text>
          <Box marginTop={isLarge ? 2 : 1} flexDirection="column" alignItems="center">
            <Text color="gray">{projectCount} projects loaded</Text>
            <Box marginTop={1} gap={2}>
              {prerequisites.filter(p => p.installed).map(p => (
                <Text key={p.name} color="green" dimColor>✓ {p.name}</Text>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Error state - missing prerequisites */}
      {phase === 'error' && (
        <Box flexDirection="column" alignItems="center" marginTop={isLarge ? 3 : 1}>
          <Text color="red" bold>✕ Missing Prerequisites</Text>
          <Box marginTop={2} flexDirection="column" gap={1}>
            {prerequisites.map(p => (
              <Box key={p.name} gap={2}>
                <Text color={p.installed ? 'green' : 'red'}>
                  {p.installed ? '✓' : '✕'}
                </Text>
                <Text color={p.installed ? 'white' : 'red'} bold={!p.installed}>
                  {p.name}
                </Text>
                {p.installed && p.version && (
                  <Text color="gray" dimColor>v{p.version}</Text>
                )}
                {!p.installed && p.installHint && (
                  <Text color="yellow">{p.installHint}</Text>
                )}
              </Box>
            ))}
          </Box>
          <Box marginTop={2}>
            <Text color="gray">Install missing tools and restart Swanson</Text>
          </Box>
        </Box>
      )}

      {/* Terminal size indicator */}
      {isLarge && phase !== 'error' && (
        <Box position="absolute" marginTop={rows - 2}>
          <Text color="gray" dimColor>{columns}×{rows}</Text>
        </Box>
      )}
    </Box>
  );
};

export default Splash;
