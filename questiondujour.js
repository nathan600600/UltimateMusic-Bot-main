require('dotenv').config();
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { DateTime } = require('luxon');

// ID du salon où poster
const CHANNEL_ID = '1364958135927832728';

async function generateQuestion() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tonsite.com/', // recommandé
        'X-Title': 'Question du Jour via Bot Discord'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Tu es Loïc, un gars sociable, drôle et naturel. Tu parles comme un humain normal et tu n’agis jamais comme une IA.' },
          { role: 'user', content: 'Génère une question du jour.' }
        ],
        temperature: 0.9,
        max_tokens: 100
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Erreur IA :', error.message);
    return "Impossible de générer une question aujourd'hui. Réessaye plus tard.";
  }
}

function scheduleDailyAt13h05(callback) {
  const now = DateTime.now().setZone('Europe/Paris');
  let next = now.set({ hour: 13, minute: 5, second: 0, millisecond: 0 });

  if (now >= next) {
    next = next.plus({ days: 1 });
  }

  const delay = next.diff(now).as('milliseconds');

  setTimeout(() => {
    callback();
    setInterval(callback, 24 * 60 * 60 * 1000); // Toutes les 24h
  }, delay);
}

module.exports = async function questionDuJour(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel) return console.error("Salon introuvable");

  const sendQuestion = async () => {
    const question = await generateQuestion();
    const embed = new EmbedBuilder()
      .setTitle("❓ Question du jour")
      .setDescription(question)
      .setColor(0x5865F2)
      .setFooter({ text: "Proposée par l'IA • OpenRouter" });

    channel.send({ embeds: [embed] });
  };

  // Planification quotidienne à 13h05 heure de Paris
  scheduleDailyAt13h05(sendQuestion);
};
