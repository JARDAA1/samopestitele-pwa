import { createClient } from '@supabase/supabase-js';

// Supabase konfigurace
const SUPABASE_URL = 'https://ozxzowfzhdulofkxniji.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96eHpvd2Z6aGR1bG9ma3huaWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNTg5MDMsImV4cCI6MjA4MDkzNDkwM30.ZfDrCvq7pCX6Y9RQm7MNFyuOMSeH3iVQUhRaoXBAu9M';

// Vytvoření Supabase clienta
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
