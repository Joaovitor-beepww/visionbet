import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import { TelegramService } from './telegram.js';
import { MatchAnalyzer } from './analyzer.js';
import { EspnScanner } from './espn-scanner.js';

// Carrega as variáveis de ambiente ou utiliza os padrões já configurados
const botToken = process.env.TELEGRAM_BOT_TOKEN || '9099041052:AAF9dNhTuT6Soxm_PPxavFVbNO8D0m0q_RA';
const chatId = process.env.TELEGRAM_CHAT_ID || '@visionnbet';

// Servidor Web para manter a aplicação 24h ativa no Render / Nuvem
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 VisionBET - Robô de Futebol Ao Vivo 24h Online!\nCanal: ' + chatId);
}).listen(port, () => {
  console.log(`🌐 Servidor Web de monitoramento ativo na porta ${port}`);
});

console.log('========================================================');
console.log('       VISIONBET - ROBÔ DE ANÁLISE AO VIVO 24H         ');
console.log('       Fonte de Dados: ESPN Global (100% Ilimitado)     ');
console.log(`       Canal Telegram: ${chatId}                      `);
console.log('========================================================');

const telegram = new TelegramService(botToken, chatId);
const analyzer = new MatchAnalyzer();
const scanner = new EspnScanner(analyzer, telegram);

// Inicia a varredura contínua a cada 60 segundos
scanner.start(60);
