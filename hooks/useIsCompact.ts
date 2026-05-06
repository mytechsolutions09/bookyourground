import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useHasMounted } from './useHasMounted';

export function useIsCompact() {
  const hasMounted = useHasMounted();
  const { width } = useWindowDimensions();
  
  return useMemo(() => hasMounted ? width < 900 : false, [hasMounted, width < 900]);
}
