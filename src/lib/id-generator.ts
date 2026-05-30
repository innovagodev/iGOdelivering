// Genera ID progressivi leggibili e sequenziali per tipo
export type OrderIdType = 'ORD' | 'ASP' | 'TAV' | 'PRE';

const COUNTER_KEYS: Record<OrderIdType, string> = {
  ORD: 'iGO_id_counter_ORD',
  ASP: 'iGO_id_counter_ASP',
  TAV: 'iGO_id_counter_TAV',
  PRE: 'iGO_id_counter_PRE',
};

export function generateId(type: OrderIdType, tableNumber?: string | number): string {
  if (typeof window === 'undefined') {
    // Fallback per SSR
    const today = new Date();
    const dayMonth = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${type}-${dayMonth}-${rand}`;
  }

  const today = new Date();
  const dayMonth = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const counterKey = COUNTER_KEYS[type];
  const lastDateKey = `${counterKey}_date`;
  const storedDate = localStorage.getItem(lastDateKey);
  
  let counter = 0;
  if (storedDate === dayMonth) {
    counter = parseInt(localStorage.getItem(counterKey) || '0', 10) + 1;
  } else {
    counter = 1;
    localStorage.setItem(lastDateKey, dayMonth);
  }
  localStorage.setItem(counterKey, String(counter));
  
  const formattedCounter = String(counter).padStart(4, '0');
  
  // Per gli ordini al tavolo, il formato include il numero del tavolo (es. TAV3-3005-0001)
  if (type === 'TAV' && tableNumber !== undefined && tableNumber !== '') {
    return `TAV${tableNumber}-${dayMonth}-${formattedCounter}`;
  }
  
  return `${type}-${dayMonth}-${formattedCounter}`;
}
