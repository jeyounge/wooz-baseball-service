import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
});

const supabase = createClient(url, key);

async function fixDB() {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const todayStr = `${year}-${month}-${day}`;

  // 1. Reset today's pitchers to '미정' since they were corrupted by fallback
  console.log("Resetting pitchers for:", todayStr);
  const { data: updated, error: upErr } = await supabase
    .from('games')
    .update({ home_pitcher: '미정', away_pitcher: '미정' })
    .gte('game_date', `${todayStr}T00:00:00+09:00`)
    .lt('game_date', `${todayStr}T23:59:59+09:00`)
    .select('id, home_pitcher');
    
  console.log("Fixed games:", updated, upErr);

  // 2. Check standings data
  console.log("Checking Standings in DB...");
  const { data: standings, error: stdErr } = await supabase
    .from('standings')
    .select('team_id, wins, losses, win_pct, game_behind, rank')
    .order('rank', { ascending: true })
    .limit(5);
    
  console.log("Standings:", standings, stdErr);
}

fixDB();
