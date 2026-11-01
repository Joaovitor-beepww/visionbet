// Lista curada das principais ligas do mundo com alta liquidez nas casas e dados 100% confiáveis ao vivo
export const TOP_LEAGUES = {
  // Competições Internacionais / Continentais
  2: { name: 'UEFA Champions League', country: 'World' },
  3: { name: 'UEFA Europa League', country: 'World' },
  848: { name: 'UEFA Europa Conference League', country: 'World' },
  13: { name: 'Copa Libertadores', country: 'South-America' },
  11: { name: 'Copa Sudamericana', country: 'South-America' },
  9: { name: 'Copa America', country: 'South-America' },
  1: { name: 'World Cup', country: 'World' },

  // Brasil
  71: { name: 'Brasileirão Série A', country: 'Brazil' },
  72: { name: 'Brasileirão Série B', country: 'Brazil' },
  73: { name: 'Copa do Brasil', country: 'Brazil' },
  475: { name: 'Paulista - A1', country: 'Brazil' },
  476: { name: 'Carioca - 1', country: 'Brazil' },

  // Inglaterra
  39: { name: 'Premier League', country: 'England' },
  40: { name: 'Championship', country: 'England' },
  41: { name: 'League One', country: 'England' },
  45: { name: 'FA Cup', country: 'England' },
  48: { name: 'League Cup (Carabao)', country: 'England' },

  // Espanha
  140: { name: 'La Liga', country: 'Spain' },
  141: { name: 'Segunda División', country: 'Spain' },
  143: { name: 'Copa del Rey', country: 'Spain' },

  // Itália
  135: { name: 'Serie A', country: 'Italy' },
  136: { name: 'Serie B', country: 'Italy' },
  137: { name: 'Coppa Italia', country: 'Italy' },

  // Alemanha
  78: { name: 'Bundesliga', country: 'Germany' },
  79: { name: '2. Bundesliga', country: 'Germany' },
  81: { name: 'DFB Pokal', country: 'Germany' },

  // França
  61: { name: 'Ligue 1', country: 'France' },
  62: { name: 'Ligue 2', country: 'France' },
  66: { name: 'Coupe de France', country: 'France' },

  // Outras Grandes Ligas Europeias e Mundiais
  88: { name: 'Eredivisie', country: 'Netherlands' },
  94: { name: 'Primeira Liga', country: 'Portugal' },
  203: { name: 'Süper Lig', country: 'Turkey' },
  144: { name: 'Jupiler Pro League', country: 'Belgium' },
  307: { name: 'Saudi Pro League', country: 'Saudi-Arabia' },
  253: { name: 'MLS', country: 'USA' },
  128: { name: 'Liga Profesional', country: 'Argentina' }
};

const topLeagueIds = new Set(Object.keys(TOP_LEAGUES).map(Number));

/**
 * Verifica se a liga da partida faz parte das Ligas de Ouro
 */
export function isTopLeague(league) {
  if (!league || !league.id) return false;
  return topLeagueIds.has(league.id);
}

