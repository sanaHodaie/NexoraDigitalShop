// Only map bundled artwork; custom product image URLs stay untouched.
const optimized = new Map([
  ['/assets/article_gaming_future_1790528125558.jpg', '/assets/article_gaming_future_1790528125558.webp'],
  ['/assets/article_productivity_setup_1790528034532.jpg', '/assets/article_productivity_setup_1790528034532.webp'],
  ['/assets/article_smart_home_1790528113494.jpg', '/assets/article_smart_home_1790528113494.webp'],
  ['/assets/collection_audio_headphones_1790528002919.jpg', '/assets/collection_audio_headphones_1790528002919.webp'],
  ['/assets/collection_gaming_gear_1790528013982.jpg', '/assets/collection_gaming_gear_1790528013982.webp'],
  ['/assets/collection_laptop_pc_1790528088687.jpg', '/assets/collection_laptop_pc_1790528088687.webp'],
  ['/assets/collection_smart_home_1790528023441.jpg', '/assets/collection_smart_home_1790528023441.webp'],
  ['/assets/collection_wearables_watch_1790528102322.jpg', '/assets/collection_wearables_watch_1790528102322.webp'],
  ['/assets/hero_devices_showcase_1790527984816.jpg', '/assets/hero_devices_showcase_1790527984816.webp'],
]);
export const optimizedImage = source => optimized.get(source) || source;
