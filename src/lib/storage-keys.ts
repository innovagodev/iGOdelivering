/**
 * Centralized localStorage keys for iGOdelivering SaaS.
 */
export const STORAGE_KEYS = {
  // Global Platform Keys
  AUTH: 'igodelivering_auth',
  AUTH_ROLE: 'igodelivering_role',
  RESTAURANTS: 'iGOdelivering_restaurants',
  SIDEBAR_COLLAPSED: 'iGO_sidebar_collapsed',
  ALLERGENS_LIST: 'iGO_allergens_list',
  DISH_TAGS_LIST: 'iGO_dish_tags_list',

  // Restaurant-specific Keys (functions to resolve using restaurantId or slug)
  settings: (restaurantId: string) => `iGO_settings_${restaurantId}`,
  menuItems: (restaurantId: string) => `iGO_menu_items_${restaurantId}`,
  zones: (restaurantId: string) => `iGO_zones_${restaurantId}`,
  promos: (restaurantId: string) => `iGO_promos_${restaurantId}`,
  bookings: (restaurantId: string) => `iGO_bookings_${restaurantId}`,
  orders: (restaurantId: string) => `iGO_orders_${restaurantId}`,
  tables: (restaurantId: string) => `iGO_tables_${restaurantId}`,
  serviceHours: (restaurantId: string) => `iGO_service_hours_${restaurantId}`,
  guestInfo: (restaurantId: string) => `iGO_guest_${restaurantId}`,
  customerOrders: (restaurantId: string, emailHash: string) =>
    `iGO_customer_orders_${restaurantId}_${emailHash}`,
};
