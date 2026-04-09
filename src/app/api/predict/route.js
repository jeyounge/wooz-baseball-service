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
    // ID 파싱 및 숫자형 변환 (DB BIGINT 대응)
    const { gameId: rawGameId } = await request.json();
    const gameIdNum = parseInt(rawGameId);

    if (!gameIdNum || isNaN(gameIdNum)) {
      return NextResponse.json({ error: "Invalid Game ID" }, { status: 400 });
    }

    // 1. [IRONCLAD CACHE] Check Cache with proper number type
    let { data: existing } = await supabase
      .from('predictions')
      .select('*')
      .eq('game_id', gameIdNum)
      .maybeSingle();

    if (existing && (existing.analysis_report || existing.situation)) {
      console.log(`[CACHE_HIT] Game ${rawGameId}: Absolute Consistency Guaranteed.`);
      
      const data = {
        ...existing,
        analysis_report: existing.analysis_report || {
          situation: existing.situation,
          starting_pitcher: existing.starter_pitcher,
          bullpen: existing.bullpen,
          batting: existing.batting
        },
        recommendations: existing.recommendations || {
          priority_1: { pick: existing.pick_1, confidence: 90, description: "저장된 데이터" },
          priority_2: { pick: existing.pick_2, confidence: 80, description: "저장된 데이터" },
          priority_3: { pick: existing.pick_3, confidence: 70, description: "저장된 데이터" }
        },
        final_summary: existing.final_summary || existing.conclusion
      };
      
      return NextResponse.json({ data, isCached: true });
    }

    console.log(`[CACHE_MISS] Game ${rawGameId}: Initiating Grounded AI Analysis.`);

    // 2. Fetch Game Info & Recent Team Feedback
    const { data: game } = await supabase
      .from('games')
      .select(`
        id, game_date, stadium, home_pitcher, away_pitcher, home_team_id, away_team_id,
        home:teams!home_team_id(name), away:teams!away_team_id(name)
      `)
      .eq('id', rawGameId)
      .single();

    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    // 2.1 최근 학습 포인트 조회
    const { data: recentFeedback } = await supabase
      .from('predictions_feedback')
      .select('*, game:games!inner(home_team_id, away_team_id)')
      .or(`home_team_id.eq.${game.home_team_id},away_team_id.eq.${game.home_team_id}`, { foreignTable: 'games' })
      .order('created_at', { ascending: false })
      .limit(5);

    let learningContext = "";
    if (recentFeedback && recentFeedback.length > 0) {
      learningContext = "\n# Your Past Learning Points (자기 학습 피드백):\n";
      recentFeedback.forEach((fb, idx) => {
        learningContext += `${idx + 1}. [복기 내용]: ${fb.feedback_content.substring(0, 150)}...\n   - 피드백: ${JSON.stringify(fb.learning_points)}\n`;
      });
    }

    // 3. User Defined Premium Prompt
    const systemPrompt = `
      # Role
      너는 KBO 데이터 분석 전문가 '우제트(Wooz) AI'야.
      아래 제공된 **정확한 선발 투수 명단**을 바탕으로 분석을 수행하고, 다른 투수와 혼동하지 마.

      # Step-by-Step Analysis Process
      1. **상황 분석**: 최근 5경기 흐름 및 부상자 변동.
      2. **투수(선발)**: **${game.home_pitcher}**와 **${game.away_pitcher}**의 성적, 구종별 피안타율, 최근 이닝 소화력 집중 분석.
      3. **투수(계투)**: 최근 3일간 불펜 소모도 및 필승조 가용성.
      4. **타격 감각**: 최근 타선 응집력 및 현재 타격 사이클.

      # Output Strategy (Confidence-Based Priority)
      분석을 마친 후 아래 세 가지 항목(승패, 다득점/저득점, 핸디캡)을 도출하되, **순위는 반드시 분석 신뢰도(Confidence)가 높은 순서대로 책정**해:
      - **1순위 (메인)**: 세 가지 항목 중 가장 적중 확률이 높고 데이터 근거가 확실한 항목 (승패가 아니어도 됨)
      - **2순위 (적중)**: 두 번째로 확률이 높은 항목
      - **3순위 (도전)**: 세 번째로 확률이 높은 항목
      (예: 승패 우열을 가리기 힘든 박빙의 경기라면 1순위가 '다득점'이나 '핸디캡'이 될 수 있음)

      # Target Match
      - 경기: ${game.home.name} (홈) vs ${game.away.name} (원정)
      - **선발 투수**: ${game.home.name}(${game.home_pitcher || '미정'}), ${game.away.name}(${game.away_pitcher || '미정'})
      - 장소: ${game.stadium}
      - 일시: ${game.game_date}

      ${learningContext}

      # Output JSON Schema (Strict)
      {
        "home_win_prob": number,
        "away_win_prob": number,
        "predicted_score": "string",
        "analysis_report": {
          "situation": "string",
          "starting_pitcher": "string",
          "bullpen": "string",
          "batting": "string"
        },
        "recommendations": {
          "priority_1": { "pick": "string", "confidence": number, "description": "string" },
          "priority_2": { "pick": "string", "confidence": number, "description": "string" },
          "priority_3": { "pick": "string", "confidence": number, "description": "string" }
        },
        "final_summary": "string",
        "data_source_time": "string"
      }
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
      game_id: gameIdNum,
      home_win_prob: predictionData.home_win_prob,
      away_win_prob: predictionData.away_win_prob,
      predicted_score: predictionData.predicted_score,
      pick_1: predictionData.recommendations?.priority_1?.pick,
      pick_2: predictionData.recommendations?.priority_2?.pick,
      pick_3: predictionData.recommendations?.priority_3?.pick,
      analysis_report: predictionData.analysis_report,
      conclusion: premiumScrubber(predictionData.final_summary),
      situation: premiumScrubber(predictionData.analysis_report.situation),
      starter_pitcher: premiumScrubber(predictionData.analysis_report.starting_pitcher),
      bullpen: premiumScrubber(predictionData.analysis_report.bullpen),
      batting: premiumScrubber(predictionData.analysis_report.batting),
      final_summary: premiumScrubber(predictionData.final_summary),
      data_source_time: predictionData.data_source_time
    };

    const { error: upsertErr } = await supabase
      .from('predictions')
      .upsert(dbPayload, { onConflict: 'game_id' });

    if (upsertErr) {
      console.error("[DB_ERROR] Save failed for Game", gameIdNum, ":", upsertErr.message);
      return NextResponse.json({ 
        error: 'DATABASE_SAVE_FAILED', 
        details: upsertErr.message 
      }, { status: 500 });
    }

    console.log(`[DB_SUCCESS] Analysis cached for Game ${gameIdNum}`);

    // [AUTO-POST] If this is a new analysis, post to community as Admin
    // (이전과 동일한 로직...)
    if (!existing) {
      try {
        const { data: existingAdminPost } = await supabase
          .from('community_posts')
          .select('id')
          .eq('game_id', gameIdNum)
          .eq('nickname', '관리자')
          .single();

        if (!existingAdminPost) {
          const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
          const title = `[${today}] ${game.away?.name || '원정'} VS ${game.home?.name || '홈'} 경기 분석 리포트! ⚾️`;
          const content = `🏆 우제트 AI 심층 분석 리포트 ... (데이터 매칭용)`;
          
          await supabase.from('community_posts').insert([
            { 
              title, 
              content, 
              nickname: '관리자', 
              password: '0310', 
              ip_address: '127.0.*.*',
              game_id: gameIdNum
            }
          ]);
          console.log(`[AUTO_POST_SUCCESS] Game ${gameIdNum}`);
        }
      } catch (postErr) {
        console.error('[AUTO_POST_FAILED]', postErr.message);
      }
    }

    return NextResponse.json({ 
      data: dbPayload, 
      isCached: false,
      provider: "Gemini 3.1 Pro (Search Guided)",
      saveStatus: "success"
    });

  } catch (err) {
    console.error("API Critical Error:", err.message);
    return NextResponse.json({ error: 'AI_BUSY', details: err.message }, { status: 429 });
  }
}
