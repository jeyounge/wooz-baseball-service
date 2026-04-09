async function checkKboApi() {
  const params = new URLSearchParams({
    leId: "1", srIdList: "0,9", seasonId: "2026", gameMonth: "04", teamId: ""
  });

  const res = await fetch('https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  
  const json = await res.json();
  if (json.rows) {
     const april8Matches = json.rows.filter(r => {
        const text = r.row.map(c => c.Text).join(' | ');
        return text.includes('04.08') || text.includes('<span>');
     });
     
     // Dump one full match clearly
     let target = json.rows.find(r => r.row.map(c => c.Text).join(' ').includes('04.08'));
     if(!target) target = json.rows[15];
     
     console.log("Full columns:", target.row.map(c => c.Text));
  }
}
checkKboApi();
