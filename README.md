# ⚽ VisionBET - Robô de Análise e Sinais de Futebol Ao Vivo (Modo Ilimitado)

Sistema de detecção de oportunidades de **Valor Esperado Positivo (+EV)** em partidas de futebol ao vivo, conectado diretamente à rede de dados da **ESPN Global**, com envio instantâneo para o canal do Telegram **@visionnbet**.

---

## 🌟 Vantagens Desta Versão
* 💸 **100% Gratuito:** Sem mensalidades ou assinaturas de APIs.
* ♾️ **Sem Limite de Requisições:** Pode rodar continuamente 24h por dia a cada 60 segundos.
* 🏆 **Cobertura Mundial das Grandes Ligas:** Premier League, La Liga, Brasileirão Série A/B, Serie A Italiana, Bundesliga, Champions League, Libertadores, etc.
* 📊 **Estatísticas Completas em Tempo Real:** Chutes no alvo, finalizações totais, escanteios, posse de bola e cartões.

---

## 🎯 Estratégias do Robô

### 1. 🔥 Over 0.5 Gols HT (1º Tempo)
* **Janela:** 25' a 38' do primeiro tempo.
* **Critério:** Jogo empatado em 0x0 com pelo menos **3 chutes a gol**, **6 finalizações totais** e **2 escanteios**.
* **Objetivo:** Pegar o gol antes do intervalo em odds de valor (1.55+).

### 2. ⚡ Over Gols Limite FT (2º Tempo)
* **Janela:** 70' a 83' do segundo tempo.
* **Critério:** Placar apertado (empate ou diferença de 1 gol) com mais de **6 chutes no alvo** e **13 finalizações totais**.
* **Objetivo:** Gol no final de partida aberta e com pressão contínua (odds 1.65+).

### 3. 🚩 Cantos Limite FT (Escanteios)
* **Janela:** 82' a 88' do segundo tempo.
* **Critério:** Time pressionando em busca do resultado com alto volume de finalizações e pelo menos **7 escanteios** acumulados.
* **Objetivo:** Entrada rápida no último escanteio do jogo (odds 1.60+).

---

## 🚀 Como Iniciar o Robô

Basta dar dois cliques no arquivo:
👉 **`iniciar_bot.bat`**

Ou rodar pelo terminal:
```bash
npm start
```
