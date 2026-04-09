import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if(key) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function absoluteReset() {
  console.log("Starting ABSOLUTE RESET of game_predictions table...");
  const { data, error } = await supabase.from('game_predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 행 삭제
  
  if (error) {
    console.error("Reset failed:", error);
  } else {
    console.log("Database table game_predictions successfully truncated.");
  }
}

absoluteReset();
