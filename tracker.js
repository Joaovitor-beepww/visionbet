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

    // Evita duplicatas
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

    for (const bet of this.bets) {
      try {
        const details = await this.espn.getMatchStats(bet.leagueId, bet.matchId);
        if (!details) {
          remainingBets.push(bet);
          continue;
        }

        const totalShots = details.homeStats.totalShots + details.awayStats.totalShots;
        const totalCorners = details.homeStats.corners + details.awayStats.corners;
        const homeScore = details.homeScore ?? bet.initialHomeScore;
        const awayScore = details.awayScore ?? bet.initialAwayScore;
        const currentTotalGoals = homeScore + awayScore;

        // Pega estado atual do jogo na lista ao vivo
        const liveMatches = await this.espn.getLiveMatches();
        const currentMatch = liveMatches.find(m => m.id === bet.matchId);

        const period = currentMatch?.period ?? 2;
        const elapsed = currentMatch?.elapsed ?? 90;
        const isFinished = !currentMatch; // Se não está mais ao vivo, o jogo acabou

        let isGreen = false;
        let isRed = false;

        // ==========================================
        // 1. OVER 0.5 GOLS HT
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
        // 4. FAVORITO PRESSIONANDO
        // ==========================================
        else if (bet.strategy === 'FAVORITE_PRESSING') {
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
          // Aposta ainda em andamento
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

