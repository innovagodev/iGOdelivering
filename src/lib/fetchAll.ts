/**
 * Legge tutte le righe di una query a pagine.
 *
 * PostgREST (quindi Supabase) restituisce al massimo 1000 righe per richiesta
 * e **non segnala** di aver tagliato: un elenco con 1500 ordini ne mostrava 1000,
 * e KPI e totali risultavano sbagliati senza alcun errore. Qui si chiede una
 * pagina per volta finché ne arriva una incompleta.
 *
 * La query deve avere un ordinamento stabile (per esempio `created_at` e poi
 * `id`): senza, righe con lo stesso valore possono comparire due volte o
 * saltare fra una pagina e l'altra.
 *
 * `maxPages` è un freno di sicurezza: oltre, si smette invece di caricare per
 * sempre (50 pagine = 50.000 righe).
 */
export async function fetchAllPages<T = any>(
  build: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
  maxPages = 50
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}
