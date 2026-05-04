import { useWindowDimensions } from 'react-native';
import { useHasMounted } from './useHasMounted';

export function useIsCompact() {
  const hasMounted = useHasMounted();
  const { width } = useWindowDimensions();
  return hasMounted ? width < 900 : false;
}
