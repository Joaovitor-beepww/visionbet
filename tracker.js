import fs from 'fs';
import path from 'path';

export class ResultTracker {
  constructor(telegram, espnProvider) {
    this.telegram = telegram;
    this.espn = espnProvider;
    this.filePath = path.resolve('pending_bets.json');
    this.bets = this.loadBets();
  }

  loadBets() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[Tracker] Erro ao carregar pending_bets.json:', err.message);
    }
    return [];
  }

  saveBets() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.bets, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Tracker] Erro ao salvar pending_bets.json:', err.message);
    }
  }

  addBet(signal, messageId, match) {
    if (!messageId) return;

    const bet = {
      id: `${match.id}_${signal.strategy}`,
      matchId: match.id,
      leagueId: match.leagueId,
      messageId: messageId,
      strategy: signal.strategy,
      recommendation: signal.recommendation,
      matchName: `${match.homeTeam} x ${match.awayTeam}`,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      initialHomeScore: match.homeScore,
      initialAwayScore: match.awayScore,
      initialTotalGoals: match.homeScore + match.awayScore,
      initialCorners: (signal.stats?.cornersHome || 0) + (signal.stats?.cornersAway || 0),
      initialPeriod: match.period,
      createdAt: Date.now(),
      resolved: false
    };

    if (!this.bets.some(b => b.id === bet.id)) {
      this.bets.push(bet);
      this.saveBets();
      console.log(`📌 [Tracker] Aposta registrada para verificação automática: ${bet.matchName} (${bet.recommendation})`);
    }
  }

  async checkAllBets() {
    if (this.bets.length === 0) return;

    console.log(`🔍 [Tracker] Conferindo resultado de ${this.bets.length} aposta(s) em aberto...`);

    const remainingBets = [];
    const liveMatches = await this.espn.getLiveMatches();

    for (const bet of this.bets) {
      try {
        const currentMatch = liveMatches.find(m => m.id === bet.matchId);
        const details = await this.espn.getMatchStats(bet.leagueId, bet.matchId);

        // Captura o placar mais atualizado possível (de details ou de liveMatches)
        let homeScore = bet.initialHomeScore;
        let awayScore = bet.initialAwayScore;

        if (details && typeof details.homeScore === 'number' && !isNaN(details.homeScore)) {
          homeScore = details.homeScore;
          awayScore = details.awayScore;
        } else if (currentMatch) {
          homeScore = currentMatch.homeScore;
          awayScore = currentMatch.awayScore;
        }

        const currentTotalGoals = homeScore + awayScore;
        const totalCorners = (details?.homeStats?.corners || 0) + (details?.awayStats?.corners || 0);

        const period = currentMatch?.period ?? 2;
        const elapsed = currentMatch?.elapsed ?? 90;
        const isFinished = !currentMatch; // Se saiu da lista de ao vivo, jogo finalizou

        let isGreen = false;
        let isRed = false;

        // ==========================================
        // 1. OVER 0.5 GOLS HT (1º Tempo)
        // ==========================================
        if (bet.strategy === 'OVER_05_HT') {
          if (currentTotalGoals > bet.initialTotalGoals) {
            isGreen = true;
          } else if (period >= 2 || isFinished) {
            isRed = true;
          }
        }

        // ==========================================
        // 2. CANTOS LIMITE HT
        // ==========================================
        else if (bet.strategy === 'CORNERS_HT') {
          if (totalCorners > bet.initialCorners) {
            isGreen = true;
          } else if (period >= 2 || isFinished) {
            isRed = true;
          }
        }

        // ==========================================
        // 3. AMBAS MARCAM (BTTS)
        // ==========================================
        else if (bet.strategy === 'BTTS_YES') {
          if (homeScore >= 1 && awayScore >= 1) {
            isGreen = true;
          } else if (isFinished) {
            isRed = true;
          }
        }

        // ==========================================
        // 4. FAVORITO PRESSIONANDO (Over Gols / Empate)
        // ==========================================
        else if (bet.strategy === 'FAVORITE_PRESSING') {
          // Bate se saiu qualquer gol a mais ou o time empatou/virou
          if (currentTotalGoals > bet.initialTotalGoals) {
            isGreen = true;
          } else if (isFinished) {
            isRed = true;
          }
        }

        // ==========================================
        // 5. OVER GOLS FT (Gol Limite)
        // ==========================================
        else if (bet.strategy === 'OVER_GOLS_FT') {
          if (currentTotalGoals > bet.initialTotalGoals) {
            isGreen = true;
          } else if (isFinished) {
            isRed = true;
          }
        }

        // ==========================================
        // 6. CANTOS LIMITE FT
        // ==========================================
        else if (bet.strategy === 'CORNERS_FT') {
          if (totalCorners > bet.initialCorners) {
            isGreen = true;
          } else if (isFinished) {
            isRed = true;
          }
        }

        if (isGreen) {
          console.log(`🎉 [GREEN CONFIRMADO!] ${bet.matchName} - ${bet.recommendation}`);
          await this.telegram.sendGreenAlert(bet, {
            elapsed,
            homeScore,
            awayScore,
            totalCorners
          });
        } else if (isRed) {
          console.log(`❌ [RED CONFIRMADO] ${bet.matchName} - ${bet.recommendation}`);
          await this.telegram.sendRedAlert(bet, {
            homeScore,
            awayScore
          });
        } else {
          // Aposta continua em andamento
          remainingBets.push(bet);
        }
      } catch (err) {
        console.error(`[Tracker Erro na aposta ${bet.id}]`, err.message);
        remainingBets.push(bet);
      }
    }

    this.bets = remainingBets;
    this.saveBets();
  }
}
