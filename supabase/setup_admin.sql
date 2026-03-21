-- Setup Admin User: contact@scoresmartpte.com
-- 
-- STEP 1: First create the user in Supabase Dashboard:
--   Go to: Authentication → Users → Add User → Create New User
--   Email: contact@scoresmartpte.com
--   Password: SCORE2025
--   Auto Confirm User: ✅ (check this box)
--   Click "Create User"
--
-- STEP 2: After creating the user, run the SQL below to:
--   - Set role to 'admin'
--   - Create a workspace
--   - Assign workspace to the user

-- Create workspace for admin
INSERT INTO public.workspaces (name) 
VALUES ('Admin Workspace') 
RETURNING id;

-- Copy the workspace UUID from above, then run this:
-- (Replace 'WORKSPACE_UUID_HERE' with the actual UUID)

-- Set user as admin and assign workspace
UPDATE public.profiles 
SET 
  role = 'admin',
  workspace_id = 'WORKSPACE_UUID_HERE'
WHERE email = 'contact@scoresmartpte.com';

-- Verify the update
SELECT id, email, role, workspace_id, is_active 
FROM public.profiles 
WHERE email = 'contact@scoresmartpte.com';
