import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = "gemini-3.1-flash-lite-preview"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`;

function getKstNow() {
  const d = new Date();
  d.setHours(d.getHours() + 9);
  return d;
}

export async function GET(request) {
  try {
    const todayKst = getKstNow();
    const yesterdayKst = new Date(todayKst);
    yesterdayKst.setDate(yesterdayKst.getDate() - 1);

    const formattedToday = todayKst.toISOString().split('T')[0];
    const formattedYesterday = yesterdayKst.toISOString().split('T')[0];

    // 1. Fetch Team Mapping from DB
    const { data: teams } = await supabase.from('teams').select('id, name');
    const teamMap = {};
    if (teams) {
      teams.forEach(t => { teamMap[t.name] = t.id; });
    }

    const teamNamesStr = teams ? teams.map(t => t.name).join(', ') : '';

    // 2. Prepare Gemini Prompt with Search
    const systemPrompt = `
      # Role
      너는 KBO(한국프로야구) 데이터 관리자야. 실시간 검색을 통해 어제 경기 결과와 최신 리그 순위를 정확하게 추출해.

      # Target Data
      1. 어제(${formattedYesterday}) KBO 모든 경기 결과 (홈/원정 팀별 점수 및 경기 상태)
      2. 오늘(${formattedToday}) 기준 KBO 전체 리그 순위표 (순위, 경기수, 승, 무, 패, 승률, 게임차, 팀타율, 팀홈런, 팀방어율)

      # Restrictions
      - 팀 이름은 반드시 다음 목록에 있는 이름만 사용해: [${teamNamesStr}]
      - 만약 경기 결과가 취소라면 status를 'canceled'로 표시하고 cancel_reason을 명시해. 정상 종료면 'finished'.
      - 숫자는 반드시 숫자 데이터 타입으로 응답해.

      # Output JSON Schema (Strict)
      {
        "results": [
          { "home": "string", "away": "string", "home_score": number, "away_score": number, "status": "finished|canceled", "cancel_reason": "string|null" }
        ],
        "standings": [
          { "name": "string", "rank": number, "games": number, "wins": number, "draws": number, "losses": number, "win_rate": number, "game_behind": number, "team_avg": number, "team_hr": number, "team_era": number }
        ]
      }
    `;

    const payload = {
      contents: [{ parts: [{ text: systemPrompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    };

    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await res.json();
    
    if (result.error) throw new Error(result.error.message);

    const rawText = result.candidates[0].content.parts[0].text;
    const syncData = JSON.parse(rawText.replace(/```json|```/g, "").trim());

    const updateLogs = { games: [], standings: [] };

    // 3. Update Games Table (Yesterday's results)
    for (const match of syncData.results) {
      const homeId = teamMap[match.home];
      const awayId = teamMap[match.away];

      if (homeId && awayId) {
        // Find matching game by date and teams
        const { data: gameRecord } = await supabase
          .from('games')
          .select('id')
          .eq('home_team_id', homeId)
          .eq('away_team_id', awayId)
          .gte('game_date', `${formattedYesterday}T00:00:00+09:00`)
          .lte('game_date', `${formattedYesterday}T23:59:59+09:00`)
          .maybeSingle();

        if (gameRecord) {
          const { error: gameErr } = await supabase
            .from('games')
            .update({
              home_score: match.home_score,
              away_score: match.away_score,
              status: match.status,
              cancel_reason: match.cancel_reason
            })
            .eq('id', gameRecord.id);
          
          if (!gameErr) updateLogs.games.push(`${match.away} vs ${match.home} updated`);
        }
      }
    }

    // 4. Update Standings Table (Batch Upsert)
    const standingsPayload = syncData.standings.map(s => ({
      year: 2026,
      team_id: teamMap[s.name],
      rank: s.rank,
      games: s.games,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      win_rate: s.win_rate,
      game_behind: s.game_behind,
      team_avg: s.team_avg,
      team_hr: s.team_hr,
      team_era: s.team_era
    })).filter(s => s.team_id);

    const { error: standingsErr } = await supabase
      .from('standings')
      .upsert(standingsPayload, { onConflict: 'year,team_id' });

    if (!standingsErr) updateLogs.standings = `${standingsPayload.length} teams updated`;

    return NextResponse.json({ 
      success: true, 
      date: formattedYesterday,
      logs: updateLogs,
      message: "Yesterday results and current standings synchronized via Gemini 3.1 Search."
    });

  } catch (err) {
    console.error("Sync API Error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
