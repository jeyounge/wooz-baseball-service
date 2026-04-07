// KBO 포스트시즌 최종 순위로 rank 업데이트
// Usage: node scripts/update_final_ranks.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim()))
);
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

// ────────────────────────────────────────────
// 연도별 포스트시즌 최종 순위 (챔피언 기준)
// 구조: { '팀명': 최종순위 }
// 포스트시즌 미진출 팀(6~10위)은 정규시즌 순위 유지 → 여기서 지정 안 함
// ────────────────────────────────────────────
const FINAL_RANKS = {
  2015: { // KS: 두산 vs 삼성 → 두산 우승
    '두산 베어스': 1, '삼성 라이온즈': 2,
    '넥센 히어로즈': 3, // PO 탈락
  },
  2016: { // KS: 두산 vs NC → 두산 우승
    '두산 베어스': 1, 'NC 다이노스': 2,
    '넥센 히어로즈': 3, // PO 탈락 (넥센 = 키움)
  },
  2017: { // KS: KIA vs 두산 → KIA 우승
    'KIA 타이거즈': 1, '두산 베어스': 2,
    'NC 다이노스': 3, // PO 탈락
  },
  2018: { // KS: SK vs 두산 → SK(SSG) 우승
    'SSG 랜더스': 1, '두산 베어스': 2,
    '한화 이글스': 3, // PO 탈락
  },
  2019: { // KS: 두산 vs 키움 → 두산 우승
    '두산 베어스': 1, '키움 히어로즈': 2,
    'LG 트윈스': 3, // PO 탈락
  },
  2020: { // KS: NC vs 두산 → NC 우승 (코로나 단축시즌)
    'NC 다이노스': 1, '두산 베어스': 2,
    'LG 트윈스': 3, // PO 탈락
  },
  2021: { // KS: KT vs 두산 → KT 우승
    'KT 위즈': 1, '두산 베어스': 2,
    'LG 트윈스': 3, // PO 탈락
  },
  2022: { // KS: SSG vs 키움 → SSG 우승 (LG 정규2위 → PO에서 키움에 탈락 → 최종3위)
    'SSG 랜더스': 1, '키움 히어로즈': 2,
    'LG 트윈스': 3, 'KT 위즈': 4, 'NC 다이노스': 5,
  },
  2023: { // KS: LG vs KT → LG 우승 (29년만)
    'LG 트윈스': 1, 'KT 위즈': 2,
    'NC 다이노스': 3, // PO 탈락
    '두산 베어스': 4, // 준PO 탈락
    '삼성 라이온즈': 5, // WC 탈락
  },
  2024: { // KS: KIA vs 삼성 → KIA 우승
    'KIA 타이거즈': 1, '삼성 라이온즈': 2,
    'LG 트윈스': 3, // PO 탈락
    'KT 위즈': 4,  // 준PO 탈락
    '두산 베어스': 5, // WC 탈락
  },
};

async function getTeams() {
  const { data } = await supabase.from('teams').select('id, name');
  const map = {};
  (data || []).forEach(t => { map[t.name] = t.id; });
  return map;
}

async function main() {
  const teamMap = await getTeams();
  let updated = 0, skipped = 0;

  for (const [yearStr, overrides] of Object.entries(FINAL_RANKS)) {
    const year = parseInt(yearStr);
    console.log(`\n[${year}] 포스트시즌 순위 반영 중...`);

    for (const [teamName, finalRank] of Object.entries(overrides)) {
      const teamId = teamMap[teamName];
      if (!teamId) {
        console.log(`  [skip] 팀 없음: ${teamName}`);
        skipped++;
        continue;
      }

      const { error } = await supabase
        .from('standings')
        .update({ rank: finalRank })
        .eq('year', year)
        .eq('team_id', teamId);

      if (error) {
        console.error(`  [error] ${teamName} ${year}: ${error.message}`);
        skipped++;
      } else {
        console.log(`  ✅ ${teamName} → ${finalRank}위`);
        updated++;
      }
    }
  }

  console.log(`\n✅ 완료! 업데이트: ${updated}건, 스킵: ${skipped}건`);
}

main().catch(e => { console.error(e); process.exit(1); });
