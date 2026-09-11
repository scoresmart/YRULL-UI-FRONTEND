# Supabase Integration Setup Guide

## ✅ What's Already Integrated

- ✅ Supabase client configured (`src/lib/supabase.js`)
- ✅ Auth store with Supabase login (`src/store/authStore.js`)
- ✅ Complete database schema with RLS policies (`supabase/schema.sql`)
- ✅ Auto-profile creation trigger on user signup
- ✅ All data hooks ready for Supabase queries

## 📋 Step-by-Step Setup

### 1. Apply Database Schema to Supabase

1. Go to your Supabase project: https://llafxbetyhxfzqcckkmy.supabase.co
2. Open **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the **entire contents** of `supabase/schema.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

This will create:
- All tables (profiles, contacts, tags, conversations, messages, etc.)
- Row Level Security (RLS) policies
- Auto-profile creation trigger

### 2. Verify Your .env File

Make sure your `.env` file has:

```env
VITE_SUPABASE_URL=https://llafxbetyhxfzqcckkmy.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_MOCK=false
```

**To get your anon key:**
1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy the **`anon` `public`** key (not the `service_role` key!)
3. Paste it into `.env` as `VITE_SUPABASE_ANON_KEY`

### 3. Create Your First User

**Option A: Via Supabase Dashboard**
1. Go to **Authentication** → **Users**
2. Click **Add User** → **Create New User**
3. Enter email and password
4. The profile will be auto-created by the trigger

**Option B: Via App (if you add signup later)**
- Sign up through the app (when you implement signup)
- Profile is auto-created

### 4. Create a Workspace for Your User

After creating a user, you need to assign them a workspace:

1. Go to **SQL Editor** in Supabase
2. Run this query (replace `USER_EMAIL` with your user's email):

```sql
-- Create a workspace
INSERT INTO public.workspaces (name) 
VALUES ('My Workspace') 
RETURNING id;

-- Assign workspace to your user (replace USER_EMAIL and WORKSPACE_ID)
UPDATE public.profiles 
SET workspace_id = 'WORKSPACE_ID_HERE'
WHERE email = 'USER_EMAIL_HERE';
```

Or get the workspace ID from the first query and use it in the second.

### 5. Restart Dev Server

After updating `.env`:

```bash
npm run dev
```

### 6. Test Login

1. Open `http://localhost:5177/login` (or whatever port Vite shows)
2. Log in with the email/password you created in Supabase
3. You should be redirected to `/dashboard`

## 🔧 Troubleshooting

### "Invalid login credentials"
- Check email/password matches what you created in Supabase
- Verify user exists in **Authentication** → **Users**

### "Profile not found" or white screen after login
- Make sure you created a workspace and assigned it to your user (Step 4)
- Check `profiles` table has your user with a `workspace_id`

### "RLS policy violation"
- Make sure you ran the full `schema.sql` including RLS policies
- Verify your user has a `workspace_id` set in the `profiles` table

### Still seeing mock data
- Check `.env` has `VITE_USE_MOCK=false` (no quotes)
- Restart dev server after changing `.env`

## 🎯 Next Steps

Once login works:
1. Add some test data via Supabase SQL Editor or the app UI
2. Test real-time features (messages, conversations)
3. Set up your Railway backend API (when ready)

## 📚 Supabase Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Subscriptions](https://supabase.com/docs/guides/realtime)
