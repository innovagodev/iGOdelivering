import { STORAGE_KEYS } from './storage-keys';

/**
 * Converts a text string into a URL-friendly slug.
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

/**
 * Resolves a restaurant slug or ID to a canonical restaurant ID (e.g., 'r-001').
 */
export const getRestaurantId = (slug: string): string => {
  if (typeof window === 'undefined') return 'r-001';
  if (!slug) return 'r-001';
  if (slug.startsWith('r-')) return slug;
  if (slug === 'pizzeria-bella-napoli') return 'r-001';
  if (slug === 'trattoria-da-mario') return 'r-002';
  if (slug === 'sushi-zen') return 'r-003';
  if (slug === 'osteria-del-porto') return 'r-004';
  if (slug === 'burger-house') return 'r-005';

  try {
    const storedStr = localStorage.getItem(STORAGE_KEYS.RESTAURANTS);
    if (storedStr) {
      const restaurants = JSON.parse(storedStr);
      const matched = restaurants.find(
        (r: any) => slugify(r.name) === slug || r.id === slug
      );
      if (matched) return matched.id;
    }
  } catch (e) {
    console.error('Error resolving restaurant ID', e);
  }
  return 'r-001';
};

/**
 * Checks if a restaurant ID or slug is one of the built-in mock/demo accounts.
 */
export const isMockRestaurant = (slugOrId: string): boolean => {
  const normalized = (slugOrId || '').toLowerCase();
  return (
    normalized === 'r-001' ||
    normalized === 'r-002' ||
    normalized === 'r-003' ||
    normalized === 'r-004' ||
    normalized === 'r-005' ||
    normalized === 'pizzeria-bella-napoli' ||
    normalized === 'trattoria-da-mario' ||
    normalized === 'sushi-zen' ||
    normalized === 'osteria-del-porto' ||
    normalized === 'burger-house'
  );
};

