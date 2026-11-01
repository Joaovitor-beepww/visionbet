export class MatchAnalyzer {
  constructor() {
    // Armazena sinais já disparados para evitar duplicidade (chave única por estratégia)
    this.sentAlerts = new Set();
  }

  // Analisador para os dados da ESPN Global (Ilimitado)
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
    // ESTRATÉGIA 2: CANTOS LIMITE HT (1º Tempo)
    // ==========================================
    const keyCornersHT = `espn_${id}_CORNERS_HT`;
    if (!this.sentAlerts.has(keyCornersHT)) {
      if (
        period === 1 &&
        elapsed >= 37 &&
        elapsed <= 43 &&
        totalCorners >= 4 &&
        totalShots >= 6
      ) {
        this.sentAlerts.add(keyCornersHT);
        signals.push({
          title: 'Cantos Limite 1º Tempo',
          strategy: 'CORNERS_HT',
          recommendation: `Mais de 0.5 Cantos Limite HT (Linha Atual + 1)`,
          minOdds: 1.60,
          reason: `🚩 Ritmo de escanteios aquecido no fim do 1º tempo! ${totalCorners} cantos e ${totalShots} finalizações até os ${elapsed}' minutos.`,
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
    // ESTRATÉGIA 3: AMBAS AS EQUIPES MARCAM (BTTS)
    // ==========================================
    const keyBTTS = `espn_${id}_BTTS`;
    if (!this.sentAlerts.has(keyBTTS)) {
      const isUnderTwoGoals = totalGoals <= 1;
      const bothThreatening =
        homeStats.shotsOnTarget >= 2 &&
        awayStats.shotsOnTarget >= 2 &&
        homeStats.totalShots >= 4 &&
        awayStats.totalShots >= 4;

      if (elapsed >= 30 && elapsed <= 65 && isUnderTwoGoals && bothThreatening) {
        this.sentAlerts.add(keyBTTS);
        signals.push({
          title: 'Ambas Marcam (BTTS)',
          strategy: 'BTTS_YES',
          recommendation: 'Ambas as Equipes Marcam: SIM',
          minOdds: 1.70,
          reason: `⚔️ Jogo aberto lá e cá! Ambos os times agredindo a área: ${homeTeam} (${homeStats.shotsOnTarget} no alvo) x ${awayTeam} (${awayStats.shotsOnTarget} no alvo).`,
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
    // ESTRATÉGIA 4: PRESSÃO DE FAVORITO ATRÁS DO PLACAR
    // ==========================================
    const keyComeback = `espn_${id}_COMEBACK`;
    if (!this.sentAlerts.has(keyComeback)) {
      if (period === 2 && elapsed >= 55 && elapsed <= 78) {
        const homeLosing = homeScore === awayScore - 1 && homeStats.possession >= 58 && homeStats.shotsOnTarget >= 3;
        const awayLosing = awayScore === homeScore - 1 && awayStats.possession >= 58 && awayStats.shotsOnTarget >= 3;

        if (homeLosing || awayLosing) {
          const pressingTeam = homeLosing ? homeTeam : awayTeam;
          this.sentAlerts.add(keyComeback);
          signals.push({
            title: 'Pressão Máxima de Recuperação',
            strategy: 'FAVORITE_PRESSING',
            recommendation: `Over 0.5 Gols de ${pressingTeam} (ou Empate Anula/Dupla Chance)`,
            minOdds: 1.65,
            reason: `🦁 Abafa total! ${pressingTeam} está atrás por apenas 1 gol, com domínio absoluto de posse e volume ofensivo constante aos ${elapsed}' minutos.`,
            match: { home: homeTeam, away: awayTeam },
            league: leagueName,
            country: 'Mundial',
            elapsed,
            score: { home: homeScore, away: awayScore },
            stats
          });
        }
      }
    }

    // ==========================================
    // ESTRATÉGIA 5: OVER GOLS FT (Gol Limite 2º Tempo)
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
    // ESTRATÉGIA 6: ESCANTEIOS LIMITE FT (Final de Jogo)
    // ==========================================
    const keyCornersFT = `espn_${id}_CORNERS_FT`;
    if (!this.sentAlerts.has(keyCornersFT)) {
      const isDesperate = Math.abs(homeScore - awayScore) <= 1;
      if (
        period === 2 &&
        elapsed >= 82 &&
        elapsed <= 88 &&
        isDesperate &&
        totalCorners >= 7 &&
        totalShots >= 14
      ) {
        this.sentAlerts.add(keyCornersFT);
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
