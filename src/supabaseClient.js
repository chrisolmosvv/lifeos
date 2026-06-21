import { createClient } from '@supabase/supabase-js'

// Both values come from environment variables (see .env), so no keys live in
// the source code. The anon/public key is safe to ship to the browser — the
// database's row-level security is what actually protects your data.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
