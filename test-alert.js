import dotenv from 'dotenv';
dotenv.config();

import { TelegramService } from './src/telegram.js';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const telegram = new TelegramService(botToken, chatId);

async function sendTest() {
  console.log('Enviando alerta de teste para o Telegram...');
  const testSignal = {
    title: 'Gols 1º Tempo',
    strategy: 'OVER_05_HT',
    recommendation: 'Over 0.5 Gols no 1º Tempo (HT)',
    minOdds: 1.62,
    reason: '🔥 Jogo em 0x0 com pressão absurda no 1º tempo! 5 chutes no gol e 9 finalizações em 32 minutos.',
    match: { home: 'Real Madrid', away: 'Barcelona' },
    league: 'La Liga',
    country: 'Espanha',
    elapsed: 32,
    score: { home: 0, away: 0 },
    stats: {
      shotsOnTargetHome: 3,
      shotsOnTargetAway: 2,
      totalShotsHome: 5,
      totalShotsAway: 4,
      cornersHome: 3,
      cornersAway: 2,
      apm: 1.15
    }
  };

  const res = await telegram.sendSignalAlert(testSignal);
  if (res && res.ok) {
    console.log('✅ Mensagem de teste enviada com SUCESSO no seu canal/chat!');
  } else {
    console.log('❌ Falha ao enviar. Verifique o Chat ID e permissões do bot no canal.');
  }
}

sendTest().catch(console.error);

