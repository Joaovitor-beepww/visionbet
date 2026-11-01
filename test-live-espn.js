async function testLive() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/scorepanel', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const data = await res.json();
  const allEvents = data.scores.flatMap(s => s.events || []);
  const inProgress = allEvents.filter(e => e.status?.type?.state === 'in');
  console.log('JOGOS ROLANDO AGORA NO ESPN:', inProgress.length);
  for (const e of inProgress) {
    const comp = e.competitions?.[0];
    const home = comp?.competitors?.find(c => c.homeAway === 'home');
    const away = comp?.competitors?.find(c => c.homeAway === 'away');
    console.log(`- ${home?.team?.name} ${home?.score ?? 0} x ${away?.score ?? 0} ${away?.team?.name} [${e.status?.displayClock}] ID: ${e.id}`);
  }
}
testLive().catch(console.error);

