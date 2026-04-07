import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
});

const supabase = createClient(url, key);

async function test() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.game_predictions (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      game_id bigint REFERENCES public.games(id) ON DELETE CASCADE,
      situation text NOT NULL,
      starter_pitcher text NOT NULL,
      bullpen text NOT NULL,
      batting text NOT NULL,
      conclusion text NOT NULL,
      pick_1 text,
      pick_2 text,
      pick_3 text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      UNIQUE(game_id)
    );
  `;
  
  // NOTE: supabase.rpc does not allow arbitrary SQL execution by default unless we set up a function.
  // I will just create a script for the user to run, or since I couldn't run it through RPC, I must instruct the user to run the SQL query.
}
test();
