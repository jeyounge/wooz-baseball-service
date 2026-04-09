import { parse } from 'node-html-parser';

async function verifyLogic() {
  const d = new Date();
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const todayKboFmt = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  
  console.log("Checking date:", todayKboFmt);

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
         
         const root = parse(playHtml);
         const spans = root.querySelectorAll('span');
         
         console.log("Raw HTML span count:", spans.length, "Play HTML:", playHtml);
         if (spans.length >= 4) {
            apiPitchers.push({
               away: spans[0].text.trim(),
               awayPitcher: spans[1].text.replace(/[()]/g, '').trim(),
               homePitcher: spans[2].text.replace(/[()]/g, '').trim(),
               home: spans[3].text.trim()
            });
         }
       }
    }
  }
  
  console.log("Extracted pitchers from KBO:", apiPitchers);
}

verifyLogic();
