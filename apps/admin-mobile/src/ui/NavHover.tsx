import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../state/motion';

export function NavHover({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [hovered, setHovered] = useState(false);
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: hovered ? 1 : 0, duration: reduced ? 0 : 160, useNativeDriver: false });
    animation.start(); return () => animation.stop();
  }, [hovered, reduced, progress]);
  return <View onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)} style={style}>
    <Animated.View style={{ borderRadius: 20, backgroundColor: progress.interpolate({ inputRange: [0, 1], outputRange: ['rgba(57,120,237,0)', 'rgba(57,120,237,0.16)'] }),
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, reduced ? 0 : -2] }) }] }}>{children}</Animated.View>
  </View>;
}
