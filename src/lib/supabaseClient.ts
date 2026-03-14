import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Note: This app is primarily configured for Firebase.
// Ensure your Firestore security rules and Supabase Row Level Security
// do not conflict if you use both services for data.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY') {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // We are not throwing an error here to prevent the app from crashing.
  // Instead, we will show a warning in the console.
  // The DocumentManager component will handle the null case.
  console.warn('Supabase client is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
}

export { supabase };
