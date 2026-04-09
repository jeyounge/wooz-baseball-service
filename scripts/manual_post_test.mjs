import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// .env.local 직접 읽기
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const [key, ...value] = line.split('=');
      return [key.trim(), value.join('=').trim().replace(/['"]/g, '')];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log('--- Checking Predictions to Post ---');
  
  // 1. 기존 분석 데이터 가져오기
  const { data: preds, error: fError } = await supabase
    .from('predictions')
    .select('*, games(*, home:home_team_id(name), away:away_team_id(name))')
    .limit(2);

  if (fError) {
    console.error('Fetch Error:', fError.message);
    return;
  }

  if (!preds || preds.length === 0) {
    console.log('No existing predictions found to backfill.');
    return;
  }

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');

  for (const p of preds) {
    const game = p.games;
    const title = `[${today}] ${game.away?.name || '원정'} VS ${game.home?.name || '홈'} 경기 분석 리포트! ⚾️`;
    const content = `🏆 우제트 AI 심층 분석 리포트\n\n🎯 1순위 픽: ${p.pick_1}\n🎯 2순위 픽: ${p.pick_2}\n🎯 3순위 픽: ${p.pick_3}\n\n📈 예상 스코어: ${p.predicted_score}\n📈 승률 예측: 홈 ${p.home_win_prob}% / 원정 ${p.away_win_prob}%\n\n📝 AI 분석 개요:\n${typeof p.analysis_report === 'string' ? p.analysis_report : (p.analysis_report?.summary || p.analysis_report?.situation || '상세 분석을 참조하세요.')}\n\n---\n🤖 본 게시글은 관리자에 의해 수동으로 테스트 게시되었습니다. 향후 분석 시 자동 게시됩니다.`;

    const { error: iError } = await supabase
      .from('community_posts')
      .insert([{
        title,
        content,
        nickname: '관리자',
        password: '0310',
        ip_address: '127.0.*.*'
      }]);

    if (iError) {
      console.error(`Insert Error for "${title}":`, iError.message);
    } else {
      console.log(`Successfully Posted: ${title}`);
    }
  }
}

run();
