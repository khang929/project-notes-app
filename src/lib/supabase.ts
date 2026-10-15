import { createClient } from '@supabase/supabase-js';

// Publishable key: an toàn để đặt ở phía trình duyệt (bảo mật nhờ Row Level Security).
// Có thể ghi đè bằng biến môi trường VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY trên Vercel.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://yadogitxzcbioudjhonp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable__CMdYreSvsFtOzXg3y5tKQ_x-3CfB24';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
