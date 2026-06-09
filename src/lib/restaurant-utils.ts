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
 * Fallback resolver. In Supabase integration, always prefer using the UUID
 * from restaurantSettings.id in React components.
 */
export const getRestaurantId = (slug: string): string => {
  return slug;
};

/**
 * Returns false as all mock/demo restaurants have been removed.
 */
export const isMockRestaurant = (_slugOrId: string): boolean => {
  return false;
};
