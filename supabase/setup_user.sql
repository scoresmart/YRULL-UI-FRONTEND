-- Quick Setup: Create Workspace and Assign to User
-- Replace 'YOUR_USER_EMAIL@example.com' with your actual user email

-- Step 1: Create a workspace
INSERT INTO public.workspaces (name) 
VALUES ('My Workspace') 
RETURNING id;

-- Step 2: Copy the workspace ID from above, then run this:
-- (Replace 'WORKSPACE_ID_HERE' with the actual UUID from Step 1)
-- (Replace 'YOUR_USER_EMAIL@example.com' with your user's email)

UPDATE public.profiles 
SET workspace_id = 'WORKSPACE_ID_HERE'
WHERE email = 'YOUR_USER_EMAIL@example.com';

-- OR: If you know your user's UUID, use this instead:
-- UPDATE public.profiles 
-- SET workspace_id = 'WORKSPACE_ID_HERE'
-- WHERE id = 'USER_UUID_HERE';
