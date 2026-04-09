import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
});

const supabase = createClient(url, key);

function getTodayString() {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

async function checkDate() {
  const todayStr = getTodayString();
  console.log("Today string:", todayStr);
  
  const { data: todayGames } = await supabase
    .from('games')
    .select('id, game_date, home_pitcher')
    .gte('game_date', `${todayStr}T00:00:00+09:00`)
    .lt('game_date', `${todayStr}T23:59:59+09:00`);
    
  console.log("Today Games:", todayGames);
}

async function checkStandings() {
   const { data } = await supabase.from('standings').select('*').limit(5);
   console.log("Standings Sample:", data.map(d => ({team: d.team_name, wpct: d.win_pct})));
}

async function checkAll() {
  await checkDate();
  await checkStandings();
}

checkAll();
