import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'node-html-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = {};
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envConfig[key.trim()] = valueParts.join('=').trim().replace(/['"]/g, '');
    }
  });
}

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const CURRENT_YEAR = 2026;

const teamNameMap = {
  "KIA": "KIA 타이거즈", "삼성": "삼성 라이온즈", "LG": "LG 트윈스",
  "두산": "두산 베어스", "KT": "KT 위즈", "SSG": "SSG 랜더스", 
  "롯데": "롯데 자이언츠", "한화": "한화 이글스", "NC": "NC 다이노스", 
  "키움": "키움 히어로즈",
  // KBO API map
  "KIA 타이거즈": "KIA 타이거즈", "삼성 라이온즈": "삼성 라이온즈", "LG 트윈스": "LG 트윈스",
  "두산 베어스": "두산 베어스", "KT 위즈": "KT 위즈", "SSG 랜더스": "SSG 랜더스",
  "롯데 자이언츠":"롯데 자이언츠", "한화 이글스":"한화 이글스", "NC 다이노스": "NC 다이노스",
  "키움 히어로즈": "키움 히어로즈"
};

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }});
  return res.text();
}

async function scrapeMergedKboStats() {
  console.log(`[1/4] Fetching ${CURRENT_YEAR} KBO Basic Standings...`);
  const standingsHtml = await fetchHtml('https://www.koreabaseball.com/Record/TeamRank/TeamRank.aspx');
  const sRoot = parse(standingsHtml);
  
  let mergedData = {};
  sRoot.querySelectorAll('.tData tbody tr').forEach(row => {
    const cols = row.querySelectorAll('td');
    if (cols.length > 5) {
      const rank = parseInt(cols[0].text.trim(), 10);
      const teamRaw = cols[1].text.trim();
      const games = parseInt(cols[2].text.trim(), 10);
      const wins = parseInt(cols[3].text.trim(), 10);
      const losses = parseInt(cols[4].text.trim(), 10);
      const draws = parseInt(cols[5].text.trim(), 10);
      const winRateStr = cols[6].text.trim();
      let win_rate = winRateStr === '-' ? 0.0 : parseFloat(winRateStr);
      let gbStr = cols[7] ? cols[7].text.trim() : '0';
      let game_behind = gbStr === '-' ? 0.0 : parseFloat(gbStr);

      if (!isNaN(rank) && teamRaw) {
        mergedData[teamRaw] = { rank, games, wins, losses, draws, win_rate, game_behind, team_avg: 0.0, team_era: 0.0, team_hr: 0 };
      }
    }
  });

  console.log(`[2/4] Fetching ${CURRENT_YEAR} KBO Team Hitting Stats...`);
  const hitterHtml = await fetchHtml('https://www.koreabaseball.com/Record/Team/Hitter/Basic1.aspx');
  parse(hitterHtml).querySelectorAll('.tData tbody tr').forEach(row => {
    const cols = row.querySelectorAll('td');
    if (cols.length > 10) {
      const teamRaw = cols[1].text.trim();
      if (mergedData[teamRaw]) {
        mergedData[teamRaw].team_avg = parseFloat(cols[2].text.trim() || "0");
        mergedData[teamRaw].team_hr = parseInt(cols[10].text.trim() || "0", 10);
      }
    }
  });

  console.log(`[3/4] Fetching ${CURRENT_YEAR} KBO Team Pitching Stats...`);
  const pitcherHtml = await fetchHtml('https://www.koreabaseball.com/Record/Team/Pitcher/Basic1.aspx');
  parse(pitcherHtml).querySelectorAll('.tData tbody tr').forEach(row => {
    const cols = row.querySelectorAll('td');
    if (cols.length > 5) {
      const teamRaw = cols[1].text.trim();
      if (mergedData[teamRaw]) {
        mergedData[teamRaw].team_era = parseFloat(cols[2].text.trim() || "0");
      }
    }
  });

  return mergedData;
}

// Extract scores/results from KBO API and map them to our DB Games
async function scrapeAndSyncGameResults(teamIdMap, month) {
  console.log(`[4/4] Fetching ${CURRENT_YEAR}-${month} KBO Game Results...`);
  
  const params = new URLSearchParams({
    leId: "1", srIdList: "0,9", seasonId: CURRENT_YEAR.toString(), gameMonth: month.toString().padStart(2, '0'), teamId: ""
  });

  const res = await fetch('https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  
  const json = await res.json();
  const kboGames = [];

  let currentPrefix = "";
  if (json.rows) {
    for (let row of json.rows) {
      const cols = row.row || [];
      const cleanCols = cols.map(c => parse(c.Text || '').text.trim().replace(/\s+/g, ' '));
      
      let dateStr, playStr, statusSum;
      if (cleanCols.length === 9) {
        dateStr = cleanCols[0].substring(0, 5);
        currentPrefix = `${CURRENT_YEAR}-${dateStr.replace('.', '-')}`;
        playStr = cleanCols[2];
        statusSum = cleanCols[8];
      } else if (cleanCols.length === 8) {
        playStr = cleanCols[1];
        statusSum = cleanCols[7];
      } else continue;
      
      if (playStr.includes("프로야구가 없습니다") || !playStr.includes("vs")) continue;

      let awayTeamRaw = "", homeTeamRaw = "", awayScore = 0, homeScore = 0;
      let status = "scheduled"; // default
      let cancelReason = null;

      if (statusSum.includes("취소")) {
        status = "canceled";
        cancelReason = statusSum;
        const pts = playStr.split("vs");
        awayTeamRaw = pts[0].trim();
        homeTeamRaw = pts[1].trim();
      } else if (statusSum.includes("종료") || statusSum.includes("특별 콜드") || playStr.match(/\d+\s*vs\s*\d+/)) {
        // Ex: "KIA 5 vs 3 삼성"
        const m = playStr.match(/([^\d]+)\s*(\d+)\s*vs\s*(\d+)\s*([^\d]+)/);
        if (m) {
          awayTeamRaw = m[1].trim();
          awayScore = parseInt(m[2], 10);
          homeScore = parseInt(m[3], 10);
          homeTeamRaw = m[4].trim();
          status = "finished";
        } else {
          // fallback
          const pts = playStr.split("vs");
          awayTeamRaw = pts[0].trim();
          homeTeamRaw = pts[1].trim();
        }
      } else {
        const pts = playStr.split("vs");
        awayTeamRaw = pts[0].trim();
        homeTeamRaw = pts[1].trim();
      }

      const awayId = teamIdMap[teamNameMap[awayTeamRaw]];
      const homeId = teamIdMap[teamNameMap[homeTeamRaw]];

      if (awayId && homeId) {
        kboGames.push({
          datePrefix: currentPrefix,
          awayId, homeId, status, awayScore, homeScore, cancelReason
        });
      }
    }
  }

  // Fetch games from DB for the current month
  const startDate = `${CURRENT_YEAR}-${String(month).padStart(2, '0')}-01T00:00:00+09:00`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYr = month === 12 ? CURRENT_YEAR + 1 : CURRENT_YEAR;
  const endDate = `${nextYr}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+09:00`;

  const { data: dbGames, error } = await supabase
    .from('games')
    .select('*')
    .gte('game_date', startDate)
    .lt('game_date', endDate);
    
  if (error) {
    console.error("Failed to fetch games for sync:", error);
    return;
  }

  const updates = [];
  
  // Match them based on Date(YYYY-MM-DD prefix) and Teams
  dbGames.forEach(dbG => {
    // DB game_date ex: "2026-03-23T18:30:00+09:00", we just need "2026-03-23" for matching
    const dbPrefix = dbG.game_date.substring(0, 10);
    const matchedKbo = kboGames.find(k => k.datePrefix === dbPrefix && k.homeId === dbG.home_team_id && k.awayId === dbG.away_team_id);
    
    if (matchedKbo) {
      if (dbG.status !== matchedKbo.status || dbG.home_score !== matchedKbo.homeScore || dbG.away_score !== matchedKbo.awayScore || dbG.cancel_reason !== matchedKbo.cancelReason) {
        updates.push({
          ...dbG,
          status: matchedKbo.status,
          home_score: matchedKbo.homeScore,
          away_score: matchedKbo.awayScore,
          cancel_reason: matchedKbo.cancelReason
        });
      }
    }
  });

  if (updates.length > 0) {
    console.log(`Pushing updates for ${updates.length} games (setting scores/status)...`);
    const { error: upErr } = await supabase.from('games').upsert(updates);
    if (upErr) console.error("Error upserting games:", upErr);
    else console.log(`✅ Successfully synced ${updates.length} game results!`);
  } else {
    console.log("No game changes required (already synced).");
  }
}

async function main() {
  console.log(`Starting Data Loader for KBO ${CURRENT_YEAR} Real-time Standings & Results...`);
  
  const { data: dbTeams, error: tErr } = await supabase.from('teams').select('id, name');
  if (tErr) { console.error(tErr); return; }
  const teamIdMap = {};
  dbTeams.forEach(t => teamIdMap[t.name] = t.id);

  // 1. Process Standings
  const rawData = await scrapeMergedKboStats();
  const standingsToUpsert = [];
  for (const [rawName, data] of Object.entries(rawData)) {
    const teamId = teamIdMap[teamNameMap[rawName]];
    if (teamId) {
      standingsToUpsert.push({ year: CURRENT_YEAR, team_id: teamId, ...data });
    }
  }

  if (standingsToUpsert.length > 0) {
    const { error } = await supabase.from('standings').upsert(standingsToUpsert, { onConflict: 'year, team_id' });
    if (error) console.error("❌ Failed to upsert standings:", error.message);
    else console.log("✅ Successfully updated Real-time KBO standings & team stats!");
  }

  // 2. Process Game Results for current month and also March just in case
  const currentMonth = new Date().getMonth() + 1;
  if (currentMonth !== 3) {
    await scrapeAndSyncGameResults(teamIdMap, 3);
  }
  await scrapeAndSyncGameResults(teamIdMap, currentMonth);
}

main();
