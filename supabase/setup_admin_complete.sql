-- Complete Admin Setup for contact@scoresmartpte.com
-- 
-- IMPORTANT: First create the user in Supabase Dashboard:
--   1. Go to: Authentication → Users → Add User → Create New User
--   2. Email: contact@scoresmartpte.com
--   3. Password: SCORE2025
--   4. Auto Confirm User: ✅ (check this)
--   5. Click "Create User"
--
-- Then run this entire script:

-- Step 1: Create workspace
DO $$
DECLARE
  workspace_uuid uuid;
  user_uuid uuid;
BEGIN
  -- Create workspace
  INSERT INTO public.workspaces (name) 
  VALUES ('Admin Workspace') 
  RETURNING id INTO workspace_uuid;

  -- Get user UUID
  SELECT id INTO user_uuid 
  FROM auth.users 
  WHERE email = 'contact@scoresmartpte.com';

  -- Update profile to admin and assign workspace
  UPDATE public.profiles 
  SET 
    role = 'admin',
    workspace_id = workspace_uuid,
    is_active = true
  WHERE id = user_uuid;

  -- Output results
  RAISE NOTICE 'Workspace created: %', workspace_uuid;
  RAISE NOTICE 'User UUID: %', user_uuid;
  RAISE NOTICE 'Admin user setup complete!';
END $$;

-- Verify setup
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
