import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export type StorageBucket =
  | 'bike-images'
  | 'accessory-images'
  | 'content-images'
  | 'trade-in-photos'
  | 'payment-proofs';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const demoPreviewUrls = new Map<string, string>();

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

  const ext = MIME_TO_EXT[file.type] || 'bin';
  const safePrefix = folderPrefix.replace(/^\/+|\/+$/g, '') || 'uploads';
  const safePath = `${safePrefix}/${crypto.randomUUID()}.${ext}`;

  if (!isSupabaseConfigured || !supabase) {
    const objectUrl = URL.createObjectURL(file);
    const fullDemoPath = `${bucket}/${safePath}`;
    demoPreviewUrls.set(fullDemoPath, objectUrl);
    return { path: fullDemoPath, url: objectUrl };
  }

  const { error } = await supabase.storage.from(bucket).upload(safePath, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  if (bucket === 'trade-in-photos' || bucket === 'payment-proofs') {
    const { data, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(safePath, 3600);
    if (signError) throw signError;
    return { path: safePath, url: data.signedUrl };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(safePath);
  return { path: safePath, url: data.publicUrl };
}

export async function createSignedStorageUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn = 300
): Promise<string> {
  if (!path) throw new Error('Missing file path');
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }

  if (!isSupabaseConfigured || !supabase) {
    const cached = demoPreviewUrls.get(path) || demoPreviewUrls.get(`${bucket}/${path}`);
    if (cached) return cached;
    throw new Error('Preview is only available for newly uploaded files in demo mode.');
  }

  const normalizedPath = path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(normalizedPath, expiresIn);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Unable to generate signed file URL');
  return data.signedUrl;
}
