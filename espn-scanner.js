import { EspnProvider } from './providers/espn.js';

export class EspnScanner {
  constructor(analyzer, telegram) {
    this.espn = new EspnProvider();
    this.analyzer = analyzer;
    this.telegram = telegram;
    this.isRunning = false;
    this.lastCheck = new Map();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isCandidate(match) {
    const elapsed = match.elapsed;
    if (!elapsed) return false;

    // Janela 1: 1º Tempo (25' a 38')
    const isHTWindow = match.period === 1 && elapsed >= 25 && elapsed <= 38;
    // Janela 2: 2º Tempo (70' a 88')
    const isFTWindow = match.period === 2 && elapsed >= 70 && elapsed <= 88;

    return isHTWindow || isFTWindow;
  }

  async scanOnce() {
    console.log(`\n[${new Date().toLocaleTimeString()}] 🌐 [ESPN ILIMITADO] Verificando jogos ao vivo no mundo...`);
    const liveMatches = await this.espn.getLiveMatches();
    console.log(`[Status Ao Vivo] ${liveMatches.length} partidas rolando agora com cobertura de scout.`);

    if (liveMatches.length === 0) {
      console.log(`ℹ️ [Aguardando Rodada] Nenhuma partida no exato minuto de entrada agora.`);
      return;
    }

    const candidates = liveMatches.filter(m => this.isCandidate(m));

    if (candidates.length === 0) {
      console.log(`ℹ️ ${liveMatches.length} jogos em andamento, mas nenhum nas janelas de entrada (25'-38' ou 70'-88').`);
      return;
    }

    console.log(`🎯 [Oportunidades em Análise] ${candidates.length} jogo(s) na janela exata de entrada!`);

    for (const match of candidates) {
      const { id, homeTeam, awayTeam, elapsed, homeScore, awayScore, leagueId } = match;

      console.log(`-> Analisando estatísticas: [${elapsed}'] ${homeTeam} ${homeScore}x${awayScore} ${awayTeam}`);

      const details = await this.espn.getMatchStats(leagueId, id);
      if (!details) continue;

      const signals = this.analyzer.analyzeEspn(match, details);

      if (signals && signals.length > 0) {
        for (const sig of signals) {
          console.log(`🔥 SINAL ENCONTRADO: ${sig.recommendation} em ${homeTeam} x ${awayTeam}!`);
          await this.telegram.sendSignalAlert(sig);
        }
      } else {
        console.log(`ℹ️ Partida não atingiu a pressão mínima exigida.`);
      }

      await this.sleep(1000);
    }
  }

  async start(intervalSeconds = 60) {
    this.isRunning = true;
    console.log(`🚀 Motor VisionBET [MODO ILIMITADO - ESPN GLOBAL] INICIADO!`);
    console.log(`⏱️ Ciclo de monitoramento: a cada ${intervalSeconds} segundos (Sem limite de requisições!).`);

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

