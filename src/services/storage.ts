import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export type StorageBucket =
  | 'bike-images'
  | 'accessory-images'
  | 'content-images'
  | 'trade-in-photos'
  | 'payment-proofs';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadFileToBucket(
  bucket: StorageBucket,
  folderPrefix: string,
  file: File
): Promise<{ path: string; url: string }> {
  if (file.size > MAX_BYTES) {
    throw new Error('File exceeds maximum allowed size of 5 MB');
  }

  const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedProofs = [...allowedImages, 'application/pdf'];
  const allowed = bucket === 'payment-proofs' ? allowedProofs : allowedImages;
  if (!allowed.includes(file.type)) {
    throw new Error(
      bucket === 'payment-proofs'
        ? 'Only JPG, PNG, WebP, or PDF files are supported'
        : 'Only JPG, PNG, or WebP images are supported'
    );
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safePath = `${folderPrefix}/${crypto.randomUUID()}.${ext}`;

  if (!isSupabaseConfigured || !supabase) {
    const objectUrl = URL.createObjectURL(file);
    return { path: `${bucket}/${safePath}`, url: objectUrl };
  }

  const { error } = await supabase.storage.from(bucket).upload(safePath, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  if (bucket === 'trade-in-photos' || bucket === 'payment-proofs') {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(safePath, 3600);
    return { path: safePath, url: data?.signedUrl || safePath };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(safePath);
  return { path: safePath, url: data.publicUrl };
}
