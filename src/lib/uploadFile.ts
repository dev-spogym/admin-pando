import { supabase } from '@/lib/supabase';

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) return { error: error.message };

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return { url: urlData.publicUrl };
}
