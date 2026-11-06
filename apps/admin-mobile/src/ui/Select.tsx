import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, T, styles } from './index';
import { useTheme } from '../state/theme';
export function Select({ label, value, options, onChange, disabled }: { label: string; value: string;
  options: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false); const { c } = useTheme();
  return <View style={{ gap: 7 }}><T style={styles.label}>{label}</T>
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={() => setOpen(true)}
      style={[styles.row, styles.input, { backgroundColor: c.input, borderColor: c.line, justifyContent: 'space-between' }]}>
      <T>{options.find(x => x.value === value)?.label || 'انتخاب کنید'}</T><Ionicons name="chevron-down" color={c.muted} size={18} />
    </Pressable><Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,20,40,.45)', padding: 24, justifyContent: 'center' }}>
        <Card style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}><T style={styles.label}>{label}</T>
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">{options.map(option =>
            <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={option.label} onPress={() => { onChange(option.value); setOpen(false); }}
              style={{ paddingVertical: 13, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: c.line }}>
              <T style={{ color: option.value === value ? c.blue : c.ink }}>{option.value === value ? '✓ ' : ''}{option.label}</T>
            </Pressable>)}</ScrollView><Button secondary onPress={() => setOpen(false)}>بستن</Button>
        </Card></View></Modal>
  </View>;
}
