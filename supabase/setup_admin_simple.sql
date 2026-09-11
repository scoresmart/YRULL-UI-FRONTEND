-- Simple Admin Setup for contact@scoresmartpte.com
-- Run this AFTER creating the user in Supabase Dashboard
-- (Authentication → Users → Add User)

-- Step 1: Create workspace and get its ID
WITH new_workspace AS (
  INSERT INTO public.workspaces (name) 
  VALUES ('Admin Workspace') 
  RETURNING id
)
-- Step 2: Update profile to admin and assign workspace
UPDATE public.profiles 
SET 
  role = 'admin',
  workspace_id = (SELECT id FROM new_workspace),
  is_active = true
WHERE email = 'contact@scoresmartpte.com';

-- Step 3: Verify it worked
SELECT 
  p.id,
  p.email,
  p.role,
  p.workspace_id,
  p.is_active,
  w.name as workspace_name
FROM public.profiles p
LEFT JOIN public.workspaces w ON p.workspace_id = w.id
WHERE p.email = 'contact@scoresmartpte.com';
