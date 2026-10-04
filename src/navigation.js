import { useSyncExternalStore } from 'react';

const subscribe = callback => {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
};
export const usePathname = () => useSyncExternalStore(subscribe, () => window.location.pathname);
export function navigate(path) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}
