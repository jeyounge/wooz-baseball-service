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
    const formattedToday = todayKst.toISOString().split('T')[0];

    // 1. Fetch Team Mapping from DB
    const { data: teams } = await supabase.from('teams').select('id, name');
    const teamMap = {};
    if (teams) {
      teams.forEach(t => { teamMap[t.name] = t.id; });
    }

    const teamNamesStr = teams ? teams.map(t => t.name).join(', ') : '';

    // 2. Prepare Gemini Prompt with Search
    const systemPrompt = `
      "오늘(${formattedToday}) 베트맨(Betman) 사이트의 '야구토토 스페셜 트리플' 회차에 해당하는 대상 경기 3개를 직접 검색해서 찾아내"
      
      반대 팀 이름은 반드시 다음 목록에 있는 이름만 사용해: [${teamNamesStr}]
      만약 팀 이름이 다르면 목록에 있는 이름으로 치환해 (예: LG 트윈스 -> LG, 키움 히어로즈 -> 키움).

      # Output JSON Schema (Strict)
      {
        "target_games": [
          { "game_no": 1, "home": "string", "away": "string" },
          { "game_no": 2, "home": "string", "away": "string" },
          { "game_no": 3, "home": "string", "away": "string" }
        ],
        "found": boolean
      }
      오늘 대상 경기를 찾지 못했다면 found: false 로 응답해.
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

    if (!syncData.found || syncData.target_games.length !== 3) {
       return NextResponse.json({ success: false, message: "오늘 대상 경기를 찾지 못했습니다.", data: null });
    }

    // 3. Find matching games in our DB for today
    const targetGameIds = [];
    for (const match of syncData.target_games) {
      const homeId = teamMap[match.home];
      const awayId = teamMap[match.away];

      if (homeId && awayId) {
        const { data: gameRecord } = await supabase
          .from('games')
          .select('*')
          .eq('home_team_id', homeId)
          .eq('away_team_id', awayId)
          .gte('game_date', `${formattedToday}T00:00:00+09:00`)
          .lte('game_date', `${formattedToday}T23:59:59+09:00`)
          .maybeSingle();

        if (gameRecord) {
          gameRecord.toto_game_no = match.game_no;
          targetGameIds.push(gameRecord);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      date: formattedToday,
      target_games: targetGameIds
    });

  } catch (err) {
    console.error("Toto Sync Error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
