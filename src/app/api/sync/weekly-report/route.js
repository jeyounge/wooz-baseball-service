import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = "gemini-3.1-flash-lite-preview"; // 최신 빠른 모델
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`;

// KST 날짜 반환 포맷
function getKstDateString(date) {
  const d = new Date(date.getTime());
  d.setHours(d.getHours() + 9);
  return d.toISOString().split('T')[0];
}

// 올해의 몇 번째 주(Week)인지 계산하는 함수 (ISO 8601 기준)
function getYearWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

async function callGemini(prompt) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }], // Google Search Grounding 활성화 (직근 기록 검색 유리)
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    })
  });
  const result = await res.json();
  if (result.error) throw new Error(result.error.message);
  
  const rawText = result.candidates[0].content.parts[0].text;
  try {
    return JSON.parse(rawText.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.error("Failed to parse Gemini JSON:", rawText);
    throw new Error("Invalid JSON format returned from Gemini");
  }
}

export async function POST(request) {
  try {
    const { targetDate } = await request.json().catch(() => ({}));

    // 기준일: 파라미터가 없으면 오늘을 기준으로 지난주 데이터 추출
    const now = targetDate ? new Date(targetDate) : new Date();
    
    // 월요일 기준으로 지난 화요일 ~ 일요일을 가져옵니다.
    // 만약 오늘이 수요일이라면 -> 지난 화~일 (최근 종료된 주차 한사이클)
    // 현재 요일 (0:일, 1:월, ... 6:토)
    let day = now.getDay();
    // 일요일(0)인 경우 7로 처리해서 계산을 편하게 함
    if (day === 0) day = 7; 
    
    // 지난 주 일요일 날짜 (현재 날짜에서 현재 요일을 뺌)
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - day);
    
    // 지난 주 화요일 날짜 (일요일 - 5일)
    const lastTuesday = new Date(lastSunday);
    lastTuesday.setDate(lastSunday.getDate() - 5);

    const startDateStr = getKstDateString(lastTuesday);
    const endDateStr = getKstDateString(lastSunday);
    const yearWeekStr = getYearWeek(lastSunday); // 해당 일요일 기준의 Week Number

    console.log(`[Weekly Report Sync] 타겟 주간: ${startDateStr} ~ ${endDateStr} (${yearWeekStr})`);

    // 1. 이미 이번주 차 리포트가 있는지 확인
    const { data: existingReport } = await supabase
      .from('weekly_reports')
      .select('id')
      .eq('year_week', yearWeekStr)
      .maybeSingle();

    if (existingReport && !targetDate) {
       return NextResponse.json({ success: true, status: 'already_exists', year_week: yearWeekStr });
    }

    // 2. 지난 주 경기 피드백 및 결과 요약 가져오기
    // (너무 방대한 데이터는 Gemini 컨텍스트 한계를 초과하므로 간략화)
    const { data: recentGames } = await supabase
      .from('predictions_feedback')
      .select(`
        game_id, actual_result, feedback_content, created_at,
        game_box_scores ( game_date )
      `)
      // Supabase Join을 통해 날짜 기준 필터링을 시도 (간단히 하기 위해 최근 200건에서 JS 필터링)
      .order('created_at', { ascending: false })
      .limit(200);

    // 날짜가 해당 주차에 속하는 피드백만 필터링
    const weeklyGames = recentGames ? recentGames.filter(game => {
       if (!game.game_box_scores || !game.game_box_scores.game_date) return false;
       const gDate = game.game_box_scores.game_date;
       return gDate >= startDateStr && gDate <= endDateStr;
    }) : [];

    const gamesSummary = weeklyGames.map(g => `- ${g.game_box_scores.game_date} : ${g.actual_result}`).join('\n');

    // 3. Gemini Prompting
    const prompt = `
      # Role
      너는 최고 수준의 KBO 프로야구 데이터 분석가 및 스포츠 저널리스트야.
      Google 검색을 활용하여 지정된 기간 동안 KBO 10개 구단의 주요 이슈와 성적을 정확하게 분석해 리포트로 작성해.

      # Target Period
      - 기간: ${startDateStr} (화) ~ ${endDateStr} (일)
      - 기준: ${yearWeekStr}

      # 입력 데이터 (이 주의 일부 경기 결과 참고)
      ${gamesSummary}

      # Task
      위 기간 동안의 실제 KBO 경기 결과와 뉴스를 검색해서 다음 내용을 완벽한 JSON 포맷으로 작성해.
      과거 데이터가 아닌, 해당 날짜 주간의 실제 최신 데이터를 검색해야 해.
      
      1. title: "2026년 4월 x주차 KBO 주간 결산" 같은 멋진 제목
      2. team_rankings: 1주간의 성적을 반영한 1위~10위 팀 순위. (팀명, 순위, 요약, 트렌드(상승/하락/유지))
      3. hot_hitters: 이번 주 가장 맹활약한 타자 3명 (이름, 소속, 주간 홈런/타점/타율 등 상세 기록 요약, 선정 이유). 단, 3명은 가급적 모두 다른 구단에서 선정할 것.
      4. hot_pitchers: 이번 주 가장 맹활약한 투수 3명 (이름, 소속, 주간 승수/방어율/탈삼진 등 상세 기록 요약, 선정 이유). 단, 3명은 가급적 모두 다른 구단에서 선정할 것.
      5. weekly_issues: 이번 주 KBO를 달군 핫이슈 3~4가지 (부상자, 콜업, 트레이드, 감독 논란, 명장면 등)

      * 주의사항: MVP 선정 시 특정 한 팀에 편중되지 않도록 주의하고, 실제 KBO 주간 스탯을 기반으로 객관적으로 맹활약한 선수를 선정하세요.

      # Output JSON Schema
      {
        "title": "string",
        "team_rankings": [
          { "team": "string", "rank": number, "trend": "상승|하락|유지", "summary": "string" }
        ],
        "hot_hitters": [
          { "name": "string", "team": "string", "stats": "string", "reason": "string" }
        ],
        "hot_pitchers": [
          { "name": "string", "team": "string", "stats": "string", "reason": "string" }
        ],
        "weekly_issues": [
          { "issue": "string", "description": "string" }
        ]
      }
    `;

    const reportContent = await callGemini(prompt);

    // 4. DB 저장
    const { data, error } = await supabase
      .from('weekly_reports')
      .upsert({
        start_date: startDateStr,
        end_date: endDateStr,
        year_week: yearWeekStr,
        report_content: reportContent
      }, { onConflict: 'year_week' })
      .select()
      .single();

    if (error) throw error;


    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Weekly Report Sync Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Vercel Cron Job 용 (GET 메서드 허용)
export async function GET(request) {
  return POST(request);
}
