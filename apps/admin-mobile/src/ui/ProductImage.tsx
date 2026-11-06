import { useEffect, useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { catalogueImages } from '../lib/catalogueImages';
import { productImage } from '../api/files';
import { T } from './index';

export function ProductImage({ path, baseUrl, label, large = false, style }: {
  path: string; baseUrl: string; label: string; large?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => { setFailed(false); setRetry(0); }, [path, baseUrl]);
  const bundled = catalogueImages[path];
  const source = !large && bundled ? bundled : { uri: productImage(path, baseUrl, large ? 640 : 320) };
  return <View style={[{ backgroundColor: 'white', borderRadius: 18, overflow: 'hidden' }, style]}>
    {failed ? <Pressable accessibilityRole="button" accessibilityLabel={`دریافت دوبارهٔ تصویر ${label}`} onPress={() => { setFailed(false); setRetry(v => v + 1); }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 4 }}>
      <Ionicons name="refresh-outline" size={22} color="#687A93" /><T style={{ fontSize: 10, color: '#687A93', textAlign: 'center' }}>تلاش دوباره</T>
    </Pressable> : <Image key={`${path}:${retry}`} source={source} placeholder={bundled} placeholderContentFit="contain"
      accessibilityLabel={label} alt={label} contentFit="contain" cachePolicy="memory-disk" recyclingKey={path}
      transition={120} onError={() => setFailed(true)} style={{ width: '100%', height: '100%' }} />}
  </View>;
}
