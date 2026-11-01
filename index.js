import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import { TelegramService } from './src/telegram.js';
import { MatchAnalyzer } from './src/analyzer.js';
import { EspnScanner } from './src/espn-scanner.js';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!botToken || !chatId) {
  console.error('❌ ERRO: Verifique se TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID estão configurados no arquivo .env!');
  process.exit(1);
}

// Mini-servidor web para manter o bot 24h ativo em servidores em nuvem (Render, Railway, etc.)
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 VisionBET - Robô de Futebol Ao Vivo 24h Online!\nCanal Oficial: ' + chatId);
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
