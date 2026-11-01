import dotenv from 'dotenv';
dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;

async function checkTelegram() {
  const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
  const res = await fetch(url);
  const data = await res.json();
  console.log('--- GET UPDATES RESULT ---');
  if (data.result && data.result.length > 0) {
    for (const u of data.result) {
      if (u.channel_post) {
        console.log(`CANAL ENCONTRADO!`);
        console.log(`Nome: ${u.channel_post.chat.title}`);
        console.log(`Chat ID: ${u.channel_post.chat.id}`);
        console.log(`Username: @${u.channel_post.chat.username || 'privado'}`);
        return u.channel_post.chat.id;
      }
      if (u.message) {
        console.log(`MENSAGEM ENCONTRADA!`);
        console.log(`De: ${u.message.from?.first_name}`);
        console.log(`Chat ID: ${u.message.chat.id}`);
        console.log(`Tipo: ${u.message.chat.type}`);
        return u.message.chat.id;
      }
      if (u.my_chat_member) {
        console.log(`BOT ADICIONADO A UM CANAL/GRUPO!`);
        console.log(`Título: ${u.my_chat_member.chat.title}`);
        console.log(`Chat ID: ${u.my_chat_member.chat.id}`);
        return u.my_chat_member.chat.id;
      }
    }
  } else {
    console.log('Nenhuma mensagem ou canal detectado ainda.');
    console.log('Passo a passo:');
    console.log('1. Abra seu canal no Telegram');
    console.log('2. Adicione @visionnbet_bot como ADMINISTRADOR');
    console.log('3. Envie qualquer mensagem ou post no canal (ex: "teste")');
    return null;
  }
}

checkTelegram().catch(console.error);

