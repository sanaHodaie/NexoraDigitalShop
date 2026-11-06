import { Alert, Platform } from 'react-native';
export function confirmAction(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise(resolve => Alert.alert('تأیید عملیات', message, [
    { text: 'انصراف', style: 'cancel', onPress: () => resolve(false) },
    { text: 'تأیید', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}
