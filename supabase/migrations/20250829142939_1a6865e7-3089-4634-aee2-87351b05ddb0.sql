-- Fix the share_token column to use supported base64 encoding instead of base64url
ALTER TABLE public.trips 
ALTER COLUMN share_token SET DEFAULT encode(extensions.gen_random_bytes(32), 'base64');