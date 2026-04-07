// KBO 역대 순위 데이터 Wikipedia 스크래핑 → Supabase Insert
// Usage: node scripts/seed_standings.mjs

import { createClient } from '@supabase/supabase-js';
import { parse } from 'node-html-parser';
import fs from 'fs';

// Load .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
);
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEAM_NAME_MAP = {
  'KIA': 'KIA 타이거즈', '삼성': '삼성 라이온즈', 'LG': 'LG 트윈스',
  '두산': '두산 베어스', 'KT': 'KT 위즈', 'kt': 'KT 위즈',
  'SSG': 'SSG 랜더스', 'SK': 'SSG 랜더스', '롯데': '롯데 자이언츠',
  '한화': '한화 이글스', 'NC': 'NC 다이노스', '키움': '키움 히어로즈',
  '넥센': '키움 히어로즈', '히어로즈': '키움 히어로즈',
};

async function getTeams() {
  const { data, error } = await supabase.from('teams').select('id, name');
  if (error) throw new Error(`teams fetch error: ${JSON.stringify(error)}`);
  const map = {};
  data.forEach(t => { map[t.name] = t.id; });
  console.log('Teams loaded:', Object.keys(map).join(', '));
  return map;
}

function mapTeamName(raw) {
  const cleaned = raw.split('[')[0].trim();
  for (const [key, full] of Object.entries(TEAM_NAME_MAP)) {
    if (cleaned.includes(key) || cleaned === full) return full;
  }
  return cleaned;
}

async function fetchWikiStandings(year, teamDict) {
  console.log(`\nFetching ${year}...`);
  const res = await fetch(`https://ko.wikipedia.org/wiki/${year}년_KBO_리그`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const html = await res.text();
  const root = parse(html);
  const tables = root.querySelectorAll('table.wikitable');

  const results = [];

  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) continue;

    const headerCells = rows[0].querySelectorAll('th, td').map(c => c.text.trim());
    if (!headerCells.includes('순위') || !headerCells.includes('승') || !headerCells.includes('패')) continue;

    console.log(`[${year}] 순위 테이블 발견! 헤더: ${headerCells.join('|')}`);

    const iRank = headerCells.indexOf('순위');
    const iTeam = headerCells.includes('구단') ? headerCells.indexOf('구단') : headerCells.indexOf('팀명');
    const iGames = headerCells.includes('경기') ? headerCells.indexOf('경기') : headerCells.indexOf('경기수');
    const iWins = headerCells.indexOf('승');
    const iDraws = headerCells.indexOf('무');
    const iLosses = headerCells.indexOf('패');
    const iWinRate = headerCells.indexOf('승률');
    const iBehind = headerCells.includes('승차') ? headerCells.indexOf('승차')
                  : headerCells.includes('게임차') ? headerCells.indexOf('게임차') : -1;

    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r].querySelectorAll('th, td').map(c => c.text.trim());
      if (cols.length < 6) continue;

      const rankStr = cols[iRank]?.replace('위', '').trim();
      if (!rankStr || !/^\d+$/.test(rankStr)) continue;
      if (cols[iRank]?.includes('합계') || cols[iRank]?.includes('총계')) continue;

      const teamRaw = cols[iTeam] || '';
      const teamName = mapTeamName(teamRaw);
      if (!teamDict[teamName]) {
        console.log(`  [skip] 팀 매핑 실패: "${teamRaw}" → "${teamName}"`);
        continue;
      }

      const wins = parseInt(cols[iWins]) || 0;
      const losses = parseInt(cols[iLosses]) || 0;
      const draws = parseInt(cols[iDraws]) || 0;
      const games = parseInt(cols[iGames]) || (wins + losses + draws);
      const winRate = parseFloat(cols[iWinRate]) || 0;
      let gameBehind = 0;
      if (iBehind !== -1 && cols[iBehind] && cols[iBehind] !== '-' && cols[iBehind] !== '–') {
        gameBehind = parseFloat(cols[iBehind]) || 0;
      }

      results.push({
        year, team_id: teamDict[teamName], rank: parseInt(rankStr),
        games, wins, losses, draws, win_rate: winRate, game_behind: gameBehind
      });
    }

    if (results.length > 0) {
      // 평균 경기수 확인 - 100 미만이면 포스트시즌 테이블이므로 skip
      const avgGames = results.reduce((s, r) => s + r.games, 0) / results.length;
      if (avgGames < 100) {
        console.log(`  [skip] 평균 경기수 ${avgGames.toFixed(0)}경기 → 포스트시즌 테이블로 판단, 다음 테이블 확인`);
        results.length = 0; // 초기화하고 다음 테이블 보기
        continue;
      }
      break; // 정규시즌 테이블 발견!
    }
  }

  console.log(`  → ${results.length}개 팀 파싱됨`);
  return results;
}

async function clearStandings() {
  console.log('\nClearing existing standings...');
  const { error } = await supabase.from('standings').delete().gt('year', 0);
  if (error) console.warn('Clear warning (maybe empty):', error?.message);
}

async function main() {
  const teamDict = await getTeams();
  await clearStandings();

  let totalSuccess = 0, totalErrors = 0;

  for (let year = 2015; year <= 2025; year++) {
    const records = await fetchWikiStandings(year, teamDict);

    for (const record of records) {
      const { error } = await supabase.from('standings').insert(record);
      if (error) {
        console.error(`  Insert error [${year} ${record.rank}위]:`, error?.message, error?.code);
        totalErrors++;
      } else {
        totalSuccess++;
      }
    }

    // Wikipedia 과부하 방지용 딜레이
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n✅ 완료! 성공: ${totalSuccess}건, 실패: ${totalErrors}건`);
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
