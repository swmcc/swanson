import { useStdout } from 'ink';
import { useState, useEffect } from 'react';

export interface TerminalSize {
  columns: number;
  rows: number;
  isWide: boolean;    // > 100 columns
  isTall: boolean;    // > 30 rows
  isLarge: boolean;   // both wide and tall
}

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();

  const getSize = (): TerminalSize => {
    const columns = stdout?.columns || 80;
    const rows = stdout?.rows || 24;
    const isWide = columns > 100;
    const isTall = rows > 30;

    return {
      columns,
      rows,
      isWide,
      isTall,
      isLarge: isWide && isTall,
    };
  };

  const [size, setSize] = useState<TerminalSize>(getSize);

  useEffect(() => {
    const handleResize = () => {
      setSize(getSize());
    };

    stdout?.on('resize', handleResize);
    return () => {
      stdout?.off('resize', handleResize);
    };
  }, [stdout]);

  return size;
}
