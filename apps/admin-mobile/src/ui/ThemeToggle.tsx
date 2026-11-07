import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../state/theme';

export function ThemeToggle() {
  const { c, dark, setMode } = useTheme();
  const label = dark ? 'فعال کردن حالت روشن' : 'فعال کردن حالت تیره';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="انتخاب ظاهر برنامه روی این دستگاه حفظ می‌شود"
    accessibilityState={{ selected: dark }} onPress={() => setMode(dark ? 'light' : 'dark')}
    style={({ pressed }) => ({ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.line, opacity: pressed ? .65 : 1 })}>
    <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} color={c.blue} size={21} />
  </Pressable>;
}
