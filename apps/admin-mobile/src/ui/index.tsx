import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, View, type StyleProp, type TextProps, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { date } from '../lib/format';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../state/theme';
import { Bell } from './Bell';
import { ThemeToggle } from './ThemeToggle';
import { useLayout } from '../state/layout';

export const colors = { blue: '#2965ED', ink: '#132B4B', muted: '#687A93', background: '#F3F6FC',
  line: '#E3EAF5', pale: '#EAF0FF', green: '#107B60', danger: '#AE3045', gold: '#CF962C' };
export function T({ style, ...props }: TextProps) {
  const { c, dark } = useTheme();
  const original = StyleSheet.flatten(style)?.color;
  const adapted = original === colors.muted ? c.muted : original === colors.blue ? c.blue : original === colors.danger ? c.danger
    : !original || original === colors.ink ? c.ink : original;
  return <Text {...props} style={[styles.text, { color: c.ink }, style, dark && { color: adapted }]} />;
}
export function Page({ children, refreshing, onRefresh, scroll = true }: { children: React.ReactNode;
  refreshing?: boolean; onRefresh?: () => void; scroll?: boolean }) {
  const { c, dark } = useTheme();
  const { desktop, compact } = useLayout();
  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: c.background }]}>
    <LinearGradient colors={dark ? ['#0F1D35', '#122741', '#102239'] : ['#ECF3FF', '#F5F9FF', '#E8F6FA']} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: 'absolute', width: 230, height: 230, borderRadius: 150, backgroundColor: dark ? '#253F6C' : '#C9DEFF', top: 65, right: -100, opacity: .55 }} />
    <View pointerEvents="none" style={{ position: 'absolute', width: 250, height: 250, borderRadius: 150, backgroundColor: dark ? '#15445B' : '#BFEFF4', bottom: 50, left: -100, opacity: .35 }} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.page, { padding: desktop ? 32 : compact ? 16 : 22 }]}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.blue} /> : undefined}>
        {children}
      </ScrollView> : <View style={{ flex: 1 }}>{children}</View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c, dark } = useTheme();
  return <BlurView intensity={28} blurMethod="dimezisBlurViewSdk31Plus" tint={dark ? 'dark' : 'light'} style={[styles.card, { backgroundColor: c.card, borderColor: c.line }, style,
    dark && { backgroundColor: c.card, borderColor: c.line }]}>{children}</BlurView>;
}
export function Title({ title, subtitle, back }: { title: string; subtitle?: string; back?: () => void }) {
  const { c } = useTheme();
  const { compact } = useLayout();
  return <View style={{ gap: 8, marginBottom: 8 }}><View style={[styles.row, { gap: compact ? 7 : 12 }]}>
    <View style={styles.brand}><T style={{ color: 'white', fontFamily: 'Vazirmatn_700Bold', fontSize: 21 }}>N</T></View>
    <View style={{ flex: 1, minWidth: 0 }}><T style={styles.eyebrow}>NEXORA / BUSINESS</T><T style={[styles.title, compact && { fontSize: 20, lineHeight: 31 }]}>{title}</T></View>
    <View style={{ flexDirection: 'row-reverse', gap: 6, alignItems: 'center' }}><ThemeToggle /><Bell /></View>
    {back && <Pressable accessibilityRole="button" accessibilityLabel="بازگشت" onPress={back} style={[styles.iconButton, { backgroundColor: c.card }]}>
      <Ionicons name="arrow-forward" size={23} color={c.ink} /></Pressable>}
  </View>{subtitle && <T style={styles.muted}>{subtitle}</T>}</View>;
}
export function Button({ children, onPress, disabled, busy, secondary, danger, testID }: {
  children: React.ReactNode; onPress: () => void; disabled?: boolean; busy?: boolean;
  secondary?: boolean; danger?: boolean; testID?: string;
}) {
  const { c } = useTheme();
  return <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
    disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.button,
      secondary && { backgroundColor: c.pale }, danger && { backgroundColor: colors.danger },
      (disabled || busy) && { opacity: .5 }, pressed && { opacity: .75 }]}>
    {busy ? <ActivityIndicator color={secondary ? colors.blue : 'white'} /> :
      <T style={{ color: secondary ? colors.blue : 'white', textAlign: 'center', fontFamily: 'Vazirmatn_700Bold' }}>{children}</T>}
  </Pressable>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const { c } = useTheme();
  return <View style={{ gap: 7 }}><T style={styles.label}>{label}</T><TextInput accessibilityLabel={label}
    placeholderTextColor={c.muted} {...props} style={[styles.input, { color: c.ink, backgroundColor: c.input, borderColor: c.line }, props.multiline && { minHeight: 95, textAlignVertical: 'top' }, props.style]} />
    {!!error && <T accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12 }}>{error}</T>}</View>;
}
export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return <Card style={{ backgroundColor: '#FFF0F2', borderColor: '#F4CDD4' }}>
    <T accessibilityRole="alert" style={{ color: colors.danger }}>{error instanceof Error ? error.message : String(error)}</T>
    {retry && <Button secondary onPress={retry}>تلاش دوباره / تازه‌سازی</Button>}
  </Card>;
}
export function Loading() { return <View style={{ padding: 30, gap: 12 }}><ActivityIndicator color={colors.blue} /><T style={styles.muted}>در حال دریافت اطلاعات…</T></View>; }
export function Empty({ children }: { children: React.ReactNode }) {
  return <Card><Ionicons name="file-tray-outline" size={34} color={colors.muted} style={{ alignSelf: 'center' }} /><T style={{ textAlign: 'center' }}>{children}</T></Card>;
}
export function Badge({ children, green }: { children: React.ReactNode; green?: boolean }) {
  const { c, dark } = useTheme();
  return <View style={[styles.badge, { backgroundColor: green ? (dark ? '#163E39' : '#E4F5ED') : c.pale }]}><T style={{ fontSize: 11, color: green ? c.green : c.blue }}>{children}</T></View>;
}
export function Chips<TValue extends string>({ value, options, onChange, disabled }: {
  value: TValue; options: { value: TValue; label: string }[]; onChange: (value: TValue) => void; disabled?: boolean;
}) {
  const { c } = useTheme();
  return <View style={[styles.row, { flexWrap: 'wrap', gap: 8 }]}>{options.map(option =>
    <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: value === option.value, disabled }}
      disabled={disabled} onPress={() => onChange(option.value)} style={[styles.chip, { backgroundColor: c.card, borderColor: c.line }, value === option.value && { backgroundColor: colors.blue, borderColor: colors.blue }]}>
      <T style={{ fontSize: 12, color: value === option.value ? 'white' : colors.muted }}>{option.label}</T>
    </Pressable>)}</View>;
}
export function Updated({ at }: { at: number }) {
  return at ? <T style={[styles.muted, { fontSize: 11 }]}>آخرین دریافت: {date(at)} · برای تازه‌سازی صفحه را پایین بکشید.</T> : null;
}
export function Metric({ label, value, icon, accent }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; accent?: string }) {
  const { desktop } = useLayout(); const { c } = useTheme();
  return <Card style={{ flexGrow: 1, flexBasis: desktop ? '22%' : '44%' }}><Ionicons name={icon} color={accent || c.blue} size={22} style={{ alignSelf: 'flex-end' }} />
    <T style={{ fontFamily: 'Vazirmatn_700Bold', fontSize: 20 }}>{value}</T><T style={styles.muted}>{label}</T></Card>;
}
export function Pagination({ page, total, size, busy, onPage }: { page: number; total: number; size: number; busy: boolean; onPage: (page: number) => void }) {
  return <View style={styles.row}><View style={{ flex: 1 }}><Button secondary disabled={page <= 1 || busy} onPress={() => onPage(page - 1)}>قبلی</Button></View>
    <T style={styles.muted}>صفحه {page}</T><View style={{ flex: 1 }}><Button secondary disabled={page * size >= total || busy} onPress={() => onPage(page + 1)}>بعدی</Button></View></View>;
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { padding: 22, gap: 20, paddingBottom: 32, width: '100%', maxWidth: 1340, alignSelf: 'center', flexGrow: 1 },
  text: { fontFamily: 'Vazirmatn_400Regular', color: colors.ink, fontSize: 14, lineHeight: 25, textAlign: 'right', writingDirection: 'rtl' },
  title: { fontFamily: 'Vazirmatn_700Bold', fontSize: 24, lineHeight: 36, color: colors.ink },
  eyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, writingDirection: 'ltr' },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 23 },
  label: { fontFamily: 'Vazirmatn_700Bold', fontSize: 12 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  card: { borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.68)', padding: 20, gap: 12, borderWidth: 1, borderColor: colors.line, boxShadow: '0 8px 28px rgba(33,58,107,0.06)' },
  input: { backgroundColor: '#F7F9FD', borderColor: colors.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 12, minHeight: 48, color: colors.ink, fontFamily: 'Vazirmatn_400Regular', fontSize: 14, textAlign: 'right' },
  button: { borderRadius: 14, backgroundColor: colors.blue, paddingHorizontal: 18, paddingVertical: 12, minHeight: 48, justifyContent: 'center' },
  badge: { alignSelf: 'flex-end', borderRadius: 8, backgroundColor: colors.pale, paddingHorizontal: 9, paddingVertical: 3 },
  chip: { borderRadius: 12, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: 'white', borderWidth: 1, borderColor: colors.line, minHeight: 40 },
  brand: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  iconButton: { padding: 10, borderRadius: 14, backgroundColor: 'white' },
});
