import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.API_FOOTBALL_KEY;

async function testLive() {
  const res = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
    headers: { 'x-apisports-key': apiKey }
  });
  const data = await res.json();
  console.log('LIVE FIXTURES COUNT:', data.results);
  if (data.results > 0) {
    console.log('PRIMEIROS 3 JOGOS AO VIVO:');
    data.response.slice(0, 3).forEach(f => {
      console.log(`- ${f.league.name} (${f.league.country}): ${f.teams.home.name} ${f.goals.home ?? 0} x ${f.goals.away ?? 0} ${f.teams.away.name} [${f.fixture.status.elapsed}'] ID: ${f.fixture.id}`);
    });
  }
}
testLive().catch(console.error);

