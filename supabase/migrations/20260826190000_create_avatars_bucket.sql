-- UP
--
-- Creates the `avatars` storage bucket.
--
-- Migration 20260822222159 added four RLS policies scoped to bucket_id = 'avatars',
-- but nothing ever created the bucket — it was made by hand in the Lovable
-- dashboard. On the existing project that gap is invisible; on a fresh project the
-- policies apply to a bucket that does not exist and avatar upload fails with
-- "Bucket not found". This closes it so the migration history stands alone.
--
-- Private, not public: Profile.tsx reads avatars with createSignedUrl(), and the
-- SELECT policy already restricts reads to the owner's own folder. A public bucket
-- would make every avatar world-readable by URL regardless of that policy.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- DOWN
--
-- Objects must be removed before the bucket will drop, so this is deliberately
-- destructive and left commented out.
--
-- delete from storage.objects where bucket_id = 'avatars';
-- delete from storage.buckets where id = 'avatars';
