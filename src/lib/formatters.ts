/**
 * Formatta un numero come prezzo in Euro
 */
export const formatPrice = (price: number | string): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(num || 0);
};

/**
 * Formatta una data in modo leggibile (es. 15 Maggio 2026)
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

/**
 * Formatta un timestamp in ora e minuti (es. 17:30)
 */
export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};
