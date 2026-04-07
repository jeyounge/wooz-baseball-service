async function test() {
  const KST = new Date();
  KST.setHours(KST.getHours() + 9);
  const dateStr = KST.toISOString().split('T')[0];
  
  const res = await fetch(`https://m.sports.naver.com/kbaseball/schedule/index?date=${dateStr.replace(/-/g, '')}`);
  const html = await res.text();
  console.log(html.includes('__NEXT_DATA__') ? "Has Next Data" : "No Next data");
  // extract next data
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
  if(match) {
      console.log(match[1].substring(0, 1000));
  }
}
test();
