export class MatchAnalyzer {
  constructor() {
    // Armazena sinais já disparados para evitar duplicidade (fixtureId_strategy)
    this.sentAlerts = new Set();
  }

  // Extrai estatísticas chave da resposta da API-Football
  parseStats(statisticsResponse, elapsed) {
    if (!statisticsResponse || statisticsResponse.length < 2) {
      return null;
    }

    const homeStats = statisticsResponse[0]?.statistics || [];
    const awayStats = statisticsResponse[1]?.statistics || [];

    const getStat = (stats, type) => {
      const item = stats.find(s => s.type.toLowerCase() === type.toLowerCase());
      if (!item || item.value === null || item.value === undefined) return 0;
      if (typeof item.value === 'string') {
        const parsed = parseInt(item.value.replace('%', ''), 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return item.value;
    };

    const shotsOnTargetHome = getStat(homeStats, 'Shots on Goal');
    const shotsOnTargetAway = getStat(awayStats, 'Shots on Goal');
    const totalShotsHome = getStat(homeStats, 'Total Shots');
    const totalShotsAway = getStat(awayStats, 'Total Shots');
    const cornersHome = getStat(homeStats, 'Corner Kicks');
    const cornersAway = getStat(awayStats, 'Corner Kicks');
    const possessionHome = getStat(homeStats, 'Ball Possession');
    const possessionAway = getStat(awayStats, 'Ball Possession');

    const totalShots = totalShotsHome + totalShotsAway;
    const totalShotsOnTarget = shotsOnTargetHome + shotsOnTargetAway;
    const totalCorners = cornersHome + cornersAway;

    // Se nenhum dado estatístico foi registrado (scout zerado), descarta
    if (totalShots === 0 && totalCorners === 0) {
      return null;
    }

    // Calcula taxa de intensidade / APM estimado
    const effectiveMinutes = Math.max(elapsed || 1, 1);
    const apm = (totalShots * 1.5 + totalCorners * 1.0) / effectiveMinutes;

    return {
      shotsOnTargetHome,
      shotsOnTargetAway,
      totalShotsHome,
      totalShotsAway,
      cornersHome,
      cornersAway,
      possessionHome,
      possessionAway,
      totalShots,
      totalShotsOnTarget,
      totalCorners,
      apm
    };
  }

  // Avalia a partida com base nas regras anti-erro e gera o sinal se houver valor real
  analyze(fixture, statsData) {
    const fixtureId = fixture.fixture.id;
    const elapsed = fixture.fixture.status.elapsed;
    const homeGoals = fixture.goals.home ?? 0;
    const awayGoals = fixture.goals.away ?? 0;
    const totalGoals = homeGoals + awayGoals;

    const stats = this.parseStats(statsData, elapsed);
    if (!stats) return null; // Sem dados suficientes para operar com segurança

    const signals = [];

    // ==========================================
    // ESTRATÉGIA 1: OVER 0.5 GOLS HT (1º Tempo)
    // ==========================================
    const keyHT = `${fixtureId}_OVER_HT`;
    if (!this.sentAlerts.has(keyHT)) {
      if (
        elapsed >= 25 &&
        elapsed <= 38 &&
        totalGoals === 0 &&
        stats.totalShotsOnTarget >= 3 &&
        stats.totalShots >= 6 &&
        stats.totalCorners >= 2
      ) {
        this.sentAlerts.add(keyHT);
        signals.push({
          title: 'Gols 1º Tempo',
          strategy: 'OVER_05_HT',
          recommendation: 'Over 0.5 Gols no 1º Tempo (HT)',
          minOdds: 1.55,
          reason: `🔥 Jogo em 0x0 com pressão no 1º tempo! ${stats.totalShotsOnTarget} chutes no gol e ${stats.totalShots} finalizações em ${elapsed} minutos.`,
          match: { home: fixture.teams.home.name, away: fixture.teams.away.name },
          league: fixture.league.name,
          country: fixture.league.country,
          elapsed,
          score: { home: homeGoals, away: awayGoals },
          stats
        });
      }
    }

    // ==========================================
    // ESTRATÉGIA 2: OVER GOLS FT (Gol Limite 2º Tempo)
    // ==========================================
    const keyFT = `${fixtureId}_OVER_FT`;
    if (!this.sentAlerts.has(keyFT)) {
      const isCloseGame = Math.abs(homeGoals - awayGoals) <= 1; // empate ou diferença de 1 gol
      if (
        elapsed >= 70 &&
        elapsed <= 83 &&
        isCloseGame &&
        stats.totalShotsOnTarget >= 6 &&
        stats.totalShots >= 13 &&
        stats.totalCorners >= 4
      ) {
        const nextGoalLine = totalGoals + 0.5;
        this.sentAlerts.add(keyFT);
        signals.push({
          title: 'Gol Limite Final de Jogo',
          strategy: 'OVER_GOLS_FT',
          recommendation: `Over ${nextGoalLine} Gols Asiático / Limite`,
          minOdds: 1.65,
          reason: `⚡ Ritmo ofensivo intenso aos ${elapsed}'! Somatório de ${stats.totalShots} chutes (${stats.totalShotsOnTarget} no alvo) e jogo aberto para qualquer um marcar.`,
          match: { home: fixture.teams.home.name, away: fixture.teams.away.name },
          league: fixture.league.name,
          country: fixture.league.country,
          elapsed,
          score: { home: homeGoals, away: awayGoals },
          stats
        });
      }
    }

    // ==========================================
    // ESTRATÉGIA 3: ESCANTEIOS LIMITE FT
    // ==========================================
    const keyCorners = `${fixtureId}_CORNERS_FT`;
    if (!this.sentAlerts.has(keyCorners)) {
      const isDesperate = Math.abs(homeGoals - awayGoals) <= 1; // time precisando do gol
      if (
        elapsed >= 82 &&
        elapsed <= 88 &&
        isDesperate &&
        stats.totalCorners >= 7 &&
        stats.totalShots >= 14
      ) {
        this.sentAlerts.add(keyCorners);
        signals.push({
          title: 'Cantos Limite FT',
          strategy: 'CORNERS_FT',
          recommendation: `Mais de 0.5 Cantos Limite (Linha Atual + 1)`,
          minOdds: 1.60,
          reason: `🚩 Abafa final aos ${elapsed}'! Jogo disputado com ${stats.totalCorners} escanteios já cobrados e time pressionando a área adversária.`,
          match: { home: fixture.teams.home.name, away: fixture.teams.away.name },
          league: fixture.league.name,
          country: fixture.league.country,
          elapsed,
          score: { home: homeGoals, away: awayGoals },
          stats
        });
      }
    }

    return signals;
  }

  // Analisador exclusivo para os dados ilimitados da ESPN
  analyzeEspn(match, details) {
    const { id, elapsed, homeScore, awayScore, homeTeam, awayTeam, period } = match;
    const { leagueName, homeStats, awayStats } = details;
    const totalGoals = homeScore + awayScore;

    const totalShots = homeStats.totalShots + awayStats.totalShots;
    const totalShotsOnTarget = homeStats.shotsOnTarget + awayStats.shotsOnTarget;
    const totalCorners = homeStats.corners + awayStats.corners;

    if (totalShots === 0 && totalCorners === 0) {
      return [];
    }

    const effectiveMinutes = Math.max(elapsed || 1, 1);
    const apm = (totalShots * 1.5 + totalCorners * 1.0) / effectiveMinutes;

    const stats = {
      shotsOnTargetHome: homeStats.shotsOnTarget,
      shotsOnTargetAway: awayStats.shotsOnTarget,
      totalShotsHome: homeStats.totalShots,
      totalShotsAway: awayStats.totalShots,
      cornersHome: homeStats.corners,
      cornersAway: awayStats.corners,
      possessionHome: homeStats.possession,
      possessionAway: awayStats.possession,
      totalShots,
      totalShotsOnTarget,
      totalCorners,
      apm
    };

    const signals = [];

    // ==========================================
    // ESTRATÉGIA 1: OVER 0.5 GOLS HT (1º Tempo)
    // ==========================================
    const keyHT = `espn_${id}_OVER_HT`;
    if (!this.sentAlerts.has(keyHT)) {
      if (
        period === 1 &&
        elapsed >= 25 &&
        elapsed <= 38 &&
        totalGoals === 0 &&
        totalShotsOnTarget >= 3 &&
        totalShots >= 6 &&
        totalCorners >= 2
      ) {
        this.sentAlerts.add(keyHT);
        signals.push({
          title: 'Gols 1º Tempo',
          strategy: 'OVER_05_HT',
          recommendation: 'Over 0.5 Gols no 1º Tempo (HT)',
          minOdds: 1.55,
          reason: `🔥 Jogo em 0x0 com pressão no 1º tempo! ${totalShotsOnTarget} chutes no alvo e ${totalShots} finalizações em ${elapsed} minutos.`,
          match: { home: homeTeam, away: awayTeam },
          league: leagueName,
          country: 'Mundial',
          elapsed,
          score: { home: homeScore, away: awayScore },
          stats
        });
      }
    }

    // ==========================================
    // ESTRATÉGIA 2: OVER GOLS FT (Gol Limite 2º Tempo)
    // ==========================================
    const keyFT = `espn_${id}_OVER_FT`;
    if (!this.sentAlerts.has(keyFT)) {
      const isCloseGame = Math.abs(homeScore - awayScore) <= 1;
      if (
        period === 2 &&
        elapsed >= 70 &&
        elapsed <= 83 &&
        isCloseGame &&
        totalShotsOnTarget >= 6 &&
        totalShots >= 13 &&
        totalCorners >= 4
      ) {
        const nextGoalLine = totalGoals + 0.5;
        this.sentAlerts.add(keyFT);
        signals.push({
          title: 'Gol Limite Final de Jogo',
          strategy: 'OVER_GOLS_FT',
          recommendation: `Over ${nextGoalLine} Gols Asiático / Limite`,
          minOdds: 1.65,
          reason: `⚡ Ritmo ofensivo intenso aos ${elapsed}'! Somatório de ${totalShots} chutes (${totalShotsOnTarget} no alvo) e jogo aberto para qualquer um marcar.`,
          match: { home: homeTeam, away: awayTeam },
          league: leagueName,
          country: 'Mundial',
          elapsed,
          score: { home: homeScore, away: awayScore },
          stats
        });
      }
    }

    // ==========================================
    // ESTRATÉGIA 3: ESCANTEIOS LIMITE FT
    // ==========================================
    const keyCorners = `espn_${id}_CORNERS_FT`;
    if (!this.sentAlerts.has(keyCorners)) {
      const isDesperate = Math.abs(homeScore - awayScore) <= 1;
      if (
        period === 2 &&
        elapsed >= 82 &&
        elapsed <= 88 &&
        isDesperate &&
        totalCorners >= 7 &&
        totalShots >= 14
      ) {
        this.sentAlerts.add(keyCorners);
        signals.push({
          title: 'Cantos Limite FT',
          strategy: 'CORNERS_FT',
          recommendation: `Mais de 0.5 Cantos Limite (Linha Atual + 1)`,
          minOdds: 1.60,
          reason: `🚩 Abafa final aos ${elapsed}'! Jogo disputado com ${totalCorners} escanteios já cobrados e time pressionando a área adversária.`,
          match: { home: homeTeam, away: awayTeam },
          league: leagueName,
          country: 'Mundial',
          elapsed,
          score: { home: homeScore, away: awayScore },
          stats
        });
      }
    }

    return signals;
  }
}

