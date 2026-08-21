/*
# Create Storage Bucket for Event Attachments

1. Purpose
   - Creates a private storage bucket "event-attachments" where authenticated users
     can upload PDFs and images as attachments for calendar events.
   - Files are scoped per-user: each user can only access their own files.

2. Storage Bucket
   - "event-attachments" (private, 10MB file size limit)

3. Storage Policies (RLS on storage.objects)
   - SELECT: users can read only files they own (owner = auth.uid())
   - INSERT: users can upload only to their own folder (user_id/auth.uid())
   - UPDATE: users can update only their own files
   - DELETE: users can delete only their own files

4. Notes
   - Files are stored under path: {user_id}/{timestamp}-{filename}
   - The bucket is private; access requires a signed URL or authenticated session.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-attachments',
  'event-attachments',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- SELECT policy: users can read their own files
DROP POLICY IF EXISTS "read_own_attachments" ON storage.objects;
CREATE POLICY "read_own_attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'event-attachments' AND owner = auth.uid());

-- INSERT policy: users can upload to their own folder
DROP POLICY IF EXISTS "insert_own_attachments" ON storage.objects;
CREATE POLICY "insert_own_attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-attachments' AND owner = auth.uid());

-- UPDATE policy: users can update their own files
DROP POLICY IF EXISTS "update_own_attachments" ON storage.objects;
CREATE POLICY "update_own_attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-attachments' AND owner = auth.uid())
WITH CHECK (bucket_id = 'event-attachments' AND owner = auth.uid());

-- DELETE policy: users can delete their own files
DROP POLICY IF EXISTS "delete_own_attachments" ON storage.objects;
CREATE POLICY "delete_own_attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-attachments' AND owner = auth.uid());
