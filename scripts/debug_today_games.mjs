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
  const KST = new Date();
  KST.setHours(KST.getHours() + 9);
  const todayStr = KST.toISOString().split('T')[0];
  
  const { data, error } = await supabase.from('games').select('id, game_date, status, home_pitcher, away_pitcher, home:teams!home_team_id(name), away:teams!away_team_id(name)').gte('game_date', `${todayStr}T00:00:00+09:00`).lte('game_date', `${todayStr}T23:59:59+09:00`);
  
  console.log("DB Games Today:");
  console.log(JSON.stringify(data, null, 2));
}
test();
