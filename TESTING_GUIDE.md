# Testing & Debugging Guide

## 🐛 Profile Creation Issues - Debugging Steps

### Issue: Profiles not created consistently or redirects not working

### **Step 1: Check Database Setup** ⚠️ **CRITICAL FIRST STEP**

Before testing, **you MUST run this SQL** in your Supabase SQL Editor:

```sql
-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own profile (CRITICAL for automatic creation)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile (but not role)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
```

### **Step 2: Use Debug Page**

1. **Go to `/debug`** in your browser after logging in
2. **Check if user and profile data appear**
3. **If profile is missing, click "Create Profile Manually"**

### **Step 3: Test Signup Flow with Console Logs**

1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Try signup process**
4. **Watch for debug logs**:
   - "Starting signup process for: email"
   - "Signup successful"
   - "Auth confirm - token_hash: true"
   - "Profile created/updated successfully"

### **Step 4: Check Email Confirmation**

The signup flow should be:
1. **Sign up** → Goes to success page
2. **Click email confirmation link** 
3. **Should redirect to `/complete-profile`**
4. **Complete profile form**
5. **Redirects to home page**

## 🧪 **Systematic Testing Process**

### **Complete Clean Test:**

1. **Delete old test user** (Supabase Dashboard > Authentication > Users)
2. **Clear browser storage** (DevTools > Application > Clear Storage)
3. **Use incognito/private browsing mode**
4. **Follow this exact sequence**:

```
1. Go to /auth/sign-up
2. Fill form with: Full Name, Email, Password
3. Click "Sign up" → Should go to success page
4. Check email for confirmation link
5. Click confirmation link → Should go to /complete-profile
6. Fill profile completion form
7. Click "Complete Profile" → Should go to home page
8. Check /debug page to verify profile exists
```

### **Debug Each Step:**

**If signup fails:**
- Check console for errors
- Verify Supabase connection
- Check network tab for failed requests

**If email confirmation doesn't redirect to complete-profile:**
- Check the confirmation link URL
- Look for console errors in auth/confirm route
- Check if profile was created during confirmation

**If complete-profile page doesn't show:**
- Go directly to `/complete-profile`
- Check if user is logged in via `/debug`
- Look for middleware redirect loops

**If profile form doesn't save:**
- Check console for errors
- Verify RLS policies are set up
- Try manual profile creation via `/debug`

## 🗑️ **How to Delete Users for Clean Testing**

### **Method 1: Supabase Dashboard (Easiest)**

1. **Go to your Supabase Dashboard**
2. **Authentication → Users**
3. **Find your test user**
4. **Click the delete/trash icon**
5. **Confirm deletion**

### **Method 2: SQL Commands**

```sql
-- Delete from profiles table first
DELETE FROM public.profiles WHERE email = 'your-test-email@example.com';

-- Then delete the auth user via dashboard (can't do via SQL)
```

### **Method 3: Clear All Test Data**

```sql
-- Delete all non-admin profiles
DELETE FROM public.profiles WHERE role = 'student';

-- Then delete all users except admins via dashboard
```

## 🔍 **Verification Queries**

**Check if profiles exist:**
```sql
SELECT id, full_name, email, role, created_at FROM public.profiles ORDER BY created_at DESC;
```

**Check specific user:**
```sql
SELECT * FROM public.profiles WHERE email = 'test@example.com';
```

**Check RLS policies:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

## ⚡ **Quick Fixes**

**Profile creation fails → Run RLS setup SQL above**
**Redirects don't work → Check browser console for errors**
**Form doesn't save → Check /debug page and RLS policies**
**Inconsistent behavior → Use incognito mode for clean testing**

## 🎯 **Expected Behavior**

✅ **Working Flow:**
- Signup → Success page
- Email confirmation → Complete profile page  
- Profile completion → Home page
- Profile visible in /debug page
- Admin access works after role update

❌ **Problem Indicators:**
- No redirect after email confirmation
- Complete profile page not showing
- Profile not saving
- Different emails in auth vs profiles
- Console errors during signup

Use the `/debug` page and browser console to identify exactly where the process is failing!
