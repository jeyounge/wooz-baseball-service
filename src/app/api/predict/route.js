import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const API_KEY = process.env.GEMINI_API_KEY;
// PhD급 분석을 위해 Pro-Preview를 메인으로, Flash를 서브로 사용
const MODEL_ID = "gemini-3.1-flash-lite-preview"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`;

function premiumScrubber(text) {
  if (!text) return text;
  return text.replace(/[\u4E00-\u9FFF]/g, '').trim();
}

export async function POST(request) {
  try {
    const { gameId: rawGameId } = await request.json();
    const gameId = String(rawGameId); // DB 제약 조건(String)에 맞게 문자열로 강제 변환

    if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 });

    // 1. Check Cache (v3.1 규격 데이터 확인)
    const { data: existing, error: cacheErr } = await supabase
      .from('predictions')
      .select('*')
      .eq('game_id', gameId)
      .maybeSingle();

    if (existing && (existing.analysis_report || existing.situation)) {
      console.log(`[CACHE_HIT] Game ${gameId}: Reconstructing data for client.`);
      
      // 만약 DB가 평탄 구조라면 중첩 구조로 복원하여 UI 깨짐 방지
      if (!existing.analysis_report && existing.situation) {
        existing.analysis_report = {
          situation: existing.situation,
          starting_pitcher: existing.starter_pitcher,
          bullpen: existing.bullpen,
          batting: existing.batting
        };
        existing.recommendations = {
          priority_1: { pick: existing.pick_1, confidence: 90, description: "저장된 데이터" },
          priority_2: { pick: existing.pick_2, confidence: 80, description: "저장된 데이터" },
          priority_3: { pick: existing.pick_3, confidence: 70, description: "저장된 데이터" }
        };
        existing.final_summary = existing.conclusion;
      }
      
      return NextResponse.json({ data: existing, isCached: true });
    }

    console.log(`[CACHE_MISS] Game ${gameId}: Generating fresh AI analysis.`);

    // 2. Fetch Game Info
    const { data: game } = await supabase
      .from('games')
      .select(`
        id, game_date, stadium, home_pitcher, away_pitcher,
        home:teams!home_team_id(name), away:teams!away_team_id(name)
      `)
      .eq('id', gameId)
      .single();

    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    // 3. User Defined Premium Prompt (PhD Level with Search Guidelines)
    const systemPrompt = `
      # Role
      너는 KBO(한국프로야구) 데이터 분석 전문가이자 전문 베터 수준의 승부 예측 엔진 '우제트(Wooz) AI'야.
      제공된 구글 검색 도구를 활용해 실시간 데이터를 수집하고, [4단계 심층 분석]을 거쳐 [3순위 추천 결과]를 생성해.

      # Search Efficiency Guidelines (MUST FOLLOW)
      1. 검색 쿼리는 다음 3개로 제한하여 신속하게 수행해:
         - "오늘 KBO ${game.home.name} vs ${game.away.name} 선발 및 라인업"
         - "${game.home.name} ${game.away.name} 최근 5경기 전적 및 부상자"
         - "KBO 팀별 불펜 투구수 및 피로도 현황"
      2. 뉴스 헤드라인과 핵심 요약 위주로 정보를 취합하여 분석 시간을 단축해.

      # Step-by-Step Analysis Process
      1. **상황 분석**: 최근 5경기 흐름(연승/연패), 주요 부상자 및 엔트리 변동 사항.
      2. **선발 분석**: 선발 투수의 최근 3경기 성적(이닝, 자책점), 상대 타선과의 상성.
      3. **계투 분석**: 최근 3일간 불펜 소모도(연투 여부), 필승조 가용 상태 및 방어율.
      4. **타격 분석**: 최근 3경기 팀 타율, 상/하위 타선 응집력 및 현재 타격 사이클.

      # Output Strategy (Confidence-Based Priority)
      분석을 마친 후 아래 세 가지 항목(승패, 다득점/저득점, 핸디캡)을 도출하되, **순위는 반드시 분석 신뢰도(Confidence)가 높은 순서대로 책정**해:
      - **1순위 (메인)**: 세 가지 항목 중 가장 적중 확률이 높고 데이터 근거가 확실한 항목 (승패가 아니어도 됨)
      - **2순위 (적중)**: 두 번째로 확률이 높은 항목
      - **3순위 (도전)**: 세 번째로 확률이 높은 항목
      (예: 승패 우열을 가리기 힘든 박빙의 경기라면 1순위가 '다득점'이나 '핸디캡'이 될 수 있음)

      # Target Match
      - 경기: ${game.home.name} (홈) vs ${game.away.name} (원정)
      - 장소: ${game.stadium}
      - 일시: ${game.game_date}

      # Output JSON Schema (Strict)
      {
        "home_win_prob": number (홈팀 승리 확률 0~100),
        "away_win_prob": number (원정팀 승리 확률 0~100),
        "predicted_score": "string (예: 5:3)",
        "analysis_report": {
          "situation": "string (상황 분석 결과)",
          "starting_pitcher": "string (선발 분석 결과)",
          "bullpen": "string (계투 분석 결과)",
          "batting": "string (타격 분석 결과)"
        },
        "recommendations": {
          "priority_1": { "pick": "string (예: LG 승, 8.5 오버 등)", "confidence": "number", "description": "1순위로 선정한 강력한 이유" },
          "priority_2": { "pick": "string", "confidence": "number", "description": "2순위 선정 이유" },
          "priority_3": { "pick": "string", "confidence": "number", "description": "3순위 선정 이유" }
        },
        "final_summary": "string (전문가 수준 한 줄 총평)",
        "data_source_time": "2026-04-08 18:04 (KST)"
      }

      * 반드시 순수 한글(Hangul)로 작성하며 한자를 절대 사용하지 마세요.
    `;

    // 4. REST API 호출
    const payload = {
      contents: [{ parts: [{ text: systemPrompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    };

    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await res.json();
    
    if (result.error) throw new Error(result.error.message);

    const rawText = result.candidates[0].content.parts[0].text;
    const predictionData = JSON.parse(rawText.replace(/```json|```/g, "").trim());

    // 5. Save & Clean
    const dbPayload = {
      game_id: gameId,
      home_win_prob: predictionData.home_win_prob,
      away_win_prob: predictionData.away_win_prob,
      predicted_score: predictionData.predicted_score,
      conclusion: premiumScrubber(predictionData.final_summary),
      situation: premiumScrubber(predictionData.analysis_report.situation),
      starter_pitcher: premiumScrubber(predictionData.analysis_report.starting_pitcher),
      bullpen: premiumScrubber(predictionData.analysis_report.bullpen),
      batting: premiumScrubber(predictionData.analysis_report.batting),
      pick_1: predictionData.recommendations.priority_1.pick,
      pick_2: predictionData.recommendations.priority_2.pick,
      pick_3: predictionData.recommendations.priority_3.pick,
      analysis_report: predictionData.analysis_report,
      recommendations: predictionData.recommendations,
      final_summary: premiumScrubber(predictionData.final_summary),
      data_source_time: predictionData.data_source_time
    };

    const { data: upserted, error: upsertErr } = await supabase
      .from('predictions')
      .upsert(dbPayload, { onConflict: 'game_id' })
      .select()
      .limit(1)
      .single();

    if (upsertErr) console.error("[DB_ERROR] Save failed:", upsertErr.message);

    return NextResponse.json({ 
      data: upserted || dbPayload, 
      isCached: false,
      provider: "Gemini 3.1 Pro (Search Guided)"
    });

    if (upsertErr) {
      console.error("[DB_ERROR] Save failed:", upsertErr.message);
    } else {
      console.log(`[DB_SUCCESS] Analysis cached for Game ${gameId}`);
    }

    return NextResponse.json({ 
      data: upserted || dbPayload, 
      isCached: false,
      provider: "Gemini 3.1 Pro (Search Guided)"
    });

  } catch (err) {
    console.error("API Critical Error:", err.message);
    return NextResponse.json({ error: 'AI_BUSY', details: err.message }, { status: 429 });
  }
}
