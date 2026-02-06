import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';

// Ron Swanson ASCII art - captures the essence
const SWANSON_ASCII = `
                    ▄▄▄▄▄▄▄▄▄▄▄
               ▄▀▀▀▀▀         ▀▀▀▀▀▄
             ▄▀    ▄▄▄▄▄▄▄▄▄▄▄    ▀▄
            █   ▄▀▀           ▀▀▄   █
           █  ▄▀  ▄▄▄     ▄▄▄  ▀▄  █
          █  █   █▀▀█     █▀▀█   █  █
          █  █   ▀▄▄▀     ▀▄▄▀   █  █
          █  █                   █  █
          █  █    ▄▄▄▄▄▄▄▄▄    █  █
          █   ▀▄  █       █  ▄▀   █
           █    ▀▀█▄▄▄▄▄▄▄█▀▀    █
            ▀▄     ▀▀▀▀▀▀▀     ▄▀
              ▀▀▄▄▄▄▄▄▄▄▄▄▄▀▀
`;

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
    // Phase 1: Show logo briefly
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

        // Update loading text based on progress
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

  const progressBarWidth = 40;
  const filledWidth = Math.floor((progress / 100) * progressBarWidth);
  const progressBar = '█'.repeat(filledWidth) + '░'.repeat(progressBarWidth - filledWidth);

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      {/* Logo */}
      <Box marginBottom={1}>
        <Gradient name="morning">
          <Text>{SWANSON_LOGO}</Text>
        </Gradient>
      </Box>

      {/* Tagline */}
      <Box marginBottom={1}>
        <Text italic color="gray">{TAGLINE}</Text>
      </Box>

      {/* Loading section */}
      {phase === 'loading' && (
        <Box flexDirection="column" alignItems="center" marginTop={1}>
          <Box>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            <Text color="white"> {loadingText}...</Text>
          </Box>

          <Box marginTop={1}>
            <Text color="cyan">{progressBar}</Text>
            <Text color="white"> {Math.floor(progress)}%</Text>
          </Box>

          <Box marginTop={1}>
            <Text color="gray">Found {projectCount} projects</Text>
          </Box>
        </Box>
      )}

      {/* Ready state */}
      {phase === 'ready' && (
        <Box flexDirection="column" alignItems="center" marginTop={1}>
          <Text color="green" bold>✓ Ready</Text>
          <Box marginTop={1}>
            <Text color="gray">{projectCount} projects loaded</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Splash;
