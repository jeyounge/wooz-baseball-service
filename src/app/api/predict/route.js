import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

export async function POST(request) {
  try {
    const { gameId } = await request.json();

    if (!gameId) {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    // 1. Check if prediction already exists in cache (DB)
    const { data: existing, error: dbErr } = await supabase
      .from('game_predictions')
      .select('*')
      .eq('game_id', gameId)
      .maybeSingle();

    if (existing) {
      // Return cached prediction! (Frontend will still show fake loading)
      return NextResponse.json({ data: existing, isCached: true });
    }

    // 2. Not in DB. We must analyze using AI.
    // Fetch game info to feed inside Prompt
    const { data: game } = await supabase
      .from('games')
      .select(`
        id, game_date, stadium, home_pitcher, away_pitcher,
        home:teams!home_team_id(name), away:teams!away_team_id(name)
      `)
      .eq('id', gameId)
      .single();

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    let predictionData = null;

    if (genAI) {
      // Use Real Gemini AI
      // Google API 503 이슈로 인해 gemini-2.0-flash-001 파생 모델 최우선 사용
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" }, {
         generationConfig: { responseMimeType: "application/json" }
      }); 
      
      const prompt = `
        당신은 KBO 프로야구 승부예측 전문 AI '우제트' 입니다.
        오늘 경기인 [${game.away.name} (선발: ${game.away_pitcher || '미정'}) VS ${game.home.name} (선발: ${game.home_pitcher || '미정'})] 매치업에 대해 분석해주세요.
        
        반드시 올바른 JSON 포맷으로 응답하세요.
        {
          "situation": "양 팀의 최근 기세, 분위기, 타선 상황 요약 (2-3문장)",
          "starter_pitcher": "양 팀 선발 투수의 최근 컨디션 및 매치업 우위 스탯 분석 (2-3문장)",
          "bullpen": "양 팀 불펜 계투진의 안정성, 피로도 분석 (2문장)",
          "batting": "최근 타격 흐름 및 주요 타자 분석 (2문장)",
          "conclusion": "최종 예측 요약 및 승리 가능성이 더 높은 팀 (3문장)",
          "pick_1": "가장 추천하는 픽 (예: SSG 승)",
          "pick_2": "2순위 픽 (예: 오버)",
          "pick_3": "3순위 픽 (예: SSG 핸디캡 승)"
        }
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      try {
        predictionData = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse JSON:", responseText);
        throw new Error("AI generated invalid JSON");
      }
    } else {
      // API Key가 없을 경우의 Fallback (Mock Data)
      predictionData = {
        situation: "현재 양팀의 기세가 매우 치열합니다. 어제 경기 결과에 따라 불펜 출혈이 있었던 점이 변수로 작용할 수 있습니다.",
        starter_pitcher: `${game.home.name}의 선발 ${game.home_pitcher}와 ${game.away.name}의 선발 ${game.away_pitcher}의 맞대결입니다. 투수전 양상이 예상됩니다.`,
        bullpen: "불펜의 가동률은 홈팀이 조금 더 안정적이나, 원정팀의 필승조가 휴식을 충분히 취했습니다.",
        batting: "최근 5경기 타격감은 원정팀이 근소하게 앞서고 있으나 장타율은 홈팀이 유리합니다.",
        conclusion: "종합적으로 팽팽한 접전이 예상되나, 선발의 무게감에서 앞서는 홈팀의 약우세가 예상됩니다.",
        pick_1: `${game.home.name.split(' ')[0]} 승`,
        pick_2: "UNDER (언더)",
        pick_3: "홈팀 핸디캡 승"
      };
      
      // 인위적인 지연 (AI 호출 시간 흉내)
      await new Promise(r => setTimeout(r, 2000));
    }

    // 3. Save to Cache (DB)
    const dbPayload = {
      game_id: gameId,
      situation: predictionData.situation,
      starter_pitcher: predictionData.starter_pitcher,
      bullpen: predictionData.bullpen,
      batting: predictionData.batting,
      conclusion: predictionData.conclusion,
      pick_1: predictionData.pick_1,
      pick_2: predictionData.pick_2,
      pick_3: predictionData.pick_3
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('game_predictions')
      .insert(dbPayload)
      .select()
      .single();

    if (insertErr) {
       console.error("Insert error:", insertErr);
       // Return data anyway so UI doesn't break
       return NextResponse.json({ data: dbPayload, isCached: false });
    }

    return NextResponse.json({ data: inserted, isCached: false });

  } catch (err) {
    console.error("Prediction API Error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
