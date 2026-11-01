import { EspnProvider } from './espn.js';
import { ResultTracker } from './tracker.js';

export class EspnScanner {
  constructor(analyzer, telegram) {
    this.espn = new EspnProvider();
    this.analyzer = analyzer;
    this.telegram = telegram;
    this.tracker = new ResultTracker(this.telegram, this.espn);
    this.isRunning = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isCandidate(match) {
    const elapsed = match.elapsed;
    if (!elapsed) return false;

    // Candidato se o jogo já passou dos 25 minutos de jogo
    return elapsed >= 25 && elapsed <= 89;
  }

  async scanOnce() {
    console.log(`\n[${new Date().toLocaleTimeString()}] 🌐 [ESPN ILIMITADO] Varrendo jogos ao vivo no mundo todo...`);
    const liveMatches = await this.espn.getLiveMatches();
    console.log(`[Status Ao Vivo] ${liveMatches.length} partidas rolando agora com cobertura de scout.`);

    // 1. Confere se alguma aposta aberta bateu GREEN ou encerrou em RED
    await this.tracker.checkAllBets();

    if (liveMatches.length === 0) {
      console.log(`ℹ️ [Aguardando Rodada] Nenhuma partida rolando no momento.`);
      return;
    }

    const candidates = liveMatches.filter(m => this.isCandidate(m));

    if (candidates.length === 0) {
      console.log(`ℹ️ ${liveMatches.length} jogos em andamento, mas ainda em fase inicial (< 25 min).`);
      return;
    }

    console.log(`🎯 [Em Análise Ativa] ${candidates.length} jogo(s) monitorados segundo a segundo!`);

    for (const match of candidates) {
      const { id, homeTeam, awayTeam, elapsed, homeScore, awayScore, leagueId } = match;

      console.log(`-> Analisando: [${elapsed}'] ${homeTeam} ${homeScore}x${awayScore} ${awayTeam}`);

      const details = await this.espn.getMatchStats(leagueId, id);
      if (!details) continue;

      const signals = this.analyzer.analyzeEspn(match, details);

      if (signals && signals.length > 0) {
        for (const sig of signals) {
          console.log(`🔥 SINAL ENCONTRADO: ${sig.recommendation} em ${homeTeam} x ${awayTeam}!`);
          const messageId = await this.telegram.sendSignalAlert(sig);
          if (messageId) {
            this.tracker.addBet(sig, messageId, match);
          }
        }
      } else {
        console.log(`ℹ️ [Sem gatilho] Pressão ainda insuficiente para entrada.`);
      }

      await this.sleep(800);
    }
  }

  async start(intervalSeconds = 30) {
    this.isRunning = true;
    console.log(`🚀 Motor VisionBET [MODO ILIMITADO COM DETECTOR DE GREEN/RED] ATIVO!`);
    console.log(`⏱️ Ciclo ultra-rápido: a cada ${intervalSeconds} segundos.`);

    while (this.isRunning) {
      try {
        await this.scanOnce();
      } catch (err) {
        console.error('[Erro no ciclo ESPN]', err.message);
      }
      await this.sleep(intervalSeconds * 1000);
    }
  }

  stop() {
    this.isRunning = false;
  }
}
