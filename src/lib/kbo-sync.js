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
          stateCode: g.GAME_STATE_SC, // 1: 예정, 2: 진행, 3: 종료, 4: 취소
          awayScore: parseInt(g.T_SCORE_CN || 0, 10),
          homeScore: parseInt(g.B_SCORE_CN || 0, 10),
          cancelReason: g.CANCEL_NM || '' 
        });
      });
    }

    const updates = [];
    games.forEach(g => {
      // Ensure the game belongs to the requested dateStr
      // Format game_date to YYYYMMDD in KST
      const gDate = new Date(g.game_date);
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(gDate);
      const gDateStr = `${parts.find(p=>p.type==='year').value}${parts.find(p=>p.type==='month').value}${parts.find(p=>p.type==='day').value}`;
      
      if (gDateStr !== dateStr) return;

      const fullHome = g.home?.name || "";
      const fullAway = g.away?.name || "";
      
      const found = kboData.find(k => {
        const homeMatch = fullHome.includes(k.home) || k.home.includes(fullHome);
        const awayMatch = fullAway.includes(k.away) || k.away.includes(fullAway);
        return homeMatch && awayMatch;
      });
      
      if (found) {
        const updatePayload = {};
        
        // GAME_STATE_SC from KBO: 1: 예정, 2: 진행, 3: 종료, 4: 취소
        
        // Canceled
        if (found.stateCode == '4' && g.status !== 'canceled') {
           updatePayload.status = 'canceled';
           updatePayload.cancel_reason = found.cancelReason || '취소';
           g.status = 'canceled';
           g.cancel_reason = found.cancelReason || '취소';
        }
        
        // Live
        if (found.stateCode == '2') {
           if (g.status !== 'live') { updatePayload.status = 'live'; g.status = 'live'; }
           if (g.home_score !== found.homeScore) { updatePayload.home_score = found.homeScore; g.home_score = found.homeScore; }
           if (g.away_score !== found.awayScore) { updatePayload.away_score = found.awayScore; g.away_score = found.awayScore; }
        }
        
        // Finished
        if (found.stateCode == '3') {
           if (g.status !== 'finished') { updatePayload.status = 'finished'; g.status = 'finished'; }
           if (g.home_score !== found.homeScore) { updatePayload.home_score = found.homeScore; g.home_score = found.homeScore; }
           if (g.away_score !== found.awayScore) { updatePayload.away_score = found.awayScore; g.away_score = found.awayScore; }
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
