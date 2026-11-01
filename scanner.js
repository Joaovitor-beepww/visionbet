import dotenv from 'dotenv';
dotenv.config();

import { isTopLeague, TOP_LEAGUES } from './leagues.js';

export class FootballScanner {
  constructor(apiKey, analyzer, telegram) {
    this.apiKey = apiKey || process.env.API_FOOTBALL_KEY;
    this.analyzer = analyzer;
    this.telegram = telegram;
    this.baseUrl = 'https://v3.football.api-sports.io';
    this.isRunning = false;

    // Cache de ligas que não têm cobertura de scout ao vivo
    this.unsupportedLeagues = new Set();

    // Cache de última consulta de stats por jogo (evita consultar o mesmo jogo várias vezes em poucos minutos)
    this.lastStatsCheck = new Map();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getLiveFixtures() {
    try {
      const res = await fetch(`${this.baseUrl}/fixtures?live=all`, {
        headers: { 'x-apisports-key': this.apiKey }
      });
      const data = await res.json();
      if (data.errors && Object.keys(data.errors).length > 0) {
        console.warn('[API-Football Aviso]', data.errors);
        return [];
      }
      return data.response || [];
    } catch (err) {
      console.error('[Erro getLiveFixtures]', err.message);
      return [];
    }
  }

  async getFixtureStatistics(fixtureId) {
    try {
      const res = await fetch(`${this.baseUrl}/fixtures/statistics?fixture=${fixtureId}`, {
        headers: { 'x-apisports-key': this.apiKey }
      });
      const data = await res.json();
      return data.response || [];
    } catch (err) {
      console.error(`[Erro getFixtureStatistics fixture=${fixtureId}]`, err.message);
      return [];
    }
  }

  // Verifica se o jogo é um candidato estratégico
  isCandidate(fixture) {
    const elapsed = fixture.fixture?.status?.elapsed;
    if (!elapsed) return false;

    // Filtro 1: Modo Ligas de Ouro (se ativado no .env)
    const onlyTop = process.env.ONLY_TOP_LEAGUES === 'true';
    if (onlyTop && !isTopLeague(fixture.league)) {
      return false;
    }

    // Filtro 2: Ligas sem suporte identificadas previamente
    if (this.unsupportedLeagues.has(fixture.league.id)) {
      return false;
    }

    // Filtro 3: Janelas de tempo estratégicas
    const isHTWindow = elapsed >= 25 && elapsed <= 38;
    const isFTWindow = elapsed >= 70 && elapsed <= 88;

    if (!isHTWindow && !isFTWindow) {
      return false;
    }

    // Filtro 4: Evitar checagem repetida do mesmo jogo em menos de 5 minutos
    const lastCheck = this.lastStatsCheck.get(fixture.fixture.id);
    if (lastCheck && Date.now() - lastCheck < 300000) {
      return false;
    }

    return true;
  }

  async scanOnce() {
    console.log(`\n[${new Date().toLocaleTimeString()}] 🔍 Varrendo jogos ao vivo...`);
    const liveFixtures = await this.getLiveFixtures();
    console.log(`[Status Geral] ${liveFixtures.length} partidas no mundo todo neste instante.`);

    const onlyTop = process.env.ONLY_TOP_LEAGUES === 'true';
    if (onlyTop) {
      const topCount = liveFixtures.filter(f => isTopLeague(f.league)).length;
      console.log(`[Modo Ligas de Ouro] ${topCount} jogos das principais ligas em campo.`);
    }

    // Identifica candidatos reais dentro dos critérios
    const candidates = liveFixtures.filter(f => this.isCandidate(f));

    if (candidates.length === 0) {
      console.log(`[Economia de API] Nenhum jogo das ligas principais nas janelas de entrada (25'-38' ou 70'-88').`);
      console.log(`-> Zero requisições extras gastas! Cota 100% preservada.`);
      return;
    }

    console.log(`🎯 [Oportunidades em Análise] ${candidates.length} jogo(s) dentro do momento exato de entrada!`);

    for (const fixture of candidates) {
      const fId = fixture.fixture.id;
      const lId = fixture.league.id;
      const home = fixture.teams.home.name;
      const away = fixture.teams.away.name;
      const elapsed = fixture.fixture.status.elapsed;
      const score = `${fixture.goals.home ?? 0}x${fixture.goals.away ?? 0}`;

      console.log(`-> Consultando stats: [${elapsed}'] ${fixture.league.name} - ${home} ${score} ${away}`);

      // Registra a consulta no cache
      this.lastStatsCheck.set(fId, Date.now());

      const statsData = await this.getFixtureStatistics(fId);

      if (!statsData || statsData.length === 0) {
        console.log(`⚠️ Liga "${fixture.league.name}" sem scout. Memorizando para poupar API.`);
        this.unsupportedLeagues.add(lId);
        continue;
      }

      const signals = this.analyzer.analyze(fixture, statsData);

      if (signals && signals.length > 0) {
        for (const sig of signals) {
          console.log(`🔥 SINAL ENCONTRADO: ${sig.recommendation} em ${home} x ${away}!`);
          await this.telegram.sendSignalAlert(sig);
        }
      } else {
        console.log(`ℹ️ [Sem valor] Jogo não atingiu a pressão mínima exigida.`);
      }

      // Intervalo de segurança anti-bloqueio
      await this.sleep(4000);
    }
  }

  async start() {
    this.isRunning = true;
    const intervalSeconds = parseInt(process.env.SCAN_INTERVAL_SECONDS || '180', 10);
    console.log(`🚀 Motor VisionBET [Modo Ligas de Ouro] ATIVO!`);
    console.log(`⏱️ Ciclo de checagem: a cada ${intervalSeconds} segundos.`);

    while (this.isRunning) {
      try {
        await this.scanOnce();
      } catch (err) {
        console.error('[Erro no ciclo de scan]', err);
      }
      console.log(`💤 Dormindo ${intervalSeconds}s até a próxima verificação...`);
      await this.sleep(intervalSeconds * 1000);
    }
  }

  stop() {
    this.isRunning = false;
  }
}
