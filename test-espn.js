async function test() {
  const spRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/scorepanel', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const sp = await spRes.json();
  const allEvents = sp.scores.flatMap(s => s.events || []);
  const finished = allEvents.find(e => e.status?.type?.completed);
  if (finished) {
    console.log('Finished event:', finished.id, finished.name);
    const summaryRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/aus.1/summary?event=${finished.id}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    console.log('Status:', summaryRes.status);
    const data = await summaryRes.json();
    if (data.boxscore?.teams) {
      for (const t of data.boxscore.teams) {
        console.log(`Team: ${t.team?.displayName}`);
        console.log(t.statistics?.map(s => `${s.name}: ${s.displayValue}`).join(', '));
      }
    }
  }
}
test().catch(console.error);

