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
  const gameId = '2316';
  
  const { data: game, error } = await supabase
    .from('games')
    .select(`
      id, game_date, stadium, status, home_pitcher, away_pitcher,
      home:teams!home_team_id(id, name),
      away:teams!away_team_id(id, name)
    `)
    .eq('id', gameId)
    .single();
      
  console.log("Game Error Analysis:", error);
}
test();
