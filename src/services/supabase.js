// ============================================
// Supabase Client
// ============================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hgngmribnfrykviaocvg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbmdtcmlibmZyeWt2aWFvY3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzYyODksImV4cCI6MjA4ODgxMjI4OX0.NDmYZ30D-HJTnZlWpzlZ77WLk1wVdSwm5BGxVPD2zQE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
