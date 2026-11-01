import dotenv from 'dotenv';
dotenv.config();

export class TelegramService {
  constructor(token, chatId) {
    this.token = token || process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = chatId || process.env.TELEGRAM_CHAT_ID;
  }

  setChatId(id) {
    this.chatId = id;
  }

  async sendMessage(text, options = {}) {
    if (!this.chatId) {
      console.warn('[Telegram] Chat ID não configurado ainda.');
      return null;
    }

    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const payload = {
      chat_id: this.chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...options
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.ok) {
        console.error('[Telegram Error]', data.description);
      }
      return data;
    } catch (err) {
      console.error('[Telegram Request Failed]', err.message);
      return null;
    }
  }

  async sendSignalAlert(signal) {
    const {
      title,
      strategy,
      match,
      league,
      country,
      elapsed,
      score,
      stats,
      reason,
      recommendation,
      minOdds
    } = signal;

    const message = `
🤖 <b>VISIONBET • ALERTA DE ENTRADA AO VIVO</b> ⚽
━━━━━━━━━━━━━━━━━━━━━━━
🏆 <b>Liga:</b> ${league} (${country})
⚔️ <b>Jogo:</b> <b>${match.home}</b> ${score.home} x ${score.away} <b>${match.away}</b>
⏱️ <b>Tempo:</b> ${elapsed}' minutos

🎯 <b>MERCADO SUGERIDO:</b>
👉 <b>${recommendation}</b>
📈 <b>Odd Mínima de Valor:</b> @${minOdds.toFixed(2)}+

📊 <b>Estatísticas de Pressão:</b>
• Chutes no Alvo: ${stats.shotsOnTargetHome + stats.shotsOnTargetAway} (${stats.shotsOnTargetHome} x ${stats.shotsOnTargetAway})
• Chutes Totais: ${stats.totalShotsHome + stats.totalShotsAway} (${stats.totalShotsHome} x ${stats.totalShotsAway})
• Escanteios: ${stats.cornersHome + stats.cornersAway} (${stats.cornersHome} x ${stats.cornersAway})
• Ataques Perigosos/min: ~${stats.apm.toFixed(2)} APM

💡 <b>Motivo da Entrada:</b>
${reason}

⚠️ <i>Gestão recomendada: 1% a 2% da banca. Não entre em odds abaixo da recomendada.</i>
━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    return this.sendMessage(message);
  }
}

