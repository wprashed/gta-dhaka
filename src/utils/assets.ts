/**
 * Central utility to resolve asset URLs across both local dev (root '/')
 * and GitHub Pages production deployment (e.g. '/gta-dhaka/').
 */
export function resolveAssetUrl(path: string): string {
  if (
    !path ||
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // In browser runtime, determine whether we are hosted on a subpath (e.g. /gta-dhaka/)
  // or at root (/) based on current window.location.pathname
  if (typeof window !== 'undefined' && window.location) {
    const pathname = window.location.pathname;
    if (pathname.includes('/gta-dhaka')) {
      return `/gta-dhaka/${cleanPath}`;
    }
    return `/${cleanPath}`;
  }

  const rawBase = import.meta.env.BASE_URL || '/';
  const cleanBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  return `${cleanBase}${cleanPath}`;
}
