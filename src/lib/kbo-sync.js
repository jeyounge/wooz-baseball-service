import { supabase } from './supabase';

/**
 * Syncs game status (cancellations/pitchers) with KBO official data.
 * @param {Array} games - List of games from Supabase.
 * @param {String} dateStr - Date string in YYYYMMDD format (optional, defaults to today KST).
 */
export async function syncGameStatusWithKbo(games, dateStr) {
  if (!games || games.length === 0) return games;

  try {
    // If no dateStr provided, calculate today KST
    if (!dateStr) {
      const d = new Date();
      dateStr = d.getFullYear() + 
                String(d.getMonth() + 1).padStart(2, '0') + 
                String(d.getDate()).padStart(2, '0');
    }

    const params = new URLSearchParams({
      leId: "1",
      srId: "0,1,3,4,5,6,7,8,9",
      date: dateStr
    });

    const res = await fetch('https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      cache: 'no-store'
    });
    const json = await res.json();
    
    const kboData = []; 
    if (json.game) {
      json.game.forEach(g => {
        kboData.push({
          away: g.AWAY_NM,
          home: g.HOME_NM,
          awayPitcher: g.T_PIT_P_NM || '미정',
          homePitcher: g.B_PIT_P_NM || '미정',
          stateCode: g.GAME_STATE_SC, // 0: 예정, 1: 진행, 2: 종료, 3: 취소
          cancelReason: g.CANCEL_NM || '' 
        });
      });
    }

    const updates = [];
    games.forEach(g => {
      const fullHome = g.home?.name || "";
      const fullAway = g.away?.name || "";
      
      // KBO API uses short names (e.g., 'KIA', '한화')
      // Our DB has full names (e.g., 'KIA 타이거즈', '한화 이글스')
      const found = kboData.find(k => {
        // More robust matching: Check if KBO name is in DB name OR DB name is in KBO name
        const homeMatch = fullHome.includes(k.home) || k.home.includes(fullHome);
        const awayMatch = fullAway.includes(k.away) || k.away.includes(fullAway);
        return homeMatch && awayMatch;
      });
      
      if (found) {
        const updatePayload = {};
        
        // 0: 예정, 1: 진행, 2: 종료, 3: 취소
        // Use loose equality (==) in case stateCode is a number
        if (found.stateCode == '3' && g.status !== 'canceled') {
           updatePayload.status = 'canceled';
           updatePayload.cancel_reason = found.cancelReason;
           g.status = 'canceled';
           g.cancel_reason = found.cancelReason;
        }
        
        // 2. Sync Pitchers (if still scheduled)
        if (g.status === 'scheduled') {
          if (found.homePitcher && found.homePitcher !== '미정' && g.home_pitcher !== found.homePitcher) {
            updatePayload.home_pitcher = found.homePitcher;
            updatePayload.away_pitcher = found.awayPitcher;
            g.home_pitcher = found.homePitcher;
            g.away_pitcher = found.awayPitcher;
          }
        }

        if (Object.keys(updatePayload).length > 0) {
          updates.push({ id: g.id, ...updatePayload });
        }
      }
    });

    if (updates.length > 0) {
      // Use a single upsert if possible, but update is safer for partials
      await Promise.all(updates.map(async (u) => {
        const { id, ...data } = u;
        const { error } = await supabase.from('games').update(data).eq('id', id);
        if (error) console.error(`Failed to update game ${id}:`, error);
      }));
    }
  } catch (err) {
    console.error("Game Sync error:", err);
  }
  
  return games;
}
