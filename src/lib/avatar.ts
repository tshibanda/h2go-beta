import { supabase } from "@/integrations/supabase/client";

/**
 * profiles.avatar_url stores either:
 *  - a full http(s) URL (Google / Apple profile picture), or
 *  - a private storage path inside the `avatars` bucket: `${userId}/avatar.jpg`
 */
export function isRemoteUrl(value: string | null | undefined): boolean {
  return !!value && /^https?:\/\//i.test(value);
}

export async function resolveAvatarUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  if (isRemoteUrl(stored)) return stored;
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(stored, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function uploadAvatar(userId: string, file: Blob, ext = "jpg"): Promise<string> {
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return path;
}

export async function removeAvatar(userId: string): Promise<void> {
  await supabase.storage.from("avatars").remove([
    `${userId}/avatar.jpg`,
    `${userId}/avatar.png`,
    `${userId}/avatar.webp`,
  ]);
}
