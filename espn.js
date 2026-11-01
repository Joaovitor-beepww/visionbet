export class EspnProvider {
  constructor() {
    this.baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
  }

  async getLiveMatches() {
    try {
      const res = await fetch(`${this.baseUrl}/scorepanel`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!res.ok) {
        console.error(`[ESPN API] Erro HTTP ${res.status}`);
        return [];
      }
      const data = await res.json();
      const allEvents = (data.scores || []).flatMap(s => s.events || []);
      const liveEvents = allEvents.filter(e => e.status?.type?.state === 'in');
      return liveEvents.map(e => this.formatEventSummary(e));
    } catch (err) {
      console.error('[ESPN getLiveMatches]', err.message);
      return [];
    }
  }

  formatEventSummary(event) {
    const comp = event.competitions?.[0];
    const home = comp?.competitors?.find(c => c.homeAway === 'home');
    const away = comp?.competitors?.find(c => c.homeAway === 'away');

    const displayClock = event.status?.displayClock || '0';
    const elapsed = parseInt(displayClock.replace(/[^0-9]/g, ''), 10) || 0;
    const period = event.status?.period || 1;

    return {
      id: event.id,
      leagueId: event.leagueId || 'all',
      leagueName: event.season?.slug || 'Futebol Internacional',
      homeTeam: home?.team?.displayName || home?.team?.name || 'Casa',
      awayTeam: away?.team?.displayName || away?.team?.name || 'Fora',
      homeScore: parseInt(home?.score || '0', 10),
      awayScore: parseInt(away?.score || '0', 10),
      elapsed,
      period,
      displayClock,
      statusDescription: event.status?.type?.description || 'Ao Vivo'
    };
  }

  async getMatchStats(leagueId, eventId) {
    try {
      const lid = leagueId || 'all';
      const url = `${this.baseUrl}/${lid}/summary?event=${eventId}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!res.ok) return null;
      const data = await res.json();

      const teams = data.boxscore?.teams || [];
      if (teams.length < 2) return null;

      const extractStats = (teamObj) => {
        const statsList = teamObj.statistics || [];
        const findVal = (name) => {
          const item = statsList.find(s => s.name === name);
          if (!item) return 0;
          const num = parseFloat(item.displayValue);
          return isNaN(num) ? 0 : num;
        };

        return {
          totalShots: findVal('totalShots'),
          shotsOnTarget: findVal('shotsOnTarget'),
          corners: findVal('wonCorners'),
          possession: findVal('possessionPct'),
          fouls: findVal('foulsCommitted'),
          yellowCards: findVal('yellowCards'),
          redCards: findVal('redCards')
        };
      };

      const homeStats = extractStats(teams[0]);
      const awayStats = extractStats(teams[1]);

      const competitors = data.header?.competitions?.[0]?.competitors || [];
      const homeComp = competitors.find(c => c.homeAway === 'home');
      const awayComp = competitors.find(c => c.homeAway === 'away');
      const homeScore = parseInt(homeComp?.score || '0', 10);
      const awayScore = parseInt(awayComp?.score || '0', 10);

      const leagueName = data.header?.league?.name || 'Liga Principal';

      return {
        leagueName,
        homeTeam: teams[0].team?.displayName || 'Casa',
        awayTeam: teams[1].team?.displayName || 'Fora',
        homeScore,
        awayScore,
        homeStats,
        awayStats,
        odds: data.odds || []
      };
    } catch (err) {
      console.error(`[ESPN getMatchStats ID: ${eventId}]`, err.message);
      return null;
    }
  }
}
