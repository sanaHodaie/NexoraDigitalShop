import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, View, type StyleProp, type TextProps, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { date } from '../lib/format';

export const colors = { blue: '#2965ED', ink: '#132B4B', muted: '#687A93', background: '#F3F6FC',
  line: '#E3EAF5', pale: '#EAF0FF', green: '#107B60', danger: '#AE3045', gold: '#CF962C' };
export function T({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.text, style]} />;
}
export function Page({ children, refreshing, onRefresh }: { children: React.ReactNode;
  refreshing?: boolean; onRefresh?: () => void }) {
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.blue} /> : undefined}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Title({ title, subtitle, back }: { title: string; subtitle?: string; back?: () => void }) {
  return <View style={{ gap: 8, marginBottom: 8 }}><View style={styles.row}>
    <View style={styles.brand}><T style={{ color: 'white', fontFamily: 'Vazirmatn_700Bold', fontSize: 21 }}>N</T></View>
    <View style={{ flex: 1 }}><T style={styles.eyebrow}>NEXORA / BUSINESS</T><T style={styles.title}>{title}</T></View>
    {back && <Pressable accessibilityRole="button" accessibilityLabel="بازگشت" onPress={back} style={styles.iconButton}>
      <Ionicons name="arrow-forward" size={23} color={colors.ink} /></Pressable>}
  </View>{subtitle && <T style={styles.muted}>{subtitle}</T>}</View>;
}
export function Button({ children, onPress, disabled, busy, secondary, danger, testID }: {
  children: React.ReactNode; onPress: () => void; disabled?: boolean; busy?: boolean;
  secondary?: boolean; danger?: boolean; testID?: string;
}) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
    disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.button,
      secondary && { backgroundColor: colors.pale }, danger && { backgroundColor: colors.danger },
      (disabled || busy) && { opacity: .5 }, pressed && { opacity: .75 }]}>
    {busy ? <ActivityIndicator color={secondary ? colors.blue : 'white'} /> :
      <T style={{ color: secondary ? colors.blue : 'white', textAlign: 'center', fontFamily: 'Vazirmatn_700Bold' }}>{children}</T>}
  </Pressable>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={{ gap: 7 }}><T style={styles.label}>{label}</T><TextInput accessibilityLabel={label}
    placeholderTextColor="#8996AA" {...props} style={[styles.input, props.multiline && { minHeight: 95, textAlignVertical: 'top' }, props.style]} />
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
  return <View style={[styles.badge, green && { backgroundColor: '#E4F5ED' }]}><T style={{ fontSize: 11, color: green ? colors.green : colors.blue }}>{children}</T></View>;
}
export function Chips<TValue extends string>({ value, options, onChange, disabled }: {
  value: TValue; options: { value: TValue; label: string }[]; onChange: (value: TValue) => void; disabled?: boolean;
}) {
  return <View style={[styles.row, { flexWrap: 'wrap', gap: 8 }]}>{options.map(option =>
    <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: value === option.value, disabled }}
      disabled={disabled} onPress={() => onChange(option.value)} style={[styles.chip, value === option.value && { backgroundColor: colors.blue, borderColor: colors.blue }]}>
      <T style={{ fontSize: 12, color: value === option.value ? 'white' : colors.muted }}>{option.label}</T>
    </Pressable>)}</View>;
}
export function Updated({ at }: { at: number }) {
  return at ? <T style={[styles.muted, { fontSize: 11 }]}>آخرین دریافت: {date(at)} · برای تازه‌سازی صفحه را پایین بکشید.</T> : null;
}
export function Metric({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return <Card style={{ flexGrow: 1, flexBasis: '44%' }}><Ionicons name={icon} color={colors.blue} size={22} style={{ alignSelf: 'flex-end' }} />
    <T style={{ fontFamily: 'Vazirmatn_700Bold', fontSize: 20 }}>{value}</T><T style={styles.muted}>{label}</T></Card>;
}
export function Pagination({ page, total, size, busy, onPage }: { page: number; total: number; size: number; busy: boolean; onPage: (page: number) => void }) {
  return <View style={styles.row}><View style={{ flex: 1 }}><Button secondary disabled={page <= 1 || busy} onPress={() => onPage(page - 1)}>قبلی</Button></View>
    <T style={styles.muted}>صفحه {page}</T><View style={{ flex: 1 }}><Button secondary disabled={page * size >= total || busy} onPress={() => onPage(page + 1)}>بعدی</Button></View></View>;
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { padding: 22, gap: 16, paddingBottom: 32, width: '100%', maxWidth: 840, alignSelf: 'center', flexGrow: 1 },
  text: { fontFamily: 'Vazirmatn_400Regular', color: colors.ink, fontSize: 14, lineHeight: 25, textAlign: 'right', writingDirection: 'rtl' },
  title: { fontFamily: 'Vazirmatn_700Bold', fontSize: 24, lineHeight: 36, color: colors.ink },
  eyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, writingDirection: 'ltr' },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 23 },
  label: { fontFamily: 'Vazirmatn_700Bold', fontSize: 12 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  card: { borderRadius: 22, backgroundColor: 'white', padding: 20, gap: 12, borderWidth: 1, borderColor: colors.line },
  input: { backgroundColor: '#F7F9FD', borderColor: colors.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 12, minHeight: 48, color: colors.ink, fontFamily: 'Vazirmatn_400Regular', fontSize: 14, textAlign: 'right' },
  button: { borderRadius: 14, backgroundColor: colors.blue, paddingHorizontal: 18, paddingVertical: 12, minHeight: 48, justifyContent: 'center' },
  badge: { alignSelf: 'flex-end', borderRadius: 8, backgroundColor: colors.pale, paddingHorizontal: 9, paddingVertical: 3 },
  chip: { borderRadius: 12, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: 'white', borderWidth: 1, borderColor: colors.line, minHeight: 40 },
  brand: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  iconButton: { padding: 10, borderRadius: 14, backgroundColor: 'white' },
});
