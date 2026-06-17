import { supabase } from './supabase';

/**
 * Carica un file immagine in un bucket di storage Supabase specifico.
 * Restituisce l'URL pubblico del file caricato.
 * 
 * @param file Il file File/Blob da caricare
 * @param bucket Il nome del bucket di storage (es. 'restaurant-logos')
 * @param path Il percorso/nome file all'interno del bucket
 */
export async function uploadImage(
  file: File,
  bucket: 'restaurant-logos' | 'restaurant-banners' | 'dish-images',
  path: string
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
  });

  if (error) {
    console.error(`Error uploading to bucket ${bucket}:`, error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrlData.publicUrl;
}
