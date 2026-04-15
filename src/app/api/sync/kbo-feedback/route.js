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

async function callGemini(prompt) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.05 }
    })
  });
  const result = await res.json();
  if (result.error) throw new Error(result.error.message);
  const rawText = result.candidates[0].content.parts[0].text;
  return JSON.parse(rawText.replace(/```json|```/g, "").trim());
}

async function processGame(game, formattedDate) {
  // A: 복기 피드백 캐시 확인 (이미 처리된 경기 스킵)
  const { data: existingFeedback } = await supabase
    .from('predictions_feedback')
    .select('id')
    .eq('game_id', Number(game.id))
    .maybeSingle();

  if (existingFeedback) {
    return { status: 'cached', gameId: game.id };
  }

  // B: AI 예측 데이터 조회
  const { data: prediction } = await supabase
    .from('predictions')
    .select('*')
    .eq('game_id', String(game.id))
    .maybeSingle();

  if (!prediction) {
    return { status: 'skipped_no_prediction', gameId: game.id };
  }

  // C: 박스스코어 캐시 확인
  let boxScore = null;
  const { data: cachedBox } = await supabase
    .from('game_box_scores')
    .select('*')
    .eq('game_id', Number(game.id))
    .maybeSingle();

  if (cachedBox) {
    boxScore = cachedBox;
  } else {
    // D: Gemini로 실제 세부 스탯 수집
    const homeName = game.home?.name || game.home_name || '홈팀';
    const awayName = game.away?.name || game.away_name || '원정팀';

    const boxData = await callGemini(`
      # Role
      너는 KBO 데이터 수집 전문가야.
      Google 검색을 통해 아래 경기의 실제 박스스코어 및 선수 세부 기록을 정확히 수집해.

      # Target Game
      - 날짜: ${formattedDate}
      - 경기: ${awayName} (원정) vs ${homeName} (홈)
      - 최종 스코어: ${awayName} ${game.away_score} : ${homeName} ${game.home_score}
      - 홈 선발: ${game.home_pitcher || '미확인'}
      - 원정 선발: ${game.away_pitcher || '미확인'}

      # 수집 항목
      1. 선발 투수 실제 기록: 이닝, 투구수, 피안타, 피홈런, 사사구(볼넷+사구), 삼진, 자책점, 승패결과
      2. 주요 계투진 기록: 투수명, 이닝, 피안타, 사사구, 삼진
      3. 타선 기록: 득점권 타율(RISP), 홈런 수, 삼진 수, 병살 수, 잔루 수

      # Output JSON Schema
      {
        "home_starter_stats": { "name": "string", "innings": number, "pitches": number, "hits": number, "hr": number, "bb": number, "so": number, "earned_runs": number, "result": "승|패|무|ND" },
        "away_starter_stats": { "name": "string", "innings": number, "pitches": number, "hits": number, "hr": number, "bb": number, "so": number, "earned_runs": number, "result": "승|패|무|ND" },
        "home_bullpen_stats": [{ "name": "string", "innings": number, "hits": number, "bb": number, "so": number, "result": "string" }],
        "away_bullpen_stats": [{ "name": "string", "innings": number, "hits": number, "bb": number, "so": number, "result": "string" }],
        "home_batting_stats": { "risp_avg": number, "hr": number, "so": number, "dp": number, "lob": number, "scoring_opps": number },
        "away_batting_stats": { "risp_avg": number, "hr": number, "so": number, "dp": number, "lob": number, "scoring_opps": number },
        "raw_summary": "string"
      }
    `);

    await supabase.from('game_box_scores').upsert({
      game_id: Number(game.id),
      game_date: formattedDate,
      home_score: game.home_score,
      away_score: game.away_score,
      home_starter_stats: boxData.home_starter_stats,
      away_starter_stats: boxData.away_starter_stats,
      home_bullpen_stats: boxData.home_bullpen_stats,
      away_bullpen_stats: boxData.away_bullpen_stats,
      home_batting_stats: boxData.home_batting_stats,
      away_batting_stats: boxData.away_batting_stats,
      raw_summary: boxData.raw_summary
    }, { onConflict: 'game_id' });

    boxScore = boxData;
  }

  // E: 복기 분석 (예측 vs 실제 대조)
  const homeName = game.home?.name || game.home_name || '홈팀';
  const awayName = game.away?.name || game.away_name || '원정팀';
  const homeWon = game.home_score > game.away_score;
  const actualResult = `${awayName} ${game.away_score} : ${homeName} ${game.home_score} → ${homeWon ? homeName : awayName} 승`;

  const feedback = await callGemini(`
    # Role
    너는 KBO AI 분석 품질 관리자 '우제트 리뷰어'야.
    아래 경기의 예측 데이터와 실제 박스스코어를 정밀 대조하여 자기 학습(Self-Learning) 보고서를 작성해.

    # 경기 정보
    - 날짜: ${formattedDate}
    - 경기: ${awayName} (원정) vs ${homeName} (홈)
    - 실제 결과: ${actualResult}

    # AI 예측 내용
    - 1순위 픽: ${prediction.pick_1 || '없음'}
    - 2순위 픽: ${prediction.pick_2 || '없음'}
    - 3순위 픽: ${prediction.pick_3 || '없음'}
    - 홈팀 승률 예측: ${prediction.home_win_prob}%
    - 원정팀 승률 예측: ${prediction.away_win_prob}%
    - 예상 스코어: ${prediction.predicted_score || '없음'}
    - 예측 요약: ${prediction.final_summary || prediction.conclusion || '없음'}

    # 실제 박스스코어
    - 홈 선발: ${JSON.stringify(boxScore?.home_starter_stats || {})}
    - 원정 선발: ${JSON.stringify(boxScore?.away_starter_stats || {})}
    - 홈 계투: ${JSON.stringify(boxScore?.home_bullpen_stats || [])}
    - 원정 계투: ${JSON.stringify(boxScore?.away_bullpen_stats || [])}
    - 홈 타선: ${JSON.stringify(boxScore?.home_batting_stats || {})}
    - 원정 타선: ${JSON.stringify(boxScore?.away_batting_stats || {})}
    - 경기 요약: ${boxScore?.raw_summary || ''}

    # 분석 지시
    1. 각 픽(pick_1, pick_2, pick_3)이 실제 결과와 맞는지 판단해.
    2. 예측과 달랐던 핵심 요인을 구체적 수치 기반으로 설명해.
    3. 동일 팀의 다음 경기 분석에 반영할 학습 포인트 2-3가지를 도출해.
    4. confidence_score: 이번 예측의 전반적인 품질 점수 (0~100)

    # Output JSON Schema
    {
      "is_correct": boolean,
      "pick_1_correct": boolean,
      "pick_2_correct": boolean,
      "pick_3_correct": boolean,
      "actual_result": "string",
      "feedback_content": "상세 복기 리포트 200자 이상 (한글)",
      "learning_points": {
        "pitching": "선발/불펜 투수진 피드백 (구체적 수치)",
        "batting": "타선 피드백 (득점권, 병살, 잔루 등)",
        "bullpen": "계투 피드백",
        "general": "기타 교훈 및 변수 요인"
      },
      "confidence_score": number
    }
  `);

  // F: 복기 피드백 DB 저장
  const { error: fbErr } = await supabase
    .from('predictions_feedback')
    .upsert({
      game_id: Number(game.id),
      is_correct: feedback.is_correct,
      pick_1_correct: feedback.pick_1_correct,
      pick_2_correct: feedback.pick_2_correct,
      pick_3_correct: feedback.pick_3_correct,
      actual_result: feedback.actual_result || actualResult,
      feedback_content: feedback.feedback_content,
      learning_points: feedback.learning_points,
      confidence_score: feedback.confidence_score
    }, { onConflict: 'game_id' });

  if (fbErr) throw new Error(fbErr.message);
  return { status: 'success', gameId: game.id };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');   // 특정 날짜 (YYYY-MM-DD)
    const allMode = searchParams.get('all') === 'true'; // 전체 미처리 모드

    const todayKst = getKstNow();

    let datesToProcess = [];

    if (allMode) {
      // ── 전체 모드: predictions 테이블에서 분석된 날짜를 게임 기준으로 모두 조회 ──
      // finished 상태이면서 predictions가 존재하나 feedback이 없는 경기 날짜 추출
      const { data: predictedGames } = await supabase
        .from('predictions')
        .select('game_id');

      if (!predictedGames || predictedGames.length === 0) {
        return NextResponse.json({ success: true, message: '분석된 경기가 없습니다.' });
      }

      const allGameIds = predictedGames.map(p => Number(p.game_id));

      // 이미 복기된 game_id 제외
      const { data: alreadyDone } = await supabase
        .from('predictions_feedback')
        .select('game_id');
      const doneIds = new Set((alreadyDone || []).map(f => Number(f.game_id)));
      const pendingIds = allGameIds.filter(id => !doneIds.has(id));

      if (pendingIds.length === 0) {
        return NextResponse.json({ success: true, message: '미처리 복기가 없습니다. 모두 완료됨.' });
      }

      // 해당 game_id의 경기가 finished 상태인 것만
      const { data: pendingGames } = await supabase
        .from('games')
        .select(`
          id, game_date, home_score, away_score, status, home_pitcher, away_pitcher,
          home:teams!home_team_id(name), away:teams!away_team_id(name)
        `)
        .in('id', pendingIds)
        .eq('status', 'finished')
        .lt('game_date', todayKst.toISOString()); // 오늘 이전 경기만

      const report = { success: 0, failed: 0, cached: 0, skipped: 0 };
      const logs = [];

      for (const game of (pendingGames || [])) {
        const gameDate = game.game_date.split('T')[0];
        try {
          const result = await processGame(game, gameDate);
          if (result.status === 'success') report.success++;
          else if (result.status === 'cached') report.cached++;
          else report.skipped++;
          logs.push(`[${gameDate}] Game ${game.id}: ${result.status}`);
        } catch (e) {
          report.failed++;
          logs.push(`[${gameDate}] Game ${game.id}: FAILED - ${e.message}`);
        }
      }

      return NextResponse.json({
        success: true,
        mode: 'all',
        totalPending: pendingGames?.length || 0,
        summary: report,
        logs
      });

    } else {
      // ── 단일 날짜 모드 (date 파라미터 or 기본 어제) ──
      let targetDate;
      if (dateParam) {
        targetDate = dateParam;
      } else {
        const yesterdayKst = new Date(todayKst);
        yesterdayKst.setDate(yesterdayKst.getDate() - 1);
        targetDate = yesterdayKst.toISOString().split('T')[0];
      }

      const { data: games, error: gameErr } = await supabase
        .from('games')
        .select(`
          id, game_date, home_score, away_score, status, home_pitcher, away_pitcher,
          home:teams!home_team_id(name), away:teams!away_team_id(name)
        `)
        .eq('status', 'finished')
        .gte('game_date', `${targetDate}T00:00:00+09:00`)
        .lte('game_date', `${targetDate}T23:59:59+09:00`);

      if (gameErr) throw new Error(gameErr.message);
      if (!games || games.length === 0) {
        return NextResponse.json({ success: true, message: `${targetDate}: 종료된 경기 없음.` });
      }

      const report = { success: 0, failed: 0, cached: 0, skipped: 0 };
      const logs = [];

      for (const game of games) {
        try {
          const result = await processGame(game, targetDate);
          if (result.status === 'success') report.success++;
          else if (result.status === 'cached') report.cached++;
          else report.skipped++;
          logs.push(`Game ${game.id}: ${result.status}`);
        } catch (e) {
          report.failed++;
          logs.push(`Game ${game.id}: FAILED - ${e.message}`);
        }
      }

      return NextResponse.json({
        success: true,
        mode: 'single',
        date: targetDate,
        summary: report,
        logs
      });
    }

  } catch (err) {
    console.error("Feedback API Critical Error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
