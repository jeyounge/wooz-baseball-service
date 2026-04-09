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

export async function GET() {
  try {
    const todayKst = getKstNow();
    const yesterdayKst = new Date(todayKst);
    yesterdayKst.setDate(yesterdayKst.getDate() - 1);
    const formattedYesterday = yesterdayKst.toISOString().split('T')[0];

    // 1. Fetch finished games from yesterday
    const { data: games, error: gameErr } = await supabase
      .from('games')
      .select(`
        id, game_date, home_score, away_score, status,
        home:teams!home_team_id(name), away:teams!away_team_id(name)
      `)
      .eq('status', 'finished')
      .gte('game_date', `${formattedYesterday}T00:00:00+09:00`)
      .lte('game_date', `${formattedYesterday}T23:59:59+09:00`);

    if (gameErr) throw new Error(gameErr.message);
    if (!games || games.length === 0) {
      return NextResponse.json({ success: true, message: "No finished games to analyze from yesterday." });
    }

    const reportCount = { success: 0, failed: 0 };

    for (const game of games) {
      // 2. Fetch the AI prediction for this game
      const { data: prediction } = await supabase
        .from('predictions')
        .select('*')
        .eq('game_id', String(game.id))
        .maybeSingle();

      if (!prediction) continue;

      // 3. Ask Gemini to analyze the difference
      const systemPrompt = `
        # Role
        너는 KBO 데이터 분석가이자 AI 품질 관리자야. 어제 경기의 예측 내용과 실제 결과를 대조하여 '자기 학습(Self-Learning)'을 수행해.

        # Match Info
        - 경기: ${game.away.name} (원정) vs ${game.home.name} (홈)
        - 최종 스코어: ${game.away.name} ${game.away_score} : ${game.home.name} ${game.home_score}
        - AI 예측 요약: ${prediction.final_summary || prediction.conclusion}
        - AI 추천픽: 1순위(${prediction.pick_1 || prediction.recommendations?.priority_1?.pick}), 2순위(${prediction.pick_2 || prediction.recommendations?.priority_2?.pick})

        # Instructions
        1. 경기 결과와 네이버 스포츠 뉴스 등을 참고하여, AI 예측이 맞았는지 혹은 틀렸다면 왜 틀렸는지 분석해.
        2. 특히 선발 투수의 퍼포먼스, 불펜의 상태, 타선의 응집력 중 어떤 부분이 예측과 달랐는지 식별해.
        3. 동일 팀의 다음 경기 분석 시 반영해야 할 '핵심 학습 포인트(Learning Points)'를 2-3가지 도출해.

        # Output JSON Schema
        {
          "is_correct": boolean,
          "feedback_content": "여기에 상세 분석 리포트 작성 (한글)",
          "learning_points": {
            "pitching": "투수진 피드백",
            "batting": "타선 피드백",
            "bullpen": "계투진 피드백",
            "general": "기타 특이사항 및 교훈"
          }
        }
      `;

      const payload = {
        contents: [{ parts: [{ text: systemPrompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      };

      try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await res.json();
        
        if (result.error) throw new Error(result.error.message);

        const rawText = result.candidates[0].content.parts[0].text;
        const feedback = JSON.parse(rawText.replace(/```json|```/g, "").trim());

        // 4. Save Feedback
        const { error: feedbackErr } = await supabase
          .from('predictions_feedback')
          .upsert({
            game_id: Number(game.id),
            is_correct: feedback.is_correct,
            feedback_content: feedback.feedback_content,
            learning_points: feedback.learning_points
          }, { onConflict: 'game_id' });

        if (!feedbackErr) reportCount.success++;
        else console.error(`Feedback save error for Game ${game.id}:`, feedbackErr.message);

      } catch (err) {
        console.error(`Gemini analysis error for Game ${game.id}:`, err.message);
        reportCount.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: reportCount,
      message: `${reportCount.success} games analyzed and stored in self-learning database.`
    });

  } catch (err) {
    console.error("Feedback API Critical Error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
