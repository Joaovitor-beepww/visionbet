async function testSummary() {
  const leagueId = 'eng.1';
  const eventId = '401879246';
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/summary?event=${eventId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const data = await res.json();
  console.log('League:', data.header?.league?.name);
  console.log('Competitions:', data.header?.competitions?.[0]?.competitors?.map(c => c.team?.displayName));
  console.log('Odds available:', data.odds ? data.odds.length : 0);
  if (data.odds && data.odds.length > 0) {
    console.log('Odd details:', data.odds[0]?.provider?.name, data.odds[0]?.overOdds, data.odds[0]?.underOdds, data.odds[0]?.details);
  }
}
testSummary().catch(console.error);

