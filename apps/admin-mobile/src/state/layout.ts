import { useWindowDimensions } from 'react-native';
export const DESKTOP_BREAKPOINT = 1024;
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, desktop: width >= DESKTOP_BREAKPOINT, wide: width >= 1280, compact: width < 400 };
}
