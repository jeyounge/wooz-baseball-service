import { parse } from 'node-html-parser';

async function testKboPitchers() {
  const params = new URLSearchParams({
    leId: "1", srIdList: "0,9", seasonId: "2026", gameMonth: "04", teamId: ""
  });

  const res = await fetch('https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  
  const json = await res.json();
  
  let currentTargetDate = false;
  if (json.rows) {
     for(let r of json.rows) {
       const cols = r.row;
       if(!cols) continue;
       
       if (cols.length === 9) {
           let dateCol = parse(cols[0].Text).text.trim();
           if(dateCol.includes('04.08')) currentTargetDate = true;
           else currentTargetDate = false;
       }
       
       if (currentTargetDate) {
         let matchColIndex = cols.length === 9 ? 2 : 1;
         let html = cols[matchColIndex]?.Text || '';
         console.log("Raw HTML match block:", html);
       }
     }
  }
}
testKboPitchers();
