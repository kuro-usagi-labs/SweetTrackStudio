import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pvtkoiadbjxgqehtijsr.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dGtvaWFkYmp4Z3FlaHRpanNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzYxMzcsImV4cCI6MjA5NzM1MjEzN30.Qf6-8gHYto5F84HTv-pfobGvjSdwT6YUAlQNZ8U31I8'

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL and Anon Key are missing. Please add them to your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

