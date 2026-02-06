import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

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
  const [phase, setPhase] = useState<'logo' | 'loading' | 'ready'>('logo');
  const [loadingText, setLoadingText] = useState('Initializing');

  const loadingSteps = [
    'Initializing',
    'Scanning projects',
    'Detecting services',
    'Checking Makefiles',
    'Ready',
  ];

  useEffect(() => {
    const logoTimer = setTimeout(() => {
      setPhase('loading');
    }, 800);

    return () => clearTimeout(logoTimer);
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;

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

  // Responsive progress bar - wider on larger terminals
  const progressBarWidth = isLarge ? 60 : 40;
  const filledWidth = Math.floor((progress / 100) * progressBarWidth);
  const progressBar = '█'.repeat(filledWidth) + '░'.repeat(progressBarWidth - filledWidth);

  // Calculate vertical centering for large terminals
  const contentHeight = 15; // Approximate height of splash content
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
      {phase === 'loading' && (
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
          <Box marginTop={isLarge ? 2 : 1}>
            <Text color="gray">{projectCount} projects loaded</Text>
          </Box>
        </Box>
      )}

      {/* Terminal size indicator (debug - remove later) */}
      {isLarge && (
        <Box position="absolute" marginTop={rows - 2}>
          <Text color="gray" dimColor>{columns}×{rows}</Text>
        </Box>
      )}
    </Box>
  );
};

export default Splash;
