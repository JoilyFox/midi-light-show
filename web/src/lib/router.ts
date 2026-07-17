// Tiny hash router — no dependency. The console has four fixed screens plus the
// component showcase; a full router would be overkill. Reload-safe via location.hash.

import { ref, readonly } from 'vue';

export const ROUTES = ['rig', 'play', 'map', 'log', 'components'] as const;
export type Route = (typeof ROUTES)[number];

const DEFAULT: Route = 'rig';

function parse(): Route {
  const h = location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(h) ? h : DEFAULT;
}

const current = ref<Route>(parse());
window.addEventListener('hashchange', () => (current.value = parse()));

export function navigate(route: Route): void {
  location.hash = `/${route}`;
}

export function useRoute() {
  return { route: readonly(current), navigate };
}
