import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables! Please check your .env file.');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
    auth: {
        // PKCE is the recommended, most secure flow for browser OAuth redirects.
        flowType: 'pkce',
        // Parse the OAuth code/token off the URL when the provider redirects back.
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
    },
});
