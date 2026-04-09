async function testNewKboApi() {
  const params = new URLSearchParams({
    leId: "1",
    srId: "0,1,3,4,5,6,7,8,9",
    date: "20260408"
  });

  try {
    const res = await fetch('https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    
    const json = await res.json();
    if (json.game && json.game.length > 0) {
      const g = json.game[0];
      for (const [key, value] of Object.entries(g)) {
        console.log(`${key}: ${value}`);
      }
    } else {
      console.log("No game data found.");
    }
  } catch (err) {
    console.error("New API fetch failed:", err);
  }
}

testNewKboApi();
