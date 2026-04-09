async function test() {
      const d = new Date();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const todayKboFmt = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      
      console.log("Searching for:", todayKboFmt);
      
      const params = new URLSearchParams({
        leId: "1", srIdList: "0,9", seasonId: String(d.getFullYear()), gameMonth: monthStr, teamId: ""
      });

      const res = await fetch('https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const json = await res.json();
      
      const apiPitchers = [];
      if (json.rows) {
        let isMatchDate = false;
        for (const row of json.rows) {
           const cols = row.row;
           if (!cols) continue;
           
           if (cols.length === 9) {
             const dateText = cols[0].Text || '';
             isMatchDate = dateText.includes(todayKboFmt);
           }
           
           if (isMatchDate) {
             const playIdx = cols.length === 9 ? 2 : 1;
             const playHtml = cols[playIdx]?.Text || '';
             
             const match = playHtml.match(/<span>(.*?)<\/span>.*?<span>\((.*?)\)<\/span>.*?<span>\((.*?)\)<\/span>.*?<span>(.*?)<\/span>/);
             if (match) {
                apiPitchers.push({
                   away: match[1].trim(),
                   awayPitcher: match[2].trim(),
                   homePitcher: match[3].trim(),
                   home: match[4].trim()
                });
             } else {
                console.log("Regex missed on:", playHtml);
             }
           }
        }
      }
      
      console.log("apiPitchers:", apiPitchers);
}
test();
