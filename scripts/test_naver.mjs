import { parse } from 'node-html-parser';

async function scrapePitchersForDate(dateStr) {
  try {
    const url = `https://m.sports.naver.com/kbaseball/schedule/index?date=${dateStr}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1", "Accept-Language": "ko-KR,ko;q=0.9" }});
    const html = await res.text();
    const root = parse(html);

    console.log("Root content preview:", html.substring(0, 500));
    
    // Attempt standard scraping
    const games = [];
    const gameItems = root.querySelectorAll('.ScheduleAllType_match_list__3EK1A .ScheduleAllType_match_item__31wPE');
    console.log("Game items found (new style):", gameItems.length);
    if(gameItems.length === 0) {
      const oldGameItems = root.querySelectorAll('li.match_item');
      console.log("Game items found (old style):", oldGameItems.length);
    }
  } catch (err) {
      console.error(err);
  }
}

scrapePitchersForDate('20260408');
